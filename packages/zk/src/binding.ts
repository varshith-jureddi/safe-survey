import { createHash, randomBytes } from "node:crypto";
import { assertBytes32Hex, bytesToHex } from "./encoding.js";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function canonicalEligibilityHash(eligibility: unknown): string {
  const canonical = JSON.stringify(eligibility, Object.keys(eligibility as object).sort());
  return sha256Hex(canonical);
}

export function surveyIdBytes(surveyId: string): Uint8Array {
  assertBytes32Hex(surveyId, "surveyId");
  return Uint8Array.from(Buffer.from(surveyId, "hex"));
}

export function eligibilityHashBytes(hash: string): Uint8Array {
  assertBytes32Hex(hash, "eligibilityHash");
  return Uint8Array.from(Buffer.from(hash, "hex"));
}

export function createParticipantSecret(): Uint8Array {
  return randomBytes(32);
}

export function encodePublicOutputs(
  satisfied: boolean,
  nullifier: Uint8Array,
  surveyId: Uint8Array,
  eligibilityHash: Uint8Array,
) {
  return {
    satisfied,
    nullifier: bytesToHex(nullifier),
    surveyId: bytesToHex(surveyId),
    eligibilityHash: bytesToHex(eligibilityHash),
  };
}
