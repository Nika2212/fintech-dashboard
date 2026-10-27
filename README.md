# Realtime Fintech Dashboard

An Angular app that shows live metrics for fictional financial instruments. A WebAssembly
generator, running inside a Web Worker, produces simulated trades and bid/ask snapshots.

- **Live demo:** _Railway URL — add after the first deploy_
- **Repository:** https://github.com/Nika2212/fintech-dashboard

## Pages

**Dashboard** — one row per instrument (`ALFA`, `BETA`, …) with:

| Metric | Calculation |
|---|---|
| Last price | Price of the instrument's latest trade |
| Bid–ask spread | `ask − bid` |
| Volume | Sum of all trade quantities since the run started |
| VWAP | `Σ(price × quantity) / Σ quantity` since the run started |
| Book imbalance | `(bidQty − askQty) / (bidQty + askQty)`, from −1 to +1 |

Before data arrives, and whenever a denominator is zero, values show as "Not available"
and volume shows 0. The page also shows the producer status and a Pause/Resume button.
Pausing stops generation; resuming keeps all totals.

**Settings** — instrument count (1–50), updates per batch (1–1,000) and batch interval
(50–2,000 ms), all whole numbers. Edits do nothing until **Apply**, which starts a new run
with fresh totals, including when the producer was paused.

## How it works

```
Angular (main thread)                 Web Worker                    WebAssembly
──────────────────────                ──────────                    ───────────
SettingsComponent ─┐
DashboardComponent ┤ MarketService ──► market.worker.ts ──────────► market-generator.wasm
                   │  (state, runId)   (timer, running totals,       (random prices, per-
                   └◄──────────────────  metrics per batch) ◄──────   instrument state)
```

- **Wasm** (`wasm/assembly`, AssemblyScript): keeps per-instrument prices and generates batches
  of updates as integer cents. See [wasm/README.md](wasm/README.md).
- **Worker** (`src/app/core/workers/market.worker.ts`): loads the Wasm module, runs one batch per
  interval and keeps running totals per instrument (last trade, book, volume, notional). It sends
  the computed metrics after every batch, so no event history is stored.
- **MarketService** (`src/app/core/services`): the only thing components talk to. It is a root
  singleton, so navigating between pages keeps the run and its running/paused state, and only
  one worker is ever created. Every Apply gets a new `runId`; responses from older runs are
  dropped. The worker is terminated when the app is destroyed.
- **UI**: Taiga UI components, standalone Angular components with `OnPush` change detection.

## Requirements

- Node.js 24 and npm

## Commands

| Command | What it does |
|---|---|
| `npm ci` | Installs dependencies |
| `npm start` | Builds the Wasm module, then serves the app at http://localhost:4200 |
| `npm run build` | Builds the Wasm module and a production build into `dist/` |
| `npm run start:prod` | Serves the production build from `dist/` on `$PORT` (default 3000), as on Railway |
| `npm test` | Runs the Angular unit tests |
| `npm run test:coverage` | Same, with coverage; fails below 100% |
| `npm run wasm:test` | Builds and tests the Wasm generator |
| `npm run wasm:coverage` | Same, with coverage; fails below 100% |
| `npm run lint` | Runs ESLint |

## Tests

Unit tests use Vitest. Both the app (`src/app`) and the generator (`wasm/assembly`) are held
at 100% coverage. They cover:

- **Metrics:** the worked example from the task, zero denominators, isolation between instruments
  (`market.worker.spec.ts`).
- **Settings:** validation, and resetting values when settings are applied
  (`settings.component.spec.ts`, `producer-settings-validator.util.spec.ts`, `market.service.spec.ts`).
- **Pause/resume and stale runs:** including Pause while the Wasm module is still loading
  (`market.worker.spec.ts`, `market.service.spec.ts`).
- **Generator:** batch sizes, value invariants, determinism, and parity between the compiled Wasm and
  the source (`wasm/tests`).

Timers are faked, so no test waits in real time.

## Deployment

The app is hosted on [Railway](https://railway.com), which redeploys on every push to `main`
through its GitHub integration. `railway.json` sets the commands:

- **Build:** `npm run build` compiles the Wasm module, then the Angular production build.
- **Start:** `npm run start:prod` serves `dist/fintech-dashboard/browser` with
  [`serve`](https://www.npmjs.com/package/serve) on Railway's `PORT`. It falls back to
  `index.html` for deep links such as `/settings`, and serves `.wasm` files as `application/wasm`,
  which `WebAssembly.compileStreaming` requires.

`.github/workflows/ci.yml` runs lint, both test suites with coverage, and a production build on
every push and pull request.

One-time setup in Railway:
1. Create a project from this GitHub repository.
2. In the service settings, turn on **Wait for CI**, so a commit deploys only after CI passes.
3. Under **Networking**, generate a public domain, and put it in the "Live demo" link above.
