import type { ReactElement } from 'react';
import { formatNumber, formatWhole } from '../game/math';
import type { Snapshot } from '../game/store';
import { EquationTicker } from './EquationTicker';
import { FlowTrail } from './FlowTrail';
import { Orb } from './Orb';
import { SurgeButton } from './SurgeButton';

interface StageProps {
  snapshot: Snapshot;
  onTap: () => void;
  onSurge: () => void;
}

/** Top section: title, funds readout, the observation orb, the live equation and the Surge ability. */
export function Stage({ snapshot, onTap, onSurge }: StageProps): ReactElement {
  const { state, derived } = snapshot;
  const surging = state.surge.activeLeft > 0;

  return (
    <section
      aria-label="Lab"
      className="relative flex shrink-0 flex-col gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:gap-3 sm:pt-5"
    >
      <FlowTrail rate={derived.psPerSecond} />

      <header className="relative flex items-center justify-between">
        <h1
          className="font-display text-sm tracking-[0.4em] transition-colors duration-700"
          style={{ color: 'var(--zone-ink)' }}
        >
          NUMERIC
        </h1>
        <p className="font-numeric text-[11px] text-slate-400">
          Lab {state.stats.collapses + 1}
          {state.echoes > 0 ? ` · ${formatNumber(state.echoes)} ε` : ''}
        </p>
      </header>

      <div className="relative text-center" aria-live="off">
        <p className="font-display text-4xl leading-none tabular-nums text-white drop-shadow-[0_0_18px_rgba(125,243,255,0.4)] sm:text-5xl">
          {formatWhole(state.amplitude)}
          <span className="ml-1.5 text-3xl italic sm:text-4xl" style={{ color: 'var(--zone-a)' }}>
            ψ
          </span>
        </p>
        <p
          className={`mt-1 font-numeric text-sm tabular-nums ${surging ? 'text-sky-200' : 'text-violet-200/80'}`}
        >
          +{formatNumber(derived.psPerSecond)} ψ/s
          <span className="sr-only"> research budget</span>
        </p>
      </div>

      <Orb tapGain={derived.tapGain} surging={surging} onTap={onTap} />
      <div className="[@media(max-height:640px)]:hidden">
        <EquationTicker derived={derived} />
      </div>
      <SurgeButton
        surge={state.surge}
        duration={derived.surgeDuration}
        cooldown={derived.surgeCooldown}
        onActivate={onSurge}
      />
    </section>
  );
}
