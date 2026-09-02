# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application source code
COPY . .

# Expose server port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV DB_PATH=/app/data/mermaid.db

# Run the application
CMD ["bun", "run", "src/index.ts"]

