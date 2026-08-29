FROM node:lts-trixie AS build

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
# ponytail: trixie (glibc 2.41) is required — sqlite3 v6's arm64 prebuilt binary
# needs GLIBC_2.38, which bullseye (2.31) and bookworm (2.36) do not provide.
FROM node:lts-trixie-slim

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
