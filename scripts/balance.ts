import { advanceTurn, createMission, solarForTurn } from '../src/engine/game';
import { nextRandom } from '../src/engine/random';
import type { Allocation, MissionState } from '../src/engine/types';

type StrategyName = 'random' | 'greedy-science' | 'all-safety' | 'do-nothing' | 'default-sliders' | 'steady' | 'forecast-only' | 'reactive';

const strategy = (name: StrategyName, state: MissionState): Allocation => {
  if (name === 'do-nothing') return { lifeSupport: 0, shielding: 0, greenhouse: 0, science: 0 };
  if (name === 'all-safety') return { lifeSupport: 7, shielding: 5, greenhouse: 2, science: 0 };
  if (name === 'greedy-science') return { lifeSupport: 4, shielding: 1, greenhouse: 2, science: 7 };
  if (name === 'default-sliders') return { lifeSupport: 6, shielding: 3, greenhouse: 3, science: 2 };
  // A steady crew keeps the same conservative split and never changes it for
  // the forecast. Moon night is deliberately lean, but still below its power
  // budget, which makes missed storms and radiation the main risk.
  if (name === 'steady') return state.site === 'moon'
    ? (state.turn > 15
      ? { lifeSupport: 4, shielding: 0, greenhouse: 0, science: 0 }
      : { lifeSupport: 5, shielding: 1, greenhouse: 3, science: 2 })
    : { lifeSupport: 5, shielding: 1, greenhouse: 2, science: 1 };
  if (name === 'forecast-only') {
    const storm = state.nextEvent.kind === 'solarStorm';
    // This crew reads only the storm forecast. It adds shielding for particles
    // but does not adapt to lunar night, dust, equipment faults, food, or
    // science progress.
    if (state.site === 'moon') return state.turn > 15
      ? (storm ? { lifeSupport: 5, shielding: 2, greenhouse: 0, science: 0 } : { lifeSupport: 4, shielding: 0, greenhouse: 0, science: 0 })
      : (storm ? { lifeSupport: 5, shielding: 5, greenhouse: 3, science: 2 } : { lifeSupport: 5, shielding: 1, greenhouse: 3, science: 2 });
    return storm
      ? { lifeSupport: 5, shielding: 4, greenhouse: 1, science: 1 }
      : { lifeSupport: 5, shielding: 1, greenhouse: 2, science: 1 };
  }
  if (name === 'reactive') {
    const storm = state.nextEvent.kind === 'solarStorm';
    if (state.site === 'moon' && state.turn > 15) return storm
      ? { lifeSupport: 5, shielding: 1, greenhouse: 0, science: 0 }
      : { lifeSupport: 4, shielding: 1, greenhouse: 0, science: 0 };
    if (state.site === 'moon') return storm
      ? { lifeSupport: 5, shielding: 5, greenhouse: 3, science: 2 }
      : { lifeSupport: 5, shielding: 3, greenhouse: 3, science: 2 };
    if (state.nextEvent.kind === 'equipmentFault' || state.nextEvent.kind === 'dustStorm') {
      const available = solarForTurn(state.site, state.turn, state.nextEvent) + state.battery;
      return available < 7
        ? { lifeSupport: 5, shielding: 0, greenhouse: 0, science: 0 }
        : { lifeSupport: 5, shielding: 1, greenhouse: 1, science: 0 };
    }
    return storm
      ? { lifeSupport: 5, shielding: state.nextEvent.severity === 3 ? 6 : 5, greenhouse: 0, science: 0 }
      : { lifeSupport: 5, shielding: 2, greenhouse: 2, science: 1 };
  }
  const [first, a] = nextRandom(state.seed ^ state.turn);
  const [, b] = nextRandom(Math.floor(first * 1_000_000));
  return { lifeSupport: Math.floor(a * 9), shielding: Math.floor(b * 6), greenhouse: Math.floor(a * 5), science: Math.floor(b * 6) };
};

const simulate = (name: StrategyName, seed: number, site: MissionState['site']): MissionState => {
  let state = createMission(site, seed);
  while (state.outcome === 'playing') state = advanceTurn(state, strategy(name, state)).state;
  return state;
};

const names: StrategyName[] = ['random', 'greedy-science', 'all-safety', 'do-nothing', 'default-sliders', 'steady', 'forecast-only', 'reactive'];
const sites: MissionState['site'][] = ['moon', 'mars'];
const results = names.flatMap((name) => sites.map((site) => {
  const missions = Array.from({ length: 500 }, (_, index) => simulate(name, 10_000 + index, site));
  const wins = missions.filter((mission) => mission.outcome === 'won').length;
  const failures = missions.reduce<Record<string, number>>((counts, mission) => {
    if (mission.failureReason) counts[mission.failureReason] = (counts[mission.failureReason] ?? 0) + 1;
    return counts;
  }, {});
  const topFailure = Object.entries(failures).sort(([, left], [, right]) => right - left)[0];
  return { strategy: name, site, wins, winRate: wins / 5, topFailure: topFailure ? `${topFailure[0]} (${topFailure[1]})` : 'Completed every mission' };
}));

console.table(results.map((result) => ({ Strategy: result.strategy, Site: result.site, Wins: `${result.wins}/500`, 'Win rate': `${result.winRate.toFixed(1)}%`, 'Top failure': result.topFailure })));

const lookup = (name: StrategyName, site: MissionState['site']): number => results.find((result) => result.strategy === name && result.site === site)!.winRate;
for (const site of sites) {
  if (lookup('do-nothing', site) !== 0) throw new Error(`Balance failure: do-nothing must fail on ${site}.`);
  if (lookup('default-sliders', site) >= 25) throw new Error(`Balance failure: default sliders must win under 25% on ${site}.`);
  if (lookup('steady', site) < 10 || lookup('steady', site) > 25) throw new Error(`Balance failure: steady play must win 10-25% on ${site}.`);
  if (lookup('forecast-only', site) < 20 || lookup('forecast-only', site) > 40) throw new Error(`Balance failure: forecast-only play must win 20-40% on ${site}.`);
  if (lookup('reactive', site) < 70 || lookup('reactive', site) > 85) throw new Error(`Balance failure: reactive play must win 70-85% on ${site}.`);
  if (lookup('random', site) >= 15) throw new Error(`Balance failure: random play must win under 15% on ${site}.`);
}
if (sites.some((site) => lookup('greedy-science', site) >= 25)) throw new Error('Balance failure: greedy science must win under 25% of missions.');
if (sites.some((site) => lookup('all-safety', site) !== 0)) throw new Error('Balance failure: all-safety must fail the science objective.');
