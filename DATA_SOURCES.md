# Data Sources and References

NASA API-derived items below are shown in the game with either `LIVE` or `ARCHIVED (date)`. A failed, rate-limited, timed-out, malformed, or empty request automatically uses the dated curated fallback in `src/data/fallback.ts`.

| Resource | Endpoint or source | Drives | Status in build |
| --- | --- | --- | --- |
| NASA CCMC DONKI: solar flares (FLR), coronal mass ejections (CME), geomagnetic storms (GST) | `https://api.nasa.gov/DONKI/{FLR,CME,GST}?startDate=...&endDate=...&api_key=DEMO_KEY` | Recent event count and the displayed DONKI class/date drive Today’s Real Space Weather storm baseline. | Live when the request validates; otherwise dated archived fallback. |
| NASA OSDR RadLab | `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&absorbed_dose_rate&format=json` | Mean ISS absorbed dose rate calibrates radiation-dose accumulation. | Live when the request validates; otherwise dated archived fallback. |
| NASA OSDR Search | `https://osdr.nasa.gov/osdr/data/search?term=spaceflight&from=0&size=1` | End-of-mission Real NASA Science card. | Live when the request validates; otherwise dated archived fallback. |
| Canadian Space Agency food-production toolkit | `https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/` | Kid-readable greenhouse learning facts during allocation and debrief. | Reference snapshot accessed 2026-11-14. |

NASA Trek is not used in the final build. See `TERRAIN_MANUAL_DOWNLOAD.md` for verified manual-export notes; do not treat those notes as shipped terrain data.

## Verification note

On 2026-11-14, `npm run verify:nasa` reached the DONKI host but received HTTP 404 for the FLR route with `DEMO_KEY`; it therefore could not verify any real response shape. The data layer validates defensively at runtime: DONKI expects an array of event objects, RadLab rows expose `absorbed_dose_rate`, and OSDR search results expose a study title plus accession. A response that does not match is treated as a failure and shown as a dated archived fallback instead of pretending it is live.

The default NASA key is `DEMO_KEY`. Add `VITE_NASA_API_KEY=your_key` to `.env.local` to use a personal key; that file is ignored by Git. Browser-session cache entries live for 30 minutes.
