const mem = require("memory-cache");
const GoogleQuery = require("../util/GoogleQuery");
const EquipGoogleKey = "1I4TjN0yWh72syHHAzLcwkA-l-PKb5KMzev3cdBNsZLE";
const DRIVER_MEMORY_KEY = "TTHOL_DRIVER";
const BACK_MEMORY_KEY = "TTHOL_BACK";

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
