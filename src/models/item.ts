import { DataTypes, Model, Sequelize } from "sequelize";

export class Item extends Model {}

// The `items` table was renamed under this model between 2023 and 2026 (tthol-data
// migrations). Sequelize SELECTs every declared attribute, so a single stale name
// fails the whole query -- the symptom was `no such column: type` on /item.
//
// Only `type`, `level` and `picture` are actually read by any command, so they are
// mapped to their current columns. The 13 combat-stat attributes that used to be
// declared here (def, mdef, critical, speed, fire, water, thunder, tree, freeze,
// min_damage, max_damage, min_pdamage, max_pdamage) were never read anywhere and are
// dropped rather than guessed at: `speed` has three plausible columns now
// (attack_speed / walk_speed / run_speed) and `freeze` has no counterpart at all.
// To bring one back, add it with the real column name from `PRAGMA table_info(items)`.
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
        field: "type_name",
      },
      summary: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "base_lv",
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
      dodge: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      uncanny_dodge: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      hit: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      picture: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "icon",
      },
    },
    {
      sequelize,
      modelName: "item",
      createdAt: false,
      updatedAt: false,
    }
  );
