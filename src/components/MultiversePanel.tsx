import type { ReactElement } from 'react';
import { MULTIVERSE_UNLOCK_WEAVES, TEAR_SHARD_COST } from '../game/data';
import { canConverge, convergePreview } from '../game/multiverse';
import { clamp, formatNumber } from '../game/math';
import { useConfirm } from '../hooks/useConfirm';
import type { GameState } from '../game/types';
import { Atom, Gem } from './icons';

interface MultiversePanelProps {
  state: GameState;
  onConverge: () => void;
}

/** Shown in place of the Multiverse until two Weaves are on the record. */
export function MultiverseLocked({ weaves }: { weaves: number }): ReactElement {
  const done = Math.min(weaves, MULTIVERSE_UNLOCK_WEAVES);
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-dashed border-violet-300/25 bg-violet-400/5 p-3">
      <div
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/15 text-violet-200 ring-1 ring-violet-300/30"
      >
        <Atom className="size-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-100">Multiverse · 5D</h3>
        <p className="mt-0.5 text-xs leading-snug text-slate-400">
          Opens after {MULTIVERSE_UNLOCK_WEAVES} Weaves. {done} of {MULTIVERSE_UNLOCK_WEAVES} done.
        </p>
      </div>
    </section>
  );
}

function ShardBalance({ state }: { state: GameState }): ReactElement {
  const { shards, shardsEarned, converges } = state.multiverse;
  return (
    <section className="rounded-2xl border border-violet-300/30 bg-violet-400/10 p-4">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/20 text-violet-100 ring-1 ring-violet-300/40"
        >
          <Gem className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs tracking-widest text-slate-400 uppercase">Shards</p>
          <p className="font-display text-3xl leading-none text-white tabular-nums">
            {formatNumber(shards)}
            <span className="ml-1.5 text-xl text-violet-300 italic">◇</span>
          </p>
        </div>
      </div>
      <p className="mt-2 font-numeric text-[11px] text-slate-400">
        {formatNumber(shardsEarned)} earned over {formatNumber(converges)} {converges === 1 ? 'Converge' : 'Converges'}.
      </p>
      <p className="mt-2 text-xs leading-snug text-slate-300">
        Shards are the top currency. For now they stitch a Continuum Tear for {TEAR_SHARD_COST} Shard when Threads run
        short.
      </p>
    </section>
  );
}

function ConvergeCard({ state, onConverge }: MultiversePanelProps): ReactElement {
  const confirm = useConfirm();
  const preview = convergePreview(state);
  const ready = canConverge(state);
  const span = Math.max(1, preview.nextAt - preview.previousAt);
  const progress = clamp((preview.threads - preview.previousAt) / span, 0, 1);

  return (
    <section
      className={`rounded-2xl border p-4 ${
        ready ? 'border-violet-300/40 bg-violet-400/10' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <p className="text-xs tracking-widest text-slate-400 uppercase">Converge the Fabric</p>
      <p className="mt-2 font-display text-4xl text-white tabular-nums">
        +{formatNumber(preview.shards)}
        <span className="ml-1.5 text-2xl text-violet-300 italic">◇</span>
      </p>
      <p className="mt-1 font-numeric text-xs text-violet-100/80">
        Paid from the {formatNumber(preview.threads)} Threads drawn since the last Converge.
      </p>

      <div className="mt-3" aria-hidden="true">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-violet-300/80 transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <p className="mt-1.5 font-numeric text-[11px] text-slate-400">
        {formatNumber(preview.threads)} / {formatNumber(preview.nextAt)} θ for {preview.shards === 0 ? 'the first' : 'one more'} Shard
      </p>

      <div className="mt-3 space-y-1 text-xs leading-relaxed text-slate-400">
        <p>
          <span className="font-semibold text-slate-200">Wipes:</span> this lab, all Threads, Thread upgrades, Cost
          Decoherence, Symmetric Pairs, Shattered layers and the Weave count.
        </p>
        <p>
          <span className="font-semibold text-slate-200">Keeps:</span> Echoes, autobuyers, Shards, research clears,
          statistics and settings.
        </p>
        <p>Converging pays Shards instead of Echoes or Threads.</p>
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={() => confirm.press(onConverge)}
        className={`mt-4 min-h-12 w-full touch-manipulation rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
          !ready
            ? 'bg-white/5 text-slate-500'
            : confirm.armed
              ? 'bg-rose-300 text-slate-950 active:bg-rose-200'
              : 'bg-violet-300 text-slate-950 active:bg-violet-200'
        }`}
      >
        {!ready ? 'Draw more Threads first' : confirm.armed ? 'Tap again to wipe the Fabric' : 'Converge'}
      </button>
    </section>
  );
}

/** Multiverse (5D). Converging the Fabric pays Shards. */
export function MultiversePanel({ state, onConverge }: MultiversePanelProps): ReactElement {
  return (
    <div className="fade-in space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg italic text-slate-200">Multiverse</h2>
        <p className="font-numeric text-xs text-slate-500">5D</p>
      </div>
      <ShardBalance state={state} />
      <ConvergeCard state={state} onConverge={onConverge} />
    </div>
  );
}
