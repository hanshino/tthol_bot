import { DataTypes, Model, Sequelize } from "sequelize";
export class ItemImage extends Model {}
export default (sequelize: Sequelize) => ItemImage.init({ itemId: { type: DataTypes.INTEGER, field: "item_id", primaryKey: true }, kind: { type: DataTypes.STRING, primaryKey: true }, shapeKey: { type: DataTypes.INTEGER, field: "shape_key" }, url: DataTypes.STRING, width: DataTypes.INTEGER, height: DataTypes.INTEGER }, { sequelize, tableName: "item_images", timestamps: false });
