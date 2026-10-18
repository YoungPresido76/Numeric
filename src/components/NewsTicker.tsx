import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import type { NoteLine, NoteTone } from '../game/types';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './hud.css';

interface NewsTickerProps {
  notes: readonly NoteLine[];
  /** Opens the full log. */
  onOpen: () => void;
}

const TONE_CLASS: Readonly<Record<NoteTone, string>> = {
  info: 'text-slate-300',
  good: 'text-cyan-200',
  warn: 'text-amber-200',
  alert: 'text-rose-300',
};

const VISIBLE = 4;
const SPEED_PX_PER_SECOND = 48;
const MIN_SECONDS = 14;

/**
 * The lab log as a one-line news ticker pinned to the top of the screen. The
 * newest entries scroll past, newest first. Tap it to open the full log.
 * With reduced motion it shows the newest entry only, truncated.
 */
export function NewsTicker({ notes, onOpen }: NewsTickerProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLSpanElement>(null);
  const [seconds, setSeconds] = useState<number>(30);

  const recent = notes.slice(-VISIBLE).reverse();
  const latest = notes[notes.length - 1];
  const signature = recent.map((note) => note.id).join(',');

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || reducedMotion) return;
    setSeconds(Math.max(MIN_SECONDS, track.scrollWidth / 2 / SPEED_PX_PER_SECOND));
  }, [signature, reducedMotion]);

  const renderItems = (prefix: string): ReactElement[] =>
    recent.map((note) => (
      <span key={`${prefix}${note.id}`} className={`mr-7 ${TONE_CLASS[note.tone]}`}>
        ◆ {note.text}
      </span>
    ));

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Lab news ticker. Tap to open the full log."
      className="flex w-full shrink-0 touch-manipulation items-center gap-2 border-b border-white/10 bg-white/[0.035] px-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-300"
      style={{ height: 'var(--ticker-h)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <span
        aria-hidden="true"
        className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-numeric text-[9px] font-bold tracking-[0.14em] transition-colors duration-700"
        style={{ color: 'var(--zone-a)' }}
      >
        LIVE
      </span>
      <span className="sr-only" role="status">
        {latest ? latest.text : 'No log entries yet'}
      </span>
      <span
        aria-hidden="true"
        className="min-w-0 flex-1 overflow-hidden font-numeric text-[12px] whitespace-nowrap"
        style={{ maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)' }}
      >
        {!latest ? (
          <span className="text-slate-500">◆ Awaiting the first note</span>
        ) : reducedMotion ? (
          <span className={`block truncate ${TONE_CLASS[latest.tone]}`}>◆ {latest.text}</span>
        ) : (
          <span
            key={latest.id}
            ref={trackRef}
            className="ticker-track"
            style={{ '--ticker-dur': `${seconds}s` } as CSSProperties}
          >
            {renderItems('a')}
            {renderItems('b')}
          </span>
        )}
      </span>
    </button>
  );
}
