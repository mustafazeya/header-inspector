# syntax=docker/dockerfile:1

# Use a slim Node.js base image
FROM node:20-alpine AS base
WORKDIR /app

# Install only prod deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
