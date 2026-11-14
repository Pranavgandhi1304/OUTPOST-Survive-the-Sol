export interface SpaceWeather {
  severity: number;
  events: number;
  eventClass: string;
  eventDate: string;
  badge: `LIVE` | `ARCHIVED (${string})`;
  source: string;
}

export interface RadiationReading {
  doseRateUgPerHour: number;
  unit: 'µGy/h';
  badge: `LIVE` | `ARCHIVED (${string})`;
  source: string;
}

export interface ScienceCard {
  title: string;
  description: string;
  studyId: string;
  badge: `LIVE` | `ARCHIVED (${string})`;
  url: string;
}

export interface NasaDataBundle {
  weather: SpaceWeather;
  radiation: RadiationReading;
  science: ScienceCard;
}
