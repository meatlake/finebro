import type { Budget, Category, FinanceState, Transaction } from "../types";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

const preciseCurrencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 0
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric"
});

const shortMonthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short"
});

export function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function monthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function formatCurrency(value: number, precise = false) {
  return precise ? preciseCurrencyFormatter.format(value) : currencyFormatter.format(value);
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return percentFormatter.format(value);
}

export function formatMonthLabel(key: string) {
  return monthFormatter.format(new Date(`${key}-01T12:00:00`));
}

export function getRecentMonths(count: number) {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);

    return monthKey(date);
  });
}

export function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function calculateSummary(transactions: Transaction[], selectedMonth: string) {
  const monthTransactions = transactions.filter((transaction) =>
    transaction.date.startsWith(selectedMonth)
  );

  const income = monthTransactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expenses = monthTransactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const recurring = monthTransactions
    .filter((transaction) => transaction.kind === "expense" && transaction.recurring)
    .reduce((total, transaction) => total + transaction.amount, 0);

  const net = income - expenses;
  const savingsRate = income > 0 ? net / income : 0;

  return {
    income,
    expenses,
    recurring,
    net,
    savingsRate,
    transactionCount: monthTransactions.length,
    monthTransactions
  };
}

export function getBudgetProgress(
  transactions: Transaction[],
  budgets: Budget[],
  selectedMonth: string
) {
  const expenses = transactions.filter(
    (transaction) => transaction.kind === "expense" && transaction.date.startsWith(selectedMonth)
  );

  return budgets.map((budget) => {
    const spent = expenses
      .filter((transaction) => transaction.category === budget.category)
      .reduce((total, transaction) => total + transaction.amount, 0);

    return {
      ...budget,
      spent,
      remaining: budget.limit - spent,
      percent: budget.limit > 0 ? spent / budget.limit : 0
    };
  });
}

export function getMonthlyTrend(transactions: Transaction[], count = 6) {
  return getRecentMonths(count)
    .reverse()
    .map((key) => {
      const summary = calculateSummary(transactions, key);

      return {
        key,
        label: shortMonthFormatter.format(new Date(`${key}-01T12:00:00`)),
        income: summary.income,
        expenses: summary.expenses,
        net: summary.net
      };
    });
}

export function getTopExpenseCategories(transactions: Transaction[], selectedMonth: string) {
  const totals = new Map<Category, number>();

  transactions
    .filter((transaction) => transaction.kind === "expense" && transaction.date.startsWith(selectedMonth))
    .forEach((transaction) => {
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
    });

  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 4);
}

export function createInitialState(): FinanceState {
  const currentMonth = monthKey();
  const previousMonth = getRecentMonths(2)[1];

  return {
    selectedMonth: currentMonth,
    budgets: [
      { category: "Housing", limit: 1850, color: "#2c6fbb" },
      { category: "Food", limit: 620, color: "#147f64" },
      { category: "Transport", limit: 280, color: "#7b61a8" },
      { category: "Subscriptions", limit: 160, color: "#a17108" },
      { category: "Travel", limit: 420, color: "#c75146" }
    ],
    transactions: [
      {
        id: makeId(),
        kind: "income",
        description: "Salary",
        amount: 5200,
        category: "Income",
        account: "Main",
        date: `${currentMonth}-24`,
        recurring: true
      },
      {
        id: makeId(),
        kind: "expense",
        description: "Rent",
        amount: 1720,
        category: "Housing",
        account: "Main",
        date: `${currentMonth}-01`,
        recurring: true
      },
      {
        id: makeId(),
        kind: "expense",
        description: "Groceries",
        amount: 142.4,
        category: "Food",
        account: "Everyday",
        date: `${currentMonth}-05`,
        recurring: false
      },
      {
        id: makeId(),
        kind: "expense",
        description: "Train pass",
        amount: 89,
        category: "Transport",
        account: "Everyday",
        date: `${currentMonth}-08`,
        recurring: true
      },
      {
        id: makeId(),
        kind: "expense",
        description: "Index fund",
        amount: 450,
        category: "Investing",
        account: "Invest",
        date: `${currentMonth}-12`,
        recurring: true
      },
      {
        id: makeId(),
        kind: "income",
        description: "Consulting",
        amount: 720,
        category: "Income",
        account: "Main",
        date: `${previousMonth}-20`,
        recurring: false
      },
      {
        id: makeId(),
        kind: "expense",
        description: "Weekend trip",
        amount: 330,
        category: "Travel",
        account: "Everyday",
        date: `${previousMonth}-16`,
        recurring: false
      }
    ]
  };
}
