# Data Sources and References

NASA API-derived items below are shown as `LIVE` only after a successful browser fetch. Otherwise, the game first uses the shipped `NASA data fetched YYYY-MM-DD` snapshot, then a dated `ARCHIVED (date)` fallback when that source is unavailable.

| Resource | Endpoint or source | Drives | Status in build |
| --- | --- | --- | --- |
| NASA CCMC DONKI: solar flares (FLR), coronal mass ejections (CME), geomagnetic storms (GST) | `https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,CME,GST}?startDate=...&endDate=...` (14-day browser window; API supports up to 30 days) | Recent event count plus a displayed class/date drive Today’s Real Space Weather storm baseline. | `LIVE` after browser validation; otherwise `NASA data fetched 2026-11-14` from `public/data/nasa-snapshot.json`; then generic dated fallback. |
| NASA OSDR RadLab | `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp>=...&timestamp<=...&absorbed_dose_rate&format=json` (last 7 days) | Mean ISS absorbed dose rate in µGy/h calibrates radiation-dose accumulation. | `LIVE` after browser validation; otherwise snapshot if one contains a recent reading; then dated fallback. The shipped snapshot has no current RadLab reading because its real seven-day `data` array was empty. |
| NASA OSDR Search | `https://osdr.nasa.gov/osdr/data/search?term=space%20biology&from=0&size=10` | End-of-mission Real NASA Science card; parser reads `hits.hits[]._source` and filters for spaceflight studies. | `LIVE` after browser validation; otherwise `NASA data fetched 2026-11-14` science card from the shipped snapshot; then dated fallback. |
| Canadian Space Agency food-production toolkit | `https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/` | Kid-readable greenhouse learning facts during allocation and debrief. | Reference snapshot accessed 2026-11-14. |

NASA Trek is not used in the final build. See `TERRAIN_MANUAL_DOWNLOAD.md` for verified manual-export notes; do not treat those notes as shipped terrain data.

## Verification note

On 2026-11-14, `npm run verify:nasa` verified real shapes: DONKI FLR/CME/GST are JSON arrays; RadLab returned a tabular object with `columns`, `index`, and `data`; OSDR search returned `hits.hits[]._source` with `Study Title` and `Accession`. The RadLab window contained no rows, which is valid and falls back without inventing a live dose rate. A response that does not match is treated as a failure and is never labelled `LIVE`.

Run `npm run fetch:nasa-snapshot` to refresh the shipped snapshot deliberately. Browser-session cache entries live for 30 minutes.
