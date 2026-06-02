FROM node:20-alpine

WORKDIR /app

# Copy the entire monorepo (Wave 1: simple build, optimize in later waves).
COPY . .

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --no-frozen-lockfile

WORKDIR /app/services/api-gateway
EXPOSE 4000
CMD ["pnpm", "dev"]
