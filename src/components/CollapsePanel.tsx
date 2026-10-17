import type { ReactElement } from 'react';
import { ECHO_BONUS_EACH, ECHO_DISCOUNT_CAP, ECHO_DISCOUNT_EACH } from '../game/data';
import { amplitudeForEchoes, costDiscountFor, echoGain, echoMultFor } from '../game/engine';
import { clamp, formatNumber } from '../game/math';
import { useConfirm } from '../hooks/useConfirm';
import type { GameState } from '../game/types';

interface CollapsePanelProps {
  state: GameState;
  onCollapse: () => void;
}

function percent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

export function CollapsePanel({ state, onCollapse }: CollapsePanelProps): ReactElement {
  const confirm = useConfirm();
  const gain = echoGain(state.runAmplitude);
  const ready = gain >= 1;

  const nextAt = amplitudeForEchoes(gain + 1);
  const previousAt = amplitudeForEchoes(gain);
  const progress = clamp((state.runAmplitude - previousAt) / (nextAt - previousAt), 0, 1);

  const afterEchoes = state.echoes + gain;
  const currentMult = echoMultFor(state.echoes);
  const currentDiscount = costDiscountFor(state.echoes);

  return (
    <div className="fade-in space-y-3">
      <h2 className="font-display text-lg italic text-slate-200">Collapse</h2>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs tracking-widest text-slate-400 uppercase">Echoes</p>
          <p className="font-display text-3xl text-fuchsia-200 tabular-nums">
            {formatNumber(state.echoes)}
            <span className="ml-1 text-xl italic">ε</span>
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white/5 px-2 py-2">
            <dt className="text-[10px] tracking-wide text-slate-500 uppercase">Production</dt>
            <dd className="mt-0.5 font-numeric text-sm text-fuchsia-100">×{formatNumber(currentMult)}</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-2 py-2">
            <dt className="text-[10px] tracking-wide text-slate-500 uppercase">Building cost</dt>
            <dd className="mt-0.5 font-numeric text-sm text-fuchsia-100">−{percent(currentDiscount)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-snug text-slate-500">
          Each Echo adds {percent(ECHO_BONUS_EACH)} production and {percent(ECHO_DISCOUNT_EACH)} off building
          costs (up to {percent(ECHO_DISCOUNT_CAP)}).
        </p>
      </section>

      <section
        className={`rounded-2xl border p-4 ${
          ready ? 'border-fuchsia-300/40 bg-fuchsia-400/10' : 'border-white/10 bg-white/[0.04]'
        }`}
      >
        <p className="text-xs tracking-widest text-slate-400 uppercase">Collapse this reality</p>
        <p className="mt-2 font-display text-4xl text-white tabular-nums">
          +{formatNumber(gain)}
          <span className="ml-1.5 text-2xl text-fuchsia-300 italic">ε</span>
        </p>
        {ready ? (
          <p className="mt-1 font-numeric text-xs text-fuchsia-100/80">
            Afterwards: ×{formatNumber(echoMultFor(afterEchoes))} production, −
            {percent(costDiscountFor(afterEchoes))} costs
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            Produce {formatNumber(amplitudeForEchoes(1))} ψ in a single reality to earn your first Echo.
          </p>
        )}

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-fuchsia-300" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1.5 font-numeric text-[11px] text-slate-500">
          {formatNumber(state.runAmplitude)} / {formatNumber(nextAt)} ψ for the next Echo
        </p>

        <button
          type="button"
          disabled={!ready}
          onClick={() => confirm.press(onCollapse)}
          className={`mt-4 min-h-12 w-full touch-manipulation rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 ${
            !ready
              ? 'bg-white/5 text-slate-500'
              : confirm.armed
                ? 'bg-amber-300 text-slate-950'
                : 'bg-fuchsia-300 text-slate-950 active:bg-fuchsia-200'
          }`}
        >
          {!ready ? 'Not enough amplitude yet' : confirm.armed ? 'Tap again to confirm' : 'Collapse reality'}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-400">
        <p>
          <span className="font-semibold text-slate-200">Resets:</span> amplitude, buildings, upgrades and Surge.
        </p>
        <p className="mt-1">
          <span className="font-semibold text-slate-200">Keeps:</span> Echoes, statistics and settings.
        </p>
      </section>
    </div>
  );
}
