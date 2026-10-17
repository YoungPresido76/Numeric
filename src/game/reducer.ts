import { activateSurge, buyBuilding, buyUpgrade, collapse, tap } from './engine';
import { syncTutorial } from './tutorial';
import type { GameAction, GameState } from './types';

function apply(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'tap':
      return tap(state);
    case 'buy':
      return buyBuilding(state, action.tier, action.amount);
    case 'upgrade':
      return buyUpgrade(state, action.id);
    case 'surge':
      return activateSurge(state);
    case 'collapse':
      return collapse(state);
    case 'setSound':
      return state.settings.sound === action.value
        ? state
        : { ...state, settings: { ...state.settings, sound: action.value } };
    case 'skipTutorial':
      return { ...state, tutorial: { ...state.tutorial, done: true } };
  }
}

/**
 * Pure game reducer. Returns the same object when an action had no effect,
 * so callers can use identity to tell whether a purchase succeeded.
 */
export function reduce(state: GameState, action: GameAction): GameState {
  const next = apply(state, action);
  return next === state ? state : syncTutorial(next);
}
