# Market generator (WebAssembly)

Generates simulated market updates — trades plus bid/ask snapshots — for the dashboard.
Written in [AssemblyScript](https://www.assemblyscript.org/) and compiled to WebAssembly.
All randomness, price evolution and per-instrument state live inside the Wasm module.

```
wasm/
├── assembly/          AssemblyScript sources (compiled to Wasm)
│   ├── index.ts       public API: init(), generateBatch(), limits
│   ├── market.ts      per-instrument state and price model
│   ├── random.ts      seeded xorshift32 random generator
│   └── constants.ts   record layout and limits
├── tests/             Vitest specs
├── asconfig.json      compiler targets
└── build/             compiler output (git-ignored)
```

## Commands

| Command | What it does |
|---|---|
| `npm run wasm:build` | Compiles the release build to `wasm/build/market-generator.wasm` |
| `npm run wasm:build:debug` | Compiles a debug build with source maps |
| `npm run wasm:test` | Builds, then runs all generator tests |
| `npm run wasm:coverage` | Same as `wasm:test`, plus a coverage report; fails below 100% |

## Build output

| File | Purpose |
|---|---|
| `market-generator.wasm` | The module itself (~6 KB) |
| `market-generator.js` | Generated bindings: `instantiate(module, imports)` returns the API below, converting the returned `Int32Array` from Wasm memory |
| `market-generator.d.ts` | Types for the bindings |
| `market-generator.wat` | Readable text form, for inspection only |

## API

### `init(instrumentCount: i32, seed: u32): void`

Starts a new run. Seeds the random generator and creates `instrumentCount` instruments,
each with a random starting bid between $10.00 and $1,000.00. Calling `init()` again
discards all previous state.

| Input | Type | Valid values |
|---|---|---|
| `instrumentCount` | integer | 1 – 50 |
| `seed` | unsigned 32-bit integer | any; `0` is replaced with a fixed non-zero seed |

The same `instrumentCount` and `seed` always produce exactly the same sequence of batches.
Pass a fixed seed in tests and a random one (e.g. from `crypto.getRandomValues`) in the app.

**Throws** `InstrumentCount must be an integer between 1 and 50` when the count is out of range.

### `generateBatch(size: i32): Int32Array`

Generates exactly `size` market updates and returns them as a flat `Int32Array` of
`size × 7` integers. Each update continues from the instruments' previous prices, including
across separate calls. An instrument can appear several times in one batch.

| Input | Type | Valid values |
|---|---|---|
| `size` | integer | 1 – 1000 |

**Throws**
- `init() must be called before generateBatch()` when no run has been started.
- `batch size must be an integer between 1 and 1000` when `size` is out of range.

A failed call does not change the generator's state.

### Limits

| Function | Returns |
|---|---|
| `fieldsPerUpdate()` | `7`, the number of integers per update |
| `maxInstruments()` | `50` |
| `maxBatchSize()` | `1000` |

## Output format

Update `n` occupies indices `n × 7` to `n × 7 + 6`:

| Offset | Field | Unit | Guaranteed range |
|---:|---|---|---|
| 0 | `instrumentId` | index | `0` to `instrumentCount − 1` |
| 1 | `tradePriceCents` | cents | equals the bid or the ask at offset 3 or 4 |
| 2 | `tradeQuantity` | units | 1 – 100 |
| 3 | `bidPriceCents` | cents | 1 – 10,000,000 |
| 4 | `askPriceCents` | cents | always greater than the bid |
| 5 | `bidQuantity` | units | 0 – 1000 |
| 6 | `askQuantity` | units | 0 – 1000 |

Example: `[0, 10200, 30, 10197, 10200, 600, 400]` means instrument 0 traded 30 units at
$102.00 (the ask), with a bid of $101.97 × 600 and an ask of $102.00 × 400.

Instrument ids are indexes. The app maps them to symbols such as `ALFA` and `BETA`.

## Price model

For each update the generator:

1. Picks a random instrument.
2. Moves its bid by a random step of at most `1 + bid / 2000` cents (about ±0.05%) in either direction, clamped to $0.01 – $100,000.00.
3. Sets the ask to the bid plus a spread of 1 to `1 + bid / 5000` cents.
4. Picks the trade side at random: a buy trades at the ask, a sell at the bid.
5. Draws the trade quantity (1 – 100) and both book quantities (0 – 1000).

The new bid is stored, so the next update for that instrument starts from it.
All prices are integer cents; nothing is rounded inside the module.

## Using it in a worker

```ts
import { instantiate } from '../../../../wasm/build/market-generator.js'; // from src/app/core/workers

const module = await WebAssembly.compileStreaming(fetch(wasmUrl));
const generator = await instantiate(module, { env: {} });

generator.init(settings.instrumentCount, crypto.getRandomValues(new Uint32Array(1))[0]);
const batch = generator.generateBatch(settings.updatesPerBatch); // Int32Array, size × 7
```

`generateBatch()` returns a copy, so the array stays valid after later calls and can be
transferred with `postMessage(batch, [batch.buffer])`.

## Tests and coverage

The sources in `assembly/` use only constructs that also run as plain TypeScript. The
AssemblyScript "portable" runtime (`tests/setup-portable.ts`) supplies `i32()`, `u32()` and
the other built-ins. This allows two kinds of test runs:

- **Portable run:** the sources run in Node, so V8 can measure coverage. `wasm:coverage` requires 100% of statements, branches, functions and lines.
- **Compiled run:** the same behaviour suite runs against `build/market-generator.wasm`. A parity test checks that the Wasm output is identical to the portable output for the same seeds, so the coverage measured on the portable run applies to the shipped binary.

| Spec | Covers |
|---|---|
| `generator.wasm.spec.ts` | Full contract against the compiled module, plus Wasm ↔ portable parity |
| `generator.portable.spec.ts` | Full contract against the portable build |
| `market.spec.ts` | Price clamping, step and spread limits, state updates |
| `random.spec.ts` | xorshift32 sequence, seed handling, ranges |

The contract (`generator-contract.ts`) checks:
- input validation;
- exact batch sizes;
- every output invariant above;
- price continuity across calls;
- reset on re-init;
- determinism.

When changing `assembly/`, keep the code portable:
- use `i32()` / `u32()` casts around integer division;
- use `>>>` for unsigned shifts;
- avoid `StaticArray`, `load` / `store` and decorators.
