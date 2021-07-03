const path = require("path");
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.resolve(__dirname, "../../", "database", "tthol.sqlite"),
  },
  useNullAsDefault: true,
});

/**
 * 提供`sqlite`連線
 * @module knex
 */
module.exports = knex;
