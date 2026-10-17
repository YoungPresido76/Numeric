/**
 * Number helpers. All game values are IEEE doubles (ceiling ≈ 1.8e308).
 * Everything that touches large values goes through this module and
 * `engine.ts`, so swapping in an arbitrary-precision type later is local.
 */

const SUFFIXES: readonly string[] = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
];

/** Replaces NaN with 0 and ±Infinity with ±MAX_VALUE so state never poisons itself. */
export function clampFinite(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n === Infinity) return Number.MAX_VALUE;
  if (n === -Infinity) return -Number.MAX_VALUE;
  return n;
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

function formatScientific(value: number, exponent: number): string {
  let mantissa = value / Math.pow(10, exponent);
  let exp = exponent;
  if (Number(mantissa.toFixed(2)) >= 10) {
    mantissa /= 10;
    exp += 1;
  }
  return `${mantissa.toFixed(2)}e${exp}`;
}

/** Compact display: 1.23K, 45.6M, 7.89e45. Keeps about three significant figures. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '0';
  if (value < 0) return `-${formatNumber(-value)}`;
  if (value === 0) return '0';
  if (value < 0.01) return '<0.01';
  if (value < 10) return trimZeros(value.toFixed(2));
  if (value < 100) return trimZeros(value.toFixed(1));
  if (value < 999.5) return value.toFixed(0);

  const exponent = Math.floor(Math.log10(value));
  let group = Math.floor(exponent / 3);
  if (group >= SUFFIXES.length) return formatScientific(value, exponent);

  let mantissa = value / Math.pow(1000, group);
  let decimals = mantissa < 10 ? 2 : mantissa < 100 ? 1 : 0;
  if (Number(mantissa.toFixed(decimals)) >= 1000) {
    group += 1;
    if (group >= SUFFIXES.length) return formatScientific(value, exponent);
    mantissa = value / Math.pow(1000, group);
    decimals = 2;
  }
  return `${trimZeros(mantissa.toFixed(decimals))}${SUFFIXES[group] ?? ''}`;
}

/** Whole-number display for the main resource (no fractional jitter). */
export function formatWhole(value: number): string {
  return formatNumber(Math.floor(Math.max(0, value)));
}

/** 3725 → "1h 2m", 125 → "2m 05s", 9 → "9s". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
