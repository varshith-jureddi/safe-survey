import type { Survey } from "@prisma/client";
import { prisma } from "../db.js";

/**
 * Fetches a survey and verifies it belongs to the given researcher.
 * Returns null if not found or not owned — callers should respond 404
 * either way, so we don't leak whether a survey id exists at all.
 */
export async function getOwnedSurvey(
  researcherId: string,
  surveyId: string,
): Promise<Survey | null> {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey || survey.researcherId !== researcherId) {
    return null;
  }
  return survey;
}

/**
 * Once a survey leaves DRAFT, its content is frozen. This matters beyond
 * UX: publishing binds the eligibility rules (via eligibilityHash) and
 * question set into what participants will eventually prove against and
 * answer. Letting a researcher edit questions or eligibility after
 * publish would silently invalidate proofs/responses already collected
 * against the original version. Returns an error string if editing
 * should be blocked, or null if it's allowed.
 */
export function assertDraftEditable(survey: Survey): string | null {
  if (survey.status !== "DRAFT") {
    return `Survey is ${survey.status}; this can only be changed while the survey is in DRAFT`;
  }
  return null;
}
