import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { validateAnswer } from "../utils/answerValidation.js";
import { verifyEligibilityToken } from "../utils/eligibilityToken.js";

interface SubmitResponseBody {
  eligibilityToken: string;
  nullifier: string;
  answers: Array<{ questionId: string; answer: unknown }>;
}

const submitResponseBodySchema = {
  type: "object",
  required: ["eligibilityToken", "nullifier", "answers"],
  properties: {
    eligibilityToken: { type: "string", minLength: 1 },
    nullifier: { type: "string", minLength: 64, maxLength: 64 },
    answers: {
      type: "array",
      items: {
        type: "object",
        required: ["questionId", "answer"],
        properties: { questionId: { type: "string" } },
      },
    },
  },
} as const;

export async function responseRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string }; Body: SubmitResponseBody }>(
    "/surveys/:id/responses",
    { schema: { body: submitResponseBodySchema } },
    async (request, reply) => {
      const { id: surveyId } = request.params;
      const { eligibilityToken, nullifier, answers } = request.body;

      const survey = await prisma.survey.findUnique({
        where: { id: surveyId },
        include: { questions: true },
      });
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }
      if (survey.status !== "PUBLISHED") {
        reply.code(409);
        return { error: `Survey is ${survey.status}; responses can only be submitted while PUBLISHED` };
      }
      if (!survey.eligibilityHash) {
        reply.code(409);
        return { error: "Survey has no eligibility configured" };
      }

      const tokenCheck = verifyEligibilityToken(app, eligibilityToken, {
        surveyId: survey.id,
        eligibilityHash: survey.eligibilityHash,
        nullifier,
      });
      if (!tokenCheck.valid) {
        reply.code(403);
        return { error: tokenCheck.reason };
      }

      const questionsById = new Map(survey.questions.map((q) => [q.id, q]));
      const answeredIds = new Set(answers.map((a) => a.questionId));
      for (const answer of answers) {
        const question = questionsById.get(answer.questionId);
        if (!question) {
          reply.code(400);
          return { error: `Question ${answer.questionId} does not belong to this survey` };
        }
        const result = validateAnswer(question, answer.answer);
        if (!result.valid) {
          reply.code(400);
          return { error: result.error };
        }
      }
      for (const question of survey.questions) {
        if (question.required && !answeredIds.has(question.id)) {
          reply.code(400);
          return { error: `Missing required answer for "${question.questionText}"` };
        }
      }

      try {
        const response = await prisma.response.create({
          data: {
            surveyId: survey.id,
            nullifier,
            answers: {
              create: answers.map((a) => ({ questionId: a.questionId, answer: a.answer as any })),
            },
          },
        });
        reply.code(201);
        return { response: { id: response.id, submittedAt: response.submittedAt } };
      } catch (err: any) {
        if (err?.code === "P2002") {
          reply.code(409);
          return { error: "You have already submitted a response to this survey" };
        }
        throw err;
      }
    },
  );
}
