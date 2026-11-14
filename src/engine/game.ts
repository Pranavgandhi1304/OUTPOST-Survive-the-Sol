import { nextRandom } from './random';
import type { Allocation, EventKind, GameEvent, MissionState, Site, TurnResult } from './types';

export const TURN_COUNT = 30;
export const BATTERY_CAPACITY = 44;
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
  // Lunar night is deliberately lean: daytime surplus must be stored first.
  const base = site === 'moon' ? (lunarDay ? 17 : 3) : 9 + ((turn * 7) % 4);
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

export const createMission = (site: Site, seed = 2026, calibration = { stormSeverity: 0, doseMultiplier: 1 }): MissionState => {
  const [nextSeed, nextEvent] = eventFor(site, seed, calibration.stormSeverity);
  return {
    site,
    missionSeed: seed >>> 0,
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
    seed: nextSeed,
    calibration,
    event: quietEvent(),
    nextEvent,
    replay: [],
    outcome: 'playing',
  };
};

const failure = (state: MissionState): string | undefined => {
  if (state.air <= 0) return 'The crew ran out of safe air.';
  if (state.health <= 0) return 'The crew was too sick to continue.';
  if (state.radiationDose >= 100) return 'The crew received too much radiation.';
  if (state.food <= 0) return 'The greenhouse could not keep the crew fed.';
  if (state.turn > TURN_COUNT && state.science < 24) return 'The crew survived, but the mission did not collect enough science.';
  return undefined;
};

export const advanceTurn = (state: MissionState, requested: Allocation, forcedEvent?: GameEvent): TurnResult => {
  if (state.outcome !== 'playing') return { state, availablePower: 0, solarPower: 0, usedPower: 0, event: state.event };

  // Consume the event shown before allocation, then store another forecast.
  const event = forcedEvent ?? state.nextEvent;
  const [nextSeed, nextEvent] = eventFor(state.site, state.seed, state.calibration.stormSeverity);
  const solarPower = solarForTurn(state.site, state.turn, event);
  const availablePower = solarPower + state.battery;
  const allocation = normalizeAllocation(requested, availablePower);
  const usedPower = sum(allocation);
  const requestedPower = sum(requested);
  const powerShortfall = Math.max(0, requestedPower - availablePower);
  const surplus = Math.max(0, solarPower - usedPower);
  const batteryDraw = Math.max(0, usedPower - solarPower);
  const battery = clamp(state.battery - batteryDraw + surplus, 0, BATTERY_CAPACITY);
  const lifeGap = Math.max(0, 5 - allocation.lifeSupport);
  const newShielding = clamp(state.shielding - 5 + allocation.shielding * 3);
  // A forecast lets the crew raise shielding before incoming particles arrive.
  const stormDose = event.kind === 'solarStorm' ? event.severity * (4 + 18 * (1 - newShielding / 100)) * state.calibration.doseMultiplier : 0;
  const food = clamp(state.food - 2 + state.greenhouseYield, 0, 100);
  const healthHit = lifeGap * 3 + (food < 10 ? 5 : 0) + (stormDose > 9 ? 3 : 0) + powerShortfall * 2;
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
    nextEvent,
    replay: [],
  };
  const failureReason = failure(next);
  const completed = next.turn > TURN_COUNT;
  const outcomeNote = failureReason ?? (completed ? 'The crew completed the 30-sol mission.' : event.message);
  const shortfallNote = powerShortfall > 0 ? `You asked for ${requestedPower} units but only ${availablePower} were available, so the crew lost health.` : '';
  const note = [shortfallNote, outcomeNote].filter(Boolean).join(' ');
  const replayEntry = { turn: state.turn, allocation, requestedPower, availablePower, powerShortfall, event, air: next.air, shielding: next.shielding, health: next.health, power: next.power, note };
  next.replay = [...state.replay, replayEntry];
  if (failureReason) {
    next.outcome = 'failed';
    next.failureReason = failureReason;
  } else if (completed) {
    next.outcome = 'won';
  }
  return { state: next, availablePower, solarPower, usedPower, event };
};

export const missionAdviceDelay = (site: Site, turn: number): number => (site === 'mars' ? 3 + ((turn * 19) % 20) : 1.3);

export const earthAdvice = (site: Site, turn: number, previousEvent?: GameEvent): string => {
  if (site === 'moon') return 'Moon radio advice arrives in about 1.3 seconds one-way.';
  const delay = missionAdviceDelay(site, turn);
  if (!previousEvent || turn === 1) return `Earth’s first advice is still in transit. It will arrive in ${delay} minutes.`;
  const focus = previousEvent.kind === 'solarStorm' ? 'keep shielding high' : previousEvent.kind === 'dustStorm' ? 'save battery power' : previousEvent.kind === 'equipmentFault' ? 'leave power for repairs' : 'protect air, shielding, and food together';
  return `Earth’s advice for sol ${turn - 1} arrived ${delay} minutes late: ${focus}.`;
};

export const allocationTotal = sum;
export const isEventKind = (event: GameEvent, kind: EventKind): boolean => event.kind === kind;
