import { createInitialState, monthKey } from "./finance";
import type { FinanceState } from "../types";

const storageKey = "finebro.finance-state.v1";

function isFinanceState(value: unknown): value is FinanceState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FinanceState>;

  return Array.isArray(candidate.transactions) && Array.isArray(candidate.budgets);
}

export function loadFinanceState(): FinanceState {
  const fallback = createInitialState();
  const stored = localStorage.getItem(storageKey);

  if (!stored) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;

    if (!isFinanceState(parsed)) {
      return fallback;
    }

    return {
      transactions: parsed.transactions,
      budgets: parsed.budgets,
      selectedMonth: parsed.selectedMonth ?? monthKey()
    };
  } catch {
    return fallback;
  }
}

export function saveFinanceState(state: FinanceState) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
