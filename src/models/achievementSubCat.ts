import { DataTypes, Model, Sequelize } from "sequelize";
export class AchievementSubCat extends Model {}
export default (sequelize: Sequelize) => AchievementSubCat.init({ id: { type: DataTypes.INTEGER, primaryKey: true }, categoryId: { type: DataTypes.INTEGER, field: "category_id" }, name: DataTypes.STRING, sortOrder: { type: DataTypes.INTEGER, field: "sort_order" } }, { sequelize, tableName: "achievement_sub_cats", timestamps: false });
