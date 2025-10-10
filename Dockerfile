# Setup
FROM node:lts-alpine AS base

WORKDIR /home/node/app

COPY . .

RUN rm -rf ./node_modules

RUN apk add --no-cache py-setuptools python3 make g++
RUN npm install --global corepack@latest
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# Runtime
FROM base AS dockploy
WORKDIR /home/node/app

EXPOSE 3000

CMD ["pnpm", "start"]
