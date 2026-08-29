import { QueryTypes, Sequelize } from "sequelize";
import { SkillDetail, SuggestOption } from "../contracts";
import { clan, target } from "../domain/enums";
import { toSkillGroups } from "../domain/stats";

export function createSkillRepo(db: Sequelize) {
  return {
    async search(keyword: string) {
      return db.query("SELECT id,name,level FROM (SELECT id,name,level,ROW_NUMBER() OVER (PARTITION BY id,name ORDER BY level DESC) rn FROM magic WHERE name LIKE :keyword) WHERE rn=1 ORDER BY name,id,level", { replacements: { keyword: `%${keyword}%` }, type: QueryTypes.SELECT });
    },
    async getByIdLevel(id: number, level: number): Promise<SkillDetail | null> {
      const a: any[] = await db.query("SELECT * FROM magic WHERE id=:id AND level=:level", { replacements: { id, level }, type: QueryTypes.SELECT });
      const r = a[0];
      if (!r) return null;
      const l: any[] = await this.levels(id);
      return { id: r.id, name: r.name, level: r.level, clanLabel: clan(r.clan), targetLabel: target(r.target), help: r.help ?? null, groups: toSkillGroups(r), availableLevels: l.map(x => x.level) };
    },
    async levels(id: number) {
      return db.query("SELECT level FROM magic WHERE id=:id ORDER BY level", { replacements: { id }, type: QueryTypes.SELECT });
    },
    async suggest(keyword: string): Promise<SuggestOption[]> {
      const a: any[] = await db.query("SELECT id,name,level FROM magic WHERE name LIKE :keyword ORDER BY name,id,level LIMIT 25", { replacements: { keyword: `%${keyword}%` }, type: QueryTypes.SELECT });
      return a.map(x => ({ name: `${x.name} Lv${x.level}`, value: `${x.id}:${x.level}` }));
    },
  };
}

export default createSkillRepo;
