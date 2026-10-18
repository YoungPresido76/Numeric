import type { ReactElement } from 'react';
import type { Notice, SaveStatus } from '../game/store';

interface NoticeBarProps {
  notice: Notice | null;
  saveStatus: SaveStatus;
  onDismiss: () => void;
}

/** Surfaces save problems: corrupt data on load, blocked storage, or a failed write. */
export function NoticeBar({ notice, saveStatus, onDismiss }: NoticeBarProps): ReactElement | null {
  const failedWrite = saveStatus === 'error';
  if (!notice && !failedWrite) return null;

  const message = notice
    ? notice.message
    : 'The last autosave failed (storage may be full). Use Export in System to keep a copy.';

  return (
    <div
      role="alert"
      className="fade-in mx-3 mb-2 flex shrink-0 items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs text-amber-100"
    >
      <p className="flex-1 leading-snug">{message}</p>
      {notice ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-1.5 py-0.5 font-semibold underline underline-offset-2"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
