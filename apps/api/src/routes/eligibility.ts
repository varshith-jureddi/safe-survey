import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { verifyEligibilityProof } from "../utils/proofVerification.js";
import { issueEligibilityToken } from "../utils/eligibilityToken.js";

interface VerifyBody {
  proof: string;
  publicSignals: {
    surveyId: string;
    eligibilityHash: string;
    satisfied: boolean;
    nullifier?: string;
  };
  nullifier: string;
}

const verifyBodySchema = {
  type: "object",
  required: ["proof", "publicSignals", "nullifier"],
  properties: {
    proof: { type: "string", minLength: 1 },
    publicSignals: {
      type: "object",
      required: ["surveyId", "eligibilityHash", "satisfied"],
      properties: {
        surveyId: { type: "string" },
        eligibilityHash: { type: "string" },
        satisfied: { type: "boolean" },
        nullifier: { type: "string" },
      },
    },
    nullifier: { type: "string", minLength: 1 },
  },
} as const;

export async function eligibilityRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string }; Body: VerifyBody }>(
    "/surveys/:id/verify",
    { schema: { body: verifyBodySchema } },
    async (request, reply) => {
      const { id: surveyId } = request.params;
      const { proof, publicSignals, nullifier } = request.body;

      const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }
      if (survey.status !== "PUBLISHED") {
        reply.code(409);
        return { error: "Survey is not accepting participants" };
      }
      if (!survey.eligibilityHash) {
        reply.code(409);
        return { error: "Survey has no eligibility rules configured" };
      }
      if (!publicSignals.nullifier || publicSignals.nullifier !== nullifier) {
        reply.code(403);
        return { error: "Nullifier mismatch" };
      }

      const verification = await verifyEligibilityProof({
        proof,
        publicSignals,
        expectedSurveyId: survey.id,
        expectedEligibilityHash: survey.eligibilityHash,
      });

      if (!verification.valid) {
        reply.code(403);
        return { error: verification.reason ?? "Eligibility proof verification failed" };
      }

      const eligibilityToken = issueEligibilityToken(app, {
        surveyId: survey.id,
        eligibilityHash: survey.eligibilityHash,
        nullifier,
      });

      return {
        verified: true,
        eligibilityToken,
        expiresInSeconds: 600,
        message: "Eligibility verified. Your personal demographic values were not received by the API.",
      };
    },
  );
}
