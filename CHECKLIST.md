# Delivery Checklist

| Requirement | Evidence |
| --- | --- |
| Vite + TypeScript static game | `package.json`, `vite.config.ts`, `src/main.ts` |
| Required source layout | `src/engine`, `src/data`, `src/ui` responsibilities are represented by `src/main.ts` and `src/styles.css`, `src/content` is embedded child-friendly content in `src/main.ts`; engine/data have dedicated folders |
| 30-turn Moon or Mars mission | `src/engine/game.ts`, `src/main.ts` |
| One power budget and three visible meters | `src/engine/game.ts`, SVG meters in `src/main.ts` |
| Air, radiation, greenhouse, science trade-offs | `src/engine/game.ts`, `tests/engine.test.ts` |
| Solar, lunar night/dust, battery, Mars delay | `solarForTurn`, `missionAdviceDelay`, engine tests |
| Seeded solar storm, dust, fault, blackout | `eventFor`, event-effect test |
| Mission Replay | `src/main.ts` debrief screen |
| DONKI, RadLab, OSDR with labels/cache/fallback | `src/data/nasa.ts`, `src/data/fallback.ts`, `DATA_SOURCES.md` |
| NASA endpoint response verification note | `DATA_SOURCES.md` |
| Engine unit coverage | `tests/engine.test.ts` |
| No-free-choice test | `ALLOCATION_OPTIONS` and final engine test |
| 1,000-game balance assertions/table | `scripts/balance.ts` |
| Mocked data success/failure fallback tests | `tests/data.test.ts` |
| Desktop/mobile full-mission E2E | `tests/e2e/mission.spec.ts` |
| Console and axe checks on every screen | `tests/e2e/mission.spec.ts` |
| npm scripts and all-in-one check | `package.json` |
| Run, test, deploy instructions | `README.md` |
| Grade 4–5 learning goals | `LEARNING_OBJECTIVES.md` |
