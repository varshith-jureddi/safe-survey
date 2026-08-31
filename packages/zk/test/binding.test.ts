import test from "node:test";
import assert from "node:assert/strict";
import { checkBinding } from "../src/verifyProof.js";

test("rejects proof bound to a different survey", () => {
  const r = checkBinding({
    proof: "00",
    expectedSurveyId: "a".repeat(64),
    expectedEligibilityHash: "b".repeat(64),
    publicOutputs: { satisfied: true, nullifier: "c".repeat(64), surveyId: "d".repeat(64), eligibilityHash: "b".repeat(64) },
  });
  assert.equal(r.valid, false);
});

test("rejects an unsatisfied result", () => {
  const r = checkBinding({
    proof: "00",
    expectedSurveyId: "a".repeat(64),
    expectedEligibilityHash: "b".repeat(64),
    publicOutputs: { satisfied: false, nullifier: "c".repeat(64), surveyId: "a".repeat(64), eligibilityHash: "b".repeat(64) },
  });
  assert.equal(r.valid, false);
});
