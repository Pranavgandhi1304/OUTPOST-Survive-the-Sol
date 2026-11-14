# OUTPOST: Survive the Sol — Plan

## Architecture

- `src/engine`: a pure seeded turn simulator: power generation, allocation, events, meters, battery, effects, failure and replay data.
- `src/data`: NASA API clients, small local cache, data status labeling, and curated archived fallback records.
- `src/content`: child-friendly mission copy, tooltips, and NASA science-card content.
- `src/ui`: accessible React screens and a compact SVG dashboard; UI dispatches intent to the engine.
- `tests`: Vitest engine/data/balance coverage plus Playwright desktop/mobile/axe journeys.

## Game design

The player selects Shackleton rim (Moon) or Jezero (Mars), then makes one power split every sol for 30 sols. Life Support protects Air and health, Shielding limits radiation dose, Greenhouse slowly creates food, and Science/Comms earns science but leaves less power for survival. Solar availability varies by lunar day/night or Martian dust. A battery stores surplus and covers shortages. Seeded solar storms, dust storms, faults, and comms blackouts force trade-offs. Earth advice on Mars arrives after a 3–22 minute simulated delay.

The player wins by keeping their crew and outpost stable through sol 30. Failures present a Mission Replay that identifies the turn, event, and allocation trade-off that led to the result.

## Implementation steps

1. Bootstrap Vite/TypeScript tooling and test harnesses.
2. Build and test the pure simulation plus balance runner.
3. Build and test NASA data layer and fallback behavior.
4. Build accessible game UI and content.
5. Add Playwright and axe journeys, documentation, and final verification.
