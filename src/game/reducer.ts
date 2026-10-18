import { activateSurge, buyBuilding, buyUpgrade, collapse, derive, tap } from './engine';
import { neutralize, noteForPurchase, observe } from './lab';
import { syncTutorial } from './tutorial';
import type { GameAction, GameState } from './types';

function apply(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'tap':
      return tap(state);
    case 'buy': {
      const next = buyBuilding(state, action.tier, action.amount);
      if (next === state) return state;
      return state.bought[action.tier] === 0 ? noteForPurchase(next, action.tier) : next;
    }
    case 'upgrade':
      return buyUpgrade(state, action.id);
    case 'surge':
      return activateSurge(state);
    case 'collapse':
      return collapse(state);
    case 'observe':
      return observe(state, action.target, derive(state).psPerSecond);
    case 'neutralize':
      return neutralize(state, action.id);
    case 'dismissSummary':
      return state.summary === null ? state : { ...state, summary: null };
    case 'setSound':
      return state.settings.sound === action.value
        ? state
        : { ...state, settings: { ...state.settings, sound: action.value } };
    case 'skipTutorial':
      return { ...state, tutorial: { ...state.tutorial, done: true } };
    case 'finishIntro':
      return state.introSeen ? state : { ...state, introSeen: true };
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
