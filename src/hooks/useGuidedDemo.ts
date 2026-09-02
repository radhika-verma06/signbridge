import { useCallback, useEffect, useRef, useState } from 'react';

export interface GuidedDemoActions {
  reset: () => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  openInterpret: () => void;
  closeInterpret: () => void;
  openExplain: () => void;
  closeExplain: () => void;
  openAsk: () => void;
  askQuestion: (question: string) => void;
  scrollToAsk: () => void;
  scrollToVisualiser: () => void;
  setForce: (value: number) => void;
  setMass: (value: number) => void;
  endCleanly: () => void;
}

/**
 * Scripts a ~35 second, fully offline walkthrough of the REAL interface --
 * every step calls the same actions a presenter would trigger by hand. This
 * is not a separate fake demo mode; it drives the live app state.
 */
export function useGuidedDemo(actions: GuidedDemoActions) {
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStepLabel, setDemoStepLabel] = useState<string | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Scheduled steps run minutes of wall-clock "later" than this render, by which
  // point currentTime/lessonContext have moved on. Always call through a ref so
  // each step uses the LATEST actions (and the video-time-derived state they
  // close over), never a stale snapshot from when startDemo was first created.
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const clear = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);

  const stopDemo = useCallback(() => {
    clear();
    setDemoRunning(false);
    setDemoStepLabel(null);
  }, [clear]);

  const startDemo = useCallback(() => {
    clear();
    setDemoRunning(true);
    actionsRef.current.reset();

    const schedule = (delay: number, label: string, action: () => void) => {
      const id = setTimeout(() => {
        setDemoStepLabel(label);
        action();
      }, delay);
      timeouts.current.push(id);
    };

    schedule(400, 'Step 1 of 9 — Playing the real Newton’s Second Law lesson', () => {
      actionsRef.current.play();
    });

    schedule(3200, 'Step 2 of 9 — Jumping to the acceleration/mass demonstration', () => {
      actionsRef.current.seek(62.5);
    });

    schedule(8000, 'Step 3 of 9 — Pausing at a key concept and opening Interpret', () => {
      actionsRef.current.pause();
      actionsRef.current.openInterpret();
    });

    schedule(12500, 'Step 4 of 9 — Opening Explain for a plain-language analogy', () => {
      actionsRef.current.closeInterpret();
      actionsRef.current.openExplain();
    });

    schedule(17500, 'Step 5 of 9 — Opening Ask SignBridge', () => {
      actionsRef.current.closeExplain();
      actionsRef.current.scrollToAsk();
    });

    schedule(19000, 'Step 6 of 9 — Asking why mass reduces acceleration', () => {
      actionsRef.current.openAsk();
      actionsRef.current.askQuestion('Why does increasing mass reduce acceleration?');
    });

    schedule(23000, 'Step 7 of 9 — Opening Visualise', () => {
      actionsRef.current.scrollToVisualiser();
    });

    schedule(25500, 'Step 8 of 9 — Increasing mass to show acceleration drop', () => {
      actionsRef.current.setForce(6);
      actionsRef.current.setMass(9);
    });

    schedule(28500, 'Step 8 of 9 — Increasing force to recover acceleration', () => {
      actionsRef.current.setForce(10);
      actionsRef.current.setMass(9);
    });

    schedule(31500, 'Step 9 of 9 — Demo complete', () => {
      setDemoStepLabel('Demo complete — explore freely, or run it again.');
    });

    schedule(35000, '', () => {
      actionsRef.current.endCleanly();
      setDemoRunning(false);
      setDemoStepLabel(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clear]);

  useEffect(() => () => clear(), [clear]);

  return { demoRunning, demoStepLabel, startDemo, stopDemo };
}
