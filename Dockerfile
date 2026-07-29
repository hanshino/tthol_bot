FROM node:lts AS build

# Install dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

# Install dependencies with yarn
RUN yarn install

# Copy source files
COPY . .

RUN test -f config/credential.json || cp config/credential.example.json config/credential.json

# Build the app
RUN yarn build

# Run the app
FROM node:lts-bullseye-slim

USER node
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
COPY --chown=node:node --from=build /usr/src/app/dist ./
COPY --chown=node:node --from=build /usr/src/app/config ./config
COPY package*.json ./
COPY yarn.lock ./

RUN ["yarn", "install", "--production"]

CMD ["dumb-init", "node", "index.js"]
