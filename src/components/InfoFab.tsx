import { useEffect, useRef, useState, type ReactElement } from 'react';
import { setbackChance } from '../game/fabricOps';
import { ketFor } from '../game/glyph';
import { formatNumber } from '../game/math';
import type { Snapshot } from '../game/store';
import type { NoteTone, Zone } from '../game/types';
import type { GameActions } from '../hooks/useGame';
import { EquationTicker } from './EquationTicker';
import { Settings } from './icons';
import { SystemPanel } from './SystemPanel';
import './hud.css';

export type SheetTab = 'equation' | 'log' | 'settings';

interface InfoFabProps {
  snapshot: Snapshot;
  actions: GameActions;
  /** The open sheet tab, or null when closed. */
  sheet: SheetTab | null;
  onSheet: (tab: SheetTab | null) => void;
}

const SHEET_TABS: readonly { id: SheetTab; label: string }[] = [
  { id: 'equation', label: 'Equation' },
  { id: 'log', label: 'Log' },
  { id: 'settings', label: 'Settings' },
];

const TONE_CLASS: Readonly<Record<NoteTone, string>> = {
  info: 'text-slate-300',
  good: 'text-cyan-200',
  warn: 'text-amber-200',
  alert: 'text-rose-300',
};

const ZONE_LABEL: Readonly<Record<Zone, string>> = {
  stable: 'Stable',
  strained: 'Strained',
  critical: 'Critical',
  imminent: 'Collapse imminent',
};

/**
 * One floating button that holds the secondary information: the production
 * equation and stats, the full log and the settings. It replaces the System
 * tab and the per-tab readouts. A dot appears when a warning or alert line
 * is waiting in the log.
 */
export function InfoFab({ snapshot, actions, sheet, onSheet }: InfoFabProps): ReactElement {
  const { state, derived } = snapshot;
  const latest = state.notes[state.notes.length - 1];
  const latestId = latest ? latest.id : 0;
  const [seenId, setSeenId] = useState<number>(latestId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const isOpen = sheet !== null;

  useEffect(() => {
    if (sheet === 'log') setSeenId(latestId);
  }, [sheet, latestId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const fab = fabRef.current;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onSheet(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      fab?.focus();
    };
  }, [isOpen, onSheet]);

  const unread = !isOpen && latest !== undefined && latest.id !== seenId && (latest.tone === 'warn' || latest.tone === 'alert');
  const ket = ketFor(state.amplitude);
  const risk = setbackChance(state);

  const stats: readonly (readonly [string, string])[] = [
    ['Output', `+${formatNumber(derived.psPerSecond)} ψ/s`],
    ['Tap gain', formatNumber(derived.tapGain)],
    ['Stability', ZONE_LABEL[derived.zone]],
    ['Echoes', `${formatNumber(state.echoes)} ε`],
    ['Collapses', formatNumber(state.stats.collapses)],
    ...(state.fabric.tapping ? ([['Setback risk', `${Math.round(risk * 100)}%`]] as const) : []),
  ];

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={() => onSheet('equation')}
        aria-label={unread ? 'Info and settings. New warning in the log.' : 'Info and settings'}
        aria-haspopup="dialog"
        className="absolute right-3 z-30 grid size-12 touch-manipulation place-items-center rounded-full border bg-panel/95 shadow-lg shadow-black/50 backdrop-blur transition-colors duration-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        style={{
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)',
          color: 'var(--zone-a)',
          borderColor: 'color-mix(in srgb, var(--zone-a) 50%, transparent)',
        }}
      >
        <Settings aria-hidden="true" className="size-5" strokeWidth={1.8} />
        {unread ? (
          <span aria-hidden="true" className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-fuchsia-400 ring-2 ring-void" />
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute inset-0 z-40">
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onClick={() => onSheet(null)}
            className="absolute inset-0 cursor-default bg-black/55"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Info and settings"
            tabIndex={-1}
            className="sheet-in absolute inset-x-0 bottom-0 flex max-h-[78%] flex-col rounded-t-2xl border border-b-0 border-white/10 bg-deep px-3.5 pt-2 pb-[max(0.875rem,env(safe-area-inset-bottom))] outline-none"
          >
            <div aria-hidden="true" className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-white/20" />
            <div role="tablist" aria-label="Info sections" className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
              {SHEET_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={sheet === id}
                  onClick={() => onSheet(id)}
                  className={`h-9 touch-manipulation rounded-lg text-xs font-medium ${
                    sheet === id ? 'bg-white/10 text-slate-100' : 'text-slate-400 active:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="scroll-clean min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {sheet === 'equation' ? (
                <div className="space-y-3 pb-1">
                  <EquationTicker derived={derived} />
                  {ket ? (
                    <p aria-hidden="true" className="text-center font-numeric text-[11px] tracking-widest text-slate-500">
                      {ket}
                    </p>
                  ) : null}
                  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 font-numeric text-xs">
                    {stats.map(([label, value]) => (
                      <div key={label} className="col-span-2 grid grid-cols-subgrid">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="text-right text-slate-200 tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {sheet === 'log' ? (
                state.notes.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">No log entries yet.</p>
                ) : (
                  <ul className="space-y-2 pb-1">
                    {[...state.notes].reverse().map((note) => (
                      <li key={note.id} className={`font-numeric text-xs leading-snug ${TONE_CLASS[note.tone]}`}>
                        [ {note.text} ]
                      </li>
                    ))}
                  </ul>
                )
              ) : null}

              {sheet === 'settings' ? <SystemPanel snapshot={snapshot} actions={actions} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
