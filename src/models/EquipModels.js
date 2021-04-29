const mem = require("memory-cache");
const GoogleQuery = require("../util/GoogleQuery");
const EquipGoogleKey = "1I4TjN0yWh72syHHAzLcwkA-l-PKb5KMzev3cdBNsZLE";
const DRIVER_MEMORY_KEY = "TTHOL_DRIVER";

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
