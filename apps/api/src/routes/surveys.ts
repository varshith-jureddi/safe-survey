import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { getOwnedSurvey, assertDraftEditable } from "../utils/surveyAccess.js";

// Forward-only transitions: DRAFT -> PUBLISHED -> CLOSED. No unpublish/
// reopen in the MVP — once eligibility + questions are locked in and
// participants may have started proving against them, going backwards
// would be unsafe.

const createSurveyBodySchema = {
  type: "object",
  required: ["title"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    description: { type: "string", maxLength: 2000 },
  },
} as const;

const updateSurveyBodySchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    description: { type: "string", maxLength: 2000 },
  },
} as const;

interface CreateSurveyBody {
  title: string;
  description?: string;
}

interface UpdateSurveyBody {
  title?: string;
  description?: string;
}

export async function surveyRoutes(app: FastifyInstance) {
  // Dashboard: list the authenticated researcher's own surveys.
  app.get("/surveys", { onRequest: [app.authenticate] }, async (request) => {
    const researcherId = request.user.sub;

    const surveys = await prisma.survey.findMany({
      where: { researcherId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        closedAt: true,
        _count: { select: { responses: true } },
      },
    });

    return {
      surveys: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        createdAt: s.createdAt,
        publishedAt: s.publishedAt,
        closedAt: s.closedAt,
        responseCount: s._count.responses,
      })),
    };
  });

  // Create a new survey. Starts as DRAFT with no eligibility yet —
  // eligibility is set in a later step, before publishing.
  app.post<{ Body: CreateSurveyBody }>(
    "/surveys",
    { onRequest: [app.authenticate], schema: { body: createSurveyBodySchema } },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { title, description } = request.body;

      const survey = await prisma.survey.create({
        data: {
          researcherId,
          title,
          description,
          status: "DRAFT",
        },
      });

      reply.code(201);
      return { survey };
    },
  );

  // Get a single survey (with its questions, ordered) — must belong to the caller.
  app.get<{ Params: { id: string } }>(
    "/surveys/:id",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { id } = request.params;

      const survey = await prisma.survey.findUnique({
        where: { id },
        include: {
          questions: { orderBy: { position: "asc" } },
        },
      });

      if (!survey || survey.researcherId !== researcherId) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      return { survey };
    },
  );

  // Update a survey's title/description.
  app.patch<{ Params: { id: string }; Body: UpdateSurveyBody }>(
    "/surveys/:id",
    { onRequest: [app.authenticate], schema: { body: updateSurveyBodySchema } },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { id } = request.params;

      const existing = await getOwnedSurvey(researcherId, id);
      if (!existing) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      const editError = assertDraftEditable(existing);
      if (editError) {
        reply.code(409);
        return { error: editError };
      }

      const survey = await prisma.survey.update({
        where: { id },
        data: request.body,
      });

      return { survey };
    },
  );

  // Publish a survey: DRAFT -> PUBLISHED.
  // Requires eligibility to be set and at least one question — a survey
  // with no questions or no eligibility rules can't meaningfully be
  // taken or proven against.
  app.post<{ Params: { id: string } }>(
    "/surveys/:id/publish",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { id } = request.params;

      const survey = await getOwnedSurvey(researcherId, id);
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      if (survey.status !== "DRAFT") {
        reply.code(409);
        return { error: `Survey is ${survey.status}; only a DRAFT survey can be published` };
      }

      if (!survey.eligibility || !survey.eligibilityHash) {
        reply.code(400);
        return { error: "Eligibility rules must be set before publishing" };
      }

      const questionCount = await prisma.question.count({ where: { surveyId: id } });
      if (questionCount === 0) {
        reply.code(400);
        return { error: "Survey must have at least one question before publishing" };
      }

      const updated = await prisma.survey.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });

      return { survey: updated };
    },
  );

  // Close a survey: PUBLISHED -> CLOSED. Stops accepting new responses.
  app.post<{ Params: { id: string } }>(
    "/surveys/:id/close",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const researcherId = request.user.sub;
      const { id } = request.params;

      const survey = await getOwnedSurvey(researcherId, id);
      if (!survey) {
        reply.code(404);
        return { error: "Survey not found" };
      }

      if (survey.status !== "PUBLISHED") {
        reply.code(409);
        return { error: `Survey is ${survey.status}; only a PUBLISHED survey can be closed` };
      }

      const updated = await prisma.survey.update({
        where: { id },
        data: { status: "CLOSED", closedAt: new Date() },
      });

      return { survey: updated };
    },
  );

  // Public: participant-facing survey view, no auth. A survey is only
  // visible once it's left DRAFT (i.e. PUBLISHED or CLOSED) — a draft
  // isn't real to anyone but its researcher yet. We whitelist fields
  // explicitly rather than returning the raw Prisma row, so we never
  // accidentally leak researcherId or anything else internal.
  app.get<{ Params: { id: string } }>("/surveys/:id/public", async (request, reply) => {
    const { id } = request.params;

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: { questions: { orderBy: { position: "asc" } } },
    });

    if (!survey || survey.status === "DRAFT") {
      reply.code(404);
      return { error: "Survey not found" };
    }

    return {
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        eligibility: survey.eligibility,
        eligibilityHash: survey.eligibilityHash,
        publishedAt: survey.publishedAt,
        closedAt: survey.closedAt,
        questions: survey.questions.map((q) => ({
          id: q.id,
          position: q.position,
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options,
          required: q.required,
        })),
      },
    };
  });
}
