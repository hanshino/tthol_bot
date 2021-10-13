const knex = require("../util/knex");
const table = "magic";

exports.searchByName = (keyword, filter = []) => {
  let query = knex(table)
    .where("name", "like", `%${keyword}%`)
    .select("*")
    .orderBy("level", "desc");
  return fieldFilter(query, filter);
};

exports.find = (id, filter = []) => {
  let query = knex(table).where("id", id).select("*").first().orderBy("level", "desc");
  return fieldFilter(query, filter);
};

/**
 *
 * @param {*} query
 * @param {Array<{field: string, operator: ?string, value: string|Number}>} fieldData
 */
function fieldFilter(query, fieldData) {
  fieldData.forEach(({ field, operator, value }) => {
    if (operator) {
      query.where(field, operator, value);
    } else {
      query.where(field, value);
    }
  });

  return query;
}
