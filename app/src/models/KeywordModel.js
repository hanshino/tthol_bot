const mem = require("memory-cache");
const GoogleQuery = require("../util/GoogleQuery");
const EquipGoogleKey = "1I4TjN0yWh72syHHAzLcwkA-l-PKb5KMzev3cdBNsZLE";
const KEYWORD_MEMORY_KEY = "TTHOL_KEYWORD";

/**
 * 取得右飾資料
 * @returns {Promise<Array>}
 */
exports.getKeywords = () => {
  return getData(KEYWORD_MEMORY_KEY, function () {
    return GoogleQuery({
      key: EquipGoogleKey,
      gid: 649856493,
      query: "SELECT *",
      type: "json",
    }).then(res =>
      res.map(data => ({
        keyword: data["關鍵字"],
        reply: data["回覆內容"],
        isStrict: data["全符合"] === "TRUE",
      }))
    );
  });
};

/**
 * @param {String} key
 * @param {Function} fallbackFn
 */
async function getData(key, fallbackFn) {
  let data = mem.get(key);
  if (data !== null) return data;

  data = await fallbackFn();

  mem.put(key, data, 86400);

  return data;
}
