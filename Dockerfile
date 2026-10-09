FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace @petpal/backend --include=dev --ignore-scripts && node -e "const d=require('better-sqlite3')(':memory:'); d.close();"
COPY apps/backend/tsconfig.json apps/backend/tsconfig.json
COPY apps/backend/src apps/backend/src
RUN npm run build --workspace @petpal/backend

FROM node:22-bookworm-slim AS runtime-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace @petpal/backend --omit=dev --ignore-scripts && node -e "const d=require('better-sqlite3')(':memory:'); d.close();" && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DB_PATH=/var/lib/petpal/petpal.db AI_CACHE_SERVE_UNREVIEWED=false
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/package.json ./apps/backend/package.json
COPY scripts/backup-db.cjs ./scripts/backup-db.cjs
COPY apps/backend/data/foodSafety.biovet.json apps/backend/data/biovet-source.json apps/backend/data/recalls.fda.json ./apps/backend/data/
RUN mkdir -p /var/lib/petpal && chown node:node /var/lib/petpal
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/ready',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/backend/dist/index.js"]
