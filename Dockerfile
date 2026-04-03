FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun --eval "const r = await fetch('http://localhost:3000/api/hello'); process.exit(r.ok ? 0 : 1)"

CMD ["bun", "src/index.ts"]
