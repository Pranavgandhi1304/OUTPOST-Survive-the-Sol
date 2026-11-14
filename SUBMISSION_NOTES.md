# OUTPOST: Survive the Sol — Submission Notes

## NASA Data

- **NASA CCMC DONKI** (FLR, CME, GST): shows the strongest verified event in a recent 14-day window. Flare class maps A/B/C to level 1, M to level 2, and X to level 3; CME speed is used when it is the strongest event. That event sets Today-mode storm difficulty. Browser data is `LIVE`; otherwise the verified, dated snapshot is used.
- **NASA OSDR RadLab**: queries ISS DosTel absorbed-dose-rate data from 2022-04-01T23:00 through 2022-04-02T01:05. Its real mean in µGy/h is stored in the dated snapshot, shown as `ISS reading from <date>`, and converted into the gameplay multiplier using the same units.
- **NASA OSDR Search**: provides the linked Real NASA Science card at mission end. Browser data is `LIVE`; otherwise the dated snapshot card is used.
- If a live request and its matching snapshot entry are both unavailable or invalid, the card is omitted. The project ships no hand-written NASA records.

## Replayable gameplay

- Every new game uses a random seed, shown as a stable Mission Code for replaying a run.
- Add `?seed=N` to replay seed `N`; `?demo=1` selects a fixed recording seed.
- The next sol’s event is forecast before allocation. Moon day/night power makes battery charging part of a winning plan.

## Space Agency Partner Data and Other References

- **Canadian Space Agency (CSA) food-production toolkit**: used for original, child-readable greenhouse facts. The facts are a reference snapshot accessed 2026-11-14 and link back to CSA sources in the game.

## Not used in the final build

- NASA Trek terrain data is not shipped or rendered. The game has a 2D animated SVG outpost scene rather than a 3D mesh. `TERRAIN_MANUAL_DOWNLOAD.md` is a future-work manual export guide only.

## Visual identity

The build does not include NASA logos, agency patches, national flags, or other official visual marks.
