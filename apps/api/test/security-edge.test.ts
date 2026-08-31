import test from "node:test";
import assert from "node:assert/strict";
import { checkBinding } from "../../packages/zk/src/verifyProof.js";
import { validateAnswer } from "../src/utils/answerValidation.js";
import { verifyEligibilityToken } from "../src/utils/eligibilityToken.js";
import { assertDraftEditable } from "../src/utils/surveyAccess.js";

const hex32 = (char: string) => char.repeat(64);

function question(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    surveyId: "s1",
    position: 1,
    questionType: "SINGLE_CHOICE",
    questionText: "Travel frequency",
    options: ["Daily", "Weekly"],
    required: true,
    ...overrides,
  } as any;
}

function fakeJwtApp(verifyImpl: () => unknown) {
  return { jwt: { verify: verifyImpl } } as any;
}

test("rejects a proof replayed against another survey", () => {
  const result = checkBinding({
    proof: "00",
    expectedSurveyId: hex32("a"),
    expectedEligibilityHash: hex32("b"),
    publicOutputs: {
      satisfied: true,
      nullifier: hex32("c"),
      surveyId: hex32("d"),
      eligibilityHash: hex32("b"),
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /surveyId/i);
});

test("rejects a proof after eligibility rules are changed", () => {
  const result = checkBinding({
    proof: "00",
    expectedSurveyId: hex32("a"),
    expectedEligibilityHash: hex32("e"),
    publicOutputs: {
      satisfied: true,
      nullifier: hex32("c"),
      surveyId: hex32("a"),
      eligibilityHash: hex32("b"),
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /eligibilityHash/i);
});

test("rejects an unsatisfied eligibility proof", () => {
  const result = checkBinding({
    proof: "00",
    expectedSurveyId: hex32("a"),
    expectedEligibilityHash: hex32("b"),
    publicOutputs: {
      satisfied: false,
      nullifier: hex32("c"),
      surveyId: hex32("a"),
      eligibilityHash: hex32("b"),
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /eligibility/i);
});

test("rejects malformed proof encoding", () => {
  const result = checkBinding({
    proof: "not-hex",
    expectedSurveyId: hex32("a"),
    expectedEligibilityHash: hex32("b"),
    publicOutputs: {
      satisfied: true,
      nullifier: hex32("c"),
      surveyId: hex32("a"),
      eligibilityHash: hex32("b"),
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /proof encoding/i);
});

test("rejects malformed nullifiers", () => {
  const result = checkBinding({
    proof: "00",
    expectedSurveyId: hex32("a"),
    expectedEligibilityHash: hex32("b"),
    publicOutputs: {
      satisfied: true,
      nullifier: "1234",
      surveyId: hex32("a"),
      eligibilityHash: hex32("b"),
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /nullifier/i);
});

test("rejects expired eligibility tokens", () => {
  const result = verifyEligibilityToken(
    fakeJwtApp(() => { throw new Error("jwt expired"); }),
    "expired-token",
    { surveyId: "s1", eligibilityHash: hex32("a"), nullifier: hex32("b") },
  );
  assert.equal(result.valid, false);
  assert.match(result.reason, /invalid or expired/i);
});

test("rejects eligibility tokens from another survey", () => {
  const result = verifyEligibilityToken(
    fakeJwtApp(() => ({ type: "eligibility", surveyId: "s2", eligibilityHash: hex32("a"), nullifier: hex32("b") })),
    "token",
    { surveyId: "s1", eligibilityHash: hex32("a"), nullifier: hex32("b") },
  );
  assert.equal(result.valid, false);
  assert.match(result.reason, /another survey/i);
});

test("rejects eligibility tokens from an old ruleset", () => {
  const result = verifyEligibilityToken(
    fakeJwtApp(() => ({ type: "eligibility", surveyId: "s1", eligibilityHash: hex32("a"), nullifier: hex32("b") })),
    "token",
    { surveyId: "s1", eligibilityHash: hex32("c"), nullifier: hex32("b") },
  );
  assert.equal(result.valid, false);
  assert.match(result.reason, /old eligibility/i);
});

test("rejects eligibility token/nullifier mismatch", () => {
  const result = verifyEligibilityToken(
    fakeJwtApp(() => ({ type: "eligibility", surveyId: "s1", eligibilityHash: hex32("a"), nullifier: hex32("b") })),
    "token",
    { surveyId: "s1", eligibilityHash: hex32("a"), nullifier: hex32("c") },
  );
  assert.equal(result.valid, false);
  assert.match(result.reason, /nullifier mismatch/i);
});

test("rejects invalid single-choice answers", () => {
  const result = validateAnswer(question(), "Yearly");
  assert.equal(result.valid, false);
});

test("rejects malformed multiple-choice answers", () => {
  const result = validateAnswer(question({ questionType: "MULTIPLE_CHOICE" }), ["Daily", "Injected option"]);
  assert.equal(result.valid, false);
});

test("rejects oversized free-text answers", () => {
  const result = validateAnswer(question({ questionType: "FREE_TEXT" }), "x".repeat(5001));
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /5000/);
});

test("rejects non-boolean YES/NO answers", () => {
  const result = validateAnswer(question({ questionType: "YES_NO" }), "true");
  assert.equal(result.valid, false);
});

test("prevents edits to published or closed surveys", () => {
  assert.match(assertDraftEditable({ status: "PUBLISHED" } as any) ?? "", /PUBLISHED/);
  assert.match(assertDraftEditable({ status: "CLOSED" } as any) ?? "", /CLOSED/);
  assert.equal(assertDraftEditable({ status: "DRAFT" } as any), null);
});

test("security contract: response route requires token and nullifier and enforces unique survey/nullifier", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(new URL("../src/routes/responses.ts", import.meta.url), "utf8");
  assert.match(source, /eligibilityToken/);
  assert.match(source, /verifyEligibilityToken/);
  assert.match(source, /P2002/);
  assert.match(source, /prisma\.response\.create/);
  assert.doesNotMatch(source, /demographic|dateOfBirth|dob|country/i);
});

test("security contract: results route is authenticated and ownership-scoped", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(new URL("../src/routes/results.ts", import.meta.url), "utf8");
  assert.match(source, /app\.authenticate/);
  assert.match(source, /getOwnedSurvey/);
  assert.doesNotMatch(source, /nullifier/);
});
