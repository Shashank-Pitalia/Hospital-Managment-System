FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source
COPY . .

# Expose port
EXPOSE 5173

# Start dev server
CMD ["pnpm", "dev"]
