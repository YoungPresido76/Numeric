import { useState, type ReactElement } from 'react';
import { BuildingsPanel } from './components/BuildingsPanel';
import { CollapsePanel } from './components/CollapsePanel';
import { dockItemCount, ExperimentDock } from './components/ExperimentDock';
import { IntroSequence } from './components/IntroSequence';
import { LabPanel } from './components/LabPanel';
import { NoticeBar } from './components/NoticeBar';
import { NotebookStrip } from './components/NotebookStrip';
import { OfflineModal } from './components/OfflineModal';
import { Stage } from './components/Stage';
import { SummaryModal } from './components/SummaryModal';
import { SystemPanel } from './components/SystemPanel';
import { TabBar, type TabId } from './components/TabBar';
import { TutorialCard } from './components/TutorialCard';
import { UpgradesPanel } from './components/UpgradesPanel';
import { WaveBackground } from './components/WaveBackground';
import { ZoneBanner } from './components/ZoneBanner';
import { ZoneOverlay } from './components/ZoneOverlay';
import { UPGRADES } from './game/data';
import { echoGain, isUpgradeVisible } from './game/engine';
import { clamp } from './game/math';
import { TUTORIAL_STEPS } from './game/tutorial';
import type { BuyAmount } from './game/types';
import { useGame } from './hooks/useGame';

const DOCK_CARD_PX = 84;

export default function App(): ReactElement {
  const { snapshot, actions } = useGame();
  const { state, derived } = snapshot;
  const zone = derived.zone;
  const [tab, setTab] = useState<TabId>('build');
  const [amount, setAmount] = useState<BuyAmount>(1);

  const intensity = clamp(Math.log10(derived.psPerSecond + 1) / 12, 0, 1);

  const step = state.tutorial.done ? undefined : TUTORIAL_STEPS[state.tutorial.step];
  const hintTab: TabId | null = step && step.isVisible(state) ? step.hintTab : null;

  const badges: Partial<Record<TabId, boolean>> = {
    upgrades: UPGRADES.some((u) => isUpgradeVisible(state, u) && state.amplitude >= u.cost),
    lab: state.lab.experiments.length > 0 || state.lab.failures.length > 0,
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
    case 'lab':
      panel = <LabPanel state={state} zone={zone} />;
      break;
    case 'collapse':
      panel = <CollapsePanel state={state} onCollapse={actions.collapse} />;
      break;
    case 'system':
      panel = <SystemPanel snapshot={snapshot} actions={actions} />;
      break;
  }

  const dockPadding = dockItemCount(state) * DOCK_CARD_PX;

  return (
    <div
      data-zone={zone}
      className="zone-root relative isolate h-dvh w-full overflow-hidden bg-void text-slate-100"
    >
      <WaveBackground intensity={intensity} surging={state.surge.activeLeft > 0} zone={zone} />
      <ZoneOverlay zone={zone} />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col md:border-x md:border-white/10 md:bg-void/50">
        <NoticeBar notice={snapshot.notice} saveStatus={snapshot.saveStatus} onDismiss={actions.dismissNotice} />
        <Stage snapshot={snapshot} onTap={actions.tap} onSurge={actions.surge} />
        <ZoneBanner zone={zone} lab={state.lab} />
        <TutorialCard state={state} onSkip={actions.skipTutorial} />
        <NotebookStrip notes={state.notes} />

        <div className="relative min-h-0 flex-1">
          <main
            id="panel"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className="scroll-clean h-full overflow-y-auto overscroll-contain px-3 pt-1 pb-4"
            style={{ paddingBottom: `${16 + dockPadding}px` }}
          >
            {panel}
          </main>
          <ExperimentDock state={state} onObserve={actions.observe} onNeutralize={actions.neutralize} />
        </div>

        <TabBar active={tab} onSelect={setTab} hintTab={hintTab} badges={badges} />
      </div>

      {state.introSeen ? null : <IntroSequence onDone={actions.finishIntro} />}
      <OfflineModal report={snapshot.offlineReport} onClose={actions.dismissOffline} />
      <SummaryModal summary={state.summary} onClose={actions.dismissSummary} />
    </div>
  );
}
