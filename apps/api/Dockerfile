# ---- Builder: full toolchain, compiles TypeScript -> dist/ ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
# npm ci (not install) — installs exactly what package-lock.json pins,
# so the image can't silently drift from what was tested locally.
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime: production deps only, no dev toolchain in the final image ----
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl


ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package*.json ./
# --omit=dev keeps this image lean and off the attack surface of
# devDependencies. `prisma` (the CLI) is a production dependency
# specifically so `prisma migrate deploy` below still works — see
# package.json comment history / PR that moved it out of devDependencies.
RUN npm ci --omit=dev

# Prisma's client is per-install (its generated query engine binary
# isn't portable across npm ci runs), so it's regenerated here rather
# than copied from the builder stage.
COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Alpine's official Node image ships a non-root "node" user (uid 1000)
# — running as root in a container with no reason to is an
# unnecessary privilege to hand out.
RUN chown -R node:node /app
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
