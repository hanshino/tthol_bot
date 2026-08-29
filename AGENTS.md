# Repository guide

Discord.js v14 + TypeScript bot; one package. It reads a gitignored SQLite DB at runtime.

## Commands

- Install reproducibly: `yarn install --frozen-lockfile` (Yarn v1 lockfile).
- Build/typecheck: `yarn build`; `tsc` emits CommonJS files to gitignored `dist/`.
- Run source with reload: `yarn dev`. Run compiled output: `yarn build && yarn start`.
- There are no test, lint, format, or separate typecheck scripts. The minimum repository check is `yarn build`.
- Do not use README's `docker-compose-dev.yml` command: that file does not exist. Use `docker compose build` / `docker compose up -d` with `docker-compose.yml`.

## Required local data

- Runtime SQLite is fixed at `database/tthol.sqlite`; it is gitignored and not seeded. It is not required for a build. Compose bind-mounts both `config/` and `database/`, so host files override image contents and preserve DB data across rebuilds.
- `.env` needs `DISCORD_APP_TOKEN`. Slash-command deployment also needs `DISCORD_CLIENT_ID`, which `.env.example` omits.

## Wiring and data quirks

- `index.ts` autoloads every file under `src/commands/` and `src/events/`. New modules need the existing default-export shapes; there is no explicit registry.
- `src/app.ts` owns the Discord client, command collection, and Sequelize connection. All data access goes through raw queries in `src/db/*Repo.ts`; Sequelize Models are not used.
- `items.type_name` contains codes such as `HORSE` and `WING`. Check the actual DB codes before changing repo filters.
- When the schema changes, use `PRAGMA table_info(items)` to confirm the live columns before updating the relevant repo; do not guess renamed combat-stat columns.

## External side effects and deploy

- Slash-command registration is separate from bot startup: after building, `node dist/deploy-commands.js` deletes all existing global application commands before re-registering them. Run it only with explicit approval; it is not a verification command.
- Pushes to `master` build and push only `linux/arm64` images to GHCR (`latest` and commit-SHA tags). The workflow does not run tests or lint.
