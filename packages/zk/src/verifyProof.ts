import type { Phase3ProofResult, Phase3VerifyInput, Phase3VerificationResult } from "./types.js";
import { assertBytes32Hex, hexToBytes } from "./encoding.js";

/**
 * Structural verification performed before cryptographic verification.
 * This is deliberately separate from the generated Midnight verifier.
 */
export function checkBinding(input: Phase3VerifyInput): Phase3VerificationResult {
  try {
    assertBytes32Hex(input.expectedSurveyId, "expectedSurveyId");
    assertBytes32Hex(input.expectedEligibilityHash, "expectedEligibilityHash");
  } catch (e) {
    return { valid: false, reason: e instanceof Error ? e.message : "Invalid expected binding" };
  }
  if (input.publicOutputs.surveyId !== input.expectedSurveyId) {
    return { valid: false, reason: "Proof surveyId does not match the requested survey" };
  }
  if (input.publicOutputs.eligibilityHash !== input.expectedEligibilityHash) {
    return { valid: false, reason: "Proof eligibilityHash does not match the current ruleset" };
  }
  if (!input.publicOutputs.satisfied) return { valid: false, reason: "Proof does not establish eligibility" };
  try { hexToBytes(input.proof); } catch { return { valid: false, reason: "Malformed proof encoding" }; }
  if (!/^[0-9a-fA-F]{64}$/.test(input.publicOutputs.nullifier)) {
    return { valid: false, reason: "Malformed nullifier" };
  }
  return { valid: true };
}

/**
 * Verifies the actual proof with the generated Midnight verifier.
 * The generated verifier API is intentionally injected because its exact
 * binding is compiler-output-specific. No SHA-256/mock acceptance path exists.
 */
export async function verifyEligibilityProof(
  input: Phase3VerifyInput,
  verifier: (proof: Uint8Array, publicOutputs: Phase3VerifyInput["publicOutputs"]) => Promise<boolean>,
): Promise<Phase3VerificationResult> {
  const binding = checkBinding(input);
  if (!binding.valid) return binding;

  const valid = await verifier(hexToBytes(input.proof), input.publicOutputs);
  return valid ? { valid: true } : { valid: false, reason: "Midnight cryptographic verification failed" };
}

export type { Phase3ProofResult };
