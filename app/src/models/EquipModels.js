const mem = require("memory-cache");
const GoogleQuery = require("../util/GoogleQuery");
const EquipGoogleKey = "1I4TjN0yWh72syHHAzLcwkA-l-PKb5KMzev3cdBNsZLE";
const DRIVER_MEMORY_KEY = "TTHOL_DRIVER";
const BACK_MEMORY_KEY = "TTHOL_BACK";
const MID_MEMORY_KEY = "TTHOL_MID";
const LEFT_MEMORY_KEY = "TTHOL_LEFT";
const HAT_MEMROY_KEY = "TTHOL_HAT";
const RIGHT_MEMORY_KEY = "TTHOL_RIGHT";

/**
 * 取得坐騎資料
 * @returns {Promise<Array>}
 */
exports.getDrivers = async () => {
  let data = mem.get(DRIVER_MEMORY_KEY);
  if (data !== null) return data;

  data = await GoogleQuery({
    key: EquipGoogleKey,
    gid: 1820863038,
    query: "SELECT *",
    type: "json",
  });

  mem.put(DRIVER_MEMORY_KEY, data, 86400);

  return data;
};

/**
 * 取得背飾資料
 * @returns {Promise<Array>}
 */
exports.getBack = () => {
  return getData(BACK_MEMORY_KEY, function () {
    return GoogleQuery({
      key: EquipGoogleKey,
      gid: 1508012721,
      query: "SELECT *",
      type: "json",
    });
  });
};

/**
 * 取得中飾資料
 * @returns {Promise<Array>}
 */
exports.getMid = () => {
  return getData(MID_MEMORY_KEY, function () {
    return GoogleQuery({
      key: EquipGoogleKey,
      gid: 1931774774,
      query: "SELECT *",
      type: "json",
    });
  });
};

/**
 * 取得左飾資料
 * @returns {Promise<Array>}
 */
exports.getLeft = () => {
  return getData(LEFT_MEMORY_KEY, function () {
    return GoogleQuery({
      key: EquipGoogleKey,
      gid: 1626960585,
      query: "SELECT *",
      type: "json",
    });
  });
};

/**
 * 取得左飾資料
 * @returns {Promise<Array>}
 */
exports.getHat = () => {
  return getData(HAT_MEMROY_KEY, function () {
    return GoogleQuery({
      key: EquipGoogleKey,
      gid: 126919644,
      query: "SELECT *",
      type: "json",
    });
  });
};

/**
 * 取得右飾資料
 * @returns {Promise<Array>}
 */
exports.getRight = () => {
  return getData(RIGHT_MEMORY_KEY, function () {
    return GoogleQuery({
      key: EquipGoogleKey,
      gid: 1930946969,
      query: "SELECT *",
      type: "json",
    });
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
