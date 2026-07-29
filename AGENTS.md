# AGENTS.md

Discord bot (discord.js v14 + TypeScript) for a game ("武林同萌傳"). Reads a
local SQLite DB and a Google Sheet for game data. Single package, no monorepo.

## Commands

- `yarn dev` — run bot via `nodemon index.ts` (ts-node, no build step).
- `yarn build` — `tsc` to `dist/`. **Will fail on a clean checkout** — see gotcha below.
- `yarn start` — `node dist/index.js` (runs the build output, not `index.ts`).
- No `test` or `lint` script exists in `package.json`.
- Slash commands are NOT registered by the bot process. Run
  `ts-node deploy-commands.ts` separately whenever a command's `data` changes.
  Needs `DISCORD_CLIENT_ID` in env — **not listed in `.env.example`**, only
  `DISCORD_APP_TOKEN` is.

## Build-breaking gotcha: `config/credential.json`

`src/utilities/equip/sheet.ts` does a static `import credential from
"../../../config/credential.json"` (relies on `resolveJsonModule`). This file
is gitignored (`config/.gitignore`) and does not exist on a fresh clone, which
makes `tsc`/`yarn build` fail outright, not just fail at runtime.

Before building: `cp config/credential.example.json config/credential.json`
(placeholder values are fine for a build-only check; real Google service
account key only needed to actually query the sheet).

## Command/event autoloading

`index.ts` `require()`s every file in `src/commands/` and `src/events/` at
startup (no explicit registry). Any new file dropped in either directory is
picked up automatically and must `export default` an object matching the
`Command` shape (`{ name, data, execute }`, see `src/type.d.ts`) or an event
shape (`{ name, once?, execute }`). A bad export is silently skipped with a
console warning, not a crash.

## Data layer quirks

- Sequelize models are factory functions taking the live `Sequelize` instance,
  not module-level singletons: `item(database)`, `monster(database)`,
  `skill(database)` (see `src/models/*.ts`). `database` comes from
  `client.database` (`src/app.ts`), backed by `database/tthol.sqlite`
  (gitignored, not seeded in repo).
- `items.type_name` (mapped to model attribute `type`) holds English codes,
  not the old Chinese categories — e.g. `/driver` filters `type: "HORSE"`,
  `/back` filters `type: "WING"`. If a query against `type` returns nothing,
  suspect a code mismatch here before assuming a data problem.
- `src/models/item.ts` only declares the attributes actually used by
  commands. Several old combat-stat columns were dropped rather than
  re-mapped after a schema rename — read the comment at the top of that file
  before re-adding an attribute; some old column names have no current
  equivalent.
- `config/equip.json` (committed, not a secret) drives which item fields are
  shown as embed fields in `/driver` and `/back` — edit it to add/remove
  displayed stats, not the command code.
- `/item` is a thin dispatcher: its `back`/`driver` subcommands call the
  `execute` functions exported by `back.ts`/`driver.ts` directly rather than
  duplicating logic.

## Deploy

Default branch is `master`, not `main`. No CI/CD is configured in this repo
(no `.github/workflows/`) — deploys are manual. The runtime container has no
listening port (Discord gateway bot, outbound-only) — don't add `EXPOSE` or a
health-check server.
