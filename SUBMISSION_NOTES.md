# OUTPOST: Survive the Sol — Submission Notes

## NASA Data

- **NASA CCMC DONKI** (FLR, CME, GST): used for the displayed space-weather class/date and Today’s Real Space Weather storm baseline. A browser-validated request is `LIVE`; otherwise the game uses the real dated DONKI record in `public/data/nasa-snapshot.json`, badged `NASA data fetched 2026-11-14`.
- **NASA OSDR RadLab**: used to calibrate in-game crew radiation-dose accumulation in µGy/h. Browser success is `LIVE`; the current snapshot has no seven-day RadLab row, so this source uses its dated fallback when the browser request fails.
- **NASA OSDR Search**: used for the linked Real NASA Science card at mission end. Browser success is `LIVE`; otherwise the card comes from the dated 2026-11-14 snapshot.

## Space Agency Partner Data and Other References

- **Canadian Space Agency (CSA) food-production toolkit**: used for original, child-readable greenhouse facts. The facts are a reference snapshot accessed 2026-11-14 and link back to CSA sources in the game.

## Not used in the final build

- NASA Trek terrain data is not shipped or rendered. The game has a 2D animated SVG outpost scene rather than a 3D mesh. `TERRAIN_MANUAL_DOWNLOAD.md` is a future-work manual export guide only.

## Visual identity

The build does not include NASA logos, agency patches, national flags, or other official visual marks.
