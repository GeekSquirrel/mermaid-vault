# Stage 1: Build application and compile TypeScript
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

RUN corepack enable pnpm

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Install all dependencies including devDependencies for compilation
RUN pnpm install --frozen-lockfile

# Copy source code and migrations
COPY src ./src
COPY migrations ./migrations

# Build TypeScript to dist/
RUN pnpm build

# Stage 2: Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/mermaid.db

# Create directory for persistent SQLite data
RUN mkdir -p /app/data

# Copy built artifacts and runtime dependencies
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

# Expose backend API port
EXPOSE 8080

# Declare persistent SQLite volume
VOLUME ["/app/data"]

# Health check against backend /health endpoint
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the Express server
CMD ["node", "dist/index.js"]



