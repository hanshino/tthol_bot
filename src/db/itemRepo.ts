import { QueryTypes, Sequelize } from "sequelize";
import { EquipStats, ItemDetail, SuggestOption } from "../contracts";
import { itemType } from "../domain/enums";
import { ATTRIBUTE_QUERY_KEYS, formatRange, toStatGroups } from "../domain/stats";

export async function itemImages(db: Sequelize, ids: number[]) {
  if (!ids.length) return [];
  return db.query(
    `SELECT item_id as itemId, kind, url, width, height
     FROM item_images
     WHERE item_id IN (:ids)
     ORDER BY CASE kind WHEN 'icon' THEN 0 ELSE 1 END`,
    { replacements: { ids }, type: QueryTypes.SELECT },
  );
}

/**
 * 外裝（紙娃娃）判定：equip_slot 以 EXTRA_ 開頭。
 * 用 substr 而非 LIKE 'EXTRA_%'，因為 LIKE 的 `_` 是萬用字元會誤配。
 */
const IS_EXTRA = "substr(coalesce(i.equip_slot,''),1,6)='EXTRA_'";

/**
 * ponytail: 外裝只在「同名的正常裝備也存在」時才隱藏 —— 這正是使用者看到
 * 白鯨兩筆的原因（HORSE lv120 與 EXTRA_HORSE lv60）。全部排除會讓 585 個
 * 只以外裝形式存在的名稱（聖誕雪橇車、燕南天劍等）從此查不到。
 * 不用「敘述含外裝」比對：有 249 筆只是在描述裡提到外裝的禮包會被誤殺。
 */
const HIDE_DUPLICATE_EXTRA = `NOT (${IS_EXTRA} AND EXISTS (
  SELECT 1 FROM items y
  WHERE y.name = i.name AND substr(coalesce(y.equip_slot,''),1,6) <> 'EXTRA_'
))`;

/**
 * 玩家角色穿戴得上的 type_name。排行 / 比較 / 屬性篩選共用這一份，
 * 是「什麼算裝備」的唯一定義。
 *
 * 排除的是有數值卻不是玩家裝備的東西：POTION（藥水）會加素質但不是穿戴、
 * PET_ORNAMENT 是「寵物」飾品（穿在寵物身上，不是角色）、ITEM_PET / ITEM_BOT 同理，
 * 其餘 NORMAL_ITEM / BONUS / SCARCE_ITEM / EVENT_ITEM / RETURN_SCROLL /
 * CASTLE_ITEM / MONEY 沒有戰鬥數值。
 *
 * 順序依 base_lv>=80 的實際筆數遞減，command 直接拿來當 Discord choices
 * （上限 25，這裡 20 個）。
 */
export const EQUIPPABLE_TYPES = [
  "HORSE", "WING", "HELMET", "ARMOR", "ORNAMENT", "BOOT", "BOXING", "STAFF",
  "CLAW", "BLADE", "SWORD", "STING", "PUNCHER", "GREAT_SWORD", "BOW", "WHISK",
  "ROD", "SHIELD", "HAMMER", "HIDDEN_WEAPON",
] as const;

/**
 * EquipStats.stats 帶的原始欄位。equipStats() 與 statsByIds() 共用，
 * 兩邊的 stats 形狀才會一致。
 *
 * damage_* / pdamage_* 是武器的核心數值（碧空烈漠劍 str=0 atk=0 但
 * damage 1360~1396），少了它們比較兩把劍會整排 0。weighted.ts 的權重表
 * 沒有這四個 key，所以多帶不影響排行分數。
 */
export const EQUIP_STAT_KEYS = [
  "base_lv", "hp", "mp", "str", "pow", "vit", "dex", "agi", "wis", "atk",
  "matk", "extra_def", "magic_def", "dodge", "uncanny_dodge", "critical_hit",
  "hit", "attack_speed", "walk_speed", "fire_def", "water_def", "lightning_def",
  "wood_def", "damage_min", "damage_max", "pdamage_min", "pdamage_max",
];

/** items 的一列 → EquipStats。equipStats / statsByIds 共用同一套投影 */
function toEquipStats(row: any, imgs: any[]): EquipStats {
  return {
    id: Number(row.id),
    name: row.name,
    typeLabel: itemType(row.type_name, row.equip_slot),
    iconUrl: imgs.find(i => i.itemId === row.id && i.kind === "icon")?.url ?? null,
    stats: Object.fromEntries(EQUIP_STAT_KEYS.map(k => [k, row[k] || 0])),
  };
}

export function createItemRepo(db: Sequelize) {
  return {
    async getById(id: number): Promise<ItemDetail | null> {
      const rows: any[] = await db.query("SELECT * FROM items WHERE id=:id", {
        replacements: { id }, type: QueryTypes.SELECT,
      });
      const r = rows[0];
      if (!r) return null;
      const imgs: any[] = await itemImages(db, [id]);
      const rand: any[] = await db.query(
        "SELECT attribute,min,max,rate FROM item_rand WHERE id=:id",
        { replacements: { id }, type: QueryTypes.SELECT },
      );
      const totalRate = rand.reduce((sum, row) => sum + (Number(row.rate) || 0), 0);
      const drops: any[] = await db.query(
        "SELECT id,name FROM monsters WHERE EXISTS (SELECT 1 FROM json_each(monsters.drop_item) WHERE CAST(value AS INTEGER)=:id)",
        { replacements: { id }, type: QueryTypes.SELECT },
      );
      const icon = imgs.find(x => x.kind === "icon")?.url ?? null;
      const big = imgs.find(x => x.kind === "gicon")?.url ?? icon;
      const keys = ["hp", "mp", "str", "pow", "vit", "dex", "agi", "wis", "atk", "matk", "extra_def", "magic_def", "dodge", "uncanny_dodge", "critical_hit", "hit", "attack_speed", "walk_speed", "fire_def", "water_def", "lightning_def", "wood_def"];
      const stats = Object.fromEntries(keys.map(k => [k, r[k]]));
      return {
        id: r.id, name: r.name, typeLabel: itemType(r.type_name, r.equip_slot),
        summary: r.summary ?? null, note: r.note ?? null, level: r.base_lv,
        iconUrl: icon, imageUrl: big,
        groups: toStatGroups({ ...stats, damage_min: r.damage_min,
          damage_max: r.damage_max, pdamage_min: r.pdamage_min,
          pdamage_max: r.pdamage_max }),
        randomAttributes: rand.map(x =>
          `${x.attribute}：${formatRange(x.min, x.max)} (${totalRate ? Math.round(x.rate / totalRate * 100) : 0}%)`),
        dropFrom: drops.map(x => ({ id: x.id, title: x.name, route: {
          kind: "monster", id: x.id, action: "detail",
        } })),
      };
    },
    async search(keyword: string) {
      const kws = keyword.trim().split(/\s+/).filter(Boolean);
      const where = kws.length
        ? kws.map((_, i) => `i.name LIKE :k${i}`).join(" AND ")
        : "1=0";
      return db.query(
        `SELECT i.id,i.name,i.type_name,i.equip_slot,i.base_lv,${IS_EXTRA} AS isExtra
         FROM items i
         WHERE ${where} AND ${HIDE_DUPLICATE_EXTRA} ORDER BY i.id`,
        { replacements: Object.fromEntries(kws.map((k, i) => [`k${i}`, `%${k}%`])),
          type: QueryTypes.SELECT },
      );
    },
    async byType(type: string) {
      return db.query(
        `SELECT i.id,i.name,i.type_name,i.equip_slot,i.base_lv,${IS_EXTRA} AS isExtra
         FROM items i
         WHERE i.type_name=:type AND ${HIDE_DUPLICATE_EXTRA} ORDER BY i.name`,
        { replacements: { type }, type: QueryTypes.SELECT },
      );
    },
    async byAttribute(attribute: string, minimum: number) {
      if (!ATTRIBUTE_QUERY_KEYS.has(attribute)) throw new Error("Invalid attribute");
      // 只回玩家裝備：藥水與寵物飾品也有 str/critical_hit，混在「篩選裝備」裡是錯的
      return db.query(
        `SELECT i.id,i.name,i.type_name,i.equip_slot,i.base_lv,${IS_EXTRA} AS isExtra
         FROM items i
         WHERE i.${attribute} >= :minimum AND i.type_name IN (:types)
           AND ${HIDE_DUPLICATE_EXTRA}
         ORDER BY i.${attribute} DESC`,
        { replacements: { minimum, types: [...EQUIPPABLE_TYPES] }, type: QueryTypes.SELECT },
      );
    },
    async suggest(keyword: string): Promise<SuggestOption[]> {
      const rows: any[] = await db.query(
        `SELECT i.id,i.name FROM items i
         WHERE i.name LIKE :keyword AND i.name <> '' AND ${HIDE_DUPLICATE_EXTRA}
         ORDER BY i.name LIMIT 25`,
        { replacements: { keyword: `%${keyword}%` }, type: QueryTypes.SELECT },
      );
      return rows.map(x => ({ name: x.name, value: String(x.id) }));
    },
    async equipStats(type: string): Promise<EquipStats[]> {
      const rows: any[] = await db.query(
        `SELECT i.* FROM items i
         WHERE i.type_name=:type AND i.base_lv>=80 AND ${HIDE_DUPLICATE_EXTRA}`,
        { replacements: { type }, type: QueryTypes.SELECT },
      );
      const imgs: any[] = await itemImages(db, rows.map(x => x.id));
      return rows.map(x => toEquipStats(x, imgs));
    },
    /**
     * 依 id 批次取 EquipStats，只回玩家裝備。
     *
     * getById() 回的 ItemDetail 數值已格式化成中文字串，反解很醜；
     * equipStats() 綁死 base_lv>=80 的單一類別。比較功能需要「任意 id 的原始數值」，
     * 所以獨立一支。查不到或不是裝備的 id 不會出現在結果裡，
     * 呼叫端自己比對缺哪一個。
     */
    async statsByIds(ids: number[]): Promise<EquipStats[]> {
      if (!ids.length) return [];
      const rows: any[] = await db.query(
        `SELECT i.id,i.name,i.type_name,i.equip_slot,${EQUIP_STAT_KEYS.map(k => `i.${k}`).join(",")}
         FROM items i
         WHERE i.id IN (:ids) AND i.type_name IN (:types)`,
        { replacements: { ids, types: [...EQUIPPABLE_TYPES] }, type: QueryTypes.SELECT },
      );
      const imgs: any[] = await itemImages(db, rows.map(x => x.id));
      return rows.map(x => toEquipStats(x, imgs));
    },
  };
}

export default createItemRepo;
