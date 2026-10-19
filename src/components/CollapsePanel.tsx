import type { ReactElement } from 'react';
import {
  BLACK_HOLE_PAYOUT,
  ECHO_BONUS_EACH,
  ECHO_DISCOUNT_CAP,
  ECHO_DISCOUNT_EACH,
  PROJECT_NAMES,
  RISK_MULT_MAX,
} from '../game/data';
import {
  amplitudeForEchoes,
  costDiscountFor,
  echoMultFor,
  echoPayout,
  legacyGrantFor,
} from '../game/engine';
import { zoneOf } from '../game/lab';
import { clamp, formatNumber } from '../game/math';
import { useConfirm } from '../hooks/useConfirm';
import type { GameState, Tier } from '../game/types';
import { AutobuyerSection } from './AutobuyerSection';
import { zoneWord } from './Charts';
import { Galaxy } from './Galaxy';

interface CollapsePanelProps {
  state: GameState;
  onCollapse: () => void;
  onAutoBuy: (tier: Tier) => void;
  onAutoToggle: (tier: Tier) => void;
}

function percent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

export function CollapsePanel({ state, onCollapse, onAutoBuy, onAutoToggle }: CollapsePanelProps): ReactElement {
  const confirm = useConfirm();
  const payout = echoPayout(state);
  const ready = payout.base >= 1;

  const nextAt = amplitudeForEchoes(payout.base + 1);
  const previousAt = amplitudeForEchoes(payout.base);
  const progress = clamp((state.runAmplitude - previousAt) / (nextAt - previousAt), 0, 1);

  const afterEchoes = state.echoesEarned + payout.published;
  const currentMult = echoMultFor(state.echoesEarned);
  const currentDiscount = costDiscountFor(state.echoesEarned);
  const closest = zoneOf(state.lab.minStability);
  const risky = payout.mult > 1.001;

  return (
    <div className="fade-in space-y-3">
      <h2 className="font-display text-lg italic text-slate-200">Collapse</h2>

      <section className="relative overflow-hidden rounded-2xl border border-white/10 p-4">
        <Galaxy variant="violet" />
        <div className="relative">
          <div className="flex items-baseline justify-between">
            <p className="text-xs tracking-widest text-slate-300 uppercase">Echoes</p>
            <p className="font-display text-3xl text-fuchsia-200 tabular-nums">
              {formatNumber(state.echoes)}
              <span className="ml-1 text-xl italic">ε</span>
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-black/40 px-2 py-2 backdrop-blur-sm">
              <dt className="text-[10px] tracking-wide text-slate-400 uppercase">Production</dt>
              <dd className="mt-0.5 font-numeric text-sm text-fuchsia-100">×{formatNumber(currentMult)}</dd>
            </div>
            <div className="rounded-xl bg-black/40 px-2 py-2 backdrop-blur-sm">
              <dt className="text-[10px] tracking-wide text-slate-400 uppercase">Project cost</dt>
              <dd className="mt-0.5 font-numeric text-sm text-fuchsia-100">−{percent(currentDiscount)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-snug text-slate-300">
            Each Echo earned adds {percent(ECHO_BONUS_EACH)} production and {percent(ECHO_DISCOUNT_EACH)} off project
            costs (up to {percent(ECHO_DISCOUNT_CAP)}). Spending Echoes on autobuyers keeps these bonuses.
          </p>
        </div>
      </section>

      <section
        className={`rounded-2xl border p-4 ${
          ready ? 'border-fuchsia-300/40 bg-fuchsia-400/10' : 'border-white/10 bg-white/[0.04]'
        }`}
      >
        <p className="text-xs tracking-widest text-slate-400 uppercase">Publish this lab</p>
        <p className="mt-2 font-display text-4xl text-white tabular-nums">
          +{formatNumber(payout.published)}
          <span className="ml-1.5 text-2xl text-fuchsia-300 italic">ε</span>
        </p>
        {ready ? (
          <div className="mt-1 space-y-1 font-numeric text-xs text-fuchsia-100/80">
            <p>
              {formatNumber(payout.base)} base × {payout.mult.toFixed(2)} risk
            </p>
            <p>
              {payout.memory > 0 ? `Includes +${formatNumber(payout.memory)} ε from Echo Memory. ` : ''}
              {risky
                ? `This lab came close to failing (${zoneWord(closest).toLowerCase()}) and survived, so it pays more.`
                : `A calm lab pays the base rate. A close call that survives pays up to ×${RISK_MULT_MAX}.`}
            </p>
            <p>
              Afterwards: ×{formatNumber(echoMultFor(afterEchoes))} production, −
              {percent(costDiscountFor(afterEchoes))} costs, and a {formatNumber(legacyGrantFor(afterEchoes))} ψ
              legacy grant.
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            Produce {formatNumber(amplitudeForEchoes(1))} ψ in a single lab to earn your first Echo.
          </p>
        )}

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-fuchsia-300" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1.5 font-numeric text-[11px] text-slate-500">
          {formatNumber(state.runAmplitude)} / {formatNumber(nextAt)} ψ for the next base Echo
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
          {!ready ? 'Not enough funding yet' : confirm.armed ? 'Tap again to confirm' : 'Publish and close lab'}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-400">
        <p>
          <span className="font-semibold text-slate-200">Resets:</span> amplitude, projects, upgrades, research,
          Surge, experiments and stability.
        </p>
        <p className="mt-1">
          <span className="font-semibold text-slate-200">Keeps:</span> Echoes, autobuyers, Threads and Thread upgrades,
          Shards, statistics, settings, and any perks carried forward.
        </p>
        <p className="mt-1">
          <span className="font-semibold text-slate-200">If stability runs out,</span> the lab falls into a black hole
          and pays only {percent(BLACK_HOLE_PAYOUT)} of the Echoes. Publish first.
        </p>
        {state.perks.length > 0 ? (
          <p className="mt-1">
            <span className="font-semibold text-slate-200">Carried forward:</span>{' '}
            {state.perks.map((tier) => PROJECT_NAMES[tier]).join(', ')} appear earlier.
          </p>
        ) : null}
      </section>

      <AutobuyerSection state={state} onBuy={onAutoBuy} onToggle={onAutoToggle} />
    </div>
  );
}
