import { DataTypes, Model, Sequelize } from "sequelize";

export class Item extends Model {}

export default (sequelize: Sequelize) =>
  Item.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      note: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      summary: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      hp: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      mp: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      str: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      pow: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      vit: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dex: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      agi: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      wis: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      atk: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      matk: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      def: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      mdef: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dodge: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      uncanny_dodge: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      critical: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      hit: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      speed: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fire: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      water: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      thunder: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tree: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      freeze: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      min_damage: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      max_damage: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      min_pdamage: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      max_pdamage: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      picture: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "item",
      createdAt: false,
      updatedAt: false,
    }
  );
