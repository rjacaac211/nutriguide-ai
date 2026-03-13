FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src/ src/
COPY knowledge/ knowledge/

RUN npm run build

FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY knowledge/ knowledge/

EXPOSE 8000

ENV PORT=8000
CMD ["node", "dist/index.js"]
