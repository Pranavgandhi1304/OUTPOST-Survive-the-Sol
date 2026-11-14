import { nextRandom } from './random';
import type { Allocation, EventKind, GameEvent, MissionState, Site, TurnResult } from './types';

export const TURN_COUNT = 30;
export const BATTERY_CAPACITY = 24;
export const EMPTY_ALLOCATION: Allocation = { lifeSupport: 0, shielding: 0, greenhouse: 0, science: 0 };

export const ALLOCATION_OPTIONS = [
  { key: 'lifeSupport', improves: 'Air', worsens: 'Power', description: 'Keeps fresh air flowing now.' },
  { key: 'shielding', improves: 'Shielding', worsens: 'Power', description: 'Makes a safer wall against space weather.' },
  { key: 'greenhouse', improves: 'Food later', worsens: 'Power now', description: 'Plants need power today before they can feed us.' },
  { key: 'science', improves: 'Science', worsens: 'Power', description: 'Sends useful science, but uses outpost power.' },
] as const;

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));
const sum = (allocation: Allocation): number => Object.values(allocation).reduce((total, value) => total + value, 0);

export const quietEvent = (): GameEvent => ({ kind: 'quiet', severity: 0, title: 'Quiet space weather', message: 'A calm sol gives your crew a chance to prepare.' });

const eventFor = (site: Site, seed: number, severityBoost = 0): [number, GameEvent] => {
  const [nextSeed, roll] = nextRandom(seed);
  const severity = Math.min(3, 1 + Math.floor((((nextSeed >>> 8) % 3) + roll) % 3) + severityBoost);
  if (roll < 0.14) return [nextSeed, { kind: 'solarStorm', severity, title: 'Solar storm', message: 'Fast particles are racing toward your outpost.' }];
  if (site === 'mars' && roll < 0.29) return [nextSeed, { kind: 'dustStorm', severity, title: 'Dust storm', message: 'Dust is blocking the Sun.' }];
  if (roll < 0.39) return [nextSeed, { kind: 'equipmentFault', severity, title: 'Equipment fault', message: 'A machine needs extra power to keep working.' }];
  if (roll < 0.48) return [nextSeed, { kind: 'commsBlackout', severity, title: 'Comms blackout', message: 'Earth cannot hear you clearly right now.' }];
  return [nextSeed, quietEvent()];
};

export const solarForTurn = (site: Site, turn: number, event: GameEvent): number => {
  const lunarDay = (turn - 1) % 30 < 15;
  const base = site === 'moon' ? (lunarDay ? 17 : 4) : 13 + ((turn * 7) % 4);
  const dustLoss = event.kind === 'dustStorm' ? event.severity * 3 : 0;
  const faultLoss = event.kind === 'equipmentFault' ? event.severity : 0;
  return Math.max(1, base - dustLoss - faultLoss);
};

export const normalizeAllocation = (allocation: Allocation, budget: number): Allocation => {
  const safe = {
    lifeSupport: Math.max(0, Math.floor(allocation.lifeSupport)),
    shielding: Math.max(0, Math.floor(allocation.shielding)),
    greenhouse: Math.max(0, Math.floor(allocation.greenhouse)),
    science: Math.max(0, Math.floor(allocation.science)),
  };
  const total = sum(safe);
  if (total <= budget) return safe;
  const scale = budget / total;
  return {
    lifeSupport: Math.floor(safe.lifeSupport * scale),
    shielding: Math.floor(safe.shielding * scale),
    greenhouse: Math.floor(safe.greenhouse * scale),
    science: Math.floor(safe.science * scale),
  };
};

export const createMission = (site: Site, seed = 2026, calibration = { stormSeverity: 0, doseMultiplier: 1 }): MissionState => ({
  site,
  turn: 1,
  power: site === 'moon' ? 17 : 14,
  air: 76,
  shielding: 58,
  health: 100,
  radiationDose: 0,
  food: 34,
  battery: 12,
  science: 0,
  greenhouseYield: 0,
  seed,
  calibration,
  event: quietEvent(),
  replay: [],
  outcome: 'playing',
});

const failure = (state: MissionState): string | undefined => {
  if (state.air <= 0) return 'The crew ran out of safe air.';
  if (state.health <= 0) return 'The crew was too sick to continue.';
  if (state.radiationDose >= 100) return 'The crew received too much radiation.';
  if (state.food <= 0) return 'The greenhouse could not keep the crew fed.';
  return undefined;
};

export const advanceTurn = (state: MissionState, requested: Allocation, forcedEvent?: GameEvent): TurnResult => {
  if (state.outcome !== 'playing') return { state, availablePower: 0, solarPower: 0, usedPower: 0, event: state.event };

  const [nextSeed, rolledEvent] = eventFor(state.site, state.seed, state.calibration.stormSeverity);
  const event = forcedEvent ?? rolledEvent;
  const solarPower = solarForTurn(state.site, state.turn, event);
  const availablePower = solarPower + state.battery;
  const allocation = normalizeAllocation(requested, availablePower);
  const usedPower = sum(allocation);
  const surplus = Math.max(0, solarPower - usedPower);
  const batteryDraw = Math.max(0, usedPower - solarPower);
  const battery = clamp(state.battery - batteryDraw + surplus, 0, BATTERY_CAPACITY);
  const lifeGap = Math.max(0, 5 - allocation.lifeSupport);
  const stormDose = event.kind === 'solarStorm' ? event.severity * 9 * state.calibration.doseMultiplier * (1 - state.shielding / 100) : 0;
  const newShielding = clamp(state.shielding - 2 + allocation.shielding * 4);
  const food = clamp(state.food - 2 + state.greenhouseYield, 0, 100);
  const healthHit = lifeGap * 3 + (food < 10 ? 5 : 0) + (stormDose > 9 ? 3 : 0);
  const next: MissionState = {
    ...state,
    turn: state.turn + 1,
    power: clamp(availablePower - usedPower, 0, 100),
    air: clamp(state.air - 5 + allocation.lifeSupport * 3),
    shielding: newShielding,
    health: clamp(state.health - healthHit),
    radiationDose: clamp(state.radiationDose + 1 + stormDose),
    food,
    battery,
    science: state.science + allocation.science * (event.kind === 'commsBlackout' ? 0 : 2),
    greenhouseYield: allocation.greenhouse * 0.85,
    seed: nextSeed,
    event,
    replay: [],
  };
  const failureReason = failure(next);
  const completed = next.turn > TURN_COUNT;
  const note = failureReason ?? (completed ? 'The crew completed the 30-sol mission.' : event.message);
  const replayEntry = { turn: state.turn, allocation, event, air: next.air, shielding: next.shielding, health: next.health, power: next.power, note };
  next.replay = [...state.replay, replayEntry];
  if (failureReason) {
    next.outcome = 'failed';
    next.failureReason = failureReason;
  } else if (completed) {
    next.outcome = 'won';
  }
  return { state: next, availablePower, solarPower, usedPower, event };
};

export const missionAdviceDelay = (site: Site, turn: number): number => (site === 'mars' ? 3 + ((turn * 19) % 20) : 1);

export const allocationTotal = sum;
export const isEventKind = (event: GameEvent, kind: EventKind): boolean => event.kind === kind;
