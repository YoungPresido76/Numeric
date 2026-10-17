import type { ReactElement } from 'react';
import { BuildIcon, CollapseIcon, SystemIcon, UpgradeIcon } from './icons';

export type TabId = 'build' | 'upgrades' | 'collapse' | 'system';

interface TabBarProps {
  active: TabId;
  onSelect: (id: TabId) => void;
  /** A tab the tutorial wants the player to open. */
  hintTab: TabId | null;
  /** Tabs with something new to do. */
  badges: Readonly<Partial<Record<TabId, boolean>>>;
}

interface TabDef {
  id: TabId;
  label: string;
  Icon: (props: { className?: string }) => ReactElement;
}

const TABS: readonly TabDef[] = [
  { id: 'build', label: 'Build', Icon: BuildIcon },
  { id: 'upgrades', label: 'Upgrades', Icon: UpgradeIcon },
  { id: 'collapse', label: 'Collapse', Icon: CollapseIcon },
  { id: 'system', label: 'System', Icon: SystemIcon },
];

export function TabBar({ active, onSelect, hintTab, badges }: TabBarProps): ReactElement {
  return (
    <nav
      role="tablist"
      aria-label="Game sections"
      className="grid shrink-0 grid-cols-4 border-t border-white/10 bg-void/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      {TABS.map(({ id, label, Icon }) => {
        const selected = id === active;
        const hinted = hintTab === id && !selected;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={selected}
            aria-controls="panel"
            onClick={() => onSelect(id)}
            className={`relative flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-300 ${
              selected ? 'text-cyan-200' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            {selected ? (
              <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-cyan-300" />
            ) : null}
            <span className="relative">
              <Icon className={`size-6 ${hinted ? 'animate-pulse text-cyan-300' : ''}`} />
              {badges[id] && !selected ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-1 size-2 rounded-full bg-fuchsia-400 ring-2 ring-void"
                />
              ) : null}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
