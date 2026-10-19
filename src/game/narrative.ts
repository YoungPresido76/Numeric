import { BUILDINGS, PROJECT_NAMES } from './data';
import { formatNumber } from './math';
import type { NoteTone, ProjectTier, Task, Tier, TreeId, Zone } from './types';

/** One notebook line before it is given an id. The text already carries its [ LABEL: ] tag. */
export interface Line {
  text: string;
  tone: NoteTone;
}

type Label = 'LOG' | 'LAB-NOTE' | 'MEMO' | 'ALERT' | 'WARNING' | null;

const DEFAULT_LABEL: Readonly<Record<NoteTone, Label>> = {
  info: 'LOG',
  good: 'LOG',
  warn: 'MEMO',
  alert: 'ALERT',
};

function pick(bank: readonly string[], salt: number): string {
  const index = Math.abs(Math.floor(salt)) % bank.length;
  return bank[index] ?? bank[0] ?? '';
}

/** Builds a line. The tag comes from the tone unless one is given; null leaves the text bare. */
function line(text: string, tone: NoteTone, label: Label = DEFAULT_LABEL[tone]): Line {
  return { text: label === null ? text : `${label}: ${text}`, tone };
}

/** The colleague who tends each project, used to name the cause of trouble. */
const OWNER: Readonly<Record<ProjectTier, string>> = {
  1: 'Dr. Okafor',
  2: 'Dr. Vey',
  3: 'Mira from the funding office',
};

const PROJECT_SHORT: Readonly<Record<ProjectTier, string>> = {
  1: 'Gate array',
  2: 'Lattice',
  3: 'Branch reactor',
};

const READINGS: Readonly<Record<ProjectTier, string>> = {
  1: 'Gate readings',
  2: 'Lattice readings',
  3: 'Branch readings',
};

/** Plain-language description of a task, as shown on the experiment card. */
export function describeTask(task: Task): string {
  const seconds = Math.round(task.limit);
  switch (task.kind) {
    case 'earn': {
      const without = task.forbid === null ? '' : `, without funding ${BUILDINGS[task.forbid].name}s`;
      return `Earn ${formatNumber(task.target)} ψ in ${seconds}s${without}`;
    }
    case 'fund':
      return `Fund a ${BUILDINGS[task.tier].name} within ${seconds}s`;
    case 'tap':
      return `Tap the orb ${task.count} times in ${seconds}s`;
    case 'hold':
      return `Fund nothing for ${seconds}s`;
  }
}

const TREE_SHORT: Readonly<Record<TreeId, string>> = {
  grant: 'Grant Optimization',
  observation: 'Deep Observation',
  calibration: 'Experiment Calibration',
};

const AUTOMATED: Readonly<Record<Tier, string>> = {
  0: 'Qubit procurement',
  1: 'Gate procurement',
  2: 'Lattice procurement',
  3: 'Branch procurement',
};

export const narrative = {
  labOpened(lab: number, salt: number): Line {
    if (lab === 1) {
      return line('Lab 1 opened. Funding is thin, but the instruments are warm. Observe, and see what answers.', 'info');
    }
    return line(
      pick(
        [
          `Lab ${lab} opened. The last team left their notebooks on every desk.`,
          `Lab ${lab} opened. Same building, new question.`,
          `Lab ${lab} is up. Everything the last lab learned is on the whiteboard.`,
        ],
        salt,
      ),
      'info',
    );
  },

  legacy(grant: number, text: string): Line {
    return line(`Legacy grant of ${text} ψ carried over from the last lab.`, grant > 0 ? 'good' : 'info');
  },

  purchase(tier: Tier, salt: number): Line {
    switch (tier) {
      case 0:
        return line(
          pick(
            [
              'First qubit calibrated. It holds two answers until someone looks.',
              'A qubit hums on the bench. Both outcomes are still possible.',
            ],
            salt,
          ),
          'good',
        );
      case 1:
        return line(
          'Gate array online. Dr. Okafor says experiments will start arriving. Each one is a task with a clock.',
          'good',
        );
      case 2:
        return line('Lattice linked. Dr. Vey signs off on the wiring. The gates now move together. - Vey', 'good');
      case 3:
        return line('A branch reactor forked a parallel run. Nobody can say which copy is ours.', 'good');
    }
  },

  grant(index: number, salt: number): Line {
    const bank = [
      'Grant received. The committee wants to see more.',
      'Another round of funding cleared. Mira reminds everyone that it is not infinite.',
      'The department upgraded our budget line. Someone bought better coffee.',
      'A foundation noticed the results and sent a grant.',
    ];
    return line(pick(bank, index + salt), 'good');
  },

  /** An unprompted line while the lab is stable. */
  idle(salt: number): Line {
    return line(
      pick(
        [
          'Funding steady. Qubits humming along. Nothing to report today. - Vey',
          'Instruments calibrated. The coffee is, for once, hot. - Vey',
          'Quiet shift. The numbers are doing what numbers do. - Vey',
        ],
        salt,
      ),
      'info',
      'LAB-NOTE',
    );
  },

  experimentStarted(tier: ProjectTier, task: Task, salt: number): Line {
    const lead = pick(
      [`${PROJECT_NAMES[tier]} needs a result.`, `${PROJECT_NAMES[tier]} is waiting on us.`],
      salt,
    );
    return line(`${lead} ${describeTask(task)}.`, 'info');
  },

  success(tier: ProjectTier, surge: boolean, salt: number): Line {
    if (surge) {
      return line(
        pick(
          [
            `${PROJECT_NAMES[tier]}: observed under Surge, resolved instantly. Funds released.`,
            `${PROJECT_NAMES[tier]} collapsed into the right answer the moment we looked.`,
          ],
          salt,
        ),
        'good',
      );
    }
    return line(
      pick(
        [
          `${PROJECT_NAMES[tier]}: task complete. Funds released.`,
          `${PROJECT_NAMES[tier]} delivered. ${OWNER[tier]} approves the next tranche.`,
        ],
        salt,
      ),
      'good',
    );
  },

  failure(tier: ProjectTier, broken: boolean, salt: number): Line {
    if (broken) {
      return line(
        `${PROJECT_NAMES[tier]} failed: the condition was broken. ${OWNER[tier]} wants it repaired.`,
        'warn',
      );
    }
    return line(
      pick(
        [
          `${PROJECT_NAMES[tier]} missed its deadline. Funding takes a hit. ${OWNER[tier]} flags the cause.`,
          `${PROJECT_NAMES[tier]} ran out of time. ${OWNER[tier]} wants it repaired.`,
        ],
        salt,
      ),
      'warn',
    );
  },

  neutralized(tier: ProjectTier, salt: number): Line {
    return line(
      pick(
        [
          `${PROJECT_SHORT[tier]} repaired. Costly, but the lab breathes again.`,
          `${OWNER[tier]} patched the ${PROJECT_SHORT[tier].toLowerCase()}. Stability is coming back.`,
        ],
        salt,
      ),
      'good',
    );
  },

  ignored(tier: ProjectTier): Line {
    return line(
      `${PROJECT_NAMES[tier]} failure left open. It will keep costing the lab until the lab is closed.`,
      'warn',
    );
  },

  strained(cause: ProjectTier | null): Line {
    const subject = cause === null ? 'Readings' : READINGS[cause];
    return line(`${subject} came in late again. Keeping an eye on it. - Vey`, 'warn', 'MEMO');
  },

  critical(cause: ProjectTier | null): Line {
    const subject = cause === null ? 'Project' : PROJECT_SHORT[cause];
    return line(`${subject} funding is bleeding out fast. Need to neutralize this before it spreads.`, 'alert', 'ALERT');
  },

  imminent(): Line {
    return line('Containment is failing. Brace for reset.', 'alert', 'WARNING');
  },

  stabilised(): Line {
    return line('Crisis averted. Numbers stabilizing. Back to work. - Vey', 'good', 'LOG');
  },

  published(lab: number, echoes: number): Line {
    return line(
      echoes > 0
        ? `Lab ${lab} closed and published. Dr. Vey: "The next team inherits all of it."`
        : `Lab ${lab} closed. Dr. Vey: "Not enough to publish, but the notes are good."`,
      'info',
    );
  },

  /** Reused for every black-hole collapse. */
  blackHole(): Line {
    return line('MEMORY RECORD TERMINATED: Timeline unthreaded. Rewinding...', 'alert', null);
  },

  perk(tier: ProjectTier): Line {
    return line(
      `From the last lab's close call: ${PROJECT_SHORT[tier].toLowerCase()} work will be visible earlier from now on.`,
      'good',
    );
  },
  /** A Main research upgrade reached a new rank. */
  researchMain(tree: TreeId, rank: number, salt: number): Line {
    const subject: Readonly<Record<TreeId, string>> = {
      grant: 'The grant office',
      observation: 'The observation team',
      calibration: 'The calibration crew',
    };
    return line(
      pick(
        [
          `${subject[tree]} signed off on stage ${rank} of ${TREE_SHORT[tree]}. - Vey`,
          `${TREE_SHORT[tree]}, stage ${rank}: approved. The whole building feels it. - Vey`,
        ],
        salt,
      ),
      'good',
      'LAB-NOTE',
    );
  },

  /** A research tree finished: Main at 3/3 and both Subs at 8/8. */
  researchComplete(tree: TreeId): Line {
    return line(`${TREE_SHORT[tree]} is complete. Nothing left to optimize. Almost suspicious. - Vey`, 'good', 'LAB-NOTE');
  },

  /** Fabric became available: the Echo ledger crossed its threshold. */
  fabricOpened(): Line {
    return line(
      'Fifteen Echoes on the ledger. The old notebooks mention something under the floor: the Fabric. Threads, if we pull them. - Vey',
      'good',
      'LAB-NOTE',
    );
  },

  /** A lab was woven: its research became Threads instead of Echoes. */
  woven(lab: number, threads: number): Line {
    return line(
      `Lab ${lab} woven into the Fabric. ${threads} ${threads === 1 ? 'Thread' : 'Threads'} drawn, and no Echoes this time. - Vey`,
      'info',
      'LOG',
    );
  },

  /** The Multiverse opened: two Weaves are on the record. */
  multiverseOpened(): Line {
    return line(
      'Two weaves on the record, and the Fabric has started to fold back on itself. Somewhere past it, other labs are running. We could converge. - Vey',
      'good',
      'LAB-NOTE',
    );
  },

  /** The Fabric was converged into Shards. */
  converged(lab: number, shards: number): Line {
    return line(
      `Lab ${lab} converged. The whole Fabric folded into ${shards} ${shards === 1 ? 'Shard' : 'Shards'}. Everything we threaded is gone, and so is the weight of it. - Vey`,
      'info',
      'LOG',
    );
  },

  /** Two labs with opposite histories lined up on a Weave. */
  symmetricPair(pairs: number): Line {
    return line(
      `One lab that never wobbled, one that nearly fell. Together they make a Symmetric Pair (${pairs}). The whole building hums a little louder. - Vey`,
      'good',
      'LAB-NOTE',
    );
  },

  /** The last-chance window opened as a Continuum Tear. */
  tearOpened(): Line {
    return line('CONTINUUM TEAR: the record is splitting. Stitch it closed with Threads, or the lab goes with it.', 'alert', 'WARNING');
  },

  /** A Tear was stitched closed. */
  tearStitched(layers: number): Line {
    return line(
      `Stitched. The lab holds, and a shattered layer settles into the record (${layers}). Do not look at the seam. - Vey`,
      'good',
      'LAB-NOTE',
    );
  },

  /** Cost Decoherence bought for a project. */
  decoherence(tier: Tier): Line {
    return line(`${AUTOMATED[tier].replace(' procurement', '')} costs stop climbing quite so fast. The ledger looks almost polite. - Vey`, 'good', 'LAB-NOTE');
  },

  /** A Temporal Wormhole paid out. */
  wormhole(gain: string): Line {
    return line(`Temporal Wormhole installed. The books were rewritten from an earlier hour: +${gain} ψ. Do not ask the auditors. - Vey`, 'good', 'LAB-NOTE');
  },

  /** Dilated Time opened. */
  dilation(): Line {
    return line('Dilated Time. The qubits run fast and the building runs hot. Do not stay in it longer than you must. - Vey', 'warn', 'MEMO');
  },

  /** Superposition Tapping bought. */
  tapping(): Line {
    return line('Superposition Tapping online. Taps are held, unresolved, until somebody observes them. Choose the moment. - Vey', 'good', 'LAB-NOTE');
  },

  /** Ancestral Legacy bought. */
  ancestral(): Line {
    return line('Ancestral Legacy. The old labs are still in the walls, and they would like a word. - Vey', 'good', 'LAB-NOTE');
  },

  /** A burst of waveforms resolved. */
  waveResolved(gain: string, count: number): Line {
    return line(`${count} waveforms collapsed at once: +${gain} ψ.`, 'good');
  },

  /** An observation at a poor moment collapsed into an Instability Setback. */
  waveSetback(zone: Zone): Line {
    return line(
      zone === 'strained'
        ? 'Observed at a bad moment. The waveforms collapsed into noise. Stability slips. - Vey'
        : 'Observed while the lab was failing. The waveforms collapsed into static. Stability slips. - Vey',
      'warn',
      'MEMO',
    );
  },

  /** An autobuyer was installed for a project. */
  autobuyerInstalled(tier: Tier): Line {
    return line(`${AUTOMATED[tier]} is automated now. The routine runs itself. - Vey`, 'good', 'LAB-NOTE');
  },
};
