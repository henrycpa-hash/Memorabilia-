import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "./jwt";
import type { AppRole } from "./roles";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      userId: string;
      email: string;
      role: AppRole;
    };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    const claims = verifyAccessToken(token);
    request.auth = {
      userId: claims.sub,
      email: claims.email,
      role: claims.role
    };
  } catch {
    reply.code(401).send({ error: "invalid_token" });
  }
}

export function requireRole(...roles: AppRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    await requireAuth(request, reply);
    if (!request.auth) return;
    if (!roles.includes(request.auth.role)) {
      reply.code(403).send({ error: "forbidden", required: roles });
    }
  };
}

/**
 * Soft auth: populates request.auth if a valid token is present, but does not
 * reject the request if the token is missing. Used for public-but-personalized
 * endpoints (e.g. story page where logged-in users see watchlist state).
 */
export async function maybeAuth(request: FastifyRequest, _reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return;
  try {
    const claims = verifyAccessToken(header.slice("Bearer ".length));
    request.auth = {
      userId: claims.sub,
      email: claims.email,
      role: claims.role
    };
  } catch {
    // intentionally swallow - this is the soft variant
  }
}
