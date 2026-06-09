import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Download,
  LineChart,
  PiggyBank,
  Plus,
  Search,
  Trash2,
  Upload,
  WalletCards
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateSummary,
  formatCurrency,
  formatMonthLabel,
  formatPercent,
  getBudgetProgress,
  getMonthlyTrend,
  getRecentMonths,
  getTopExpenseCategories,
  makeId,
  monthKey,
  todayKey
} from "./lib/finance";
import { loadFinanceState, saveFinanceState } from "./lib/storage";
import type { FinanceState, Transaction, TransactionDraft } from "./types";
import { expenseCategories } from "./types";

const defaultDraft: TransactionDraft = {
  kind: "expense",
  description: "",
  amount: "",
  category: "Food",
  account: "Everyday",
  date: todayKey(),
  recurring: false
};

export function App() {
  const [state, setState] = useState<FinanceState>(() => loadFinanceState());
  const [draft, setDraft] = useState<TransactionDraft>(defaultDraft);
  const [query, setQuery] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveFinanceState(state);
  }, [state]);

  const summary = useMemo(
    () => calculateSummary(state.transactions, state.selectedMonth),
    [state.selectedMonth, state.transactions]
  );

  const budgets = useMemo(
    () => getBudgetProgress(state.transactions, state.budgets, state.selectedMonth),
    [state.budgets, state.selectedMonth, state.transactions]
  );

  const topCategories = useMemo(
    () => getTopExpenseCategories(state.transactions, state.selectedMonth),
    [state.selectedMonth, state.transactions]
  );

  const trend = useMemo(() => getMonthlyTrend(state.transactions), [state.transactions]);
  const maxTrendValue = Math.max(...trend.flatMap((item) => [item.income, item.expenses]), 1);

  const filteredTransactions = summary.monthTransactions
    .filter((transaction) => {
      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery) {
        return true;
      }

      return [transaction.description, transaction.category, transaction.account]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((left, right) => right.date.localeCompare(left.date));

  function updateDraft(nextDraft: Partial<TransactionDraft>) {
    setDraft((current) => {
      const merged = { ...current, ...nextDraft };

      if (nextDraft.kind === "income") {
        merged.category = "Income";
      }

      if (nextDraft.kind === "expense" && current.kind === "income") {
        merged.category = "Food";
      }

      return merged;
    });
  }

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(draft.amount);
    const description = draft.description.trim();

    if (!description || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const transaction: Transaction = {
      id: makeId(),
      kind: draft.kind,
      description,
      amount,
      category: draft.kind === "income" ? "Income" : draft.category,
      account: draft.account.trim() || "Everyday",
      date: draft.date || todayKey(),
      recurring: draft.recurring
    };

    setState((current) => ({
      ...current,
      selectedMonth: monthKey(new Date(`${transaction.date}T12:00:00`)),
      transactions: [transaction, ...current.transactions]
    }));

    setDraft({
      ...defaultDraft,
      kind: draft.kind,
      date: todayKey()
    });
  }

  function deleteTransaction(id: string) {
    setState((current) => ({
      ...current,
      transactions: current.transactions.filter((transaction) => transaction.id !== id)
    }));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finebro-${state.selectedMonth}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as Partial<FinanceState>;

      if (Array.isArray(parsed.transactions) && Array.isArray(parsed.budgets)) {
        setState({
          transactions: parsed.transactions,
          budgets: parsed.budgets,
          selectedMonth: parsed.selectedMonth ?? monthKey()
        });
      }
    } finally {
      if (importInput.current) {
        importInput.current.value = "";
      }
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <WalletCards size={22} />
          </div>
          <div>
            <span>Finebro</span>
            <strong>{formatMonthLabel(state.selectedMonth)}</strong>
          </div>
        </div>

        <div className="top-actions">
          <label className="select-wrap">
            <CalendarDays size={17} aria-hidden="true" />
            <select
              aria-label="Month"
              value={state.selectedMonth}
              onChange={(event) =>
                setState((current) => ({ ...current, selectedMonth: event.target.value }))
              }
            >
              {getRecentMonths(12).map((key) => (
                <option key={key} value={key}>
                  {formatMonthLabel(key)}
                </option>
              ))}
            </select>
          </label>

          <button className="icon-button" type="button" title="Export data" onClick={exportData}>
            <Download size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Import data"
            onClick={() => importInput.current?.click()}
          >
            <Upload size={18} />
          </button>
          <input
            ref={importInput}
            className="visually-hidden"
            type="file"
            accept="application/json"
            onChange={(event) => void importData(event.target.files?.[0])}
          />
        </div>
      </header>

      <section className="summary-grid" aria-label="Monthly summary">
        <MetricCard
          icon={<ArrowUpCircle size={20} />}
          label="Income"
          value={formatCurrency(summary.income)}
          tone="income"
        />
        <MetricCard
          icon={<ArrowDownCircle size={20} />}
          label="Expenses"
          value={formatCurrency(summary.expenses)}
          tone="expense"
        />
        <MetricCard
          icon={<PiggyBank size={20} />}
          label="Net"
          value={formatCurrency(summary.net)}
          tone={summary.net >= 0 ? "income" : "expense"}
        />
        <MetricCard
          icon={<LineChart size={20} />}
          label="Savings"
          value={formatPercent(summary.savingsRate)}
          tone="neutral"
        />
      </section>

      <section className="main-grid">
        <section className="surface trend-surface" aria-label="Monthly trend">
          <div className="section-heading">
            <div>
              <span>Cashflow</span>
              <strong>{formatCurrency(summary.net, true)}</strong>
            </div>
            <small>{summary.transactionCount} transactions</small>
          </div>

          <div className="trend-chart" role="img" aria-label="Income and expense trend">
            {trend.map((item) => (
              <div className="trend-column" key={item.key}>
                <div className="trend-bars">
                  <span
                    className="trend-bar income-bar"
                    style={{ height: `${Math.max((item.income / maxTrendValue) * 100, 4)}%` }}
                    title={`Income ${formatCurrency(item.income, true)}`}
                  />
                  <span
                    className="trend-bar expense-bar"
                    style={{ height: `${Math.max((item.expenses / maxTrendValue) * 100, 4)}%` }}
                    title={`Expenses ${formatCurrency(item.expenses, true)}`}
                  />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="category-strip" aria-label="Top categories">
            {topCategories.map((item) => (
              <div key={item.category}>
                <span>{item.category}</span>
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))}
          </div>
        </section>

        <form className="surface entry-form" onSubmit={addTransaction}>
          <div className="section-heading">
            <div>
              <span>Entry</span>
              <strong>Transaction</strong>
            </div>
            <button className="primary-button" type="submit">
              <Plus size={18} />
              Add
            </button>
          </div>

          <div className="segmented-control" role="group" aria-label="Transaction type">
            <button
              className={draft.kind === "expense" ? "active" : ""}
              type="button"
              onClick={() => updateDraft({ kind: "expense" })}
            >
              <ArrowDownCircle size={17} />
              Expense
            </button>
            <button
              className={draft.kind === "income" ? "active" : ""}
              type="button"
              onClick={() => updateDraft({ kind: "income" })}
            >
              <ArrowUpCircle size={17} />
              Income
            </button>
          </div>

          <label className="field">
            <span>Description</span>
            <input
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
              placeholder="Salary, groceries, rent"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Amount</span>
              <input
                inputMode="decimal"
                min="0"
                step="0.01"
                type="number"
                value={draft.amount}
                onChange={(event) => updateDraft({ amount: event.target.value })}
                placeholder="0.00"
              />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft({ date: event.target.value })}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <select
                disabled={draft.kind === "income"}
                value={draft.category}
                onChange={(event) =>
                  updateDraft({ category: event.target.value as TransactionDraft["category"] })
                }
              >
                {draft.kind === "income" ? (
                  <option value="Income">Income</option>
                ) : (
                  expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field">
              <span>Account</span>
              <input
                value={draft.account}
                onChange={(event) => updateDraft({ account: event.target.value })}
                placeholder="Everyday"
              />
            </label>
          </div>

          <label className="check-field">
            <input
              type="checkbox"
              checked={draft.recurring}
              onChange={(event) => updateDraft({ recurring: event.target.checked })}
            />
            <span>Recurring</span>
          </label>
        </form>
      </section>

      <section className="detail-grid">
        <section className="surface transactions-surface" aria-label="Transactions">
          <div className="section-heading transaction-heading">
            <div>
              <span>Ledger</span>
              <strong>Transactions</strong>
            </div>
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label="Search transactions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
              />
            </label>
          </div>

          <div className="transaction-list">
            {filteredTransactions.map((transaction) => (
              <article className="transaction-item" key={transaction.id}>
                <div className={`transaction-icon ${transaction.kind}`}>
                  {transaction.kind === "income" ? (
                    <ArrowUpCircle size={18} />
                  ) : (
                    <ArrowDownCircle size={18} />
                  )}
                </div>
                <div className="transaction-main">
                  <strong>{transaction.description}</strong>
                  <span>
                    {transaction.category} / {transaction.account} / {transaction.date}
                  </span>
                </div>
                <strong className={transaction.kind === "income" ? "money-in" : "money-out"}>
                  {transaction.kind === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount, true)}
                </strong>
                <button
                  className="icon-button subtle"
                  type="button"
                  title="Delete transaction"
                  onClick={() => deleteTransaction(transaction.id)}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="surface budget-surface" aria-label="Budgets">
          <div className="section-heading">
            <div>
              <span>Budgets</span>
              <strong>Categories</strong>
            </div>
            <small>{formatCurrency(summary.recurring)} recurring</small>
          </div>

          <div className="budget-list">
            {budgets.map((budget) => (
              <div className="budget-row" key={budget.category}>
                <div className="budget-top">
                  <span>{budget.category}</span>
                  <strong>{formatCurrency(budget.spent)} </strong>
                </div>
                <div className="budget-track">
                  <span
                    style={{
                      width: `${Math.min(budget.percent * 100, 100)}%`,
                      backgroundColor: budget.percent > 1 ? "#c75146" : budget.color
                    }}
                  />
                </div>
                <small>
                  {budget.remaining >= 0 ? "Left" : "Over"} {formatCurrency(Math.abs(budget.remaining))}
                </small>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral";
}

function MetricCard({ icon, label, value, tone }: MetricCardProps) {
  return (
    <article className={`metric-card ${tone}`}>
      <div aria-hidden="true">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
