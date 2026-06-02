import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * Wave 1 placeholder: in later waves this becomes a real Fastify hook
 * that validates JWT tokens, extracts the user, and enforces RBAC.
 */
export async function requireBearer(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    reply.code(401).send({ error: "missing_bearer_token" });
  }
}

export function registerAuthPlugin(_app: FastifyInstance) {
  // Wave 2 will register the real preHandler chain here.
}
