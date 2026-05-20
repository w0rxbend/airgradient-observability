FROM node:22-alpine AS deps

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /src/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
