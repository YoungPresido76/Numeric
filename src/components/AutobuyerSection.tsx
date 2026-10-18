import type { ReactElement } from 'react';
import { AUTOBUYER_INTERVAL, AUTOBUYER_UNLOCK_ECHOES, BUILDINGS, TIERS } from '../game/data';
import {
  AUTOBUYER_MAX_LEVEL,
  amountLabel,
  autobuyerAmount,
  autobuyerCost,
  autobuyersUnlocked,
} from '../game/autobuyers';
import { clamp, formatNumber } from '../game/math';
import type { GameState, Tier } from '../game/types';
import { TIER_ICONS, TIER_TILE } from './icons';

interface AutobuyerSectionProps {
  state: GameState;
  onBuy: (tier: Tier) => void;
  onToggle: (tier: Tier) => void;
}

interface RowProps extends AutobuyerSectionProps {
  tier: Tier;
}

function AutobuyerRow({ tier, state, onBuy, onToggle }: RowProps): ReactElement {
  const def = BUILDINGS[tier];
  const Icon = TIER_ICONS[tier];
  const autobuyer = state.autobuyers[tier];
  const cost = autobuyerCost(tier, autobuyer);
  const affordable = cost !== null && state.echoes >= cost;
  const nextAmount = autobuyer.owned && autobuyer.level < AUTOBUYER_MAX_LEVEL ? amountLabel(autobuyerAmount(autobuyer.level + 1)) : null;

  const status = !autobuyer.owned
    ? 'Not installed'
    : `Buys ${amountLabel(autobuyerAmount(autobuyer.level))} every ${AUTOBUYER_INTERVAL}s · ${autobuyer.enabled ? 'on' : 'paused'}`;
  const action = !autobuyer.owned ? 'Install' : nextAmount === null ? 'Maxed' : `Upgrade to ${nextAmount}`;

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div aria-hidden="true" className={`grid size-11 place-items-center rounded-xl ring-1 ${TIER_TILE[tier]}`}>
        <Icon className="size-6" strokeWidth={1.6} />
      </div>
      <div className="min-w-0">
        <h4 className="truncate text-sm font-semibold text-slate-100">{def.name} autobuyer</h4>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{status}</p>
        {autobuyer.owned ? (
          <button
            type="button"
            onClick={() => onToggle(tier)}
            aria-pressed={autobuyer.enabled}
            aria-label={`${def.name} autobuyer ${autobuyer.enabled ? 'on' : 'paused'}`}
            className={`mt-1.5 min-h-8 touch-manipulation rounded-lg px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              autobuyer.enabled ? 'bg-cyan-300/20 text-cyan-100' : 'bg-white/10 text-slate-400'
            }`}
          >
            {autobuyer.enabled ? 'Running' : 'Paused'}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onBuy(tier)}
        disabled={!affordable}
        aria-label={cost === null ? `${def.name} autobuyer is fully upgraded` : `${action} ${def.name} autobuyer for ${formatNumber(cost)} echoes`}
        className={`flex min-h-12 min-w-24 touch-manipulation flex-col items-center justify-center rounded-xl px-2.5 py-1.5 text-center transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 ${
          affordable ? 'bg-fuchsia-300 text-slate-950 active:scale-95 active:bg-fuchsia-200' : 'bg-white/5 text-slate-500'
        }`}
      >
        <span className="text-xs font-bold">{action}</span>
        {cost !== null ? <span className="font-numeric text-[11px] tabular-nums">{formatNumber(cost)} ε</span> : null}
      </button>
    </li>
  );
}

export function AutobuyerSection({ state, onBuy, onToggle }: AutobuyerSectionProps): ReactElement {
  if (!autobuyersUnlocked(state)) {
    const progress = clamp(state.echoesEarned / AUTOBUYER_UNLOCK_ECHOES, 0, 1);
    return (
      <section className="rounded-2xl border border-dashed border-white/10 px-4 py-4">
        <p className="text-xs tracking-widest text-slate-400 uppercase">Autobuyers</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Locked. Earn {AUTOBUYER_UNLOCK_ECHOES} Echoes in total to automate your projects.
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-fuchsia-300/70" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1.5 font-numeric text-[11px] text-slate-500">
          {formatNumber(state.echoesEarned)} / {AUTOBUYER_UNLOCK_ECHOES} ε earned
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs tracking-widest text-slate-300 uppercase">Autobuyers</h3>
        <p className="font-numeric text-xs text-fuchsia-200 tabular-nums">{formatNumber(state.echoes)} ε to spend</p>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400">
        Paid for with Echoes. Spending them does not weaken your Echo bonuses. Autobuyers buy the highest project
        first and wait while an experiment forbids a purchase.
      </p>
      <ul className="space-y-2.5">
        {TIERS.map((tier) => (
          <AutobuyerRow key={tier} tier={tier} state={state} onBuy={onBuy} onToggle={onToggle} />
        ))}
      </ul>
    </section>
  );
}
