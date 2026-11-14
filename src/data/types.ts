export type DataBadge = 'LIVE' | `ARCHIVED (${string})` | `NASA data fetched ${string}`;

export interface SpaceWeather {
  severity: number;
  events: number;
  eventClass: string;
  eventDate: string;
  eventId?: string;
  badge: DataBadge;
  source: string;
}

export interface RadiationReading {
  doseRateUgPerHour: number;
  readingDate: string;
  unit: 'µGy/h';
  badge: DataBadge;
  source: string;
}

export interface ScienceCard {
  title: string;
  description: string;
  studyId: string;
  badge: DataBadge;
  url: string;
}

export interface NasaDataBundle {
  weather: SpaceWeather;
  radiation: RadiationReading;
  science: ScienceCard;
}
