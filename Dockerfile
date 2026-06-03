FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json* nest-cli.json ./
COPY src ./src

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

USER appuser

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
