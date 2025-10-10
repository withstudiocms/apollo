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
FROM base AS runtime
WORKDIR /home/node/app

ENV DISCORD_APP_TOKEN=""
ENV DISCORD_CLIENT_ID=""
ENV GITHUB_APP_ID=""
ENV GITHUB_CLIENT_ID=""
ENV GITHUB_CLIENT_SECRET=""
ENV GITHUB_INSTALLATION_ID=""
ENV GITHUB_PRIVATE_KEY=""
ENV GITHUB_USERNAME_OR_ORG=""
ENV GITHUB_WEBHOOK_SECRET=""
ENV TURSO_AUTH_TOKEN=""
ENV TURSO_URL=""

EXPOSE 3000

CMD ["pnpm", "start"]
