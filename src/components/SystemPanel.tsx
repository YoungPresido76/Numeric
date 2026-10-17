import {
  useState,
  type ChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  BASE_OFFLINE_EFFICIENCY,
  ECHO_BONUS_EACH,
  OFFLINE_CAP_SECONDS,
  SURGE_BASE_COOLDOWN,
  SURGE_BASE_DURATION,
  SURGE_MULT,
} from '../game/data';
import { formatDuration, formatNumber } from '../game/math';
import type { Snapshot } from '../game/store';
import { useConfirm } from '../hooks/useConfirm';
import type { GameActions } from '../hooks/useGame';

const APP_VERSION = '0.1.0';

interface SystemPanelProps {
  snapshot: Snapshot;
  actions: GameActions;
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps): ReactElement {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h3 className="text-xs tracking-widest text-slate-400 uppercase">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

interface ButtonProps {
  onClick: () => void;
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'danger' | 'warning';
  disabled?: boolean;
}

function ActionButton({ onClick, children, tone = 'neutral', disabled = false }: ButtonProps): ReactElement {
  const tones = {
    neutral: 'bg-white/10 text-slate-100 active:bg-white/20',
    primary: 'bg-cyan-300 text-slate-950 active:bg-cyan-200',
    danger: 'bg-rose-400/20 text-rose-100 active:bg-rose-400/30',
    warning: 'bg-amber-300 text-slate-950',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 touch-manipulation rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SystemPanel({ snapshot, actions }: SystemPanelProps): ReactElement {
  const { state, saveStatus, lastSavedAt } = snapshot;
  const [exported, setExported] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const importConfirm = useConfirm();
  const resetConfirm = useConfirm();

  const handleExport = async (): Promise<void> => {
    const code = actions.exportCode();
    setExported(code);
    try {
      await navigator.clipboard.writeText(code);
      setExportMessage('Copied to your clipboard.');
    } catch {
      setExportMessage('Select the code below and copy it manually.');
    }
  };

  const handleDownload = (): void => {
    const code = exported || actions.exportCode();
    setExported(code);
    downloadText(`numeric-save-${new Date().toISOString().slice(0, 10)}.txt`, code);
    setExportMessage('Save file downloaded.');
  };

  const handleImportChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setImportText(event.target.value);
    setImportMessage(null);
    importConfirm.cancel();
  };

  const selectAll = (event: ReactFocusEvent<HTMLTextAreaElement>): void => {
    event.currentTarget.select();
  };

  const handleImport = (): void => {
    const result = actions.importCode(importText);
    if (result.ok) {
      setImportText('');
      setImportMessage({ ok: true, text: 'Save imported. Welcome back.' });
    } else {
      setImportMessage({ ok: false, text: result.error });
    }
  };

  const saveLine =
    saveStatus === 'unavailable'
      ? 'Saving is blocked in this browser. Use Export.'
      : saveStatus === 'error'
        ? 'The last save failed. Use Export to keep a copy.'
        : lastSavedAt
          ? `Autosaves every 10 seconds. Last saved ${new Date(lastSavedAt).toLocaleTimeString()}.`
          : 'Autosaves every 10 seconds.';

  const stats: readonly { label: string; value: string }[] = [
    { label: 'Time played', value: formatDuration(state.stats.playSeconds) },
    { label: 'Total ψ', value: formatNumber(state.stats.totalAmplitude) },
    { label: 'Taps', value: formatNumber(state.stats.taps) },
    { label: 'Collapses', value: formatNumber(state.stats.collapses) },
  ];

  return (
    <div className="fade-in space-y-3">
      <h2 className="font-display text-lg italic text-slate-200">System</h2>

      <Section title="Settings">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-100">Sound effects</p>
            <p className="text-xs text-slate-500">Short synthesized tones. Nothing is downloaded.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.settings.sound}
            aria-label="Sound effects"
            onClick={() => actions.setSound(!state.settings.sound)}
            className={`relative h-8 w-14 shrink-0 touch-manipulation rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              state.settings.sound ? 'bg-cyan-300' : 'bg-white/15'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-1 left-1 size-6 rounded-full bg-slate-950 transition-transform ${
                state.settings.sound ? 'translate-x-6' : 'translate-x-0 bg-slate-300'
              }`}
            />
          </button>
        </div>
      </Section>

      <Section title="Save">
        <p className="text-xs leading-snug text-slate-400">{saveLine}</p>
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="primary" onClick={actions.saveNow}>
            Save now
          </ActionButton>
          <ActionButton onClick={() => void handleExport()}>Export code</ActionButton>
          <ActionButton onClick={handleDownload}>Download file</ActionButton>
        </div>
        {exported ? (
          <div className="space-y-1.5">
            <textarea
              readOnly
              value={exported}
              rows={4}
              aria-label="Exported save code"
              onFocus={selectAll}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-2.5 font-numeric text-slate-300"
            />
            {exportMessage ? (
              <p role="status" className="text-xs text-cyan-200">
                {exportMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section title="Import">
        <textarea
          value={importText}
          onChange={handleImportChange}
          rows={3}
          placeholder="Paste a NUMERIC1:… save code"
          aria-label="Save code to import"
          className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-2.5 font-numeric text-slate-200 placeholder:text-slate-600"
        />
        <ActionButton
          tone={importConfirm.armed ? 'warning' : 'neutral'}
          disabled={importText.trim().length === 0}
          onClick={() => importConfirm.press(handleImport)}
        >
          {importConfirm.armed ? 'Tap again to replace progress' : 'Import save'}
        </ActionButton>
        {importMessage ? (
          <p role="status" className={`text-xs ${importMessage.ok ? 'text-cyan-200' : 'text-rose-300'}`}>
            {importMessage.text}
          </p>
        ) : null}
      </Section>

      <Section title="Statistics">
        <dl className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/5 px-3 py-2">
              <dt className="text-[10px] tracking-wide text-slate-500 uppercase">{stat.label}</dt>
              <dd className="mt-0.5 font-numeric text-sm text-slate-100 tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="How to play">
        <ul className="list-disc space-y-1.5 pl-4 text-xs leading-snug text-slate-400 marker:text-slate-600">
          <li>Tap the orb to gain ψ instantly. Taps scale with your production.</li>
          <li>
            Qubits add ψ every second. Gates, Lattices and Branches each create the tier below them, so growth
            compounds.
          </li>
          <li>Owning 10, 25 and 50 of a building doubles its output. Upgrades are one-time boosts.</li>
          <li>
            Surge multiplies output by {SURGE_MULT} for {SURGE_BASE_DURATION}s, then recharges for{' '}
            {SURGE_BASE_COOLDOWN}s.
          </li>
          <li>
            Collapse resets the reality in exchange for Echoes: +{Math.round(ECHO_BONUS_EACH * 100)}% production
            each, forever.
          </li>
          <li>
            Away from the game, your realities keep working for up to {formatDuration(OFFLINE_CAP_SECONDS)} at{' '}
            {Math.round(BASE_OFFLINE_EFFICIENCY * 100)}% efficiency.
          </li>
        </ul>
      </Section>

      <Section title="Danger zone">
        <p className="text-xs leading-snug text-slate-500">
          Erases this save, including Echoes and statistics. Export first if you might want it back.
        </p>
        <ActionButton
          tone={resetConfirm.armed ? 'warning' : 'danger'}
          onClick={() => resetConfirm.press(actions.hardReset)}
        >
          {resetConfirm.armed ? 'Tap again to erase everything' : 'Erase save'}
        </ActionButton>
      </Section>

      <p className="pb-2 text-center font-numeric text-[11px] text-slate-600">Numeric v{APP_VERSION}</p>
    </div>
  );
}
