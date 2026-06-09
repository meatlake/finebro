export type TransactionKind = "income" | "expense";

export type Category =
  | "Income"
  | "Housing"
  | "Food"
  | "Transport"
  | "Health"
  | "Subscriptions"
  | "Travel"
  | "Investing"
  | "Other";

export interface Transaction {
  id: string;
  kind: TransactionKind;
  description: string;
  amount: number;
  category: Category;
  account: string;
  date: string;
  recurring: boolean;
}

export interface Budget {
  category: Category;
  limit: number;
  color: string;
}

export interface FinanceState {
  transactions: Transaction[];
  budgets: Budget[];
  selectedMonth: string;
}

export interface TransactionDraft {
  kind: TransactionKind;
  description: string;
  amount: string;
  category: Category;
  account: string;
  date: string;
  recurring: boolean;
}

export const expenseCategories: Category[] = [
  "Housing",
  "Food",
  "Transport",
  "Health",
  "Subscriptions",
  "Travel",
  "Investing",
  "Other"
];
