import type { CSSProperties, ReactElement } from 'react';
import { BUILDINGS, TIERS } from '../game/data';
import {
  buildingCost,
  isTierVisible,
  maxAffordable,
  milestoneMult,
  nextMilestone,
} from '../game/engine';
import { amountLabel, autobuyerAmount } from '../game/autobuyers';
import { clamp, formatNumber } from '../game/math';
import type { BuyAmount, Derived, GameState, Tier } from '../game/types';
import { TIER_BAR, TIER_GLOW, TIER_ICONS, TIER_TILE } from './icons';

interface BuildingsPanelProps {
  state: GameState;
  derived: Derived;
  amount: BuyAmount;
  onAmountChange: (amount: BuyAmount) => void;
  onBuy: (tier: Tier, amount: BuyAmount) => void;
  onToggleAuto: (tier: Tier) => void;
}

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
  onToggleAuto: (tier: Tier) => void;
}

function BuildingCard({ tier, state, derived, amount, onBuy, onToggleAuto }: BuildingCardProps): ReactElement {
  const def = BUILDINGS[tier];
  const Icon = TIER_ICONS[tier];
  const owned = state.bought[tier];
  const generated = state.generated[tier];
  const active = owned > 0;

  const fit = maxAffordable(tier, owned, state.amplitude, derived.costDiscount);
  const count = amount === 'max' ? Math.max(1, fit) : amount;
  const cost = buildingCost(tier, owned, count, derived.costDiscount);
  const affordable = amount === 'max' ? fit >= 1 : cost <= state.amplitude;

  const milestone = nextMilestone(tier, owned);
  const mult = milestoneMult(tier, owned);
  const progress = milestone === null ? 1 : clamp(owned / milestone, 0, 1);

  const autobuyer = state.autobuyers[tier];

  const perUnit =
    tier === 0
      ? `+${formatNumber(derived.rates[0] * derived.outputMult)} ψ/s each`
      : `+${formatNumber(derived.rates[tier])} ${def.outputName}/s each`;

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div
        aria-hidden="true"
        style={{ '--tile-glow': TIER_GLOW[tier], animationDelay: `${tier * 0.6}s` } as CSSProperties}
        className={`grid size-11 place-items-center rounded-xl ring-1 ${TIER_TILE[tier]} ${active ? 'tile-active' : ''}`}
      >
        <Icon className="size-6" strokeWidth={1.6} />
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-100">
            <span aria-hidden="true" className="mr-1.5 font-display text-slate-500">
              {def.symbol}
            </span>
            {def.name}
          </h3>
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
            <div className={`h-full rounded-full ${TIER_BAR[tier]}`} style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="font-numeric text-[10px] whitespace-nowrap text-slate-500">
            {milestone === null ? 'all ×2 steps done' : `×2 at ${milestone}`}
          </span>
        </div>
        {autobuyer.owned ? (
          <button
            type="button"
            onClick={() => onToggleAuto(tier)}
            aria-pressed={autobuyer.enabled}
            aria-label={`${def.name} autobuyer ${autobuyer.enabled ? 'running' : 'paused'}. Tap to ${autobuyer.enabled ? 'pause' : 'resume'}.`}
            className={`mt-1.5 min-h-7 touch-manipulation rounded-md px-2 font-numeric text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              autobuyer.enabled ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/10 text-slate-400'
            }`}
          >
            Auto {amountLabel(autobuyerAmount(autobuyer.level))} · {autobuyer.enabled ? 'on' : 'off'}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onBuy(tier, amount)}
        disabled={!affordable}
        aria-label={`Fund ${count} ${def.name} for ${formatNumber(cost)} amplitude`}
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
  onToggleAuto,
}: BuildingsPanelProps): ReactElement {
  const visibleTiers = TIERS.filter((tier) => isTierVisible(state, tier));
  const lockedTier = TIERS.find((tier) => !isTierVisible(state, tier));
  const lockedBelow = lockedTier !== undefined && lockedTier > 0 ? BUILDINGS[(lockedTier - 1) as Tier] : null;

  return (
    <div className="fade-in space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg italic text-slate-200">Projects</h2>
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
          <BuildingCard
            key={tier}
            tier={tier}
            state={state}
            derived={derived}
            amount={amount}
            onBuy={onBuy}
            onToggleAuto={onToggleAuto}
          />
        ))}
        {lockedTier !== undefined && lockedBelow ? (
          <li className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
            A new line of research is waiting. Fund a {lockedBelow.name} to find it.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
