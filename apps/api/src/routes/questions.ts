import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { getOwnedSurvey, assertDraftEditable } from "../utils/surveyAccess.js";

const QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "FREE_TEXT",
  "NUMERIC",
  "YES_NO",
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

const CHOICE_TYPES: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"];

const createQuestionBodySchema = {
  type: "object",
  required: ["questionType", "questionText"],
  properties: {
    questionType: { type: "string", enum: QUESTION_TYPES as unknown as string[] },
    questionText: { type: "string", minLength: 1, maxLength: 1000 },
    options: { type: "array", items: { type: "string" } },
    required: { type: "boolean" },
  },
} as const;

const updateQuestionBodySchema = {
  type: "object",
  properties: {
    questionType: { type: "string", enum: QUESTION_TYPES as unknown as string[] },
    questionText: { type: "string", minLength: 1, maxLength: 1000 },
    options: { type: "array", items: { type: "string" } },
    required: { type: "boolean" },
  },
} as const;

const reorderBodySchema = {
  type: "object",
  required: ["questionIds"],
  properties: {
    questionIds: { type: "array", items: { type: "string" }, minItems: 1 },
  },
} as const;

interface CreateQuestionBody {
  questionType: QuestionType;
  questionText: string;
  options?: string[];
  required?: boolean;
}

interface UpdateQuestionBody {
  questionType?: QuestionType;
  questionText?: string;
  options?: string[];
  required?: boolean;
}

interface ReorderBody {
  questionIds: string[];
}

function validateOptionsForType(questionType: QuestionType, options?: string[]) {
  if (CHOICE_TYPES.includes(questionType)) {
    return Array.isArray(options) && options.length >= 2;
  }
  return true; // options irrelevant/optional for other types
}

export async function questionRoutes(app: FastifyInstance) {
  // Add a question to a survey.
  app.post<{ Params: { surveyId: string }; Body: CreateQuestionBody }>(
    "/surveys/:surveyId/questions",
    { onRequest: [app.authenticate], schema: { body: createQuestionBodySchema } },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { surveyId } = request.params;
      const { questionType, questionText, options, required } = request.body;

      const survey = await getOwnedSurvey(researcherId, surveyId);
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      const editError = assertDraftEditable(survey);
      if (editError) {
        reply.code(409);
        return { error: editError };
      }

      if (!validateOptionsForType(questionType, options)) {
        reply.code(400);
        return { error: "SINGLE_CHOICE and MULTIPLE_CHOICE questions require at least 2 options" };
      }

      const questionCount = await prisma.question.count({ where: { surveyId } });

      const question = await prisma.question.create({
        data: {
          surveyId,
          position: questionCount,
          questionType,
          questionText,
          options: CHOICE_TYPES.includes(questionType) ? options : undefined,
          required: required ?? true,
        },
      });

      reply.code(201);
      return { question };
    },
  );

  // Update a question.
  app.patch<{ Params: { surveyId: string; questionId: string }; Body: UpdateQuestionBody }>(
    "/surveys/:surveyId/questions/:questionId",
    { onRequest: [app.authenticate], schema: { body: updateQuestionBodySchema } },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { surveyId, questionId } = request.params;

      const survey = await getOwnedSurvey(researcherId, surveyId);
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      const editError = assertDraftEditable(survey);
      if (editError) {
        reply.code(409);
        return { error: editError };
      }

      const existing = await prisma.question.findUnique({ where: { id: questionId } });
      if (!existing || existing.surveyId !== surveyId) {
        reply.code(404);
        return { error: "Question not found" };
      }

      const nextType = request.body.questionType ?? (existing.questionType as QuestionType);
      const nextOptions = request.body.options ?? (existing.options as string[] | undefined);

      if (!validateOptionsForType(nextType, nextOptions)) {
        reply.code(400);
        return { error: "SINGLE_CHOICE and MULTIPLE_CHOICE questions require at least 2 options" };
      }

      const question = await prisma.question.update({
        where: { id: questionId },
        data: {
          questionType: request.body.questionType,
          questionText: request.body.questionText,
          options: request.body.options,
          required: request.body.required,
        },
      });

      return { question };
    },
  );

  // Delete a question.
  app.delete<{ Params: { surveyId: string; questionId: string } }>(
    "/surveys/:surveyId/questions/:questionId",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { surveyId, questionId } = request.params;

      const survey = await getOwnedSurvey(researcherId, surveyId);
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      const editError = assertDraftEditable(survey);
      if (editError) {
        reply.code(409);
        return { error: editError };
      }

      const existing = await prisma.question.findUnique({ where: { id: questionId } });
      if (!existing || existing.surveyId !== surveyId) {
        reply.code(404);
        return { error: "Question not found" };
      }

      await prisma.question.delete({ where: { id: questionId } });

      reply.code(204);
      return null;
    },
  );

  // Reorder all questions on a survey in one call.
  app.put<{ Params: { surveyId: string }; Body: ReorderBody }>(
    "/surveys/:surveyId/questions/reorder",
    { onRequest: [app.authenticate], schema: { body: reorderBodySchema } },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { surveyId } = request.params;
      const { questionIds } = request.body;

      const survey = await getOwnedSurvey(researcherId, surveyId);
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      const editError = assertDraftEditable(survey);
      if (editError) {
        reply.code(409);
        return { error: editError };
      }

      const existing = await prisma.question.findMany({ where: { surveyId } });

      const existingIds = new Set(existing.map((q) => q.id));
      const providedIds = new Set(questionIds);

      const sameSet =
        existingIds.size === providedIds.size &&
        [...existingIds].every((id) => providedIds.has(id));

      if (!sameSet) {
        reply.code(400);
        return { error: "questionIds must include exactly the survey's existing question ids" };
      }

      await prisma.$transaction(
        questionIds.map((id, index) =>
          prisma.question.update({ where: { id }, data: { position: index } }),
        ),
      );

      const questions = await prisma.question.findMany({
        where: { surveyId },
        orderBy: { position: "asc" },
      });

      return { questions };
    },
  );
}
