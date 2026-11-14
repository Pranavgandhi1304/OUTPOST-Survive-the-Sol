import { advanceTurn, createMission } from '../src/engine/game';
import { nextRandom } from '../src/engine/random';
import type { Allocation, MissionState } from '../src/engine/types';

type StrategyName = 'random' | 'greedy-science' | 'all-safety' | 'do-nothing' | 'balanced';

const strategy = (name: StrategyName, state: MissionState): Allocation => {
  if (name === 'do-nothing') return { lifeSupport: 0, shielding: 0, greenhouse: 0, science: 0 };
  if (name === 'all-safety') return { lifeSupport: 7, shielding: 5, greenhouse: 2, science: 0 };
  if (name === 'greedy-science') return { lifeSupport: 4, shielding: 1, greenhouse: 2, science: 7 };
  if (name === 'balanced') return { lifeSupport: 6, shielding: 3, greenhouse: 3, science: 2 };
  const [first, a] = nextRandom(state.seed ^ state.turn);
  const [, b] = nextRandom(Math.floor(first * 1_000_000));
  return { lifeSupport: 2 + Math.floor(a * 7), shielding: Math.floor(b * 5), greenhouse: Math.floor(a * 4), science: Math.floor(b * 5) };
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
if (results.some((result) => result.winRate > 90)) throw new Error('Balance failure: no strategy may win over 90% of missions.');
if (lookup('balanced') < 10) throw new Error('Balance failure: balanced play must be winnable in at least 10% of missions.');
