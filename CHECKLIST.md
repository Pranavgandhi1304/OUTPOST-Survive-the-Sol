# Delivery Checklist

| Requirement | Evidence |
| --- | --- |
| Vite + TypeScript static game | `package.json`, `vite.config.ts`, `src/main.ts` |
| Required source layout | `src/engine`, `src/data`, `src/ui`, `src/content`, and `tests/` |
| 30-turn Moon or Mars mission | `src/engine/game.ts`, `src/main.ts` |
| One power budget and three visible meters | `src/engine/game.ts`, SVG meters in `src/main.ts` |
| Air, radiation, greenhouse, science trade-offs | `src/engine/game.ts`, `tests/engine.test.ts` |
| Solar, lunar night/dust, battery, Mars delay | `solarForTurn`, `missionAdviceDelay`, engine tests |
| Seeded solar storm, dust, fault, blackout | `eventFor`, event-effect test |
| Animated state-aware outpost scene | `src/ui/outpostScene.ts`, `src/styles.css`; includes power lights, shield dome, greenhouse plants, dust, and reduced-motion support |
| Mission Replay | Causal five-sol timeline in `src/main.ts` and `.replay-timeline` styles |
| DONKI, RadLab, OSDR with labels/cache/fallback | `src/data/nasa.ts`, `src/data/fallback.ts`, `DATA_SOURCES.md` |
| Real NASA Space Weather difficulty | DONKI event class/date panel and Today’s mode in `src/main.ts`, `src/data/nasa.ts` |
| Real endpoint response verifier | `scripts/verify-nasa.ts`, run with `npm run verify:nasa`; does not use mocks |
| Engine unit coverage | `tests/engine.test.ts` |
| No-free-choice test | `ALLOCATION_OPTIONS` and final engine test |
| 1,000-game balance assertions/table | `scripts/balance.ts`: balanced 75–85%; random <20%; greedy-science <25%; all-safety/do-nothing 0% |
| Mocked data success/failure fallback tests | `tests/data.test.ts` |
| Desktop/mobile full-mission E2E | `tests/e2e/mission.spec.ts` |
| Console and axe checks on every screen | `tests/e2e/mission.spec.ts`: tutorial, classroom, landing, mission, and debrief |
| npm scripts and all-in-one check | `package.json` |
| Run, test, deploy instructions | `README.md` |
| Grade 4–5 learning goals | `LEARNING_OBJECTIVES.md` |
| First-time tutorial | `src/content/tutorial.ts`, `src/main.ts`, and E2E tutorial coverage |
| Classroom / parent discussion mode | `src/content/tutorial.ts`, `src/main.ts`, and axe coverage |
| GitHub Pages deployment | `.github/workflows/deploy-pages.yml` and `README.md` |
