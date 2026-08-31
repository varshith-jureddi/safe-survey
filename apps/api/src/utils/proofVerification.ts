export interface VerifyProofInput {
  proof: string;
  publicSignals: { surveyId: string; eligibilityHash: string; satisfied: boolean; nullifier?: string };
  expectedSurveyId: string;
  expectedEligibilityHash: string;
}

export interface VerificationResult { valid: boolean; reason?: string }

export type MidnightVerifier = (input: VerifyProofInput) => Promise<VerificationResult>;

let verifier: MidnightVerifier | null = null;
export function configureMidnightVerifier(value: MidnightVerifier) { verifier = value; }

export async function verifyEligibilityProof(input: VerifyProofInput): Promise<VerificationResult> {
  if (input.publicSignals.surveyId !== input.expectedSurveyId) {
    return { valid: false, reason: "Proof surveyId does not match the requested survey" };
  }
  if (input.publicSignals.eligibilityHash !== input.expectedEligibilityHash) {
    return { valid: false, reason: "Proof eligibilityHash does not match the current ruleset" };
  }
  if (!input.publicSignals.satisfied) {
    return { valid: false, reason: "Proof does not establish eligibility" };
  }
  if (!input.publicSignals.nullifier || !/^[0-9a-fA-F]{64}$/.test(input.publicSignals.nullifier)) {
    return { valid: false, reason: "Proof does not contain a valid nullifier" };
  }
  if (!verifier) {
    return { valid: false, reason: "Midnight cryptographic verifier is not configured" };
  }
  return verifier(input);
}
