# Finebro

Finebro is a local-first personal finance tracker for desktop and mobile.

## Stack

- React, TypeScript, and Vite for the app UI
- Tauri 2 for desktop and mobile packaging
- Native SQLite persistence through Tauri, with a browser fallback for web development
- `rusqlite` with bundled SQLite for the native database layer

## Getting Started

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

The frontend is available at `http://127.0.0.1:5173/`.

Build the frontend:

```bash
npm run build
```

Run type checks:

```bash
npm run check
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

## Persistence

Finebro is local-first. In Tauri builds, app state is stored in a SQLite database at the platform app data location under `finebro.db`.

The native database layer lives in `src-tauri/src/lib.rs` and exposes two Tauri commands:

- `load_finance_state`
- `save_finance_state`

The frontend storage facade in `src/lib/storage.ts` uses those native commands when running inside Tauri. During browser-only development, it falls back to `localStorage`.

On first native launch with an empty SQLite database, Finebro seeds from existing browser storage when available, otherwise it uses the built-in demo data.

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

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run check` - run TypeScript checks
- `npm run build` - build the frontend
- `npm run preview` - preview the production frontend build
- `npm run tauri:dev` - run the native Tauri app in development
- `npm run tauri:build` - build the native macOS app and DMG
- `npm run tauri:android:init` - initialize Android support
- `npm run tauri:android:dev` - run Android development target
- `npm run tauri:android:build` - build Android target
- `npm run tauri:ios:init` - initialize iOS support
- `npm run tauri:ios:dev` - run iOS development target
- `npm run tauri:ios:build` - build iOS target

## Product Direction

Finebro starts with the essentials:

- monthly income, expense, and savings summaries
- transaction entry and filtering
- category budgets
- local import and export
- responsive desktop and mobile layout
- native local persistence

The next durable steps are adding account-level data, recurring rules, and optional encrypted sync.
