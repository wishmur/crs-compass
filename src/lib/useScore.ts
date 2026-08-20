import { useEffect, useState } from "react";

// The user's known CRS score, persisted to localStorage and shared by every
// page that needs it (Home, Plan). Each page mounts its own instance of this
// hook, so the localStorage write has to be synchronous, not debounced —
// Home writing on a timer left a window where navigating to Plan right after
// typing would read the old value, making the "same score, same spot on both
// pages" promise feel broken. A 4-digit input is cheap enough to just write
// on every keystroke.
//
// State is intentionally split into `raw` (the string in the input) and
// `score` (the parsed number, or null if empty/invalid).

const SCORE_KEY = "crsSignal.score";

export interface ScoreState {
  raw: string;
  setRaw: (v: string) => void;
  /** Parsed integer 1..1200, or null if the raw input is empty/invalid. */
  score: number | null;
  hydrated: boolean;
}

export function useScore(): ScoreState {
  const [raw, setRawState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SCORE_KEY);
      if (stored) setRawState(stored);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setRaw = (v: string) => {
    const next = v.replace(/\D/g, "").slice(0, 4);
    setRawState(next);
    try {
      if (next) window.localStorage.setItem(SCORE_KEY, next);
      else window.localStorage.removeItem(SCORE_KEY);
    } catch {
      /* ignore */
    }
  };

  const parsed = Number.parseInt(raw, 10);
  const score = Number.isFinite(parsed) && parsed > 0 && parsed <= 1200 ? parsed : null;

  return { raw, setRaw, score, hydrated };
}
