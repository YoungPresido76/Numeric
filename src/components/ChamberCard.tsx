import type { ReactElement } from 'react';
import { formatNumber } from '../game/math';
import type { AutoStitchMode, GameState, VarianceId } from '../game/types';
import { autoStitchUnlocked, enterBlock, VARIANCES, type VarianceDef } from '../game/variance';
import { useConfirm } from '../hooks/useConfirm';
import { Atom } from './icons';

interface ChamberCardProps {
  state: GameState;
  onEnter: (id: VarianceId) => void;
  onLeave: () => void;
  onAutoStitch: (mode: AutoStitchMode) => void;
}

const MODE_ORDER: readonly AutoStitchMode[] = ['off', 'threads', 'any'];

const MODE_LABEL: Readonly<Record<AutoStitchMode, string>> = {
  off: 'Off',
  threads: 'Threads only',
  any: 'Threads, then a Shard',
};

function nextMode(mode: AutoStitchMode): AutoStitchMode {
  const index = MODE_ORDER.indexOf(mode);
  return MODE_ORDER[(index + 1) % MODE_ORDER.length] ?? 'off';
}

function StreakDots({ streak, goal }: { streak: number; goal: number }): ReactElement {
  return (
    <div
      role="img"
      aria-label={`${streak} of ${goal} labs held`}
      className="mt-3 flex items-center gap-1.5"
    >
      {Array.from({ length: goal }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-2 flex-1 rounded-full ${i < streak ? 'bg-violet-300' : 'bg-white/10'}`}
        />
      ))}
      <span className="ml-1 font-numeric text-[11px] text-slate-400 tabular-nums">
        {streak}/{goal}
      </span>
    </div>
  );
}

function VarianceCard({
  def,
  state,
  onEnter,
  onLeave,
}: {
  def: VarianceDef;
  state: GameState;
  onEnter: (id: VarianceId) => void;
  onLeave: () => void;
}): ReactElement {
  const confirm = useConfirm();
  const { multiverse } = state;
  const running = multiverse.active === def.id;
  const cleared = multiverse.cleared.includes(def.id);
  const block = enterBlock(state, def.id);

  let hint: string | null = null;
  if (block === 'started') hint = 'Variances can only be entered at the start of a lab, before anything is bought.';
  else if (block === 'running') hint = 'Another Variance is running. Leave it first.';

  return (
    <section
      className={`rounded-2xl border p-4 ${
        running
          ? 'border-violet-300/50 bg-violet-400/10'
          : cleared
            ? 'border-emerald-300/30 bg-emerald-400/[0.06]'
            : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs tracking-widest text-slate-400 uppercase">Variance</p>
          <h3 className="mt-0.5 font-display text-xl italic text-white">{def.name}</h3>
        </div>
        {cleared ? (
          <span className="shrink-0 rounded-full bg-emerald-300/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
            Cleared
          </span>
        ) : running ? (
          <span className="shrink-0 rounded-full bg-violet-300/20 px-2 py-0.5 text-[11px] font-semibold text-violet-100">
            Running
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-300">{def.tagline}</p>

      <ul className="mt-3 space-y-1 text-xs leading-snug text-slate-400">
        {def.rules.map((rule) => (
          <li key={rule} className="flex gap-2">
            <span aria-hidden="true" className="text-violet-300">
              ◇
            </span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-snug text-slate-300">
        <span className="font-semibold text-slate-100">To clear:</span> {def.victory} A black hole resets the streak but
        keeps you inside.
      </p>
      <p className="mt-1 font-numeric text-[11px] text-slate-400">
        Reward: +{formatNumber(def.rewardShards)} ◇ ({def.shardLabel}). Unlocks: {def.unlocks}
      </p>

      {running ? <StreakDots streak={multiverse.streak} goal={def.goal} /> : null}

      {cleared ? null : running ? (
        <button
          type="button"
          onClick={() => confirm.press(onLeave)}
          className={`mt-4 min-h-12 w-full touch-manipulation rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
            confirm.armed ? 'bg-rose-300 text-slate-950 active:bg-rose-200' : 'bg-white/10 text-slate-200 active:bg-white/15'
          }`}
        >
          {confirm.armed ? 'Tap again to lose the streak' : 'Leave the Variance'}
        </button>
      ) : (
        <>
          <button
            type="button"
            disabled={block !== null}
            onClick={() => onEnter(def.id)}
            className={`mt-4 min-h-12 w-full touch-manipulation rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              block === null ? 'bg-violet-300 text-slate-950 active:bg-violet-200' : 'bg-white/5 text-slate-500'
            }`}
          >
            Enter {def.name}
          </button>
          {hint === null ? null : <p className="mt-2 text-xs leading-snug text-slate-400">{hint}</p>}
        </>
      )}
    </section>
  );
}

function AutoStitchCard({ state, onAutoStitch }: { state: GameState; onAutoStitch: (mode: AutoStitchMode) => void }): ReactElement | null {
  if (!autoStitchUnlocked(state.multiverse)) return null;
  const mode = state.multiverse.autoStitch;
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs tracking-widest text-slate-400 uppercase">Automated stitching</p>
      <p className="mt-1 text-xs leading-snug text-slate-300">
        When a Continuum Tear opens, stitch it closed the moment it appears.
      </p>
      <button
        type="button"
        onClick={() => onAutoStitch(nextMode(mode))}
        className="mt-3 flex min-h-12 w-full touch-manipulation items-center justify-between rounded-xl bg-white/10 px-4 text-sm font-semibold text-slate-100 transition-colors active:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        <span>{MODE_LABEL[mode]}</span>
        <span className="font-numeric text-[11px] text-slate-400">tap to change</span>
      </button>
    </section>
  );
}

/** The Convergence Chamber: Variances to enter, and the automation they unlock. */
export function ChamberCard({ state, onEnter, onLeave, onAutoStitch }: ChamberCardProps): ReactElement {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-1">
        <Atom aria-hidden="true" className="size-4 text-violet-300" />
        <h3 className="font-display text-base italic text-slate-200">Convergence Chamber</h3>
      </div>
      {VARIANCES.map((def) => (
        <VarianceCard key={def.id} def={def} state={state} onEnter={onEnter} onLeave={onLeave} />
      ))}
      <AutoStitchCard state={state} onAutoStitch={onAutoStitch} />
    </div>
  );
}
