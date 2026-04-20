# Stage 1: install deps only — avoids COPY backend/ merging/overwriting node_modules
FROM node:20-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci && node -e "require('module-alias/register')"

FROM node:20-alpine
WORKDIR /app

COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY database/migrations ./database/migrations
COPY database/init-postgres.sql database/init-sqlite.sql ./database/

WORKDIR /app/backend

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "server.js"]
