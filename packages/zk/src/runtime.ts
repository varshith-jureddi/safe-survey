/**
 * Midnight SDK boundary.
 *
 * The generated contract is produced by `compact compile` and is intentionally
 * not checked into source control. This module loads it after compilation and
 * creates a CompiledContract with the participant witness implementation.
 */
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import type { EligibilityWitnessState } from "./witnesses.js";
import { toGeneratedWitnesses } from "./witnesses.js";

export function loadCompiledEligibilityContract(state: EligibilityWitnessState, zkConfigPath: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const generated = require(zkConfigPath);
  const Contract = generated.Contract ?? generated.default?.Contract;
  if (!Contract) throw new Error("Compiled eligibility contract bindings were not found");

  return CompiledContract.make("SurveyEligibility", Contract).pipe(
    CompiledContract.withWitnesses(toGeneratedWitnesses(state) as never),
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );
}
