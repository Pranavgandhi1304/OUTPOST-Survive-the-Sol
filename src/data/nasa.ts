import { archivedRadiation, archivedScience, archivedWeather } from './fallback';
import type { NasaDataBundle, RadiationReading, ScienceCard, SpaceWeather } from './types';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const CACHE_PREFIX = 'outpost:nasa:';
const CACHE_MS = 30 * 60 * 1000;
const nasaKey = (): string => import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
const dateOnly = (date: Date): string => date.toISOString().slice(0, 10);

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

export const getSpaceWeather = async (fetcher: FetchLike = fetch, now = new Date()): Promise<SpaceWeather> => {
  try {
    const end = dateOnly(now);
    const start = dateOnly(new Date(now.getTime() - 14 * 86_400_000));
    const base = `https://api.nasa.gov/DONKI`;
    const [flares, cmes, storms] = await Promise.all(['FLR', 'CME', 'GST'].map((kind) => cachedJson<unknown>(`donki-${kind}-${end}`, `${base}/${kind}?startDate=${start}&endDate=${end}&api_key=${nasaKey()}`, fetcher)));
    const count = asArray(flares).length + asArray(cmes).length + asArray(storms).length;
    if (count === 0) throw new Error('No recent DONKI events');
    return { severity: Math.min(3, Math.max(1, Math.ceil(count / 3))), events: count, badge: 'LIVE', source: 'NASA DONKI FLR, CME, and GST events from the last 14 days.' };
  } catch {
    return archivedWeather;
  }
};

export const getRadiation = async (fetcher: FetchLike = fetch): Promise<RadiationReading> => {
  try {
    const response = await cachedJson<unknown>('radlab-iss', 'https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&absorbed_dose_rate&format=json', fetcher);
    const rows = asArray(response);
    const rates = rows.map((row) => Number(row.absorbed_dose_rate)).filter((rate) => Number.isFinite(rate) && rate > 0);
    if (rates.length === 0) throw new Error('No dose rates');
    return { doseRate: rates.reduce((total, rate) => total + rate, 0) / rates.length, badge: 'LIVE', source: 'NASA OSDR RadLab ISS absorbed dose-rate readings (microgray per hour).' };
  } catch {
    return archivedRadiation;
  }
};

export const getScienceCard = async (fetcher: FetchLike = fetch): Promise<ScienceCard> => {
  try {
    const response = await cachedJson<unknown>('osdr-spaceflight', 'https://osdr.nasa.gov/osdr/data/search?term=spaceflight&from=0&size=1', fetcher);
    const rows = asArray(response);
    const first = rows[0];
    const title = typeof first.title === 'string' ? first.title : undefined;
    const id = typeof first.Accession === 'string' ? first.Accession : typeof first.accession === 'string' ? first.accession : undefined;
    if (!title || !id) throw new Error('No usable OSDR study');
    return { title, description: 'A current NASA space-biology study found through OSDR.', studyId: id, badge: 'LIVE', url: `https://osdr.nasa.gov/bio/repo/data/studies/${id}` };
  } catch {
    return archivedScience;
  }
};

export const loadNasaData = async (fetcher: FetchLike = fetch): Promise<NasaDataBundle> => {
  const [weather, radiation, science] = await Promise.all([getSpaceWeather(fetcher), getRadiation(fetcher), getScienceCard(fetcher)]);
  return { weather, radiation, science };
};

export const calibrationFromData = (data: NasaDataBundle): { stormSeverity: number; doseMultiplier: number } => ({
  stormSeverity: Math.max(0, data.weather.severity - 1),
  doseMultiplier: Math.min(1.5, Math.max(0.7, data.radiation.doseRate / 0.42)),
});
