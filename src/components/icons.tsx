import { CircleDot, GitFork, Network, ToggleRight, type LucideIcon } from 'lucide-react';
import type { Tier } from '../game/types';

export {
  Atom,
  AudioWaveform,
  Bot,
  Coins,
  Eye,
  FlaskConical,
  Gem,
  History,
  Hourglass,
  Layers,
  NotebookPen,
  Orbit,
  Settings,
  ShieldCheck,
  Spline,
  TrendingUp,
  TriangleAlert,
  Waypoints,
  Zap,
} from 'lucide-react';

/** The type of a lucide icon component. */
export type IconComponent = LucideIcon;

/** One icon per project, chosen for what the project does: a two-state orb, a switch, a mesh, forking paths. */
export const TIER_ICONS: Readonly<Record<Tier, LucideIcon>> = {
  0: CircleDot,
  1: ToggleRight,
  2: Network,
  3: GitFork,
};

/** Chart fills, in fixed tier order. Checked against the dark surface for colour-blind separation. */
export const TIER_CHART_COLORS: Readonly<Record<Tier, string>> = {
  0: '#1aa3bd',
  1: '#ec4899',
  2: '#8b5cf6',
  3: '#0da371',
};

/** RGB triplet per tier for soft glows. */
export const TIER_GLOW: Readonly<Record<Tier, string>> = {
  0: '103 232 249',
  1: '249 168 212',
  2: '196 181 253',
  3: '110 231 183',
};

/** Text and tile classes per tier. One accent hue per tier. */
export const TIER_TILE: Readonly<Record<Tier, string>> = {
  0: 'bg-cyan-400/15 text-cyan-200 ring-cyan-300/30',
  1: 'bg-pink-400/15 text-pink-200 ring-pink-300/30',
  2: 'bg-violet-400/15 text-violet-200 ring-violet-300/30',
  3: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
};

export const TIER_BAR: Readonly<Record<Tier, string>> = {
  0: 'bg-cyan-300',
  1: 'bg-pink-300',
  2: 'bg-violet-300',
  3: 'bg-emerald-300',
};
