FROM node:lts-alpine as base

WORKDIR /home/node/app

COPY . .
RUN pnpm install

CMD ["pnpm", "start"]