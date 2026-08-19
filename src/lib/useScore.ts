import { useEffect, useState } from "react";

// The user's known CRS score, persisted to localStorage. Reused by any page
// that needs the score — Home today, /plan tomorrow.
//
// State is intentionally split into `raw` (the string in the input) and
// `score` (the parsed number, or null if empty/invalid). Callers write to
// setRaw; the debounced localStorage write and validation happen here.

const SCORE_KEY = "crsSignal.score";
const WRITE_DEBOUNCE_MS = 500;

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

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      try {
        if (raw) window.localStorage.setItem(SCORE_KEY, raw);
        else window.localStorage.removeItem(SCORE_KEY);
      } catch {
        /* ignore */
      }
    }, WRITE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [raw, hydrated]);

  const setRaw = (v: string) => setRawState(v.replace(/\D/g, "").slice(0, 4));

  const parsed = Number.parseInt(raw, 10);
  const score = Number.isFinite(parsed) && parsed > 0 && parsed <= 1200 ? parsed : null;

  return { raw, setRaw, score, hydrated };
}
