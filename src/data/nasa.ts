import { archivedRadiation, archivedScience, archivedWeather } from './fallback';
import { dataFromSnapshot, isSnapshot } from './snapshot';
import type { NasaDataBundle, RadiationReading, ScienceCard, SpaceWeather } from './types';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const CACHE_PREFIX = 'outpost:nasa:';
const CACHE_MS = 30 * 60 * 1000;
const dateOnly = (date: Date): string => date.toISOString().slice(0, 10);
export const snapshotUrl = (): string => `${import.meta.env.BASE_URL}data/nasa-snapshot.json`;

const cachedJson = async <T>(key: string, url: string, fetcher: FetchLike, timeoutMs = 6_000): Promise<T> => {
  const storage = typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  const cached = storage?.getItem(CACHE_PREFIX + key);
  if (cached) {
    const parsed = JSON.parse(cached) as { savedAt: number; data: T };
    if (Date.now() - parsed.savedAt < CACHE_MS) return parsed.data;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`NASA request failed (${response.status})`);
    const data = (await response.json()) as T;
    storage?.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
    return data;
  } finally {
    clearTimeout(timer);
  }
};

const asArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null);
  if (typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data)) return asArray((value as { data: unknown }).data);
  throw new Error('Unexpected NASA response shape');
};

const asOsdrStudies = (value: unknown): Record<string, unknown>[] => {
  if (typeof value !== 'object' || value === null) throw new Error('Unexpected OSDR response shape');
  const hits = (value as { hits?: { hits?: unknown } }).hits?.hits;
  if (!Array.isArray(hits)) throw new Error('Unexpected OSDR hits response shape');
  return hits.map((hit) => (typeof hit === 'object' && hit !== null ? (hit as { _source?: unknown })._source : undefined)).filter((source): source is Record<string, unknown> => typeof source === 'object' && source !== null);
};

const asRadLabRows = (value: unknown): Record<string, unknown>[] => {
  if (typeof value === 'object' && value !== null) {
    const table = value as { columns?: unknown; data?: unknown };
    if (Array.isArray(table.columns) && table.columns.every((column): column is string => typeof column === 'string') && Array.isArray(table.data)) {
      const columns = table.columns as string[];
      const data = table.data as unknown[];
      return data.map((row) => Array.isArray(row) ? Object.fromEntries(columns.map((column, index) => [column, row[index]])) : row).filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null);
    }
  }
  return asArray(value);
};

const isSpaceflightStudy = (study: Record<string, unknown>): boolean => {
  const title = typeof study['Study Title'] === 'string' ? study['Study Title'] : '';
  const program = typeof study['Space Program'] === 'string' ? study['Space Program'] : '';
  const flight = typeof study['Flight Program'] === 'string' ? study['Flight Program'] : '';
  return /space|microgravity|\biss\b|flight/i.test(`${title} ${program} ${flight}`);
};

const eventDate = (record: Record<string, unknown>, fallback: string): string => {
  const raw = [record.beginTime, record.startTime, record.eventTime, record.time21_5].find((value): value is string => typeof value === 'string');
  return raw?.slice(0, 10) || fallback;
};

export const getSpaceWeather = async (fetcher: FetchLike = fetch, now = new Date()): Promise<SpaceWeather> => {
  try {
    const end = dateOnly(now);
    const start = dateOnly(new Date(now.getTime() - 14 * 86_400_000));
    const base = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get';
    const [flares, cmes, storms] = await Promise.all(['FLR', 'CME', 'GST'].map((kind) => cachedJson<unknown>(`donki-${kind}-${end}`, `${base}/${kind}?startDate=${start}&endDate=${end}`, fetcher)));
    const grouped = [['FLR', asArray(flares)], ['CME', asArray(cmes)], ['GST', asArray(storms)]] as const;
    const count = grouped.reduce((total, [, records]) => total + records.length, 0);
    if (count === 0) throw new Error('No recent DONKI events');
    const [kind, records] = grouped.find(([, entries]) => entries.length > 0)!;
    const record = records[0];
    const classification = typeof record.classType === 'string' ? ` · ${record.classType}` : '';
    const eventId = ['flrID', 'activityID', 'gstID'].map((key) => record[key]).find((value): value is string => typeof value === 'string');
    return { severity: Math.min(3, Math.max(1, Math.ceil(count / 3))), events: count, eventClass: `${kind}${classification}`, eventDate: eventDate(record, end), eventId, badge: 'LIVE', source: 'NASA CCMC DONKI FLR, CME, and GST events from the last 14 days.' };
  } catch {
    return archivedWeather;
  }
};

export const getRadiation = async (fetcher: FetchLike = fetch, now = new Date()): Promise<RadiationReading> => {
  try {
    const end = now.toISOString().slice(0, 16);
    const start = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 16);
    const url = `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=${encodeURIComponent(start)}&timestamp%3C=${encodeURIComponent(end)}&absorbed_dose_rate&format=json`;
    const response = await cachedJson<unknown>(`radlab-iss-${end.slice(0, 10)}`, url, fetcher);
    const rows = asRadLabRows(response);
    const rates = rows.map((row) => Number(row.absorbed_dose_rate)).filter((rate) => Number.isFinite(rate) && rate > 0);
    if (rates.length === 0) throw new Error('No dose rates');
    return { doseRateUgPerHour: rates.reduce((total, rate) => total + rate, 0) / rates.length, unit: 'µGy/h', badge: 'LIVE', source: 'NASA OSDR RadLab ISS absorbed dose-rate readings (µGy/h).' };
  } catch {
    return archivedRadiation;
  }
};

export const getScienceCard = async (fetcher: FetchLike = fetch): Promise<ScienceCard> => {
  try {
    const response = await cachedJson<unknown>('osdr-space-biology', 'https://osdr.nasa.gov/osdr/data/search?term=space%20biology&from=0&size=10', fetcher);
    const first = asOsdrStudies(response).find(isSpaceflightStudy);
    if (!first) throw new Error('No spaceflight OSDR study');
    const title = typeof first['Study Title'] === 'string' ? first['Study Title'] : undefined;
    const id = typeof first.Accession === 'string' ? first.Accession : undefined;
    if (!title || !id) throw new Error('No usable OSDR study');
    return { title, description: 'A current NASA space-biology study found through OSDR.', studyId: id, badge: 'LIVE', url: `https://osdr.nasa.gov/bio/repo/data/studies/${id}` };
  } catch {
    return archivedScience;
  }
};

export const loadNasaData = async (fetcher: FetchLike = fetch): Promise<NasaDataBundle> => {
  const fallback: NasaDataBundle = { weather: archivedWeather, radiation: archivedRadiation, science: archivedScience };
  let snapshotData: NasaDataBundle | undefined;
  try {
    const response = await fetcher(snapshotUrl());
    if (response.ok) {
      const snapshot = await response.json() as unknown;
      if (isSnapshot(snapshot)) snapshotData = dataFromSnapshot(snapshot, fallback);
    }
  } catch {
    // A bundled snapshot is optional; individual source fallbacks remain available.
  }
  const [weather, radiation, science] = await Promise.all([getSpaceWeather(fetcher), getRadiation(fetcher), getScienceCard(fetcher)]);
  return {
    weather: weather.badge === 'LIVE' ? weather : snapshotData?.weather ?? weather,
    radiation: radiation.badge === 'LIVE' ? radiation : snapshotData?.radiation ?? radiation,
    science: science.badge === 'LIVE' ? science : snapshotData?.science ?? science,
  };
};

export const calibrationFromData = (data: NasaDataBundle, useTodayWeather = false): { stormSeverity: number; doseMultiplier: number } => ({
  stormSeverity: useTodayWeather ? Math.max(0, data.weather.severity - 1) : 0,
  doseMultiplier: Math.min(1.6, Math.max(0.5, data.radiation.doseRateUgPerHour / 0.42)),
});
