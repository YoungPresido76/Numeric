import type { CSSProperties, ReactElement } from 'react';
import { NEUTRALIZE_WINDOW, PROJECT_NAMES } from '../game/data';
import { canObserve, neutralizeCost, taskStatus } from '../game/lab';
import { describeTask } from '../game/narrative';
import { clamp, formatNumber } from '../game/math';
import type { Experiment, Failure, GameState, ObserveTarget } from '../game/types';
import { Eye, ShieldCheck, TIER_GLOW, TIER_ICONS, TIER_TILE } from './icons';
import './hud.css';

interface ExperimentDockProps {
  state: GameState;
  onObserve: (target: ObserveTarget) => void;
  onNeutralize: (id: number) => void;
}

const MAX_VISIBLE = 3;

interface ExperimentCardProps {
  state: GameState;
  experiment: Experiment;
  surging: boolean;
  onObserve: (target: ObserveTarget) => void;
}

function ExperimentCard({ state, experiment, surging, onObserve }: ExperimentCardProps): ReactElement {
  const Icon = TIER_ICONS[experiment.tier];
  const observable = canObserve(experiment, surging);
  const { task } = experiment;
  const status = taskStatus(state, experiment);
  const left = Math.max(0, Math.ceil(task.limit - experiment.age));
  const clock = clamp(1 - experiment.age / task.limit, 0, 1);
  const urgent = left <= 8;
  const name = PROJECT_NAMES[experiment.tier];

  return (
    <li
      className="alert-in relative overflow-hidden rounded-2xl border border-white/15 bg-panel/95 shadow-lg shadow-black/40 backdrop-blur"
      style={{ '--tile-glow': TIER_GLOW[experiment.tier] } as CSSProperties}
    >
      <div className="flex items-center gap-3 p-2.5">
        <span
          aria-hidden="true"
          className={`tile-active grid size-9 shrink-0 place-items-center rounded-lg ring-1 ${TIER_TILE[experiment.tier]}`}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] leading-tight font-semibold text-slate-100">{describeTask(task)}</p>
          <p className="mt-1 flex items-center gap-1.5 font-numeric text-[11px] text-slate-400">
            <span aria-hidden="true" className="superposed inline-block size-1.5 shrink-0 rounded-full bg-cyan-300" />
            <span className="truncate">
              {name} · {status.label}
            </span>
            <span className={`ml-auto shrink-0 tabular-nums ${urgent ? 'text-amber-300' : 'text-slate-300'}`}>
              {task.kind === 'hold' ? `hold ${left}s` : `${left}s`}
            </span>
          </p>
        </div>
        {observable ? (
          <button
            type="button"
            onClick={() => onObserve(experiment.id)}
            aria-label={`Observe ${name} to complete it instantly`}
            className="flex min-h-11 min-w-[5.5rem] touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-sky-200 px-3 text-xs font-bold text-slate-950 active:scale-95 active:bg-sky-100"
          >
            <Eye aria-hidden="true" className="size-4" />
            Observe
          </button>
        ) : null}
      </div>
      <div className="relative h-0.5 bg-white/10" aria-hidden="true">
        <div className={`h-full ${urgent ? 'bg-amber-300/80' : 'bg-cyan-300/70'}`} style={{ width: `${clock * 100}%` }} />
      </div>
      <div className="relative h-0.5 bg-white/5" aria-hidden="true">
        <div className="h-full bg-emerald-300/80 transition-[width] duration-200" style={{ width: `${status.fraction * 100}%` }} />
      </div>
    </li>
  );
}

interface FailureCardProps {
  failure: Failure;
  cost: number;
  affordable: boolean;
  onNeutralize: (id: number) => void;
}

function FailureCard({ failure, cost, affordable, onNeutralize }: FailureCardProps): ReactElement {
  const Icon = TIER_ICONS[failure.tier];
  const name = PROJECT_NAMES[failure.tier];
  const progress = clamp(failure.left / NEUTRALIZE_WINDOW, 0, 1);

  return (
    <li className="alert-in relative overflow-hidden rounded-2xl border border-rose-400/40 bg-panel/95 shadow-lg shadow-black/40 backdrop-blur">
      <div className="flex items-center gap-3 p-2.5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-200 ring-1 ring-rose-300/30"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-rose-100">{name} failed</p>
          <p className="mt-0.5 font-numeric text-[11px] text-slate-400">
            Spreading. {Math.ceil(failure.left)}s to neutralize
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNeutralize(failure.id)}
          disabled={!affordable}
          aria-label={`Neutralize ${name} failure for ${formatNumber(cost)} amplitude`}
          className={`flex min-h-11 min-w-[5.5rem] touch-manipulation flex-col items-center justify-center rounded-xl px-3 text-xs font-bold ${
            affordable ? 'bg-rose-300 text-slate-950 active:scale-95 active:bg-rose-200' : 'bg-white/5 text-slate-500'
          }`}
        >
          <span className="flex items-center gap-1">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Neutralize
          </span>
          <span className="font-numeric text-[10px] font-medium tabular-nums">{formatNumber(cost)} ψ</span>
        </button>
      </div>
      <div className="h-0.5 bg-white/10" aria-hidden="true">
        <div className="h-full bg-rose-300/70" style={{ width: `${progress * 100}%` }} />
      </div>
    </li>
  );
}

/**
 * Time-sensitive work, visible on every tab: experiment tasks to complete
 * before their clock runs out, and failures waiting to be neutralized. Rendered inside the AlertStack under the news ticker.
 */
export function ExperimentDock({ state, onObserve, onNeutralize }: ExperimentDockProps): ReactElement | null {
  const surging = state.surge.activeLeft > 0;
  const { experiments, failures } = state.lab;
  const total = experiments.length + failures.length;
  if (total === 0) return null;

  const cost = neutralizeCost(state);
  const affordable = state.amplitude >= cost;
  const observableCount = experiments.filter((e) => canObserve(e, surging)).length;
  const showAll = surging && observableCount > 1;

  const cards: ReactElement[] = [
    ...failures.map((f) => (
      <FailureCard key={`f${f.id}`} failure={f} cost={cost} affordable={affordable} onNeutralize={onNeutralize} />
    )),
    ...experiments.map((e) => <ExperimentCard key={`e${e.id}`} state={state} experiment={e} surging={surging} onObserve={onObserve} />),
  ];
  const visible = cards.slice(0, MAX_VISIBLE);
  const hidden = cards.length - visible.length;

  return (
    <section aria-label="Lab alerts" className="px-3 pb-2">
      <ul className="space-y-1.5">{visible}</ul>
      {showAll || hidden > 0 ? (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {hidden > 0 ? (
            <span className="rounded-full bg-black/60 px-2.5 py-1 font-numeric text-[11px] text-slate-300">
              +{hidden} more
            </span>
          ) : (
            <span />
          )}
          {showAll ? (
            <button
              type="button"
              onClick={() => onObserve('all')}
              className="min-h-10 touch-manipulation rounded-xl bg-sky-200 px-4 text-xs font-bold text-slate-950 active:scale-95"
            >
              Observe all ({observableCount})
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function dockItemCount(state: GameState): number {
  return Math.min(MAX_VISIBLE, state.lab.experiments.length + state.lab.failures.length);
}
