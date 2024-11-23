FROM node:lts-alpine as base

WORKDIR /home/node/app

COPY . .
RUN npm install

CMD ["npm", "start"]