const path = require("path");
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.resolve(__dirname, "../../", "database", "tthol.sqlite"),
  },
  useNullAsDefault: true,
});
const table = "npc";

exports.searchByName = keyword => {
  return knex(table).select("*").where("name", "like", `%${keyword}%`);
};

exports.searchById = id => {
  return knex(table).select("*").where("id", "=", id);
};

exports.config = [
  { key: "id", start: 0x00, length: 0x2, note: "編號", encode: null },
  { key: "name", start: 0x04, length: 0xd, note: "名稱", encode: "big5" },
  { key: "pic", start: 0x11, length: 0x2, note: "圖片", encode: null },
  { key: "type", start: 0x1b, length: 0x1, note: "類型", encode: null },
  { key: "sub_type", start: 0x1f, length: 0x1, note: "副類型", encode: null },
  { key: "level", start: 0x23, length: 0x1, note: "等級", encode: null },
  { key: "hp", start: 0x2b, length: 0x4, note: "血量", encode: null },
  { key: "str", start: 0x33, length: 0x1, note: "外功", encode: null },
  { key: "pow", start: 0x35, length: 0x1, note: "根骨", encode: null },
  { key: "vit", start: 0x37, length: 0x1, note: "玄學", encode: null },
  { key: "dex", start: 0x39, length: 0x1, note: "身法", encode: null },
  { key: "agi", start: 0x3b, length: 0x1, note: "技巧", encode: null },
  { key: "wis", start: 0x3d, length: 0x1, note: "內力", encode: null },
  { key: "walk_speed", start: 0x40, length: 0x1, note: "跑速", encode: null },
  { key: "attack_speed", start: 0x41, length: 0x1, note: "攻速", encode: null },
  {
    key: "attack_range",
    start: 0x42,
    length: 0x1,
    note: "攻擊距離",
    encode: null,
  },
  {
    key: "damage_min",
    start: 0x44,
    length: 0x1,
    note: "最小物攻",
    encode: null,
  },
  {
    key: "damage_max",
    start: 0x46,
    length: 0x1,
    note: "最大物攻",
    encode: null,
  },
  {
    key: "pDamage_min",
    start: 0x48,
    length: 0x1,
    note: "最小內勁",
    encode: null,
  },
  {
    key: "pDamage_max",
    start: 0x4a,
    length: 0x1,
    note: "最大內勁",
    encode: null,
  },
  { key: "extra_def", start: 0x4c, length: 0x2, note: "防禦", encode: null },
  { key: "magic_def", start: 0x4e, length: 0x2, note: "護勁", encode: null },
  { key: "base_hit", start: 0x50, length: 0x1, note: "基礎命中", encode: null },
  {
    key: "base_dodge",
    start: 0x52,
    length: 0x1,
    note: "基礎閃躲",
    encode: null,
  },
  { key: "critical_hit", start: 0x54, length: 0x1, note: "重擊", encode: null },
  {
    key: "uncanny_dodge",
    start: 0x56,
    length: 0x1,
    note: "拆招",
    encode: null,
  },
  { key: "fire_def", start: 0x58, length: 0x1, note: "火抗", encode: null },
  { key: "water_def", start: 0x59, length: 0x1, note: "水抗", encode: null },
  {
    key: "lightning_def",
    start: 0x5a,
    length: 0x1,
    note: "雷抗",
    encode: null,
  },
  { key: "wood_def", start: 0x5b, length: 0x1, note: "木抗", encode: null },
  {
    key: "extra_status",
    start: 0x5c,
    length: 0x1,
    note: "額外狀態",
    encode: null,
  },
  {
    key: "status_prob",
    start: 0x5d,
    length: 0x1,
    note: "上狀態機率(?)",
    encode: null,
  },
  { key: "drop_exp", start: 0x66, length: 0x2, note: "經驗", encode: null },
  {
    key: "drop_money_min",
    start: 0x76,
    length: 0x2,
    note: "最小銀兩",
    encode: null,
  },
  {
    key: "drop_money_max",
    start: 0x78,
    length: 0x2,
    note: "最大銀兩",
    encode: null,
  },
  {
    key: "move_sound",
    start: 0x1d5,
    length: 0x9,
    note: "移動音檔",
    encode: "big5",
  },
  {
    key: "atta_sound",
    start: 0x216,
    length: 0x9,
    note: "攻擊音檔",
    encode: "big5",
  },
  {
    key: "hurt_sound",
    start: 0x257,
    length: 0x9,
    note: "受傷音檔",
    encode: "big5",
  },
  {
    key: "dead_sound",
    start: 0x298,
    length: 0x9,
    note: "死亡音檔",
    encode: "big5",
  },
];
