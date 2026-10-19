import { newlyOwned, runAutobuyers } from './autorun';
import { advance, buildingCost, closeLab, derive } from './engine';
import { noteForPurchase, stepLab } from './lab';
import type { GameState, Tier } from './types';
import { autoStitchTear } from './varianceOps';

const TIERS: readonly Tier[] = [0, 1, 2, 3];

/**
 * One tick of live play: production first, then autobuyers, then the lab (experiments,
 * stability, notebook). If the last-chance window runs out the lab is closed
 * as a black hole in the same tick.
 */
export function step(state: GameState, dt: number): GameState {
  if (!(dt > 0)) return state;
  const advanced = advance(state, dt);
  const automated = runAutobuyers(advanced, dt);
  let produced = automated;
  for (const tier of newlyOwned(advanced, automated)) produced = noteForPurchase(produced, tier);
  const derived = derive(produced);
  const costs = TIERS.map((tier) => buildingCost(tier, produced.bought[tier], 1, derived.costDiscount, derived.growth[tier]));
  const result = stepLab(produced, dt, derived.psPerSecond, costs);
  const stitched = result.blackHole ? result.state : autoStitchTear(result.state);
  const stepped: GameState = {
    ...stitched,
    stats: { ...stitched.stats, playSeconds: stitched.stats.playSeconds + dt },
  };
  return result.blackHole ? closeLab(stepped, 'blackHole') : stepped;
}
