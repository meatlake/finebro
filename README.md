# Finebro

Finebro is a local-first personal finance tracker for desktop and mobile.

## Stack

- React, TypeScript, and Vite for the app UI
- Tauri 2 for desktop and mobile packaging
- Local-first state today, with room for SQLite and optional sync later

## Getting Started

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

Run the native app shell:

```bash
npm run tauri:dev
```

Tauri requires Rust and Cargo for native desktop or mobile builds. The frontend can be developed and tested without Rust.

## Product Direction

Finebro starts with the essentials:

- monthly income, expense, and savings summaries
- transaction entry and filtering
- category budgets
- local import and export
- responsive desktop and mobile layout

The next durable step is moving persistence from browser storage to SQLite through Tauri, then adding account-level data, recurring rules, and optional encrypted sync.
