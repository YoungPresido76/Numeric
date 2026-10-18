import type { ReactElement } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTypewriter } from '../hooks/useTypewriter';
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

/**
 * The newest log line, framed as [ LABEL: ... ]. A new line is deleted
 * backward, a short static burst plays, then it types at about 30 characters
 * per second. Tap to skip to the full text. The full history lives in the Lab tab.
 */
export function NotebookStrip({ notes }: NotebookStripProps): ReactElement | null {
  const latest = notes[notes.length - 1];
  const reducedMotion = useReducedMotion();
  const framed = latest ? `[ ${latest.text} ]` : '';
  const typed = useTypewriter(framed, latest ? latest.id : 0, !reducedMotion);

  if (!latest) return null;

  const busy = typed.phase !== 'done';
  const color = typed.phase === 'static' ? 'text-slate-500' : TONE_CLASS[latest.tone];

  return (
    <button
      type="button"
      onClick={typed.skip}
      className="mx-3 mb-2 flex min-h-11 shrink-0 touch-manipulation items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left"
      aria-label="Lab log. Tap to finish the current line."
    >
      <NotebookPen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500" />
      <span className="sr-only" role="status">
        {latest.text}
      </span>
      <span aria-hidden="true" className={`min-w-0 flex-1 font-numeric text-[12px] leading-snug ${color}`}>
        {typed.text}
        {busy ? <span className="caret" /> : null}
      </span>
    </button>
  );
}
