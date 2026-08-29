import { QueryTypes, Sequelize } from "sequelize";
import { AchievementCategory, AchievementEntry } from "../contracts";
import { reward } from "../domain/enums";
export function createAchievementRepo(db: Sequelize) {
  return {
    async categories(): Promise<AchievementCategory[]> {
      const rows: any[] = await db.query(
        `SELECT c.id, c.name, s.id subId, s.name subName,
                COUNT(a.id) count, COALESCE(SUM(a.points), 0) totalPoints
         FROM achievement_categories c
         LEFT JOIN achievement_sub_cats s ON s.category_id = c.id
         LEFT JOIN achievements a ON a.sub_cat_id = s.id
         GROUP BY c.id, s.id
         ORDER BY c.sort_order, s.sort_order`,
        { type: QueryTypes.SELECT },
      );
      return rows.reduce((out: AchievementCategory[], row: any) => {
        let category = out.find(item => item.id === row.id);
        if (!category) {
          category = { id: row.id, name: row.name, subCats: [] };
          out.push(category);
        }
        if (row.subId != null) {
          category.subCats.push({
            id: row.subId,
            parentId: row.id,
            name: row.subName,
            count: row.count,
            totalPoints: row.totalPoints,
          });
        }
        return out;
      }, []);
    },
    async bySubCat(id: number): Promise<AchievementEntry[]> {
      const achievements: any[] = await db.query(
        "SELECT a.*, i.name itemName, (SELECT name FROM magic WHERE id=a.reward_id ORDER BY level ASC LIMIT 1) magicName FROM achievements a LEFT JOIN items i ON a.reward_type=2 AND i.id=a.reward_id WHERE a.sub_cat_id=:id ORDER BY group_no,id",
        { replacements: { id }, type: QueryTypes.SELECT },
      );
      return achievements.map(this.entry);
    },
    async search(keyword: string): Promise<AchievementEntry[]> {
      const achievements: any[] = await db.query(
        "SELECT a.*, i.name itemName, (SELECT name FROM magic WHERE id=a.reward_id ORDER BY level ASC LIMIT 1) magicName FROM achievements a LEFT JOIN items i ON a.reward_type=2 AND i.id=a.reward_id WHERE a.name LIKE :k OR a.description LIKE :k ORDER BY group_no,id LIMIT 100",
        { replacements: { k: `%${keyword}%` }, type: QueryTypes.SELECT },
      );
      return achievements.map(this.entry);
    },
    entry(achievement: any): AchievementEntry {
      const result = reward(
        achievement.reward_type,
        achievement.reward_id,
        achievement.reward_amount, achievement.itemName, achievement.magicName,
      );
      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description ?? null,
        points: achievement.points,
        isPeriodic: achievement.reset_type > 0,
        rewardLabel: result.label,
        rewardRoute: result.route,
      };
    },
  };
}
export default createAchievementRepo;
