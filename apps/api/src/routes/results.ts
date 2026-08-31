import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { getOwnedSurvey } from "../utils/surveyAccess.js";

function numericValues(values: unknown[]): number[] {
  return values
    .map((value) => typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN)
    .filter((value) => Number.isFinite(value));
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function choiceCounts(values: unknown[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const choices = Array.isArray(value) ? value : [value];
    for (const choice of choices) {
      if (choice === null || choice === undefined || choice === "") continue;
      const key = String(choice);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([option, count]) => ({ option, count }))
    .sort((a, b) => b.count - a.count || a.option.localeCompare(b.option));
}

export async function resultRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/surveys/:id/results",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const survey = await getOwnedSurvey(researcherId, request.params.id);
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      const [questions, responses] = await Promise.all([
        prisma.question.findMany({
          where: { surveyId: survey.id },
          orderBy: { position: "asc" },
          select: { id: true, position: true, questionType: true, questionText: true, options: true, required: true },
        }),
        prisma.response.findMany({
          where: { surveyId: survey.id },
          orderBy: { submittedAt: "asc" },
          select: {
            id: true,
            submittedAt: true,
            answers: { select: { questionId: true, answer: true } },
          },
        }),
      ]);

      const questionStats = questions.map((question) => {
        const values = responses.flatMap((response) =>
          response.answers.filter((answer) => answer.questionId === question.id).map((answer) => answer.answer),
        );

        if (question.questionType === "NUMERIC") {
          const numbers = numericValues(values);
          const average = numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
          return {
            questionId: question.id,
            position: question.position,
            questionType: question.questionType,
            questionText: question.questionText,
            responseCount: numbers.length,
            stats: {
              average: average === null ? null : Number(average.toFixed(2)),
              median: median(numbers),
              min: numbers.length ? Math.min(...numbers) : null,
              max: numbers.length ? Math.max(...numbers) : null,
            },
          };
        }

        if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "YES_NO"].includes(question.questionType)) {
          const counts = choiceCounts(values);
          const configuredOptions = Array.isArray(question.options) ? (question.options as unknown[]).map(String) : [];
          const merged = configuredOptions.map((option) => ({ option, count: counts.find((item) => item.option === option)?.count ?? 0 }));
          for (const item of counts) if (!merged.some((option) => option.option === item.option)) merged.push(item);
          return {
            questionId: question.id,
            position: question.position,
            questionType: question.questionType,
            questionText: question.questionText,
            responseCount: values.length,
            stats: { choices: merged },
          };
        }

        return {
          questionId: question.id,
          position: question.position,
          questionType: question.questionType,
          questionText: question.questionText,
          responseCount: values.length,
          stats: { answered: values.length },
        };
      });

      const totalResponses = responses.length;
      const firstSubmittedAt = responses[0]?.submittedAt ?? null;
      const lastSubmittedAt = responses.at(-1)?.submittedAt ?? null;

      return {
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          status: survey.status,
          eligibility: survey.eligibility,
          createdAt: survey.createdAt,
          publishedAt: survey.publishedAt,
          closedAt: survey.closedAt,
        },
        summary: {
          totalResponses,
          totalQuestions: questions.length,
          firstSubmittedAt,
          lastSubmittedAt,
        },
        questions: questionStats,
      };
    },
  );
}
