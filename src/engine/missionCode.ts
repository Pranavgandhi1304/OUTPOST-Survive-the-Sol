export const DEMO_SEED = 20260402;

const toSeed = (value: string | null): number | undefined => {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed >>> 0 : undefined;
};

/** Reads a reproducible mission seed without making ordinary games predictable. */
export const seedFromSearch = (search: string): number | undefined => {
  const query = new URLSearchParams(search);
  if (query.get('demo') === '1') return DEMO_SEED;
  return toSeed(query.get('seed'));
};

export const randomMissionSeed = (): number => {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
};

export const missionCode = (seed: number): string => `SOL-${(seed >>> 0).toString(36).toUpperCase().padStart(7, '0')}`;
