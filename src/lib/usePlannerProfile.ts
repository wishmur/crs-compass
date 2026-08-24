import { useEffect, useState } from "react";
import {
  ABILITIES,
  EDUCATION_LEVELS,
  type AbilityScores,
  type EducationLevel,
} from "@/lib/crs/types";

// Supporting profile inputs the planner's scenario flows need, persisted to
// localStorage the same way useScore/useCrsProfile are. Deliberately narrow
// — only what a scenario's math actually depends on. Each scenario's own
// target (French target, English target, etc.) is NOT stored here; it's
// transient per-session state local to that flow, so a stale target never
// silently reappears next visit.
//
// NOTE: scenario flows currently only WRITE here — none of them read this
// profile back in to prefill their own accordion state, so the same
// "do you have a spouse" question still gets asked fresh in every scenario
// within a session even though the answer is already known. That's an
// existing gap (not something this comment is papering over), worth fixing
// once there are enough scenarios that re-asking becomes actively annoying
// rather than a one-time redundancy.

const PLANNER_PROFILE_KEY = "crsSignal.plannerProfile";
const WRITE_DEBOUNCE_MS = 500;

const ZERO_ABILITIES: AbilityScores = { speaking: 0, listening: 0, reading: 0, writing: 0 };

export interface PlannerProfile {
  hasSpouseOrPartner: boolean;
  hasEnglishResults: boolean;
  englishClb: AbilityScores;
  currentFrenchNclc: AbilityScores;
  educationLevel: EducationLevel;
  canadianWorkYears: number;
  foreignWorkYears: number;
}

const DEFAULT_PROFILE: PlannerProfile = {
  hasSpouseOrPartner: false,
  hasEnglishResults: true,
  englishClb: ZERO_ABILITIES,
  currentFrenchNclc: ZERO_ABILITIES,
  educationLevel: "none",
  canadianWorkYears: 0,
  foreignWorkYears: 0,
};

function isAbilityScores(value: unknown): value is AbilityScores {
  if (!value || typeof value !== "object") return false;
  return ABILITIES.every((a) => typeof (value as Record<string, unknown>)[a] === "number");
}

function isEducationLevel(value: unknown): value is EducationLevel {
  return typeof value === "string" && (EDUCATION_LEVELS as readonly string[]).includes(value);
}

function isWorkYears(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
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
    educationLevel: isEducationLevel(p.educationLevel)
      ? p.educationLevel
      : DEFAULT_PROFILE.educationLevel,
    canadianWorkYears: isWorkYears(p.canadianWorkYears)
      ? p.canadianWorkYears
      : DEFAULT_PROFILE.canadianWorkYears,
    foreignWorkYears: isWorkYears(p.foreignWorkYears)
      ? p.foreignWorkYears
      : DEFAULT_PROFILE.foreignWorkYears,
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
