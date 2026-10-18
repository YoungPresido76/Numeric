import type { ReactElement } from 'react';
import { WAVE_STORE_CAP } from '../game/data';
import { setbackChance, waveWeight } from '../game/fabricOps';
import { formatNumber } from '../game/math';
import type { GameState } from '../game/types';
import { AudioWaveform } from './icons';

interface WaveformBarProps {
  state: GameState;
  onResolve: () => void;
}

/**
 * Superposition Tapping: shows the Unresolved Waveforms the player has built up
 * and the button that collapses them. The button warns when the lab is in a
 * poor state, because observing then can collapse into a setback.
 */
export function WaveformBar({ state, onResolve }: WaveformBarProps): ReactElement {
  const count = Math.floor(state.fabric.waveforms);
  const chance = setbackChance(state);
  const weight = waveWeight(state);
  const risky = chance > 0;
  const empty = count < 1;

  return (
    <div
      className={`mx-auto flex h-11 w-full max-w-xs items-stretch overflow-hidden rounded-xl border bg-white/[0.04] ${
        risky ? 'border-amber-300/40' : 'border-teal-300/40'
      }`}
    >
      <div className="relative flex min-w-0 flex-1 flex-col justify-center px-3">
        <p className="flex items-center gap-1.5 truncate font-numeric text-xs text-slate-200 tabular-nums">
          <AudioWaveform aria-hidden="true" className="size-3.5 shrink-0 text-teal-200" strokeWidth={1.8} />
          {formatNumber(count)} unresolved
          {count >= WAVE_STORE_CAP ? <span className="text-slate-500"> (full)</span> : null}
        </p>
        <p className="truncate text-[10px] text-slate-500">
          {risky ? `Poor moment: ${Math.round(chance * 100)}% setback risk` : 'Tap fast for bigger bursts'}
        </p>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-300/70 transition-[width] duration-200"
          style={{ width: `${weight * 100}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onResolve}
        disabled={empty}
        aria-label={`Observe ${count} unresolved waveforms${risky ? `. ${Math.round(chance * 100)} percent chance of a setback` : ''}`}
        className={`min-w-24 touch-manipulation px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-300 ${
          empty
            ? 'bg-white/5 text-slate-500'
            : risky
              ? 'bg-amber-300 text-slate-950 active:bg-amber-200'
              : 'bg-teal-300 text-slate-950 active:bg-teal-200'
        }`}
      >
        Observe
      </button>
    </div>
  );
}
