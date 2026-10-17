import { useState, type ReactElement } from 'react';
import { BuildingsPanel } from './components/BuildingsPanel';
import { CollapsePanel } from './components/CollapsePanel';
import { NoticeBar } from './components/NoticeBar';
import { OfflineModal } from './components/OfflineModal';
import { Stage } from './components/Stage';
import { SystemPanel } from './components/SystemPanel';
import { TabBar, type TabId } from './components/TabBar';
import { TutorialCard } from './components/TutorialCard';
import { UpgradesPanel } from './components/UpgradesPanel';
import { WaveBackground } from './components/WaveBackground';
import { UPGRADES } from './game/data';
import { echoGain, isUpgradeVisible } from './game/engine';
import { clamp } from './game/math';
import { TUTORIAL_STEPS } from './game/tutorial';
import type { BuyAmount } from './game/types';
import { useGame } from './hooks/useGame';

export default function App(): ReactElement {
  const { snapshot, actions } = useGame();
  const { state, derived } = snapshot;
  const [tab, setTab] = useState<TabId>('build');
  const [amount, setAmount] = useState<BuyAmount>(1);

  const intensity = clamp(Math.log10(derived.psPerSecond + 1) / 12, 0, 1);

  const step = state.tutorial.done ? undefined : TUTORIAL_STEPS[state.tutorial.step];
  const hintTab: TabId | null = step && step.isVisible(state) ? step.hintTab : null;

  const badges: Partial<Record<TabId, boolean>> = {
    upgrades: UPGRADES.some((u) => isUpgradeVisible(state, u) && state.amplitude >= u.cost),
    collapse: echoGain(state.runAmplitude) >= 1,
  };

  let panel: ReactElement;
  switch (tab) {
    case 'build':
      panel = (
        <BuildingsPanel
          state={state}
          derived={derived}
          amount={amount}
          onAmountChange={setAmount}
          onBuy={actions.buy}
        />
      );
      break;
    case 'upgrades':
      panel = <UpgradesPanel state={state} onBuy={actions.buyUpgrade} />;
      break;
    case 'collapse':
      panel = <CollapsePanel state={state} onCollapse={actions.collapse} />;
      break;
    case 'system':
      panel = <SystemPanel snapshot={snapshot} actions={actions} />;
      break;
  }

  return (
    <div className="relative isolate h-dvh w-full overflow-hidden bg-void text-slate-100">
      <WaveBackground intensity={intensity} />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col md:border-x md:border-white/10 md:bg-void/50">
        <NoticeBar notice={snapshot.notice} saveStatus={snapshot.saveStatus} onDismiss={actions.dismissNotice} />
        <Stage snapshot={snapshot} onTap={actions.tap} onSurge={actions.surge} />
        <TutorialCard state={state} onSkip={actions.skipTutorial} />

        <main
          id="panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="scroll-clean min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-1 pb-4"
        >
          {panel}
        </main>

        <TabBar active={tab} onSelect={setTab} hintTab={hintTab} badges={badges} />
      </div>

      <OfflineModal report={snapshot.offlineReport} onClose={actions.dismissOffline} />
    </div>
  );
}
