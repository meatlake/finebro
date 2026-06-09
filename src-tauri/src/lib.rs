use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct FinanceState {
    transactions: Vec<Transaction>,
    budgets: Vec<Budget>,
    selected_month: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct Transaction {
    id: String,
    kind: String,
    description: String,
    amount: f64,
    category: String,
    account: String,
    date: String,
    recurring: bool,
}

#[derive(Debug, Deserialize, Serialize)]
struct Budget {
    category: String,
    limit: f64,
    color: String,
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;

    Ok(dir.join("finebro.db"))
}

fn connect(app: &tauri::AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(database_path(app)?).map_err(|error| error.to_string())?;
    migrate(&conn)?;

    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS preferences (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS budgets (
            category TEXT PRIMARY KEY NOT NULL,
            limit_amount REAL NOT NULL,
            color TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY NOT NULL,
            kind TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            account TEXT NOT NULL,
            date TEXT NOT NULL,
            recurring INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        "#,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn load_finance_state(app: tauri::AppHandle) -> Result<FinanceState, String> {
    let conn = connect(&app)?;

    let selected_month = conn
        .query_row(
            "SELECT value FROM preferences WHERE key = ?1 LIMIT 1",
            ["selectedMonth"],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_default();

    let mut transaction_stmt = conn
        .prepare(
            "SELECT id, kind, description, amount, category, account, date, recurring FROM transactions ORDER BY date DESC, created_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let transactions = transaction_stmt
        .query_map([], |row| {
            Ok(Transaction {
                id: row.get(0)?,
                kind: row.get(1)?,
                description: row.get(2)?,
                amount: row.get(3)?,
                category: row.get(4)?,
                account: row.get(5)?,
                date: row.get(6)?,
                recurring: row.get::<_, i64>(7)? != 0,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let mut budget_stmt = conn
        .prepare("SELECT category, limit_amount, color FROM budgets ORDER BY category ASC")
        .map_err(|error| error.to_string())?;

    let budgets = budget_stmt
        .query_map([], |row| {
            Ok(Budget {
                category: row.get(0)?,
                limit: row.get(1)?,
                color: row.get(2)?,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(FinanceState {
        transactions,
        budgets,
        selected_month,
    })
}

#[tauri::command]
fn save_finance_state(app: tauri::AppHandle, state: FinanceState) -> Result<(), String> {
    let mut conn = connect(&app)?;
    let tx = conn.transaction().map_err(|error| error.to_string())?;

    tx.execute(
        "INSERT INTO preferences (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        params!["selectedMonth", state.selected_month],
    )
    .map_err(|error| error.to_string())?;

    tx.execute("DELETE FROM budgets", [])
        .map_err(|error| error.to_string())?;

    for budget in state.budgets {
        tx.execute(
            "INSERT INTO budgets (category, limit_amount, color, updated_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
            params![budget.category, budget.limit, budget.color],
        )
        .map_err(|error| error.to_string())?;
    }

    tx.execute("DELETE FROM transactions", [])
        .map_err(|error| error.to_string())?;

    for transaction in state.transactions {
        tx.execute(
            "INSERT INTO transactions (id, kind, description, amount, category, account, date, recurring, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)",
            params![
                transaction.id,
                transaction.kind,
                transaction.description,
                transaction.amount,
                transaction.category,
                transaction.account,
                transaction.date,
                if transaction.recurring { 1 } else { 0 }
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    tx.commit().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_finance_state,
            save_finance_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running Finebro");
}
