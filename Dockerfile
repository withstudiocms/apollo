FROM node:lts-alpine AS base

WORKDIR /home/node/app

COPY . .

RUN rm -rf ./node_modules

RUN apk add --no-cache py-setuptools python3 make g++
RUN npm install

CMD [ "npm", "start" ]