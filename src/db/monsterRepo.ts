import { QueryTypes, Sequelize } from "sequelize";
import { MonsterDetail, SuggestOption } from "../contracts";
import { element } from "../domain/enums";
import { toMonsterGroups } from "../domain/stats";

export function createMonsterRepo(db: Sequelize) {
  return {
    async getById(id: number): Promise<MonsterDetail | null> {
      const a: any[] = await db.query("SELECT n.*,m.drop_item, m.pdamage_min AS pdamage_min, m.pdamage_max AS pdamage_max FROM npc n LEFT JOIN monsters m ON m.id=n.id WHERE n.id=:id AND n.is_monster=1", { replacements: { id }, type: QueryTypes.SELECT });
      const r = a[0];
      if (!r) return null;
      const im: any[] = await db.query("SELECT url FROM npc_images WHERE npc_id=:id ORDER BY shape_key LIMIT 1", { replacements: { id }, type: QueryTypes.SELECT });
      let ids: any[] = [];
      try { ids = JSON.parse(r.drop_item || "[]").map(Number); } catch {}
      const drops: any[] = ids.length ? await db.query("SELECT id,name FROM items WHERE id IN (:ids) AND name<>''", { replacements: { ids }, type: QueryTypes.SELECT }) : [];
      return { id: r.id, name: r.name, level: r.level, elemental: element(r.elemental), iconUrl: im[0]?.url ?? null, groups: toMonsterGroups(r), drops: drops.map(x => ({ id: x.id, title: x.name, route: { kind: "item", id: x.id, action: "detail" } })) };
    },
    async search(keyword: string) {
      return db.query("SELECT id,name,level,elemental FROM npc WHERE name LIKE :keyword AND is_monster=1 ORDER BY name", { replacements: { keyword: `%${keyword}%` }, type: QueryTypes.SELECT });
    },
    async byLevel(min: number, max: number) {
      return db.query("SELECT id,name,level,elemental FROM npc WHERE is_monster=1 AND level BETWEEN :min AND :max ORDER BY level,name", { replacements: { min, max }, type: QueryTypes.SELECT });
    },
    async byElement(value: string, min = 0, max = 999) {
      return db.query("SELECT id,name,level,elemental FROM npc WHERE is_monster=1 AND elemental=:elemental AND level BETWEEN :min AND :max ORDER BY level,name", { replacements: { elemental: element(value), min, max }, type: QueryTypes.SELECT });
    },
    async suggest(keyword: string): Promise<SuggestOption[]> {
      const a: any[] = await db.query("SELECT id,name FROM npc WHERE is_monster=1 AND name LIKE :keyword LIMIT 25", { replacements: { keyword: `%${keyword}%` }, type: QueryTypes.SELECT });
      return a.map(x => ({ name: x.name, value: String(x.id) }));
    },
  };
}

export default createMonsterRepo;
