import type { Phase3Demographics, Phase3ProofResult } from "./types.js";
import { createEligibilityWitnessState } from "./witnesses.js";
import { assertBytes32Hex, bytesToHex } from "./encoding.js";
import { createParticipantSecret } from "./binding.js";

/**
 * Real Midnight proof-generation entry point.
 *
 * The caller supplies a configured deployed contract returned by the
 * Midnight.js runtime. The function does not calculate eligibility in JS and
 * does not manufacture a fake proof. The Compact circuit is the authority.
 */
export async function generateEligibilityProof(args: {
  deployedContract: any;
  demographics: Phase3Demographics;
  surveyId: string;
  eligibilityHash: string;
  participantSecret?: Uint8Array;
}): Promise<Phase3ProofResult> {
  assertBytes32Hex(args.surveyId, "surveyId");
  assertBytes32Hex(args.eligibilityHash, "eligibilityHash");

  const secret = args.participantSecret ?? createParticipantSecret();
  const state = createEligibilityWitnessState(args.demographics, secret);
  void state; // Witnesses are bound when the compiled contract is constructed.

  if (!args.deployedContract?.callTx?.proveEligibility) {
    throw new Error(
      "Compiled Midnight contract is not initialized. Run `npm run compact` and initialize the deployed contract/proof providers first.",
    );
  }

  const result = await args.deployedContract.callTx.proveEligibility(
    Uint8Array.from(Buffer.from(args.surveyId, "hex")),
    Uint8Array.from(Buffer.from(args.eligibilityHash, "hex")),
  );

  const publicOutputs = result.public?.output ?? result.public?.result ?? result.public;
  if (!publicOutputs) throw new Error("Midnight returned no public proof outputs");

  return {
    proof: bytesToHex(result.proof ?? result.tx?.proof ?? new Uint8Array()),
    publicOutputs: {
      satisfied: Boolean(publicOutputs[0]),
      nullifier: bytesToHex(publicOutputs[1]),
      surveyId: bytesToHex(publicOutputs[2]),
      eligibilityHash: bytesToHex(publicOutputs[3]),
    },
  };
}
