import { DataTypes, Model, Sequelize } from "sequelize";
export class NpcImage extends Model {}
export default (sequelize: Sequelize) => NpcImage.init({ npcId: { type: DataTypes.INTEGER, field: "npc_id", primaryKey: true }, shapeKey: { type: DataTypes.INTEGER, field: "shape_key", primaryKey: true }, url: DataTypes.STRING, width: DataTypes.INTEGER, height: DataTypes.INTEGER }, { sequelize, tableName: "npc_images", timestamps: false });
