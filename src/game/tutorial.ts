import { BUILDINGS, SURGE_BASE_DURATION, SURGE_MULT } from './data';
import { echoGain } from './engine';
import { formatNumber } from './math';
import type { GameState } from './types';

export type TutorialTab = 'build' | 'upgrades' | 'lab' | 'collapse';

export interface TutorialStepDef {
  id: string;
  title: string;
  body: string;
  /** A tab to nudge the player toward while this step is active. */
  hintTab: TutorialTab | null;
  isComplete: (state: GameState) => boolean;
  /** Steps that only make sense later stay hidden until this is true. */
  isVisible: (state: GameState) => boolean;
}

const always = (): boolean => true;

export const TUTORIAL_STEPS: readonly TutorialStepDef[] = [
  {
    id: 'observe',
    title: 'Watch the results come in',
    body: 'Tap the glowing orb to observe the lab and gain Amplitude (ψ), your research budget.',
    hintTab: null,
    isComplete: (s) => s.stats.taps >= 3,
    isVisible: always,
  },
  {
    id: 'qubit',
    title: 'Fund your first project',
    body: 'Open Projects and buy a Qubit. It brings in ψ every second, even while you rest.',
    hintTab: 'build',
    isComplete: (s) => s.bought[0] >= 1,
    isVisible: always,
  },
  {
    id: 'register',
    title: 'Grow the register',
    body: 'Each Qubit costs about 22% more than the last. Buy a few more.',
    hintTab: 'build',
    isComplete: (s) => s.bought[0] >= 5,
    isVisible: always,
  },
  {
    id: 'gate',
    title: 'Unlock Superposition Gates',
    body: `Gates create Qubits for you, so growth compounds. The first costs ${formatNumber(BUILDINGS[1].baseCost)} ψ. Gates also start running experiments.`,
    hintTab: 'build',
    isComplete: (s) => s.bought[1] >= 1,
    isVisible: always,
  },
  {
    id: 'upgrade',
    title: 'Buy an upgrade',
    body: 'Upgrades are permanent boosts for this lab. Pick one in the Upgrades tab.',
    hintTab: 'upgrades',
    isComplete: (s) => s.upgrades.length >= 1,
    isVisible: always,
  },
  {
    id: 'surge',
    title: 'Trigger a Surge',
    body: `Superposition Surge multiplies output by ${SURGE_MULT} for ${SURGE_BASE_DURATION} seconds and lets you observe any experiment instantly. Then it recharges.`,
    hintTab: null,
    isComplete: (s) => s.surge.activeLeft > 0 || s.surge.cooldownLeft > 0,
    isVisible: always,
  },
  {
    id: 'experiment',
    title: 'Run an experiment',
    body: 'Each experiment is a task with a clock: earn, fund, tap or hold. Finish it for funds and stability. Miss it and the lab takes a hit you must repair. Surge lets you observe one instantly.',
    hintTab: 'lab',
    isComplete: (s) => s.lab.run.successes >= 1 || s.stats.experiments >= 3,
    isVisible: (s) => s.lab.experiments.length > 0 || s.stats.experiments > 0,
  },
  {
    id: 'collapse',
    title: 'Your research is ready to publish',
    body: 'Open Collapse to close this lab for permanent Echoes. A lab that survived a close call pays more.',
    hintTab: 'collapse',
    isComplete: (s) => s.stats.collapses >= 1,
    isVisible: (s) => echoGain(s.runAmplitude) >= 1,
  },
];

/** Advances the tutorial past every step the state already satisfies. */
export function syncTutorial(state: GameState): GameState {
  if (state.tutorial.done) return state;
  let step = state.tutorial.step;
  while (step < TUTORIAL_STEPS.length && TUTORIAL_STEPS[step]?.isComplete(state)) {
    step += 1;
  }
  const done = step >= TUTORIAL_STEPS.length;
  if (step === state.tutorial.step && done === state.tutorial.done) return state;
  return { ...state, tutorial: { step, done } };
}
