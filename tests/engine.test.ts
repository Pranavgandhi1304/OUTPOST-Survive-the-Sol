import { describe, expect, it } from 'vitest';
import { ALLOCATION_OPTIONS, BATTERY_CAPACITY, advanceTurn, allocationTotal, createMission, missionAdviceDelay, normalizeAllocation, quietEvent, solarForTurn } from '../src/engine/game';
import type { GameEvent } from '../src/engine/types';

const event = (kind: GameEvent['kind'], severity = 2): GameEvent => ({ kind, severity, title: kind, message: kind });

describe('outpost engine', () => {
  it('normalizes allocations within the shared power budget', () => {
    const allocation = normalizeAllocation({ lifeSupport: 10, shielding: 10, greenhouse: 10, science: 10 }, 12);
    expect(allocationTotal(allocation)).toBeLessThanOrEqual(12);
    expect(allocation.lifeSupport).toBeGreaterThan(0);
  });

  it('keeps all bounded meters inside their valid range', () => {
    let state = createMission('moon', 1);
    for (let turn = 0; turn < 30; turn += 1) state = advanceTurn(state, { lifeSupport: 100, shielding: 100, greenhouse: 100, science: 100 }).state;
    expect(state.air).toBeGreaterThanOrEqual(0);
    expect(state.air).toBeLessThanOrEqual(100);
    expect(state.shielding).toBeLessThanOrEqual(100);
    expect(state.battery).toBeLessThanOrEqual(BATTERY_CAPACITY);
  });

  it('applies each event effect', () => {
    const base = createMission('mars', 3);
    const safe = { lifeSupport: 6, shielding: 6, greenhouse: 4, science: 2 };
    expect(advanceTurn(base, safe, event('solarStorm')).state.radiationDose).toBeGreaterThan(advanceTurn(base, safe, quietEvent()).state.radiationDose);
    expect(solarForTurn('mars', 1, event('dustStorm'))).toBeLessThan(solarForTurn('mars', 1, quietEvent()));
    expect(solarForTurn('mars', 1, event('equipmentFault'))).toBeLessThan(solarForTurn('mars', 1, quietEvent()));
    expect(advanceTurn(base, safe, event('commsBlackout')).state.science).toBe(0);
  });

  it('models lunar day/night power and battery storage/draw', () => {
    expect(solarForTurn('moon', 2, quietEvent())).toBeGreaterThan(solarForTurn('moon', 20, quietEvent()));
    const charged = advanceTurn({ ...createMission('moon'), battery: 0 }, { lifeSupport: 1, shielding: 0, greenhouse: 0, science: 0 }, quietEvent()).state;
    expect(charged.battery).toBeGreaterThan(0);
    const drawn = advanceTurn({ ...createMission('moon'), turn: 20, battery: 12 }, { lifeSupport: 8, shielding: 2, greenhouse: 0, science: 0 }, quietEvent()).state;
    expect(drawn.battery).toBeLessThan(12);
  });

  it('ends missions for air, health, radiation, and food failures', () => {
    const noPower = { lifeSupport: 0, shielding: 0, greenhouse: 0, science: 0 };
    expect(advanceTurn({ ...createMission('moon'), air: 1 }, noPower, quietEvent()).state.outcome).toBe('failed');
    expect(advanceTurn({ ...createMission('moon'), health: 1 }, noPower, quietEvent()).state.outcome).toBe('failed');
    expect(advanceTurn({ ...createMission('moon'), radiationDose: 99 }, noPower, event('solarStorm', 3)).state.outcome).toBe('failed');
    expect(advanceTurn({ ...createMission('moon'), food: 1 }, noPower, quietEvent()).state.outcome).toBe('failed');
  });

  it('is seed deterministic and makes Mars advice late', () => {
    const allocation = { lifeSupport: 5, shielding: 5, greenhouse: 3, science: 2 };
    expect(advanceTurn(createMission('mars', 99), allocation).state).toEqual(advanceTurn(createMission('mars', 99), allocation).state);
    expect(missionAdviceDelay('mars', 5)).toBeGreaterThanOrEqual(3);
    expect(missionAdviceDelay('mars', 5)).toBeLessThanOrEqual(22);
  });

  it('has no free allocation choice', () => {
    for (const choice of ALLOCATION_OPTIONS) {
      expect(choice.improves).not.toEqual(choice.worsens);
      expect(choice.worsens).toMatch(/Power/);
    }
  });
});
