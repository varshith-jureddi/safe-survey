export interface Phase3Demographics {
  age: number;
  country: string;
}

export interface Phase3ProofPublicOutputs {
  satisfied: boolean;
  nullifier: string;
  surveyId: string;
  eligibilityHash: string;
}

export interface Phase3ProofResult {
  proof: string;
  publicOutputs: Phase3ProofPublicOutputs;
}

export interface Phase3VerifyInput {
  proof: string;
  expectedSurveyId: string;
  expectedEligibilityHash: string;
  publicOutputs: Phase3ProofPublicOutputs;
}

export interface Phase3VerificationResult {
  valid: boolean;
  reason?: string;
}
