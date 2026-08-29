import { EquipStats } from "../contracts";
const WEIGHTS: Record<string, Record<string, number>> = {
  "純玄系列": { wis: 7, dex: 3, hit: 1, extra_def: .5, magic_def: .25 },
  "純外系列": { str: 11, atk: 1, dex: 3, hit: 1, extra_def: .5, magic_def: .5 },
  "純內系列": { pow: 9, matk: 1, dex: 3, hit: 1, extra_def: .5, magic_def: .5 },
  "玄內系列": { wis: 7, pow: 5, matk: 1, dex: 3, hit: 1, extra_def: .5, magic_def: .25 },
  "玄外系列": { wis: 7, str: 5, atk: 1, dex: 3, hit: 1, extra_def: .5, magic_def: .5 },
  "爆刀": { agi: 7, str: 7, critical_hit: 5, extra_def: .75, magic_def: .75 },
  "手甲": { dex: 15, hit: 5, atk: 7 },
};
export const score = (stats: Record<string, number>, series: string) =>
  Math.round(Object.entries(WEIGHTS[series] ?? {}).reduce((n, [k, w]) => n + (stats[k] || 0) * w, 0));
export const rank = (rows: EquipStats[], series: string, type: string) =>
  rows.filter(r => (r.stats.base_lv || 0) >= 80 && r.typeLabel === type)
    .map(r => ({ ...r, score: score(r.stats, series) }))
    .filter(r => r.score !== 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
