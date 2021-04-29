const { default: axios } = require("axios");

/**
 * 透過小撇步獲取 `Google Sheet` 的資料
 * @param {Object} objData
 * @param {String} objData.key
 * @param {String} objData.gid
 * @param {String} objData.type
 * @param {String} objData.query
 * @returns {Promise}
 */
module.exports = objData => {
  let uri = genUri(objData);

  return axios
    .get(uri)
    .then(res => res.data)
    .then(res => queryParse(JSON.parse(res.match(/\{.*\}/)[0])))
    .catch(() => null);
};

function genUri(objData) {
  let { key, gid, type, query } = objData;

  let params = new URLSearchParams("");

  params.set("gid", gid);
  params.set("type", type);
  params.set("query", encodeURIComponent(query));

  let url = `https://docs.google.com/spreadsheets/u/0/d/${key}/gviz/tq?${params.toString()}`;

  return url;
}

function queryParse(data) {
  let rows = data.table.rows;

  let title = data.table.cols.map(col => {
    return col.label !== "" ? col.label.trim() : col.id;
  });

  let result = [];

  rows.forEach(function (row) {
    let temp = {};
    row.c.forEach(function (value, index) {
      if (value === null) return;
      temp[title[index]] = value.hasOwnProperty("f") ? value.f : value.v;
    });
    result.push(temp);
  });

  return result;
}
