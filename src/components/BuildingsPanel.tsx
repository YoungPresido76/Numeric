import type { ReactElement } from 'react';
import { BUILDINGS, TIERS } from '../game/data';
import {
  buildingCost,
  isTierVisible,
  maxAffordable,
  milestoneMult,
  nextMilestone,
} from '../game/engine';
import { clamp, formatNumber } from '../game/math';
import type { BuyAmount, Derived, GameState, Tier } from '../game/types';

interface BuildingsPanelProps {
  state: GameState;
  derived: Derived;
  amount: BuyAmount;
  onAmountChange: (amount: BuyAmount) => void;
  onBuy: (tier: Tier, amount: BuyAmount) => void;
}

interface TierStyle {
  tile: string;
  bar: string;
}

const TIER_STYLES: Readonly<Record<Tier, TierStyle>> = {
  0: { tile: 'bg-cyan-400/15 text-cyan-200 ring-cyan-300/30', bar: 'bg-cyan-300' },
  1: { tile: 'bg-violet-400/15 text-violet-200 ring-violet-300/30', bar: 'bg-violet-300' },
  2: { tile: 'bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-300/30', bar: 'bg-fuchsia-300' },
  3: { tile: 'bg-amber-400/15 text-amber-200 ring-amber-300/30', bar: 'bg-amber-300' },
};

const AMOUNTS: readonly { value: BuyAmount; label: string }[] = [
  { value: 1, label: '×1' },
  { value: 10, label: '×10' },
  { value: 'max', label: 'Max' },
];

interface BuildingCardProps {
  tier: Tier;
  state: GameState;
  derived: Derived;
  amount: BuyAmount;
  onBuy: (tier: Tier, amount: BuyAmount) => void;
}

function BuildingCard({ tier, state, derived, amount, onBuy }: BuildingCardProps): ReactElement {
  const def = BUILDINGS[tier];
  const style = TIER_STYLES[tier];
  const owned = state.bought[tier];
  const generated = state.generated[tier];

  const fit = maxAffordable(tier, owned, state.amplitude, derived.costDiscount);
  const count = amount === 'max' ? Math.max(1, fit) : amount;
  const cost = buildingCost(tier, owned, count, derived.costDiscount);
  const affordable = amount === 'max' ? fit >= 1 : cost <= state.amplitude;

  const milestone = nextMilestone(owned);
  const mult = milestoneMult(owned);
  const progress = milestone === null ? 1 : clamp(owned / milestone, 0, 1);

  const perUnit =
    tier === 0
      ? `+${formatNumber(derived.rates[0] * derived.outputMult)} ψ/s each`
      : `+${formatNumber(derived.rates[tier])} ${def.outputName}/s each`;

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div
        aria-hidden="true"
        className={`grid size-11 place-items-center rounded-xl font-display text-2xl ring-1 ${style.tile}`}
      >
        {def.symbol}
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-100">{def.name}</h3>
          {mult > 1 ? (
            <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 font-numeric text-[10px] text-cyan-200">
              ×{formatNumber(mult)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 font-numeric text-xs text-slate-300 tabular-nums">
          {formatNumber(owned)} owned
          {generated >= 0.05 ? (
            <span className="text-slate-500"> (+{formatNumber(generated)})</span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate font-numeric text-[11px] text-slate-500">{perUnit}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="font-numeric text-[10px] whitespace-nowrap text-slate-500">
            {milestone === null ? 'max ×2 chain' : `×2 at ${milestone}`}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onBuy(tier, amount)}
        disabled={!affordable}
        aria-label={`Buy ${count} ${def.name} for ${formatNumber(cost)} amplitude`}
        className={`flex min-h-12 min-w-24 touch-manipulation flex-col items-center justify-center rounded-xl px-3 py-1.5 text-center transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
          affordable
            ? 'bg-cyan-300 text-slate-950 active:scale-95 active:bg-cyan-200'
            : 'bg-white/5 text-slate-500'
        }`}
      >
        <span className="text-xs font-bold">Buy ×{formatNumber(count)}</span>
        <span className="font-numeric text-[11px] tabular-nums">{formatNumber(cost)} ψ</span>
      </button>
    </li>
  );
}

export function BuildingsPanel({
  state,
  derived,
  amount,
  onAmountChange,
  onBuy,
}: BuildingsPanelProps): ReactElement {
  const visibleTiers = TIERS.filter((tier) => isTierVisible(state, tier));
  const lockedTier = TIERS.find((tier) => !isTierVisible(state, tier));
  const lockedBelow = lockedTier !== undefined && lockedTier > 0 ? BUILDINGS[(lockedTier - 1) as Tier] : null;

  return (
    <div className="fade-in space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg italic text-slate-200">Realities</h2>
        <div role="radiogroup" aria-label="Buy amount" className="flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
          {AMOUNTS.map((option) => {
            const selected = option.value === amount;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onAmountChange(option.value)}
                className={`min-h-9 min-w-12 touch-manipulation rounded-[10px] px-3 font-numeric text-xs font-semibold transition-colors ${
                  selected ? 'bg-cyan-300 text-slate-950' : 'text-slate-400 active:text-slate-100'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="space-y-2.5">
        {visibleTiers.map((tier) => (
          <BuildingCard key={tier} tier={tier} state={state} derived={derived} amount={amount} onBuy={onBuy} />
        ))}
        {lockedTier !== undefined && lockedBelow ? (
          <li className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
            An undiscovered reality stirs. Buy a {lockedBelow.name} to find it.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
