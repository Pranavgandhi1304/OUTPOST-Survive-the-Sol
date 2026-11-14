# OUTPOST: Survive the Sol — Project Rules

## Working agreement

- Build a static, browser-only Vite + TypeScript game. Do not add a backend, login, tracking, or personal-data collection.
- Keep simulation rules in `src/engine`; UI code must not contain game math.
- Keep remote NASA access, caching, labels, and curated fallback data in `src/data`.
- Use plain language suitable for ages 7–12. Keep controls keyboard-operable, touch-friendly, and colorblind-safe.
- Every displayed NASA-derived value must state `LIVE` or `ARCHIVED (YYYY-MM-DD)`.
- Preserve deterministic seeded simulation behavior. Add or update tests for any simulation change.
- Avoid dependencies unless they directly support the stated checks or accessibility.

## Commands

```powershell
npm install
npm run dev
npm run test
npm run test:e2e
npm run balance
npm run lint
npm run build
npm run check
```

`npm run check` runs type-checking, linting, unit/data tests, balance simulation, Playwright E2E tests, accessibility checks, and the production build.

## Definition of done

- A player can complete or fail a deterministic 30-turn Moon or Mars mission using the shared power allocation mechanic.
- The game has exactly three main state meters: Power, Air, and Shielding; crew health, dose, food, battery, and score support those meters without becoming primary dashboard meters.
- NASA data has tested live/fallback behavior, response caching, and accurate status labels.
- Unit, data, balance, E2E, and axe tests are written and pass, together with TypeScript, ESLint, and production build checks.
- `README.md`, `PLAN.md`, `DATA_SOURCES.md`, `LEARNING_OBJECTIVES.md`, and `CHECKLIST.md` are current.
- Commit each completed implementation step with a clear message. Do not claim a check passed without its recorded command output.
