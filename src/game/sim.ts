import { advance, buildingCost, closeLab, derive } from './engine';
import { stepLab } from './lab';
import type { GameState, Tier } from './types';

const TIERS: readonly Tier[] = [0, 1, 2, 3];

/**
 * One tick of live play: production first, then the lab (experiments,
 * stability, notebook). If the last-chance window runs out the lab is closed
 * as a black hole in the same tick.
 */
export function step(state: GameState, dt: number): GameState {
  if (!(dt > 0)) return state;
  const produced = advance(state, dt);
  const derived = derive(produced);
  const costs = TIERS.map((tier) => buildingCost(tier, produced.bought[tier], 1, derived.costDiscount));
  const result = stepLab(produced, dt, derived.psPerSecond, costs);
  const stepped: GameState = {
    ...result.state,
    stats: { ...result.state.stats, playSeconds: result.state.stats.playSeconds + dt },
  };
  return result.blackHole ? closeLab(stepped, 'blackHole') : stepped;
}
