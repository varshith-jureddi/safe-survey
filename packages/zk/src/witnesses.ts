import type { Phase3Demographics } from "./types.js";

/**
 * Witness implementations are deliberately tiny and side-effect free.
 * Raw demographic values must exist only in the participant's proving context.
 */
export interface EligibilityWitnessState {
  demographics: Phase3Demographics;
  participantSecret: Uint8Array;
}

export function createEligibilityWitnessState(
  demographics: Phase3Demographics,
  participantSecret: Uint8Array,
): EligibilityWitnessState {
  if (!Number.isInteger(demographics.age) || demographics.age < 0 || demographics.age > 65535) {
    throw new Error("Age must be an integer from 0 to 65535");
  }
  if (demographics.country.trim().length !== 2) {
    throw new Error("Country must be a 2-letter ISO code");
  }
  if (participantSecret.length !== 32) throw new Error("Participant secret must be exactly 32 bytes");
  return { demographics, participantSecret };
}

/**
 * Runtime witness object shape expected by generated Compact bindings.
 * The exact generated WitnessContext generic is produced by the pinned
 * compiler, so this adapter intentionally keeps SDK-specific typing at the
 * boundary rather than leaking it into the application.
 */
export function toGeneratedWitnesses(state: EligibilityWitnessState) {
  return {
    participantAge: () => [state.demographics.age],
    participantCountry: () => [new TextEncoder().encode(state.demographics.country.toUpperCase())],
    participantSecret: () => [state.participantSecret],
  };
}
