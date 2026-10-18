import { advance, closeLab, derive } from './engine';
import { stepLab } from './lab';
import type { GameState } from './types';

/**
 * One tick of live play: production first, then the lab (experiments,
 * stability, notebook). If the last-chance window runs out the lab is closed
 * as a black hole in the same tick.
 */
export function step(state: GameState, dt: number): GameState {
  if (!(dt > 0)) return state;
  const produced = advance(state, dt);
  const ps = derive(produced).psPerSecond;
  const result = stepLab(produced, dt, ps);
  const stepped: GameState = {
    ...result.state,
    stats: { ...result.state.stats, playSeconds: result.state.stats.playSeconds + dt },
  };
  return result.blackHole ? closeLab(stepped, 'blackHole') : stepped;
}
