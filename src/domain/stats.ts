import { StatGroup, StatRow } from "../contracts";

export const STAT_LABELS: Record<string, string> = {
  base_lv: "等級", hp: "體力", mp: "真氣", str: "外功", pow: "內力",
  vit: "根骨", dex: "技巧", agi: "身法", wis: "玄學", atk: "物攻",
  matk: "內勁", extra_def: "防禦", magic_def: "護勁", dodge: "閃躲",
  uncanny_dodge: "拆招", critical_hit: "重擊", hit: "命中", walk_speed: "移動",
  attack_speed: "攻速", fire_def: "火抗", water_def: "水抗", lightning_def: "雷抗",
  wood_def: "木抗", damage_min: "傷害min", damage_max: "傷害max",
  pdamage_min: "內勁傷害min", pdamage_max: "內勁傷害max",
};
export const STAT_KEYS = [
  "hp", "mp", "str", "pow", "vit", "dex", "agi", "wis", "atk", "matk",
  "extra_def", "magic_def", "dodge", "uncanny_dodge", "critical_hit", "hit",
  "attack_speed", "walk_speed", "fire_def", "water_def", "lightning_def", "wood_def",
  "damage_min", "damage_max", "pdamage_min", "pdamage_max",
];
export const ATTRIBUTE_QUERY_KEYS = new Set(STAT_KEYS);
export const SKILL_STATS: [string, string][] = [
  ["range", "距離"], ["spend_mp", "MP消耗"], ["stun", "僵直時間(ms)"],
  ["time", "持續時間(ms)"], ["func_dmg", "傷害參數"], ["func_hit_p1", "命中率"],
];
const shortNames: [string, string][] = [
  ["外功", "str"], ["玄學", "wis"], ["內力", "pow"], ["身法", "agi"],
  ["命中", "hit"], ["技巧", "dex"], ["物攻", "atk"], ["重擊", "critical_hit"],
  ["閃躲", "dodge"],
];
export const resolveAttribute = (input: string) => shortNames.find(([name]) => name.indexOf(input) >= 0)?.[1];
export const formatRange = (min: number | null | undefined, max: number | null | undefined) => min == null || max == null ? "—" : min === max ? `${min}` : `${min}~${max}`;

export function toStatGroups(values: Record<string, unknown>, keys: string[] = STAT_KEYS): StatGroup[] {
  const rows: StatRow[] = keys
    .filter(key => !["damage_min", "damage_max", "pdamage_min", "pdamage_max"].includes(key))
    .flatMap(key => {
      const value = values[key];
      return value == null || !value ? [] : [{ label: STAT_LABELS[key] ?? key, value: String(value) }];
    });
  const hasRange = (min: unknown, max: unknown) => (typeof min === "number" && min !== 0) || (typeof max === "number" && max !== 0);
  if ((keys.includes("damage_min") || keys.includes("damage_max")) && hasRange(values.damage_min, values.damage_max)) rows.push({ label: "傷害", value: formatRange(values.damage_min as number | null, values.damage_max as number | null) });
  if ((keys.includes("pdamage_min") || keys.includes("pdamage_max")) && hasRange(values.pdamage_min, values.pdamage_max)) rows.push({ label: "內勁傷害", value: formatRange(values.pdamage_min as number | null, values.pdamage_max as number | null) });
  return rows.length ? [{ title: "屬性", rows }] : [];
}
export function toSkillGroups(values: Record<string, unknown>): StatGroup[] {
  const rows = SKILL_STATS.flatMap(([key, label]) => {
    const v = values[key];
    return v == null || !v ? [] : [{ label, value: key === "func_hit_p1" ? `${v}%` : String(v) }];
  });
  return rows.length ? [{ title: "技能參數", rows }] : [];
}
export function toMonsterGroups(values: Record<string, unknown>): StatGroup[] {
  const groups: [string, StatRow[]][] = [
    ["基本屬性", ["level", "hp", "elemental", "elemental_attack", "base_hit", "base_dodge", "drop_exp", "drop_money_max"].flatMap(k => values[k] == null || !values[k] ? [] : [{ label: STAT_LABELS[k] ?? k, value: String(values[k]) }])],
    ["傷害參數", ["attack_speed", "attack_range"].flatMap(k => values[k] == null || !values[k] ? [] : [{ label: STAT_LABELS[k] ?? k, value: String(values[k]) }])],
    ["防禦參數", ["extra_def", "magic_def", "fire_def", "water_def", "lightning_def", "wood_def"].flatMap(k => values[k] == null || !values[k] ? [] : [{ label: STAT_LABELS[k] ?? k, value: String(values[k]) }])],
  ];
  const damage = formatRange(values.damage_min as number | null, values.damage_max as number | null);
  const pDamage = formatRange(values.pdamage_min as number | null, values.pdamage_max as number | null);
  if (damage !== "—" && !(values.damage_min === 0 && values.damage_max === 0)) groups[1][1].push({ label: "傷害", value: damage });
  if (pDamage !== "—" && !(values.pdamage_min === 0 && values.pdamage_max === 0)) groups[1][1].push({ label: "內勁傷害", value: pDamage });
  return groups.filter(([, rows]) => rows.length).map(([title, rows]) => ({ title, rows }));
}
