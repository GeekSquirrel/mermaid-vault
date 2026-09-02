# Stage 1: Dependency installation
FROM oven/bun:1-slim AS builder
WORKDIR /app

# Copy package descriptors
COPY package.json bun.lock tsconfig.json ./

# Install production dependencies
RUN bun install --frozen-lockfile --production

# Stage 2: Runtime image
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/mermaid.db

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

# Copy installed dependencies and source code
COPY --from=builder /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY migrations ./migrations

# Expose default API port
EXPOSE 8080

# Declare persistent volume for SQLite database
VOLUME ["/app/data"]

# Health check against backend /health endpoint
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the Bun HTTP server
CMD ["bun", "run", "src/index.ts"]


