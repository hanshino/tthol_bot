FROM node:14-alpine

LABEL Name="武林小幫手 Discord bot"
LABEL description="指令分析，提供服務"
LABEL version="1.0"
LABEL maintainer="hanshino@github"

WORKDIR /application

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

CMD [ "yarn", "start" ]
