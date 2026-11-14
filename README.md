# OUTPOST: Survive the Sol

A static browser game for the 2026 NASA Space Apps Challenge. Players aged 7–12 run a Moon outpost near Shackleton rim or a Mars outpost in Jezero crater. Over 30 sols, one shared power budget has to cover breathable air, radiation shielding, future food, and science.

## Run

```powershell
npm install
npm run dev
```

If PowerShell blocks `npm.ps1` on this Windows machine, use `cmd /c npm run dev` instead. Open the local Vite address printed in the terminal.

To use a personal NASA API key, create `.env.local`:

```text
VITE_NASA_API_KEY=your_key_here
```

The app defaults to NASA's `DEMO_KEY`; API failures use clearly dated archived records.

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

Run `npm run build`, then deploy the contents of `dist/` to any static host (GitHub Pages, Netlify, Cloudflare Pages, or similar). No server configuration is needed. For GitHub Pages under a project path, set Vite's `base` option before building.

## Design notes

- The dashboard deliberately has only three main meters: POWER, AIR, and SHIELDING.
- Food, crew health, dose, battery, and science are support values, so the player learns the central power trade-off without a crowded screen.
- A Mission Replay explains the final turn, event, and allocation split after any failure.
- NASA-derived cards always show `LIVE` or `ARCHIVED (date)`. See [DATA_SOURCES.md](DATA_SOURCES.md).
