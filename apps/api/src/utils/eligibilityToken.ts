import type { FastifyInstance } from "fastify";

export interface EligibilityTokenClaims {
  type: "eligibility";
  surveyId: string;
  eligibilityHash: string;
  nullifier: string;
}

const TOKEN_TTL = "10m";

export function issueEligibilityToken(
  app: FastifyInstance,
  claims: Omit<EligibilityTokenClaims, "type">,
): string {
  return app.jwt.sign(
    { type: "eligibility", ...claims },
    { expiresIn: TOKEN_TTL },
  );
}

export function verifyEligibilityToken(
  app: FastifyInstance,
  token: string,
  expected: { surveyId: string; eligibilityHash: string; nullifier: string },
): { valid: true } | { valid: false; reason: string } {
  try {
    const decoded = app.jwt.verify<EligibilityTokenClaims>(token);
    if (decoded.type !== "eligibility") return { valid: false, reason: "Invalid token type" };
    if (decoded.surveyId !== expected.surveyId) return { valid: false, reason: "Eligibility token is for another survey" };
    if (decoded.eligibilityHash !== expected.eligibilityHash) return { valid: false, reason: "Eligibility token is for an old eligibility ruleset" };
    if (decoded.nullifier !== expected.nullifier) return { valid: false, reason: "Eligibility token/nullifier mismatch" };
    return { valid: true };
  } catch {
    return { valid: false, reason: "Eligibility token is invalid or expired" };
  }
}
