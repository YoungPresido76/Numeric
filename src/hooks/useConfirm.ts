import { useCallback, useEffect, useRef, useState } from 'react';

interface Confirm {
  /** True while the next press will run the action. */
  armed: boolean;
  /** First press arms; a second press within the window runs `action`. */
  press: (action: () => void) => void;
  cancel: () => void;
}

/** Two-step confirmation for destructive buttons, friendly to touch screens. */
export function useConfirm(windowMs = 4000): Confirm {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = useCallback((): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const cancel = useCallback((): void => {
    clear();
    setArmed(false);
  }, [clear]);

  const press = useCallback(
    (action: () => void): void => {
      if (!armed) {
        setArmed(true);
        clear();
        timer.current = window.setTimeout(() => {
          timer.current = null;
          setArmed(false);
        }, windowMs);
        return;
      }
      clear();
      setArmed(false);
      action();
    },
    [armed, clear, windowMs],
  );

  return { armed, press, cancel };
}
