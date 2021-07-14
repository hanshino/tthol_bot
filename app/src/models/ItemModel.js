const knex = require("../util/knex");
const table = "items";
const randTable = "item_rand";

exports.search = keyword => {
  let query = knex(table).where("name", "like", `%${keyword}%`).select("*");
  return query;
};

exports.searchById = async id => {
  let res = await knex(table).where("id", "=", id).select("*");
  let random = await knex(randTable).select("*").where("id", "=", id);

  return [
    {
      ...res[0],
      randomAttributes: random,
    },
  ];
};

exports.getConfig = () => {
  return [
    { key: "id", start: 0x01, length: 0x02, encode: null, note: "編號" },
    { key: "name", start: 0x05, length: 0x0c, encode: "big5", note: "名稱" },
    { key: "note", start: 0x12, length: 0x0d, encode: "big5", note: "備註" },
    { key: "summary", start: 0x1f, length: 0x82, encode: "big5", note: "描述" },
    { key: "level", start: 0xc0, length: 0x02, encode: null, note: "等級" },
    { key: "weight", start: 0xe9, length: 0x02, encode: null, note: "重量" },
    { key: "hp", start: 0x180, length: 0x02, encode: null, note: "體力" },
    { key: "mp", start: 0x183, length: 0x02, encode: null, note: "真氣" },
    { key: "str", start: 0x186, length: 0x02, encode: null, note: "外功" },
    { key: "pow", start: 0x189, length: 0x02, encode: null, note: "內力" },
    { key: "vit", start: 0x18c, length: 0x02, encode: null, note: "根骨" },
    { key: "dex", start: 0x18f, length: 0x02, encode: null, note: "技巧" },
    { key: "agi", start: 0x192, length: 0x02, encode: null, note: "身法" },
    { key: "wis", start: 0x195, length: 0x02, encode: null, note: "玄學" },
    { key: "atk", start: 0x198, length: 0x02, encode: null, note: "物攻" },
    { key: "matk", start: 0x19a, length: 0x02, encode: null, note: "內勁" },
    { key: "def", start: 0x19c, length: 0x02, encode: null, note: "防禦" },
    { key: "mdef", start: 0x19e, length: 0x02, encode: null, note: "護勁" },
    { key: "dodge", start: 0x1a2, length: 0x02, encode: null, note: "閃躲" },
    { key: "uncanny_dodge", start: 0x1a6, length: 0x02, encode: null, note: "拆招" },
    { key: "critical", start: 0x1a8, length: 0x01, encode: null, note: "重擊" },
    { key: "hit", start: 0x1a0, length: 0x02, encode: null, note: "命中" },
    { key: "speed", start: 0x1ba, length: 0x01, encode: null, note: "移動" },
    { key: "fire", start: 0x1c3, length: 0x01, encode: null, note: "火抗" },
    { key: "water", start: 0x1c4, length: 0x01, encode: null, note: "水抗" },
    { key: "thunder", start: 0x1c5, length: 0x01, encode: null, note: "雷抗" },
    { key: "tree", start: 0x1c6, length: 0x01, encode: null, note: "木抗" },
    { key: "freeze", start: 0x1d6, length: 0x01, encode: null, note: "抗定" },
    {
      key: "min_damage",
      start: 0x1b0,
      length: 0x02,
      encode: null,
      note: "傷害min",
    },
    {
      key: "max_damage",
      start: 0x1b2,
      length: 0x02,
      encode: null,
      note: "傷害max",
    },
    {
      key: "min_pdamage",
      start: 0x1b4,
      length: 0x02,
      encode: null,
      note: "內勁傷害min",
    },
    {
      key: "max_pdamage",
      start: 0x1b6,
      length: 0x02,
      encode: null,
      note: "內勁傷害max",
    },
    { key: "picture", start: 0xa5, length: 0x02, encode: null, note: "圖片" },
  ];
};
