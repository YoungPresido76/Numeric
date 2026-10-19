import type { ReactElement } from 'react';
import { TEAR_SHARD_COST } from '../game/data';
import { canStitch } from '../game/fabricOps';
import { tearCost, tearOpen } from '../game/fabric';
import { formatNumber } from '../game/math';
import { multiverseUnlocked } from '../game/multiverse';
import type { GameState, StitchCurrency } from '../game/types';
import { Spline } from './icons';

interface TearAlertProps {
  state: GameState;
  onStitch: (currency: StitchCurrency) => void;
}

interface StitchButtonProps {
  label: string;
  price: string;
  enabled: boolean;
  tone: 'threads' | 'shards';
  ariaLabel: string;
  onClick: () => void;
}

function StitchButton({ label, price, enabled, tone, ariaLabel, onClick }: StitchButtonProps): ReactElement {
  const active = tone === 'shards' ? 'bg-violet-300 text-slate-950 active:bg-violet-200' : 'bg-teal-300 text-slate-950 active:bg-teal-200';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      aria-label={ariaLabel}
      className={`min-h-11 min-w-16 touch-manipulation rounded-lg px-2.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
        enabled ? active : 'bg-white/10 text-slate-500'
      }`}
    >
      {label}
      <span className="block font-numeric text-[10px] font-semibold tabular-nums">{price}</span>
    </button>
  );
}

/**
 * A Continuum Tear: the last-chance window once Fabric is open. Shown on every tab
 * so the player can stitch it closed with Threads, or with a Shard once the
 * Multiverse is open, before the lab falls into a black hole.
 */
export function TearAlert({ state, onStitch }: TearAlertProps): ReactElement | null {
  if (!tearOpen(state)) return null;
  const cost = tearCost(state.fabric);
  const viaThreads = canStitch(state, 'threads');
  const shardsOpen = multiverseUnlocked(state);
  const viaShards = canStitch(state, 'shards');
  const seconds = Math.max(0, Math.ceil(state.lab.grace));

  const hint = viaThreads || viaShards
    ? 'Stitch it closed to keep the lab and gain a permanent layer.'
    : shardsOpen
      ? `Needs ${formatNumber(cost)} Threads or ${TEAR_SHARD_COST} Shard. Repair something or publish.`
      : `Needs ${formatNumber(cost)} Threads. You have ${formatNumber(state.fabric.threads)}. Repair something or publish.`;

  return (
    <div
      role="alert"
      className="fade-in mx-3 mb-2 flex shrink-0 items-center gap-3 rounded-xl border border-teal-300/60 bg-teal-500/15 px-3 py-2 text-teal-50"
    >
      <Spline aria-hidden="true" className="size-5 shrink-0 animate-pulse text-teal-200" strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">Continuum Tear · {seconds}s</p>
        <p className="text-[11px] leading-snug text-teal-100/80">{hint}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <StitchButton
          label="Stitch"
          price={`${formatNumber(cost)} θ`}
          enabled={viaThreads}
          tone="threads"
          ariaLabel={`Stitch the Continuum Tear for ${cost} threads`}
          onClick={() => onStitch('threads')}
        />
        {shardsOpen ? (
          <StitchButton
            label="Stitch"
            price={`${TEAR_SHARD_COST} ◇`}
            enabled={viaShards}
            tone="shards"
            ariaLabel={`Stitch the Continuum Tear for ${TEAR_SHARD_COST} shard`}
            onClick={() => onStitch('shards')}
          />
        ) : null}
      </div>
    </div>
  );
}
