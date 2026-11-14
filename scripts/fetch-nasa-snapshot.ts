import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type Row = Record<string, unknown>;
const day = (date: Date): string => date.toISOString().slice(0, 10);
const now = new Date();
const endDate = day(now);
const startDate = day(new Date(now.getTime() - 14 * 86_400_000));
const donkiBase = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get';
const radLabStart = '2022-04-01T23:00';
const radLabEnd = '2022-04-02T01:05';
const radLabUrl = `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=${encodeURIComponent(radLabStart)}&timestamp%3C=${encodeURIComponent(radLabEnd)}&absorbed_dose_rate&format=json`;
const osdrUrl = 'https://osdr.nasa.gov/osdr/data/search?term=space%20biology&from=0&size=10';

const getJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return await response.json() as unknown;
};

const records = (value: unknown): Row[] => Array.isArray(value) ? value.filter((row): row is Row => typeof row === 'object' && row !== null) : [];
const dateFrom = (row: Row): string => [row.beginTime, row.startTime, row.eventTime, row.time21_5].find((value): value is string => typeof value === 'string')?.slice(0, 10) || endDate;
const flareSeverity = (classType: string): number => ({ A: 1, B: 1, C: 1, M: 2, X: 3 })[classType.trim().charAt(0).toUpperCase()] ?? 1;
const cmeSpeed = (row: Row): number | undefined => {
  const analyses = Array.isArray(row.cmeAnalyses) ? row.cmeAnalyses : [];
  const speeds = [Number(row.speed), ...analyses.map((analysis) => typeof analysis === 'object' && analysis !== null ? Number((analysis as Row).speed) : Number.NaN)].filter((speed) => Number.isFinite(speed) && speed > 0);
  return speeds.length ? Math.max(...speeds) : undefined;
};
const cmeSeverity = (speed: number): number => speed >= 1_500 ? 3 : speed >= 800 ? 2 : 1;
const spaceStudy = (value: unknown): Row | undefined => {
  const hits = typeof value === 'object' && value !== null ? (value as { hits?: { hits?: unknown } }).hits?.hits : undefined;
  if (!Array.isArray(hits)) return undefined;
  return hits.map((hit) => (typeof hit === 'object' && hit !== null ? (hit as { _source?: unknown })._source : undefined)).filter((source): source is Row => typeof source === 'object' && source !== null).find((study) => {
    const title = typeof study['Study Title'] === 'string' ? study['Study Title'] : '';
    const program = typeof study['Space Program'] === 'string' ? study['Space Program'] : '';
    return /space|microgravity|\biss\b|flight/i.test(`${title} ${program}`);
  });
};

const radLabRate = (value: unknown): number | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const table = value as { columns?: unknown; data?: unknown };
  if (!Array.isArray(table.columns) || !Array.isArray(table.data)) return undefined;
  const rateIndex = table.columns.indexOf('absorbed_dose_rate');
  if (rateIndex < 0) return undefined;
  const rates = table.data.map((row) => Array.isArray(row) ? Number(row[rateIndex]) : Number.NaN).filter((rate) => Number.isFinite(rate) && rate > 0);
  return rates.length ? rates.reduce((total, rate) => total + rate, 0) / rates.length : undefined;
};

const radLabDate = (value: unknown): string => {
  if (typeof value !== 'object' || value === null) return `${radLabStart.slice(0, 10)} to ${radLabEnd.slice(0, 10)}`;
  const table = value as { columns?: unknown; data?: unknown };
  if (!Array.isArray(table.columns) || !Array.isArray(table.data)) return `${radLabStart.slice(0, 10)} to ${radLabEnd.slice(0, 10)}`;
  const timestampIndex = table.columns.indexOf('timestamp');
  if (timestampIndex < 0) return `${radLabStart.slice(0, 10)} to ${radLabEnd.slice(0, 10)}`;
  const dates = [...new Set(table.data.map((row) => Array.isArray(row) && typeof row[timestampIndex] === 'string' ? row[timestampIndex].slice(0, 10) : undefined).filter((date): date is string => Boolean(date)))].sort();
  return dates.length === 1 ? dates[0] : dates.length > 1 ? `${dates[0]} to ${dates.at(-1)}` : `${radLabStart.slice(0, 10)} to ${radLabEnd.slice(0, 10)}`;
};

const main = async (): Promise<void> => {
  const donkiUrls = ['FLR', 'CME', 'GST'].map((kind) => `${donkiBase}/${kind}?startDate=${startDate}&endDate=${endDate}`);
  const [flr, cme, gst, radLab, osdr] = await Promise.all([...donkiUrls.map(getJson), getJson(radLabUrl), getJson(osdrUrl)]);
  const groups = [['FLR', records(flr)], ['CME', records(cme)], ['GST', records(gst)]] as const;
  const eventCount = groups.reduce((total, [, entries]) => total + entries.length, 0);
  const candidates = [
    ...groups[0][1].map((event) => { const classType = typeof event.classType === 'string' ? event.classType : 'A'; return { event, severity: flareSeverity(classType), eventClass: `FLR · ${classType}` }; }),
    ...groups[1][1].map((event) => { const speed = cmeSpeed(event); return { event, severity: speed === undefined ? 1 : cmeSeverity(speed), eventClass: speed === undefined ? 'CME' : `CME · ${Math.round(speed)} km/s` }; }),
    ...groups[2][1].map((event) => ({ event, severity: 1, eventClass: 'GST' })),
  ];
  const strongest = candidates.reduce((best, candidate) => candidate.severity > best.severity ? candidate : best, candidates[0]);
  if (!strongest) throw new Error('No DONKI events were available for the snapshot window.');
  const identifier = ['flrID', 'activityID', 'gstID'].map((key) => strongest.event[key]).find((value): value is string => typeof value === 'string') || 'DONKI-event';
  const study = spaceStudy(osdr);
  const snapshot = {
    fetchedAt: now.toISOString(),
    sourceUrls: [...donkiUrls, radLabUrl, osdrUrl],
    weather: { severity: strongest.severity, events: eventCount, eventClass: strongest.eventClass, eventDate: dateFrom(strongest.event), eventId: identifier },
    ...(radLabRate(radLab) ? { radiation: { doseRateUgPerHour: radLabRate(radLab)!, readingDate: radLabDate(radLab) } } : {}),
    ...(study && typeof study['Study Title'] === 'string' && typeof study.Accession === 'string' ? { science: { title: study['Study Title'], studyId: study.Accession, description: 'A NASA OSDR space-biology study preserved in this dated snapshot.', url: `https://osdr.nasa.gov/bio/repo/data/studies/${study.Accession}` } } : {}),
  };
  const directory = join(process.cwd(), 'public', 'data');
  await mkdir(directory, { recursive: true });
  const target = join(directory, 'nasa-snapshot.json');
  await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${target}`);
  console.log(`Snapshot weather: ${snapshot.weather.eventClass} on ${snapshot.weather.eventDate} (${snapshot.weather.eventId})`);
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
