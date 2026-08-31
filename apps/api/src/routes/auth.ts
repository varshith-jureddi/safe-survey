import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const credentialsSchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
  },
} as const;

interface Credentials {
  email: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: Credentials }>(
    "/auth/register",
    { schema: { body: credentialsSchema } },
    async (request, reply) => {
      const { email, password } = request.body;

      const existing = await prisma.researcher.findUnique({ where: { email } });
      if (existing) {
        reply.code(409);
        return { error: "Email already registered" };
      }

      const passwordHash = await hashPassword(password);

      const researcher = await prisma.researcher.create({
        data: { email, passwordHash },
      });

      const token = app.jwt.sign({ sub: researcher.id, email: researcher.email });

      reply.code(201);
      return {
        token,
        researcher: { id: researcher.id, email: researcher.email },
      };
    },
  );

  app.post<{ Body: Credentials }>(
    "/auth/login",
    { schema: { body: credentialsSchema } },
    async (request, reply) => {
      const { email, password } = request.body;

      const researcher = await prisma.researcher.findUnique({ where: { email } });
      if (!researcher) {
        reply.code(401);
        return { error: "Invalid email or password" };
      }

      const valid = await verifyPassword(password, researcher.passwordHash);
      if (!valid) {
        reply.code(401);
        return { error: "Invalid email or password" };
      }

      const token = app.jwt.sign({ sub: researcher.id, email: researcher.email });

      return {
        token,
        researcher: { id: researcher.id, email: researcher.email },
      };
    },
  );

  // Protected route — proves the JWT + authenticate guard works end to end.
  app.get(
    "/auth/me",
    { onRequest: [app.authenticate] },
    async (request) => {
      return { researcher: request.user };
    },
  );
}
