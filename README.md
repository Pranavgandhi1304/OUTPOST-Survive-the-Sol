# OUTPOST: Survive the Sol

A static browser game for the 2026 NASA Space Apps Challenge. Players aged 7–12 run a Moon outpost near Shackleton rim or a Mars outpost in Jezero crater. Over 30 sols, one shared power budget has to cover breathable air, radiation shielding, future food, and science.

## Run

```powershell
npm install
npm run dev
```

If PowerShell blocks `npm.ps1` on this Windows machine, use `cmd /c npm run dev` instead. Open the local Vite address printed in the terminal.

NASA data is fetched directly from public NASA endpoints. If a browser request is unavailable, the game uses only its shipped, dated NASA snapshot and hides cards without verified data.

## Test and build

```powershell
npm run test       # Vitest engine and data tests
npm run balance    # 1,000 simulations per strategy
npm run test:e2e   # Playwright desktop, mobile, console, and axe checks
npm run lint
npm run build
npm run check      # all checks above plus TypeScript
```

Install the Playwright browser once when needed:

```powershell
npx playwright install chromium chromium-headless-shell
```

## Deploy

### GitHub Pages (included)

1. Push this repository to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` or `master`, or run **Deploy OUTPOST to GitHub Pages** from the Actions tab.
4. The workflow installs browsers, runs `npm run check`, then deploys `dist/`. It automatically uses the repository path as Vite's base URL.

For any other static host, run `npm run build` and deploy the contents of `dist/`. No server configuration is needed.

## Design notes

- The dashboard deliberately has only three main meters: POWER, AIR, and SHIELDING.
- Food, crew health, dose, battery, and science are support values, so the player learns the central power trade-off without a crowded screen.
- A Mission Replay explains the final turn, event, and allocation split after any failure.
- NASA-derived cards always show `LIVE` or `ARCHIVED (date)`. See [DATA_SOURCES.md](DATA_SOURCES.md).
