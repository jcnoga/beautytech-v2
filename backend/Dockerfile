FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
 
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
 
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
 
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 beautytech
COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/src          ./src
COPY --from=builder /app/package.json ./package.json
USER beautytech
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
CMD ["npm", "start"]
