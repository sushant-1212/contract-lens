FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY --from=base /app /app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
CMD wget --no-verbose --tries=1 --spider http://localhost:5000/healthz || exit 1
CMD ["node", "./artifacts/api-server/dist/index.mjs"]
