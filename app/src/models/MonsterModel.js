const path = require("path");
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.resolve(__dirname, "../../", "database", "tthol.sqlite"),
  },
  useNullAsDefault: true,
});
const table = "monsters";

/**
 * 根據物品id來搜尋哪些怪物會掉落
 * @param {String} id
 */
exports.searchDropItem = id => {
  return knex(table).select("*").where("drop_item", "like", `%"${id}"%`);
};

/**
 * 透過名稱搜尋怪物
 * @param {String} name
 * @returns {Promise<Array>}
 */
exports.searchByName = name => {
  return knex(table).select("*").where("name", "like", `%${name}%`);
};
