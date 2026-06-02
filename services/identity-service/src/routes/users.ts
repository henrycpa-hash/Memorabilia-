import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { userService } from "../domain/user.service";

const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(["fan", "creator", "authenticator", "admin"])
});

const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["fan", "creator", "authenticator", "admin"])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export function registerUserRoutes(app: FastifyInstance) {
  // Wave 1 admin-create endpoint (no password). Useful for seed scripts and
  // the Wave 1 e2e flow. Real users sign up via /users/register.
  app.post("/users", async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const user = await userService.create(input);
    reply.code(201).send(user);
  });

  app.post("/users/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    try {
      const result = await userService.register(input);
      reply.code(201).send(result);
    } catch (err) {
      reply.code(409).send({ error: (err as Error).message });
    }
  });

  app.post("/users/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    try {
      const result = await userService.login(input);
      reply.send(result);
    } catch (err) {
      reply.code(401).send({ error: (err as Error).message });
    }
  });

  // List is admin-only in Wave 2. (Wave 1 had it open.)
  app.get("/users", { preHandler: requireRole("admin") }, async () => userService.list());

  app.get("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = userService.findById(id);
    if (!user) return reply.code(404).send({ error: "not_found" });
    return user;
  });
}
