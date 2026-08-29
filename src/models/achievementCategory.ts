import { DataTypes, Model, Sequelize } from "sequelize";
export class AchievementCategory extends Model {}
export default (sequelize: Sequelize) => AchievementCategory.init({ id: { type: DataTypes.INTEGER, primaryKey: true }, name: DataTypes.STRING, sortOrder: { type: DataTypes.INTEGER, field: "sort_order" } }, { sequelize, tableName: "achievement_categories", timestamps: false });
