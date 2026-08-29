import { Route } from "../contracts";
export const clanLabels: Record<string, string> = {
  CLASS_SHAULIN: "少林", CLASS_MONTO: "曼陀", CLASS_MONTO_KYLIN: "麒麟",
  CLASS_SKY: "天外天", CLASS_FLOWER: "移花宮", CLASS_FOX: "火狐",
  CLASS_FOX_SNOW: "雪狼", CLASS_FOX_NONE: "火狐(無派)", CLASS_BAD: "惡人谷",
  CLASS_ISLE: "無名島", CLASS_GOD: "神武門", CLASS_MAGIC: "天師",
  CLASS_LOVE: "戀人", CLASS_GUILD: "家族", CLASS_CHILD: "入門弟子",
  CLASS_NONE: "無派系",
};
export const targetLabels: Record<string, string> = {
  TARGET_ENEMYTARGET: "單體敵人", TARGET_ENEMY: "敵人", TARGET_ENEMYEX: "敵人(擴)",
  TARGET_PASSIVE: "被動", TARGET_SELF: "自身", TARGET_ALLY: "友軍", TARGET_GROUP: "範圍",
  TARGET_GROUP_ONE: "範圍(單次)", TARGET_SIEGE_GROUND: "攻城地面", TARGET_LOVE: "情侶",
};
export const itemTypeLabels: Record<string, string> = {
  NORMAL_ITEM: "一般道具", BONUS: "加成道具", SCARCE_ITEM: "稀有道具", EVENT_ITEM: "活動道具",
  ITEM_PET: "寵物", ORNAMENT: "飾品", HORSE: "座騎", WING: "背飾", HELMET: "帽", ARMOR: "衣",
  POTION: "藥水", BOOT: "靴", CLAW: "特殊武器", SHIELD: "盾", BOXING: "拳刃", BLADE: "刀",
  PUNCHER: "拳", SWORD: "劍", STING: "匕首", GREAT_SWORD: "大劍", WHISK: "拂塵", BOW: "弓",
  ROD: "杖", STAFF: "法杖", PET_ORNAMENT: "寵物飾品", HAMMER: "錘", RETURN_SCROLL: "回城卷軸",
  HIDDEN_WEAPON: "暗器", CASTLE_ITEM: "城堡道具", ITEM_BOT: "機器人道具", MONEY: "金錢",
};
export const element = (value: string | null | undefined) => (value ?? "").replace("電", "雷");
export const clan = (value: string | null | undefined) => value ? clanLabels[value] ?? value : "生活/商業";
export const target = (value: string | null | undefined) => value ? targetLabels[value] ?? value : "—";
export const itemType = (type: string | null | undefined, slot?: string | null) =>
  slot === "ORNAMENT_1" ? "左飾" : slot === "ORNAMENT_2" ? "中飾" : slot === "ORNAMENT_3" ? "右飾" :
    type ? itemTypeLabels[type] ?? type : "其他";
export function reward(type: number, id: number, amount: number, itemName?: string, magicName?: string): { label: string | null; route: Route | null } {
  const n = amount.toLocaleString();
  if (!type) return { label: null, route: null };
  if (type === 1) return { label: `貨幣 #${id} ×${n}`, route: null };
  if (type === 2) return { label: `${itemName ?? `物品 #${id}`} ×${n}`, route: { kind: "item", id, action: "detail" } };
  if (type === 3) return { label: `銀兩 ×${n}`, route: null };
  if (type === 5) return { label: amount > 1 ? `${magicName ?? `技能 #${id}`} ×${amount}` : (magicName ?? `技能 #${id}`), route: { kind: "skill", id, action: "detail" } };
  return { label: `獎勵 #${type}（#${id} ×${amount}）`, route: null };
}
