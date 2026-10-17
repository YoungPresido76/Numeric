import type { ReactElement } from 'react';
import { formatNumber, formatWhole } from '../game/math';
import type { Snapshot } from '../game/store';
import { EquationTicker } from './EquationTicker';
import { Orb } from './Orb';
import { SurgeButton } from './SurgeButton';

interface StageProps {
  snapshot: Snapshot;
  onTap: () => void;
  onSurge: () => void;
}

/** Top section: title, amplitude readout, the tap orb, the live equation and the Surge ability. */
export function Stage({ snapshot, onTap, onSurge }: StageProps): ReactElement {
  const { state, derived } = snapshot;
  const surging = state.surge.activeLeft > 0;

  return (
    <section
      aria-label="Reality"
      className="flex shrink-0 flex-col gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:gap-3 sm:pt-5"
    >
      <header className="flex items-center justify-between">
        <h1 className="font-display text-sm tracking-[0.4em] text-cyan-100/80">NUMERIC</h1>
        <p className="font-numeric text-[11px] text-slate-400">
          Reality {state.stats.collapses + 1}
          {state.echoes > 0 ? ` · ${formatNumber(state.echoes)} ε` : ''}
        </p>
      </header>

      <div className="text-center" aria-live="off">
        <p className="font-display text-4xl leading-none tabular-nums text-white drop-shadow-[0_0_18px_rgba(125,243,255,0.4)] sm:text-5xl">
          {formatWhole(state.amplitude)}
          <span className="ml-1.5 text-3xl italic text-cyan-300 sm:text-4xl">ψ</span>
        </p>
        <p className={`mt-1 font-numeric text-sm tabular-nums ${surging ? 'text-amber-300' : 'text-violet-200/80'}`}>
          +{formatNumber(derived.psPerSecond)} ψ/s
        </p>
      </div>

      <Orb tapGain={derived.tapGain} surging={surging} onTap={onTap} />
      <EquationTicker derived={derived} />
      <SurgeButton
        surge={state.surge}
        duration={derived.surgeDuration}
        cooldown={derived.surgeCooldown}
        onActivate={onSurge}
      />
    </section>
  );
}
