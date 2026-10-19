# Recall

**Memorise. Shuffle. Recreate.**

Recall is a minimalist daily browser-based memory and tile-swapping puzzle game built with TypeScript, React, Vite, Tailwind CSS, and Motion.

---

## 1. Product Concept & Game Rules

Every UTC day (`00:00 UTC` rollover), all players receive the same three progressively challenging rounds:

| Property                   | Round 1 | Round 2 | Round 3 |
| -------------------------- | ------- | ------- | ------- |
| **Difficulty**             | Easy    | Medium  | Hard    |
| **Tile count**             | 4       | 6       | 8       |
| **Board layout**           | 2 × 2   | 3 × 2   | 4 × 2   |
| **Memorisation period**    | 8s      | 10s     | 15s     |
| **Recreation period**      | 20s     | 30s     | 45s     |
| **Minimum required swaps** | 2       | 3–4     | 5–6     |
| **Base points**            | 100     | 150     | 200     |

1. **Memorise:** Observe the target arrangement of coloured tiles before the countdown ends.
2. **Shuffle:** The board conceals briefly and reveals a deterministic shuffled arrangement.
3. **Recreate:** Tap (or press `Enter`/`Space` on) two tiles to swap their positions. Once the arrangement matches the original target, the round automatically completes.
4. **Progression:** A failed round awards `0` points for that round but never blocks the remaining rounds of the daily challenge.

---

## 2. Technology Stack

- **Language:** TypeScript (strict mode)
- **UI Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4 + centralised CSS custom properties (`src/styles/tokens.css`)
- **Animation:** Motion for React (`motion/react`)
- **Icons:** Lucide React
- **Persistence:** Validated browser `localStorage` with in-memory fallback
- **Unit & Integration Testing:** Vitest + React Testing Library + jsdom
- **End-to-End Browser Testing:** Playwright

---

## 3. Prerequisites & Local Installation

- **Node.js:** v20.19+ or v22+
- **Package Manager:** `npm`

```bash
# Install dependencies
npm install

# Start the local development server
npm run dev
```

---

## 4. Available Project Scripts

| Command                | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`          | Starts the Vite development server                                               |
| `npm run build`        | Runs TypeScript checks (`tsc -b`) and builds the production bundle into `dist/`  |
| `npm run preview`      | Serves the production build locally                                              |
| `npm run typecheck`    | Runs `tsc --noEmit` to verify TypeScript types                                   |
| `npm run lint`         | Runs ESLint across all TypeScript and React files                                |
| `npm run format`       | Formats source files and documentation using Prettier                            |
| `npm run format:check` | Verifies code formatting without modifying files                                 |
| `npm run test`         | Executes the Vitest unit and integration test suites                             |
| `npm run test:watch`   | Runs Vitest in interactive watch mode                                            |
| `npm run test:e2e`     | Executes Playwright end-to-end browser tests across desktop and mobile viewports |

---

## 5. Architecture Overview

The codebase enforces a strict separation between the **pure game engine** (`src/game/`) and the **React presentation layer** (`src/components/`, `src/screens/`, `src/hooks/`):

```text
src/
├── app/
│   ├── App.tsx              # Root screen router, modal manager, and live ARIA announcer
│   └── AppProviders.tsx     # Top-level provider wrapper
├── components/
│   ├── Countdown.tsx        # Isolated high-frequency timer display & progress bar
│   ├── GameBoard.tsx        # Responsive CSS Grid board preserving square geometry
│   ├── PrimaryButton.tsx    # Tactile 52px button component
│   ├── RoundHeader.tsx      # Brand header, round badge, and quick actions
│   ├── ScoreCard.tsx        # Per-round score breakdown card
│   ├── SettingsModal.tsx    # Accessibility & audio preferences dialog
│   ├── Tile.tsx             # Accessible, layout-animated square tile button
│   └── TileSymbol.tsx       # Geometric SVG overlay icons for colour-independent play
├── game/
│   ├── board.ts             # Pure tile swap and win-detection functions
│   ├── config.ts            # Centralised round parameters, palette, and schema versions
│   ├── dailyChallenge.ts    # UTC date conventions, challenge numbering, and streak math
│   ├── permutation.ts       # Cycle-decomposition minimum-swap calculator & generator
│   ├── puzzleGenerator.ts   # Deterministic daily seed & puzzle generator
│   ├── scoring.ts           # Pure round & daily scoring calculations
│   ├── seededRandom.ts      # 32-bit deterministic cyrb128 hash + sfc32 PRNG
│   ├── stateMachine.ts      # Finite state machine transitions & clock reconciliation
│   └── types.ts             # Core TypeScript domain contracts
├── hooks/
│   ├── useCountdown.ts      # Monotonic + epoch deadline timer hook
│   ├── useGameSession.ts    # Session state, persistence, and audio/ARIA orchestration
│   └── usePreferences.ts    # Persisted settings and prefers-reduced-motion detection
├── screens/
│   ├── HomeScreen.tsx
│   ├── TutorialScreen.tsx
│   ├── MemoriseScreen.tsx
│   ├── RecreateScreen.tsx
│   ├── RoundResultScreen.tsx
│   ├── IntermissionScreen.tsx
│   └── ResultsScreen.tsx
└── services/
    ├── audio.ts             # Web Audio synthesizer and optional haptics
    ├── sharing.ts           # Spoiler-free result formatter and Web Share / Clipboard service
    └── storage.ts           # Schema-validated localStorage persistence & daily lock
```

---

## 6. Key Engineering Methodologies

### 6.1 Deterministic Puzzle Generation & Cycle Decomposition (`src/game/permutation.ts`)

- Each round seed is constructed canonically as:
  `recall|<YYYY-MM-DD>|<puzzleVersion>|round-<roundId>`
- The seed is hashed with `cyrb128` into four 32-bit state words driving an `sfc32` pseudo-random number generator (`src/game/seededRandom.ts`).
- By Cayley's theorem on permutation cycles, the minimum number of arbitrary two-tile swaps required to restore a permutation of $N$ elements with $C$ disjoint cycles is:
  $$\text{Minimum Swaps} = N - C$$
- Rather than relying on rejection-sampling retry loops, `constructPermutationWithExactSwaps` deterministically partitions the $N$ positions into $C = N - k$ cycles of length $\ge 2$ (complete derangements, so no tile starts in its target slot) and validates the resulting board with `validatePuzzlePermutation`.

### 6.2 Deadline-Based Timing Architecture (`src/hooks/useCountdown.ts`)

- Active phase timers never decrement a counter via `setInterval`.
- When a timed phase begins, `phaseDeadlineEpochMs` (`Date.now() + durationMs`) is persisted to `localStorage`, and an active monotonic reference (`performance.now() + remainingMs`) drives `requestAnimationFrame` updates inside the isolated `Countdown` component.
- On tab `visibilitychange`, window `focus`, or page reload, `reconcileSessionWithClock` (`src/game/stateMachine.ts`) compares `Date.now()` against `phaseDeadlineEpochMs`. Backgrounding or refreshing never resets a timer or grants extra memorisation/recreation time.
- Every attempted swap in `performTileSwap` verifies `eventEpochMs < phaseDeadlineEpochMs` before mutating the board.

### 6.3 Scoring Formula (`src/game/scoring.ts`)

For a solved round:
$$\text{Round Score} = \max\bigl(0,\ \text{Base Points} + \lfloor \text{remainingMs} / 1000 \rfloor \times 2 - \max(0,\ \text{actualSwaps} - \text{optimalSwaps}) \times 10\bigr)$$

- Base points: Round 1 = `100`, Round 2 = `150`, Round 3 = `200`.
- Theoretical maximum daily score: `640` points.
- Timed-out rounds always receive `0` points.

### 6.4 Storage Validation & Daily Locking (`src/services/storage.ts`)

- All data loaded from `localStorage` is validated against `STORAGE_SCHEMA_VERSION` and checked for structural and permutation integrity before use.
- Once all three rounds of a UTC challenge date have resolved, the result is recorded in `PlayerStats.history[challengeId]` and subsequent visits on that UTC date lock directly to the completed `ResultsScreen`.

---

## 7. Deployment

Recall is a static single-page application ready for deployment on **Vercel** or **Cloudflare Pages**:

1. **Build command:** `npm run build`
2. **Output directory:** `dist`
3. **Security headers:** `vercel.json` configures a strict `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy`.

---

## 8. Known MVP Limitations & Future Expansion

- **Client-Side Casual Integrity:** Because the MVP is a serverless client-side application storing state in `localStorage`, scores and streaks are bound to the local browser profile and are not tamper-proof against deliberate DevTools manipulation. Server-side validation is required before introducing public global leaderboards.
- **Planned Expansions:** Unlimited practice mode, historical daily archive, cross-device account sync, and PWA offline caching.
  "# Recall"
