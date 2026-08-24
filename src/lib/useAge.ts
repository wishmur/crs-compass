import { useEffect, useState } from "react";

// The user's age in years, persisted to localStorage — same shape as
// useScore.ts. Deliberately just age, not a full date of birth: the age
// insight only needs the current year's point value, not an exact birthday.

const AGE_KEY = "crsSignal.age";

export interface AgeState {
  raw: string;
  setRaw: (v: string) => void;
  /** Parsed integer 17..99, or null if the raw input is empty/invalid. */
  age: number | null;
  hydrated: boolean;
}

export function useAge(): AgeState {
  const [raw, setRawState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AGE_KEY);
      if (stored) setRawState(stored);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setRaw = (v: string) => {
    const next = v.replace(/\D/g, "").slice(0, 2);
    setRawState(next);
    try {
      if (next) window.localStorage.setItem(AGE_KEY, next);
      else window.localStorage.removeItem(AGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const parsed = Number.parseInt(raw, 10);
  const age = Number.isFinite(parsed) && parsed >= 17 && parsed <= 99 ? parsed : null;

  return { raw, setRaw, age, hydrated };
}
