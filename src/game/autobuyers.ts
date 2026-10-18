import {
  AUTOBUYER_AMOUNTS,
  AUTOBUYER_BASE_COST,
  AUTOBUYER_STEP_GROWTH,
  AUTOBUYER_UNLOCK_ECHOES,
} from './data';
import type { AutoAmount, AutobuyerSet, AutobuyerState, GameState, Tier } from './types';

export function createAutobuyer(): AutobuyerState {
  return { owned: false, level: 0, enabled: true };
}

export function createAutobuyers(): AutobuyerSet {
  return [createAutobuyer(), createAutobuyer(), createAutobuyer(), createAutobuyer()];
}

/** The last step on the amount ladder. */
export const AUTOBUYER_MAX_LEVEL = AUTOBUYER_AMOUNTS.length - 1;

/** Autobuyers unlock once enough Echoes have been earned, whether or not they are still unspent. */
export function autobuyersUnlocked(state: GameState): boolean {
  return state.echoesEarned >= AUTOBUYER_UNLOCK_ECHOES;
}

/** How many buildings an autobuyer at `level` buys per trigger. */
export function autobuyerAmount(level: number): AutoAmount {
  return AUTOBUYER_AMOUNTS[Math.min(Math.max(0, Math.floor(level)), AUTOBUYER_MAX_LEVEL)] ?? 1;
}

export function amountLabel(amount: AutoAmount): string {
  return amount === 'max' ? 'Max' : `×${amount}`;
}

/**
 * Echo cost of the next purchase for a tier: the install price when the
 * autobuyer is not owned, then each ladder step costs 10 times the one before.
 * Returns null once the ladder is complete.
 */
export function autobuyerCost(tier: Tier, autobuyer: AutobuyerState): number | null {
  const base = AUTOBUYER_BASE_COST[tier];
  if (!autobuyer.owned) return base;
  if (autobuyer.level >= AUTOBUYER_MAX_LEVEL) return null;
  return base * Math.pow(AUTOBUYER_STEP_GROWTH, autobuyer.level + 1);
}

/** Installs the autobuyer for a tier, or buys its next ladder step, with Echoes. */
export function buyAutobuyer(state: GameState, tier: Tier): GameState {
  if (!autobuyersUnlocked(state)) return state;
  const current = state.autobuyers[tier];
  const cost = autobuyerCost(tier, current);
  if (cost === null || !(state.echoes >= cost)) return state;

  const next: AutobuyerState = current.owned
    ? { ...current, level: current.level + 1 }
    : { owned: true, level: 0, enabled: true };
  const autobuyers: AutobuyerSet = [...state.autobuyers];
  autobuyers[tier] = next;
  return { ...state, echoes: state.echoes - cost, autobuyers };
}

export function toggleAutobuyer(state: GameState, tier: Tier): GameState {
  const current = state.autobuyers[tier];
  if (!current.owned) return state;
  const autobuyers: AutobuyerSet = [...state.autobuyers];
  autobuyers[tier] = { ...current, enabled: !current.enabled };
  return { ...state, autobuyers };
}

/** True when any autobuyer install or upgrade can be bought right now. Drives the Collapse tab badge. */
export function canAffordAutobuyer(state: GameState): boolean {
  if (!autobuyersUnlocked(state)) return false;
  return ([0, 1, 2, 3] as const).some((tier) => {
    const cost = autobuyerCost(tier, state.autobuyers[tier]);
    return cost !== null && state.echoes >= cost;
  });
}
