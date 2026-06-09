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

Build the macOS desktop app:

```bash
npm run tauri:build
```

Successful macOS builds are written to:

- `src-tauri/target/release/bundle/macos/Finebro.app`
- `src-tauri/target/release/bundle/dmg/Finebro_0.1.0_aarch64.dmg`

## Mobile Targets

Tauri 2 supports Android and iOS targets from the same codebase, but each platform needs its own local tooling.

Initialize Android once the Android toolchain is installed:

```bash
npm run tauri:android:init -- --ci
```

Run or build Android:

```bash
npm run tauri:android:dev
npm run tauri:android:build
```

Initialize iOS once full Xcode is installed:

```bash
npm run tauri:ios:init -- --ci
```

Run or build iOS:

```bash
npm run tauri:ios:dev
npm run tauri:ios:build
```

Current local status:

- Rust and Cargo are installed.
- macOS desktop packaging works.
- Android still needs a Java runtime and Android Studio/SDK.
- iOS has been initialized at `src-tauri/gen/apple/finebro.xcodeproj`.
- iOS builds still need full Xcode, not only the Command Line Tools.
- iOS signing still needs an Apple development team/certificate.

## Product Direction

Finebro starts with the essentials:

- monthly income, expense, and savings summaries
- transaction entry and filtering
- category budgets
- local import and export
- responsive desktop and mobile layout

The next durable step is moving persistence from browser storage to SQLite through Tauri, then adding account-level data, recurring rules, and optional encrypted sync.
