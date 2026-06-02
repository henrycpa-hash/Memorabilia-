FROM node:20-alpine

ARG APP_PATH
WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --no-frozen-lockfile

WORKDIR /app/${APP_PATH}
CMD ["pnpm", "dev"]
