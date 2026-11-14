export interface SpaceWeather {
  severity: number;
  events: number;
  eventClass: string;
  eventDate: string;
  badge: `LIVE` | `ARCHIVED (${string})`;
  source: string;
}

export interface RadiationReading {
  doseRate: number;
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
