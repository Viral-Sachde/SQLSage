FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm ci && npm run build:packages && npm run build -w @sqlsage/server
ENV NODE_ENV=production
CMD ["node", "apps/server/dist/main.js"]
