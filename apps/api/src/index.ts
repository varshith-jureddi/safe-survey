import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "./db.js";
import jwtPlugin from "./plugins/jwt.js";
import { authRoutes } from "./routes/auth.js";
import { surveyRoutes } from "./routes/surveys.js";
import { questionRoutes } from "./routes/questions.js";
import { eligibilityRoutes } from "./routes/eligibility.js";
import { responseRoutes } from "./routes/responses.js";
import { resultRoutes } from "./routes/results.js";

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: true, // allow all origins in dev; tighten before demo
  });

  await app.register(jwtPlugin);
  await app.register(authRoutes);
  await app.register(surveyRoutes);
  await app.register(questionRoutes);
  await app.register(eligibilityRoutes);
  await app.register(responseRoutes);
  await app.register(resultRoutes);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/health/db", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "connected" };
    } catch (err) {
      reply.code(500);
      return { status: "error", db: "unreachable" };
    }
  });

  const port = Number(process.env.API_PORT) || 4000;

  try {
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`API listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
