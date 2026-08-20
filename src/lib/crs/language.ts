import { ABILITIES, type AbilityScores } from "./types";
import {
  FRENCH_BONUS_ENGLISH_CLB_THRESHOLD,
  FRENCH_BONUS_NCLC_THRESHOLD,
  FRENCH_BONUS_POINTS,
  SECOND_LANGUAGE_CAP,
  SECOND_LANGUAGE_PER_ABILITY,
} from "./ruleset-2026-08";

/** Points for one ability at a given CLB/NCLC level, per the second-official-
    language table (same banding with or without a spouse). */
export function secondLanguageAbilityPoints(level: number): number {
  const band = SECOND_LANGUAGE_PER_ABILITY.find((b) => level >= b.min);
  return band?.points ?? 0;
}

/** Combined second-official-language points across all four abilities,
    capped per the with/without-spouse maximum. */
export function secondLanguagePoints(scores: AbilityScores, hasSpouseOrPartner: boolean): number {
  const sum = ABILITIES.reduce(
    (total, ability) => total + secondLanguageAbilityPoints(scores[ability]),
    0,
  );
  const cap = hasSpouseOrPartner
    ? SECOND_LANGUAGE_CAP.withSpouse
    : SECOND_LANGUAGE_CAP.withoutSpouse;
  return Math.min(sum, cap);
}

/** The French-language additional-points bonus. `englishClb` is null when
    the candidate hasn't taken an English test — IRCC's rule treats that the
    same as scoring CLB 4 or lower for this bonus specifically. */
export function frenchBonusPoints(
  frenchNclc: AbilityScores,
  englishClb: AbilityScores | null,
): number {
  const frenchQualifies = ABILITIES.every((a) => frenchNclc[a] >= FRENCH_BONUS_NCLC_THRESHOLD);
  if (!frenchQualifies) return 0;

  const englishStrong =
    englishClb !== null &&
    ABILITIES.every((a) => englishClb[a] >= FRENCH_BONUS_ENGLISH_CLB_THRESHOLD);

  return englishStrong ? FRENCH_BONUS_POINTS.full : FRENCH_BONUS_POINTS.partial;
}
