FROM node:20-alpine

ARG SERVICE_PATH
WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --no-frozen-lockfile

WORKDIR /app/${SERVICE_PATH}
CMD ["pnpm", "dev"]
