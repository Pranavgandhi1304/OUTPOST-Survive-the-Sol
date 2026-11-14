# Data Sources and References

NASA API-derived cards are labelled `LIVE` only after a successful browser request. If that request is unavailable, the game uses the matching value from the shipped, dated NASA snapshot. A card is hidden when neither source provides verified data; there are no hand-written weather, radiation, or science records.

| Resource | Endpoint or source | Drives | Status in build |
| --- | --- | --- | --- |
| NASA CCMC DONKI: solar flares (FLR), coronal mass ejections (CME), geomagnetic storms (GST) | `https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,CME,GST}?startDate=...&endDate=...` (14-day browser window) | The strongest event in the window sets the Today-mode baseline and displayed class/date. Flare A/B/C = level 1, M = level 2, X = level 3; CME speed is the secondary signal. | `LIVE` after validation, otherwise the matching value in `public/data/nasa-snapshot.json`, badged `NASA data fetched YYYY-MM-DD`. |
| NASA OSDR RadLab | `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp>=2022-04-01T23:00&timestamp<=2022-04-02T01:05&absorbed_dose_rate&format=json` | Mean ISS absorbed dose rate in µGy/h calibrates radiation accumulation. The UI labels the verified reading with its returned date. | `LIVE` after validation, otherwise the matching historical ISS reading in the dated snapshot. |
| NASA OSDR Search | `https://osdr.nasa.gov/osdr/data/search?term=space%20biology&from=0&size=10` | End-of-mission Real NASA Science card; parser reads `hits.hits[]._source` and filters for spaceflight studies. | `LIVE` after validation, otherwise the matching card in the dated snapshot. |
| Canadian Space Agency food-production toolkit | `https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/` | Kid-readable greenhouse learning facts during allocation and debrief. | Reference snapshot accessed 2026-11-14. |

NASA Trek is not used in the final build. See `TERRAIN_MANUAL_DOWNLOAD.md` for verified manual-export notes; do not treat those notes as shipped terrain data.

## Verification note

On 2026-11-14, `npm run verify:nasa` verified the expected response shapes: DONKI FLR/CME/GST are JSON arrays; RadLab returns a tabular object with `columns`, `index`, and `data`; OSDR search returns `hits.hits[]._source` with `Study Title` and `Accession`. Invalid, empty, or unavailable responses never receive a `LIVE` label.

Run `npm run fetch:nasa-snapshot` to refresh the shipped snapshot deliberately. Browser-session cache entries live for 30 minutes.
