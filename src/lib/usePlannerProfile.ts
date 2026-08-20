import { useEffect, useState } from "react";
import { ABILITIES, type AbilityScores } from "@/lib/crs/types";

// Supporting profile inputs the planner's scenario flows need, persisted to
// localStorage the same way useScore/useCrsProfile are. Deliberately narrow
// — only what a scenario's math actually depends on. The French scenario's
// target result is NOT stored here; it's transient per-session state local
// to that flow, so a stale target never silently reappears next visit.

const PLANNER_PROFILE_KEY = "crsSignal.plannerProfile";
const WRITE_DEBOUNCE_MS = 500;

const ZERO_ABILITIES: AbilityScores = { speaking: 0, listening: 0, reading: 0, writing: 0 };

export interface PlannerProfile {
  hasSpouseOrPartner: boolean;
  hasEnglishResults: boolean;
  englishClb: AbilityScores;
  currentFrenchNclc: AbilityScores;
}

const DEFAULT_PROFILE: PlannerProfile = {
  hasSpouseOrPartner: false,
  hasEnglishResults: true,
  englishClb: ZERO_ABILITIES,
  currentFrenchNclc: ZERO_ABILITIES,
};

function isAbilityScores(value: unknown): value is AbilityScores {
  if (!value || typeof value !== "object") return false;
  return ABILITIES.every((a) => typeof (value as Record<string, unknown>)[a] === "number");
}

function migrate(parsed: unknown): PlannerProfile {
  if (!parsed || typeof parsed !== "object") return DEFAULT_PROFILE;
  const p = parsed as Partial<Record<keyof PlannerProfile, unknown>>;
  return {
    hasSpouseOrPartner:
      typeof p.hasSpouseOrPartner === "boolean"
        ? p.hasSpouseOrPartner
        : DEFAULT_PROFILE.hasSpouseOrPartner,
    hasEnglishResults:
      typeof p.hasEnglishResults === "boolean"
        ? p.hasEnglishResults
        : DEFAULT_PROFILE.hasEnglishResults,
    englishClb: isAbilityScores(p.englishClb) ? p.englishClb : ZERO_ABILITIES,
    currentFrenchNclc: isAbilityScores(p.currentFrenchNclc) ? p.currentFrenchNclc : ZERO_ABILITIES,
  };
}

export interface PlannerProfileState {
  profile: PlannerProfile;
  setProfile: React.Dispatch<React.SetStateAction<PlannerProfile>>;
  resetProfile: () => void;
  hydrated: boolean;
}

export function usePlannerProfile(): PlannerProfileState {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<PlannerProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLANNER_PROFILE_KEY);
      if (raw) setProfile(migrate(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(PLANNER_PROFILE_KEY, JSON.stringify(profile));
      } catch {
        /* ignore */
      }
    }, WRITE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [profile, hydrated]);

  const resetProfile = () => setProfile(DEFAULT_PROFILE);

  return { profile, setProfile, resetProfile, hydrated };
}
