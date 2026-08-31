import type { Demographics, ProofResult } from "./types";

/** Phase 3 adapter: real proof generation must be supplied by the Midnight runtime. */
export interface MidnightProofGenerator {
  generate(args: { demographics: Demographics; surveyId: string; eligibilityHash: string }): Promise<ProofResult>;
}

let generator: MidnightProofGenerator | null = null;
export function configureMidnightProofGenerator(value: MidnightProofGenerator) { generator = value; }

export async function generateEligibilityProof(args: { demographics: Demographics; eligibility: unknown; surveyId: string; eligibilityHash: string }): Promise<ProofResult> {
  if (!generator) {
    throw new Error("Midnight proof generator is not configured. Build the Compact contract and initialize the Midnight runtime before generating proofs.");
  }
  return generator.generate({ demographics: args.demographics, surveyId: args.surveyId, eligibilityHash: args.eligibilityHash });
}
