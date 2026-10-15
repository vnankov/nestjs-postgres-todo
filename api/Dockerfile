FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci

COPY api api
RUN npm run build -w api

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json .npmrc ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci --omit=dev

COPY --from=build /app/api/dist api/dist

WORKDIR /app/api
EXPOSE 3000

CMD ["node", "dist/main.js"]
