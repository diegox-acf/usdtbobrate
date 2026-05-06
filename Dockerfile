FROM node:22-alpine AS webapp-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build/webapp
COPY webapp/package.json webapp/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY webapp/ .
RUN pnpm build

FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /

COPY pnpm-lock.yaml ./
COPY package.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm exec tsc

COPY --from=webapp-builder /build/webapp/dist ./webapp/dist

ENV NODE_ENV=prod

CMD ["pnpm", "start"]
