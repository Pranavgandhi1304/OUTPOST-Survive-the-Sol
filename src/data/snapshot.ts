import type { NasaDataBundle, RadiationReading, ScienceCard, SpaceWeather } from './types';

export interface NasaSnapshot {
  fetchedAt: string;
  sourceUrls: string[];
  weather: { severity: number; events: number; eventClass: string; eventDate: string; eventId: string };
  radiation?: { doseRateUgPerHour: number; readingDate: string };
  science?: { title: string; studyId: string; description: string; url: string };
}

const snapshotBadge = (fetchedAt: string): `NASA data fetched ${string}` => `NASA data fetched ${fetchedAt.slice(0, 10)}`;

export const isSnapshot = (value: unknown): value is NasaSnapshot => {
  if (typeof value !== 'object' || value === null) return false;
  const snapshot = value as Partial<NasaSnapshot>;
  return typeof snapshot.fetchedAt === 'string' && Array.isArray(snapshot.sourceUrls) && typeof snapshot.weather === 'object' && snapshot.weather !== null;
};

export const dataFromSnapshot = (snapshot: NasaSnapshot, fallback: NasaDataBundle): NasaDataBundle => {
  const badge = snapshotBadge(snapshot.fetchedAt);
  const weather: SpaceWeather = { ...snapshot.weather, badge, source: `NASA CCMC DONKI snapshot fetched ${snapshot.fetchedAt}.` };
  const radiation: RadiationReading = snapshot.radiation ? { doseRateUgPerHour: snapshot.radiation.doseRateUgPerHour, readingDate: snapshot.radiation.readingDate, unit: 'µGy/h', badge, source: `NASA OSDR RadLab snapshot fetched ${snapshot.fetchedAt}.` } : fallback.radiation;
  const science: ScienceCard = snapshot.science ? { ...snapshot.science, badge } : fallback.science;
  return { weather, radiation, science };
};
