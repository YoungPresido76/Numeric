import { useCallback, useEffect, useState } from 'react';

export type TypePhase = 'erase' | 'static' | 'type' | 'done';

/** Backspacing is fast, the static burst is brief, typing runs at about 30 characters per second. */
const ERASE_MS = 16;
const ERASE_STEP = 3;
const STATIC_MS = 55;
const STATIC_FRAMES = 4;
const TYPE_MS = 33;
const NOISE = '▒░▓#%&/\\|<>=+*';
const NOISE_MAX = 12;

interface View {
  id: number;
  phase: TypePhase;
  /** What is on screen right now. */
  shown: string;
  count: number;
  frame: number;
}

export interface Typewriter {
  text: string;
  phase: TypePhase;
  /** Jump straight to the full line. */
  skip: () => void;
}

function noise(length: number, frame: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += NOISE.charAt((frame * 7 + i * 13) % NOISE.length);
  }
  return out;
}

function advance(view: View, text: string): View {
  switch (view.phase) {
    case 'erase': {
      const shown = view.shown.slice(0, Math.max(0, view.shown.length - ERASE_STEP));
      return shown.length === 0 ? { ...view, phase: 'static', shown: '', frame: 0 } : { ...view, shown };
    }
    case 'static': {
      const frame = view.frame + 1;
      if (frame >= STATIC_FRAMES) return { ...view, phase: 'type', shown: '', count: 0, frame };
      return { ...view, frame, shown: noise(Math.min(text.length, NOISE_MAX), frame) };
    }
    case 'type': {
      const count = Math.min(text.length, view.count + 1);
      return { ...view, count, shown: text.slice(0, count), phase: count >= text.length ? 'done' : 'type' };
    }
    case 'done':
      return view;
  }
}

/**
 * Log-line engine. When `id` changes the old line is deleted backward, a short
 * static burst plays, then the new line types out. With `animate` off the text
 * appears at once.
 */
export function useTypewriter(text: string, id: number, animate: boolean): Typewriter {
  const [view, setView] = useState<View>({ id, phase: 'static', shown: '', count: 0, frame: 0 });

  let current = view;
  if (view.id !== id) {
    current = {
      id,
      phase: view.shown.length > 0 ? 'erase' : 'static',
      shown: view.shown,
      count: 0,
      frame: 0,
    };
    setView(current);
  }

  const phase = current.phase;
  useEffect(() => {
    if (!animate || phase === 'done') return undefined;
    const delay = phase === 'erase' ? ERASE_MS : phase === 'static' ? STATIC_MS : TYPE_MS;
    const timer = window.setTimeout(() => setView((v) => advance(v, text)), delay);
    return () => window.clearTimeout(timer);
  }, [animate, phase, current.shown, current.frame, text]);

  const skip = useCallback(() => {
    setView({ id, phase: 'done', shown: text, count: text.length, frame: 0 });
  }, [id, text]);

  if (!animate) return { text, phase: 'done', skip };
  return { text: current.shown, phase: current.phase, skip };
}
