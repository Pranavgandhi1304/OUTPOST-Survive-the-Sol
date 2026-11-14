import { advanceTurn, createMission } from '../src/engine/game';
import { nextRandom } from '../src/engine/random';
import type { Allocation, MissionState } from '../src/engine/types';

type StrategyName = 'random' | 'greedy-science' | 'all-safety' | 'do-nothing' | 'balanced';

const strategy = (name: StrategyName, state: MissionState): Allocation => {
  if (name === 'do-nothing') return { lifeSupport: 0, shielding: 0, greenhouse: 0, science: 0 };
  if (name === 'all-safety') return { lifeSupport: 7, shielding: 5, greenhouse: 2, science: 0 };
  if (name === 'greedy-science') return { lifeSupport: 4, shielding: 1, greenhouse: 2, science: 7 };
  if (name === 'balanced') return state.site === 'moon' && state.turn > 15 ? { lifeSupport: 4, shielding: 2, greenhouse: 0, science: 0 } : { lifeSupport: 6, shielding: 3, greenhouse: 3, science: 2 };
  const [first, a] = nextRandom(state.seed ^ state.turn);
  const [, b] = nextRandom(Math.floor(first * 1_000_000));
  return { lifeSupport: Math.floor(a * 9), shielding: Math.floor(b * 6), greenhouse: Math.floor(a * 5), science: Math.floor(b * 6) };
};

const simulate = (name: StrategyName, seed: number): MissionState => {
  let state = createMission(seed % 2 === 0 ? 'moon' : 'mars', seed);
  while (state.outcome === 'playing') state = advanceTurn(state, strategy(name, state)).state;
  return state;
};

const names: StrategyName[] = ['random', 'greedy-science', 'all-safety', 'do-nothing', 'balanced'];
const results = names.map((name) => {
  const wins = Array.from({ length: 1_000 }, (_, index) => simulate(name, 10_000 + index).outcome === 'won').filter(Boolean).length;
  return { strategy: name, wins, winRate: wins / 10 };
});

console.table(results.map((result) => ({ Strategy: result.strategy, Wins: `${result.wins}/1000`, 'Win rate': `${result.winRate.toFixed(1)}%` })));

const lookup = (name: StrategyName): number => results.find((result) => result.strategy === name)!.winRate;
if (lookup('do-nothing') !== 0) throw new Error('Balance failure: do-nothing must fail.');
if (lookup('balanced') < 75 || lookup('balanced') > 85) throw new Error('Balance failure: balanced play must win 75-85% of missions.');
if (lookup('random') >= 20) throw new Error('Balance failure: random play must win under 20% of missions.');
if (lookup('greedy-science') >= 25) throw new Error('Balance failure: greedy science must win under 25% of missions.');
if (lookup('all-safety') !== 0) throw new Error('Balance failure: all-safety must fail the science objective.');
