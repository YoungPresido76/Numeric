import type { ReactElement } from 'react';
import { TUTORIAL_STEPS } from '../game/tutorial';
import type { GameState } from '../game/types';

interface TutorialCardProps {
  state: GameState;
  onSkip: () => void;
}

/** Compact guidance banner. Each step completes by doing the thing, not by pressing Next. */
export function TutorialCard({ state, onSkip }: TutorialCardProps): ReactElement | null {
  if (state.tutorial.done) return null;
  const step = TUTORIAL_STEPS[state.tutorial.step];
  if (!step || !step.isVisible(state)) return null;

  return (
    <section
      role="status"
      aria-label="Tutorial"
      className="fade-in mx-3 mb-2 shrink-0 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2.5 backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-cyan-300 font-numeric text-xs font-bold text-slate-950"
        >
          {state.tutorial.step + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cyan-100">{step.title}</p>
          <p className="mt-0.5 text-xs leading-snug text-slate-300">{step.body}</p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 rounded-md px-1.5 py-1 text-xs text-slate-400 underline underline-offset-2 active:text-slate-200"
        >
          Skip
        </button>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {TUTORIAL_STEPS.map((def, index) => (
          <span
            key={def.id}
            className={`h-0.5 flex-1 rounded-full ${index <= state.tutorial.step ? 'bg-cyan-300' : 'bg-white/15'}`}
          />
        ))}
      </div>
    </section>
  );
}
