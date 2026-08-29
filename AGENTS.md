# Repository guide

Discord.js v14 + TypeScript bot; one package. It reads a gitignored SQLite DB and a Google Sheet at runtime.

## Commands

- Install reproducibly: `yarn install --frozen-lockfile` (Yarn v1 lockfile).
- Build/typecheck: `yarn build`; `tsc` emits CommonJS files to gitignored `dist/`.
- Run source with reload: `yarn dev`. Run compiled output: `yarn build && yarn start`.
- There are no test, lint, format, or separate typecheck scripts. The minimum repository check is `yarn build`.
- Do not use README's `docker-compose-dev.yml` command: that file does not exist. Use `docker compose build` / `docker compose up -d` with `docker-compose.yml`.

## Required local data

- A clean checkout cannot build until `config/credential.json` exists because `src/utilities/equip/sheet.ts` imports it statically. Copy `config/credential.example.json` for build-only checks; use a real Google service-account key for Sheet access. Never commit `config/credential.json`.
- Runtime SQLite is fixed at `database/tthol.sqlite`; it is gitignored and not seeded. Compose bind-mounts both `config/` and `database/`, so host files override image contents and preserve DB data across rebuilds.
- `.env` needs `DISCORD_APP_TOKEN`. Slash-command deployment also needs `DISCORD_CLIENT_ID`, which `.env.example` omits.

## Wiring and data quirks

- `index.ts` autoloads every file under `src/commands/` and `src/events/`. New modules need the existing default-export shapes; there is no explicit registry.
- `src/app.ts` owns the Discord client, command collection, and Sequelize connection. Models in `src/models/` are factories initialized with that live connection, not shared model singletons.
- `items.type_name` maps to model attribute `type`; current codes include `HORSE` and `WING`. Check actual DB codes before changing filters.
- Keep `src/models/item.ts` aligned with the live schema: Sequelize selects every declared attribute, and stale columns break the whole query. Use `PRAGMA table_info(items)` rather than guessing renamed combat-stat columns.
- `config/equip.json` controls displayed equipment fields for `/driver` and `/back`. `/item` delegates its `driver` and `back` subcommands to those command modules.

## External side effects and deploy

- Slash-command registration is separate from bot startup: after building, `node dist/deploy-commands.js` deletes all existing global application commands before re-registering them. Run it only with explicit approval; it is not a verification command.
- Pushes to `master` build and push only `linux/arm64` images to GHCR (`latest` and commit-SHA tags). The workflow does not run tests or lint.
