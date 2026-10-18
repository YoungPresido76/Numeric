import { PROJECT_NAMES } from './data';
import type { NoteTone, ProjectTier, Tier } from './types';

/** One notebook line before it is given an id. */
export interface Line {
  text: string;
  tone: NoteTone;
}

function pick(bank: readonly string[], salt: number): string {
  const index = Math.abs(Math.floor(salt)) % bank.length;
  return bank[index] ?? bank[0] ?? '';
}

function line(text: string, tone: NoteTone): Line {
  return { text, tone };
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
          'Gate array online. Dr. Okafor says experiments will start arriving. Watch them closely and observe early.',
          'good',
        );
      case 2:
        return line('Lattice linked. Dr. Vey signs off on the wiring. The gates now move together.', 'good');
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

  experimentStarted(tier: ProjectTier, salt: number): Line {
    return line(
      pick(
        [
          `${PROJECT_NAMES[tier]} started. Unresolved until observed.`,
          `${PROJECT_NAMES[tier]} is running. It is in superposition for now.`,
        ],
        salt,
      ),
      'info',
    );
  },

  success(tier: ProjectTier, observed: boolean, salt: number): Line {
    if (observed) {
      return line(
        pick(
          [
            `${PROJECT_NAMES[tier]}: observed, signal clean. Funds released.`,
            `${PROJECT_NAMES[tier]} resolved under observation. It held.`,
          ],
          salt,
        ),
        'good',
      );
    }
    return line(
      pick(
        [
          `${PROJECT_NAMES[tier]} closed unwatched. The result held, this time.`,
          `${PROJECT_NAMES[tier]} resolved on its own and paid out late.`,
        ],
        salt,
      ),
      'good',
    );
  },

  failure(tier: ProjectTier, salt: number): Line {
    return line(
      pick(
        [
          `${PROJECT_NAMES[tier]} failed. Funding takes a hit. ${OWNER[tier]} flags the cause.`,
          `${PROJECT_NAMES[tier]} collapsed the wrong way. ${OWNER[tier]} wants it repaired.`,
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
    switch (cause) {
      case 1:
        return line('Gate calibration drifting. Dr. Okafor wants a recheck.', 'warn');
      case 2:
        return line('Lattice funding thin, Dr. Vey.', 'warn');
      case 3:
        return line('The branch reactor is diverging from plan. Mira asks for a report.', 'warn');
      case null:
        return line('The lab feels strained. Something is slipping.', 'warn');
    }
  },

  critical(cause: ProjectTier | null): Line {
    const who = cause === null ? 'The lab' : PROJECT_SHORT[cause];
    return line(`Critical: ${who} is failing and the building is noticing. One more bad run could end this lab.`, 'alert');
  },

  imminent(): Line {
    return line('Collapse imminent. Repair something now, or publish before the lab falls in on itself.', 'alert');
  },

  stabilised(): Line {
    return line('Stability recovered. Everyone exhales.', 'good');
  },

  published(lab: number, echoes: number): Line {
    return line(
      echoes > 0
        ? `Lab ${lab} closed and published. Dr. Vey: "The next team inherits all of it."`
        : `Lab ${lab} closed. Dr. Vey: "Not enough to publish, but the notes are good."`,
      'info',
    );
  },

  blackHole(lab: number): Line {
    return line(
      `Lab ${lab} fell into its own singularity. Dr. Vey's last note: "Publish earlier next time."`,
      'alert',
    );
  },

  perk(tier: ProjectTier): Line {
    return line(
      `From the last lab's close call: ${PROJECT_SHORT[tier].toLowerCase()} work will be visible earlier from now on.`,
      'good',
    );
  },
};
