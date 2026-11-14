# NASA Data Sources

Every item below is shown in the game with either `LIVE` or `ARCHIVED (date)`. A failed, rate-limited, timed-out, malformed, or empty request automatically uses the dated curated fallback in `src/data/fallback.ts`.

| Dataset | Endpoint | Drives |
| --- | --- | --- |
| DONKI solar flares (FLR), coronal mass ejections (CME), and geomagnetic storms (GST) | `https://api.nasa.gov/DONKI/{FLR,CME,GST}?startDate=...&endDate=...&api_key=DEMO_KEY` | Count of recent events sets the in-game solar-storm severity baseline. |
| OSDR RadLab | `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&absorbed_dose_rate&format=json` | Mean ISS absorbed dose rate calibrates radiation-dose accumulation. |
| NASA OSDR Search | `https://osdr.nasa.gov/osdr/data/search?term=spaceflight&from=0&size=1` | One end-of-mission Real NASA Science card. |

## Verification note

On 2026-11-13, this build sandbox could not make direct requests to the NASA endpoints. The implementation therefore follows NASA's public API documentation and validates defensively at runtime: DONKI is an array of event objects, RadLab rows expose `absorbed_dose_rate`, and OSDR search results expose a study title and accession. Integration calls that do not match these shapes are treated as failures and show the archived fallback label instead of pretending the value is live.

The default NASA key is `DEMO_KEY`. Add `VITE_NASA_API_KEY=your_key` to `.env.local` to use a personal key; that file is ignored by Git. Browser-session cache entries live for 30 minutes.
