import type { ScienceCard, SpaceWeather, RadiationReading } from './types';

export const archivedWeather: SpaceWeather = {
  severity: 2,
  events: 3,
  eventClass: 'No verified weather record',
  eventDate: '2025-10-01',
  badge: 'ARCHIVED (2025-10-01)',
  source: 'Curated DONKI fallback: solar flare, CME, and geomagnetic-storm examples.',
};

export const archivedRadiation: RadiationReading = {
  doseRateUgPerHour: 0.42,
  readingDate: '2022-04-02',
  unit: 'µGy/h',
  badge: 'ARCHIVED (2022-04-02)',
  source: 'Curated RadLab ISS DosTel reading in microgray per hour.',
};

export const archivedScience: ScienceCard = {
  title: 'Plants and tiny travelers in space',
  description: 'NASA researchers share space-biology studies so scientists can learn how living things adapt away from Earth.',
  studyId: 'OSD-137',
  badge: 'ARCHIVED (2017-08-28)',
  url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-137',
};
