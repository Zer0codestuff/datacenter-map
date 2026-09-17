FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN npm install --global serve

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
CMD ["sh", "-c", "serve --single --listen tcp://0.0.0.0:${PORT:-3000} dist"]
