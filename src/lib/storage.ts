import { invoke, isTauri } from "@tauri-apps/api/core";
import { createInitialState, monthKey } from "./finance";
import { expenseCategories, type Budget, type Category, type FinanceState, type Transaction } from "../types";

const storageKey = "finebro.finance-state.v1";
const migrationMarkerKey = `${storageKey}.native-sqlite-migrated`;

const categories: Category[] = ["Income", ...expenseCategories];

let sqliteUnavailable = false;
let saveQueue = Promise.resolve();

function canUseSqlite() {
  return !sqliteUnavailable && isTauri();
}

function isFinanceState(value: unknown): value is FinanceState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FinanceState>;

  return Array.isArray(candidate.transactions) && Array.isArray(candidate.budgets);
}

function isCategory(value: string): value is Category {
  return categories.includes(value as Category);
}

function normalizeCategory(value: string, fallback: Category): Category {
  return isCategory(value) ? value : fallback;
}

function normalizeTransaction(transaction: Transaction): Transaction {
  return {
    id: transaction.id,
    kind: transaction.kind === "income" ? "income" : "expense",
    description: transaction.description,
    amount: Number(transaction.amount),
    category: normalizeCategory(
      transaction.category,
      transaction.kind === "income" ? "Income" : "Other"
    ),
    account: transaction.account,
    date: transaction.date,
    recurring: Boolean(transaction.recurring)
  };
}

function normalizeBudget(budget: Budget): Budget {
  return {
    category: normalizeCategory(budget.category, "Other"),
    limit: Number(budget.limit),
    color: budget.color
  };
}

function readBrowserState() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(storageKey);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;

    if (!isFinanceState(parsed)) {
      return null;
    }

    return {
      transactions: parsed.transactions.map(normalizeTransaction),
      budgets: parsed.budgets.map(normalizeBudget),
      selectedMonth: parsed.selectedMonth ?? monthKey()
    };
  } catch {
    return null;
  }
}

function saveBrowserState(state: FinanceState) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }
}

async function seedEmptyDatabase() {
  const seed = readBrowserState() ?? createInitialState();

  await saveNativeState(seed);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(migrationMarkerKey, new Date().toISOString());
  }

  return seed;
}

async function loadNativeState() {
  const stored = await invoke<FinanceState>("load_finance_state");

  if (stored.transactions.length === 0 && stored.budgets.length === 0) {
    return seedEmptyDatabase();
  }

  return normalizeFinanceState(stored);
}

function normalizeFinanceState(state: FinanceState): FinanceState {
  return {
    transactions: state.transactions.map(normalizeTransaction),
    budgets:
      state.budgets.length > 0
        ? state.budgets.map(normalizeBudget)
        : createInitialState().budgets,
    selectedMonth: state.selectedMonth || monthKey()
  };
}

async function saveNativeState(state: FinanceState) {
  await invoke("save_finance_state", {
    state: normalizeFinanceState(state)
  });
}

export async function loadFinanceState(): Promise<FinanceState> {
  if (canUseSqlite()) {
    try {
      return await loadNativeState();
    } catch {
      sqliteUnavailable = true;
    }
  }

  return readBrowserState() ?? createInitialState();
}

export function saveFinanceState(state: FinanceState): Promise<void> {
  saveQueue = saveQueue
    .then(async () => {
      if (canUseSqlite()) {
        try {
          await saveNativeState(state);
          return;
        } catch {
          sqliteUnavailable = true;
        }
      }

      saveBrowserState(state);
    })
    .catch(() => {
      saveBrowserState(state);
    });

  return saveQueue;
}
