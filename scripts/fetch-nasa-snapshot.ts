import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type Row = Record<string, unknown>;
const day = (date: Date): string => date.toISOString().slice(0, 10);
const now = new Date();
const endDate = day(now);
const startDate = day(new Date(now.getTime() - 14 * 86_400_000));
const donkiBase = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get';
const radLabEnd = now.toISOString().slice(0, 16);
const radLabStart = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 16);
const radLabUrl = `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=${encodeURIComponent(radLabStart)}&timestamp%3C=${encodeURIComponent(radLabEnd)}&absorbed_dose_rate&format=json`;
const osdrUrl = 'https://osdr.nasa.gov/osdr/data/search?term=space%20biology&from=0&size=10';

const getJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return await response.json() as unknown;
};

const records = (value: unknown): Row[] => Array.isArray(value) ? value.filter((row): row is Row => typeof row === 'object' && row !== null) : [];
const dateFrom = (row: Row): string => [row.beginTime, row.startTime, row.eventTime].find((value): value is string => typeof value === 'string')?.slice(0, 10) || endDate;
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

const main = async (): Promise<void> => {
  const donkiUrls = ['FLR', 'CME', 'GST'].map((kind) => `${donkiBase}/${kind}?startDate=${startDate}&endDate=${endDate}`);
  const [flr, cme, gst, radLab, osdr] = await Promise.all([...donkiUrls.map(getJson), getJson(radLabUrl), getJson(osdrUrl)]);
  const groups = [['FLR', records(flr)], ['CME', records(cme)], ['GST', records(gst)]] as const;
  const eventCount = groups.reduce((total, [, entries]) => total + entries.length, 0);
  const [kind, entries] = groups.find(([, entries]) => entries.length > 0) ?? ['FLR', []];
  const event = entries[0];
  if (!event) throw new Error('No DONKI events were available for the snapshot window.');
  const classification = typeof event.classType === 'string' ? ` · ${event.classType}` : '';
  const identifier = ['flrID', 'activityID', 'gstID'].map((key) => event[key]).find((value): value is string => typeof value === 'string') || 'DONKI-event';
  const study = spaceStudy(osdr);
  const snapshot = {
    fetchedAt: now.toISOString(),
    sourceUrls: [...donkiUrls, radLabUrl, osdrUrl],
    weather: { severity: Math.min(3, Math.max(1, Math.ceil(eventCount / 3))), events: eventCount, eventClass: `${kind}${classification}`, eventDate: dateFrom(event), eventId: identifier },
    ...(radLabRate(radLab) ? { radiation: { doseRateUgPerHour: radLabRate(radLab)! } } : {}),
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
