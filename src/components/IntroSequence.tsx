import { useEffect, useState, type MouseEvent, type ReactElement } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTypewriter } from '../hooks/useTypewriter';

interface IntroSequenceProps {
  onDone: () => void;
}

/** Beat 0 is the point of light alone in the dark. The rest are Dr. Vey's lines. */
const BEATS: readonly string[] = [
  '',
  '[ LOG: Day one. - Vey ]',
  'Funding came through this morning. Not much. Enough.',
  "Somewhere under this ceiling, something that isn't anything yet is about to become something.",
  "We don't call it hope. We call it Amplitude.",
  "But some mornings, it's the same thing.",
  '[ LOG: Beginning observation. ]',
];

const LAST = BEATS.length - 1;
const HOLD_MS = 2300;
const FIRST_HOLD_MS = 2400;
const LAST_HOLD_MS = 2600;
const FADE_MS = 1400;
const POINT = '#bae6fd';
const RING = '#7dd3fc';
const RING_DELAYS: readonly number[] = [0, 0.9, 1.8];

/**
 * Shown once, before the lab appears. One circle carries every beat: it holds
 * steady, then on the last line sends out rings that settle into the wave
 * background. Tap to finish a line or move on, or skip.
 */
export function IntroSequence({ onDone }: IntroSequenceProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const [beat, setBeat] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const typed = useTypewriter(BEATS[beat] ?? '', beat, !reducedMotion);
  const settled = typed.phase === 'done' && !finishing;

  const next = (): void => {
    if (beat < LAST) setBeat(beat + 1);
    else setFinishing(true);
  };

  useEffect(() => {
    if (!settled) return undefined;
    const hold = beat === 0 ? FIRST_HOLD_MS : beat === LAST ? LAST_HOLD_MS : HOLD_MS;
    const timer = window.setTimeout(next, hold);
    return () => window.clearTimeout(timer);
    // `next` only reads `beat`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, beat]);

  useEffect(() => {
    if (!finishing) return undefined;
    const timer = window.setTimeout(onDone, FADE_MS);
    return () => window.clearTimeout(timer);
  }, [finishing, onDone]);

  const onTap = (): void => {
    if (finishing) return;
    if (typed.phase !== 'done') typed.skip();
    else next();
  };

  const rings = beat === LAST || finishing;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Opening"
      onClick={onTap}
      className="fixed inset-0 z-[70] grid touch-manipulation place-items-center bg-void transition-opacity ease-out"
      style={{ opacity: finishing ? 0 : 1, transitionDuration: `${FADE_MS}ms`, pointerEvents: finishing ? 'none' : 'auto' }}
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-8 px-8">
        <svg viewBox="-100 -100 200 200" className="size-52" aria-hidden="true">
          {rings
            ? RING_DELAYS.map((delay) => (
                <circle
                  key={delay}
                  r="5"
                  fill="none"
                  stroke={RING}
                  strokeWidth="1.2"
                  className="intro-ring"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))
            : null}
          <circle r="16" fill={RING} opacity="0.12" className="intro-halo" />
          <circle r="5" fill={POINT} className="intro-point" />
        </svg>
        <p className="min-h-[8.5rem] text-center font-numeric text-[15px] leading-relaxed text-sky-100">
          <span className="sr-only">{BEATS[beat]}</span>
          <span aria-hidden="true">
            {typed.text}
            {typed.phase !== 'done' && beat > 0 ? <span className="caret" /> : null}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onDone();
        }}
        className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] min-h-11 px-5 font-numeric text-[11px] tracking-[0.25em] text-slate-500 uppercase active:text-slate-300"
      >
        Skip
      </button>
    </div>
  );
}
