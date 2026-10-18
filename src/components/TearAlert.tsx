import type { ReactElement } from 'react';
import { tearCost, tearOpen } from '../game/fabric';
import { formatNumber } from '../game/math';
import type { GameState } from '../game/types';
import { Spline } from './icons';

interface TearAlertProps {
  state: GameState;
  onStitch: () => void;
}

/**
 * A Continuum Tear: the last-chance window once Fabric is open. Shown on every tab
 * so the player can stitch it closed with Threads before the lab falls into a black hole.
 */
export function TearAlert({ state, onStitch }: TearAlertProps): ReactElement | null {
  if (!tearOpen(state)) return null;
  const cost = tearCost(state.fabric);
  const affordable = state.fabric.threads >= cost;
  const seconds = Math.max(0, Math.ceil(state.lab.grace));

  return (
    <div
      role="alert"
      className="fade-in mx-3 mb-2 flex shrink-0 items-center gap-3 rounded-xl border border-teal-300/60 bg-teal-500/15 px-3 py-2 text-teal-50"
    >
      <Spline aria-hidden="true" className="size-5 shrink-0 animate-pulse text-teal-200" strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">Continuum Tear · {seconds}s</p>
        <p className="text-[11px] leading-snug text-teal-100/80">
          {affordable
            ? 'Stitch it closed to keep the lab and gain a permanent layer.'
            : `Needs ${formatNumber(cost)} Threads. You have ${formatNumber(state.fabric.threads)}. Repair something or publish.`}
        </p>
      </div>
      <button
        type="button"
        onClick={onStitch}
        disabled={!affordable}
        aria-label={`Stitch the Continuum Tear for ${cost} threads`}
        className={`min-h-11 min-w-20 touch-manipulation rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
          affordable ? 'bg-teal-300 text-slate-950 active:bg-teal-200' : 'bg-white/10 text-slate-500'
        }`}
      >
        Stitch
        <span className="block font-numeric text-[10px] font-semibold tabular-nums">{formatNumber(cost)} θ</span>
      </button>
    </div>
  );
}
