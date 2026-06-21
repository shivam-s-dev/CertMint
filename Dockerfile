# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set up build arguments for Next.js environment variables (NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STELLAR_NETWORK
ARG NEXT_PUBLIC_SOROBAN_RPC_URL
ARG NEXT_PUBLIC_HORIZON_URL
ARG NEXT_PUBLIC_NFT_CONTRACT_ID
ARG NEXT_PUBLIC_VERIFIER_CONTRACT_ID

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STELLAR_NETWORK=$NEXT_PUBLIC_STELLAR_NETWORK
ENV NEXT_PUBLIC_SOROBAN_RPC_URL=$NEXT_PUBLIC_SOROBAN_RPC_URL
ENV NEXT_PUBLIC_HORIZON_URL=$NEXT_PUBLIC_HORIZON_URL
ENV NEXT_PUBLIC_NFT_CONTRACT_ID=$NEXT_PUBLIC_NFT_CONTRACT_ID
ENV NEXT_PUBLIC_VERIFIER_CONTRACT_ID=$NEXT_PUBLIC_VERIFIER_CONTRACT_ID

# Disables telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets and built pages
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
