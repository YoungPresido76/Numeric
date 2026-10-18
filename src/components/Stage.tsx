import type { ReactElement } from 'react';
import { SURGE_MULT } from '../game/data';
import { setbackChance } from '../game/fabricOps';
import { formatDuration, formatNumber, formatWhole } from '../game/math';
import type { Snapshot } from '../game/store';
import { FlowTrail } from './FlowTrail';
import { Orb } from './Orb';

interface StageProps {
  snapshot: Snapshot;
  onTap: () => void;
  onSurge: () => void;
  onResolve: () => void;
}

function seconds(value: number): string {
  return value < 10 ? `${value.toFixed(1)}s` : formatDuration(value);
}

/**
 * Compact top section: title, funds, the ring-wrapped orb and two status chips.
 * The chips mirror the Surge and waveform rings and give keyboard and
 * screen-reader users a plain button for each.
 */
export function Stage({ snapshot, onTap, onSurge, onResolve }: StageProps): ReactElement {
  const { state, derived } = snapshot;
  const { surge } = state;
  const surging = surge.activeLeft > 0;
  const cooling = !surging && surge.cooldownLeft > 0;
  const tapping = state.fabric.tapping;
  const count = Math.floor(state.fabric.waveforms);
  const risk = setbackChance(state);

  const surgeLabel = surging
    ? `Surge ×${SURGE_MULT} · ${seconds(surge.activeLeft)}`
    : cooling
      ? `Recharging · ${seconds(surge.cooldownLeft)}`
      : 'Surge ready';

  return (
    <section aria-label="Lab" className="relative flex shrink-0 flex-col gap-1 px-4 pt-2 pb-1">
      <FlowTrail rate={derived.psPerSecond} />

      <header className="relative flex items-center justify-between">
        <h1
          className="ghost-text font-display text-sm tracking-[0.4em] transition-colors duration-700"
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
        <p className="ghost-text font-display text-4xl leading-none tabular-nums text-white drop-shadow-[0_0_18px_rgba(125,243,255,0.4)] sm:text-[2.75rem]">
          {formatWhole(state.amplitude)}
          <span className="ml-1.5 italic" style={{ color: 'var(--zone-a)' }}>
            ψ
          </span>
        </p>
        <p className={`ghost-text mt-1 font-numeric text-xs tabular-nums ${surging ? 'text-sky-200' : 'text-violet-200/80'}`}>
          +{formatNumber(derived.psPerSecond)} ψ/s
          <span className="sr-only"> research budget</span>
          {derived.dilated ? (
            <span className="ml-2 text-teal-200">dilated {formatDuration(Math.ceil(state.fabric.dilation.activeLeft))}</span>
          ) : null}
        </p>
      </div>

      <Orb
        tapGain={derived.tapGain}
        surge={surge}
        surgeDuration={derived.surgeDuration}
        surgeCooldown={derived.surgeCooldown}
        waveform={tapping}
        waveforms={state.fabric.waveforms}
        setbackRisk={risk}
        onTap={onTap}
        onSurge={onSurge}
        onResolve={onResolve}
      />

      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={onSurge}
          disabled={surging || cooling}
          aria-label={`Superposition Surge. ${surgeLabel}`}
          className={`h-8 touch-manipulation rounded-full border px-3 font-numeric text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
            surging
              ? 'border-sky-200/60 bg-sky-300/10 text-sky-100'
              : cooling
                ? 'border-white/10 bg-white/[0.04] text-slate-400'
                : 'border-cyan-300/50 bg-white/[0.04] text-cyan-50 active:scale-95'
          }`}
        >
          ⚡ {surgeLabel}
        </button>
        {tapping ? (
          <button
            type="button"
            onClick={onResolve}
            disabled={count < 1}
            aria-label={`Observe ${count} unresolved waveforms${risk > 0 ? `. ${Math.round(risk * 100)} percent chance of a setback` : ''}`}
            className={`h-8 touch-manipulation rounded-full border px-3 font-numeric text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              count < 1
                ? 'border-white/10 bg-white/[0.04] text-slate-500'
                : risk > 0
                  ? 'border-amber-300/60 bg-amber-300/10 text-amber-100 active:scale-95'
                  : 'border-teal-300/60 bg-teal-300/10 text-teal-100 active:scale-95'
            }`}
          >
            ∿ {count < 1 ? 'Tap to build waves' : `Observe ${formatNumber(count)}${risk > 0 ? ` · ${Math.round(risk * 100)}% risk` : ''}`}
          </button>
        ) : null}
      </div>
    </section>
  );
}
