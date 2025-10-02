FROM node:lts-alpine AS base

ARG DISCORD_APP_TOKEN
ARG DISCORD_CLIENT_ID
ARG GITHUB_APP_ID
ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
ARG GITHUB_INSTALLATION_ID
ARG GITHUB_PRIVATE_KEY
ARG GITHUB_USERNAME_OR_ORG
ARG GITHUB_WEBHOOK_SECRET
ARG TURSO_AUTH_TOKEN
ARG TURSO_URL

WORKDIR /home/node/app

COPY . .

RUN rm -rf ./node_modules

RUN apk add --no-cache py-setuptools python3 make g++
RUN npm install --global corepack@latest
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

CMD [ "pnpm", "start" ]
