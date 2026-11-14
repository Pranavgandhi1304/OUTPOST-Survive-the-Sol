export type Site = 'moon' | 'mars';
export type EventKind = 'solarStorm' | 'dustStorm' | 'equipmentFault' | 'commsBlackout' | 'quiet';

export interface Allocation {
  lifeSupport: number;
  shielding: number;
  greenhouse: number;
  science: number;
}

export interface GameEvent {
  kind: EventKind;
  severity: number;
  title: string;
  message: string;
}

export interface ReplayEntry {
  turn: number;
  allocation: Allocation;
  event: GameEvent;
  air: number;
  shielding: number;
  health: number;
  power: number;
  note: string;
}

export interface MissionState {
  site: Site;
  turn: number;
  power: number;
  air: number;
  shielding: number;
  health: number;
  radiationDose: number;
  food: number;
  battery: number;
  science: number;
  greenhouseYield: number;
  seed: number;
  calibration: { stormSeverity: number; doseMultiplier: number };
  event: GameEvent;
  /** Forecast for the sol the player is about to run. */
  nextEvent: GameEvent;
  replay: ReplayEntry[];
  outcome: 'playing' | 'won' | 'failed';
  failureReason?: string;
}

export interface TurnResult {
  state: MissionState;
  availablePower: number;
  solarPower: number;
  usedPower: number;
  event: GameEvent;
}
