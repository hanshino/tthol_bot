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

# Build the app
RUN yarn build

# Run the app
FROM node:lts-bullseye-slim

USER node
ENV NODE_ENV production
WORKDIR /usr/src/app

COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
COPY --chown=node:node --from=build /usr/src/app ./

CMD ["dumb-init", "yarn", "start"]
