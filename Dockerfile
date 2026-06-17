FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json* nest-cli.json ./
COPY src ./src

RUN npm run build
# NOTE: dev dependencies are intentionally kept — the runner needs the Prisma
# CLI (`prisma migrate deploy`) and its config loader (dotenv) at startup.

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/generated ./generated
COPY docker-entrypoint.sh ./

# WhatsApp (Baileys) auth state lives here; mounted as a volume in compose so
# the paired session survives container restarts.
RUN mkdir -p /app/.waas-auth && chown -R appuser:appgroup /app/.waas-auth

USER appuser

EXPOSE 3001

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
