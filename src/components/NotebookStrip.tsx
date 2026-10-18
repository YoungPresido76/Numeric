import { useEffect, useState, type ReactElement } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { NoteLine, NoteTone } from '../game/types';
import { NotebookPen } from './icons';

interface NotebookStripProps {
  notes: readonly NoteLine[];
}

const TONE_CLASS: Readonly<Record<NoteTone, string>> = {
  info: 'text-slate-300',
  good: 'text-cyan-200',
  warn: 'text-amber-200',
  alert: 'text-rose-300',
};

const CHARS_PER_TICK = 2;
const TICK_MS = 26;

interface Typed {
  id: number;
  count: number;
}

/**
 * The newest lab-notebook line, typed out like a typewriter. Tap it to finish
 * the line instantly. The full history lives in the Lab tab.
 */
export function NotebookStrip({ notes }: NotebookStripProps): ReactElement | null {
  const latest = notes[notes.length - 1];
  const reducedMotion = useReducedMotion();
  const [typed, setTyped] = useState<Typed>({ id: -1, count: 0 });

  const length = latest ? latest.text.length : 0;
  const shown = !latest ? 0 : reducedMotion ? length : typed.id === latest.id ? typed.count : 0;
  const typing = latest !== undefined && shown < length;

  useEffect(() => {
    if (!latest || reducedMotion || shown >= length) return undefined;
    const id = window.setTimeout(() => {
      setTyped({ id: latest.id, count: Math.min(length, shown + CHARS_PER_TICK) });
    }, TICK_MS);
    return () => window.clearTimeout(id);
  }, [latest, reducedMotion, shown, length]);

  if (!latest) return null;

  return (
    <button
      type="button"
      onClick={() => setTyped({ id: latest.id, count: length })}
      className="mx-3 mb-2 flex min-h-11 shrink-0 touch-manipulation items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left"
      aria-label="Lab notebook. Tap to finish the current line."
    >
      <NotebookPen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500" />
      <span className="sr-only" role="status">
        {latest.text}
      </span>
      <span aria-hidden="true" className={`min-w-0 flex-1 font-numeric text-[12px] leading-snug ${TONE_CLASS[latest.tone]}`}>
        {latest.text.slice(0, shown)}
        {typing ? <span className="caret" /> : null}
      </span>
    </button>
  );
}
