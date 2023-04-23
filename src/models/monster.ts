import { DataTypes, Model, Sequelize } from "sequelize";

export class Npc extends Model {
  declare type: string;
}

export default (sequelize: Sequelize) =>
  Npc.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      rawType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "type",
      },
      subType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "sub_type",
      },
      elemental: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      elementalAttack: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "elemental_attack",
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      hp: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      walkSpeed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "walk_speed",
      },
      attackSpeed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "attack_speed",
      },
      attackRange: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "attack_range",
      },
      damageMin: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "damage_min",
      },
      damageMax: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "damage_max",
      },
      pDamageMin: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "pDamage_min",
      },
      pDamageMax: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "pDamage_max",
      },
      extraDef: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "extra_def",
      },
      magicDef: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "magic_def",
      },
      baseHit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "base_hit",
      },
      baseDodge: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "base_dodge",
      },
      criticalHit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "critical_hit",
      },
      uncannyDodge: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "uncanny_dodge",
      },
      fireDef: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "fire_def",
      },
      waterDef: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "water_def",
      },
      woodDef: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "wood_def",
      },
      dropExp: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "drop_exp",
      },
      weakenRes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "weaken_res",
      },
      stunRes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "stun_res",
      },
      shapeRes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "shape_res",
      },
      bleedRes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "bleed_res",
      },
      dropMoneyMin: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "drop_money_min",
      },
      dropMoneyMax: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "drop_money_max",
      },
      damage: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.getDataValue("damageMin")} ~ ${this.getDataValue(
            "damageMax"
          )}`;
        },
        set() {
          throw new Error("Do not try to set the `damage` value!");
        },
      },
      pDamage: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.getDataValue("pDamageMin")} ~ ${this.getDataValue(
            "pDamageMax"
          )}`;
        },
        set() {
          throw new Error("Do not try to set the `pDamage` value!");
        },
      },
      dropMoney: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.getDataValue("dropMoneyMin")} ~ ${this.getDataValue(
            "dropMoneyMax"
          )}`;
        },
        set() {
          throw new Error("Do not try to set the `dropMoney` value!");
        },
      },
      type: {
        type: DataTypes.VIRTUAL,
        get() {
          const target = typeEnumerations.find(
            (type) => type.type === this.getDataValue("rawType")
          );
          return target ? target.name : "";
        },
        set() {
          throw new Error("Do not try to set the `type` value!");
        },
      },
    },
    {
      sequelize,
      tableName: "npc",
      timestamps: false,
    }
  );

export class Monster extends Model {}

export const monster = (sequelize: Sequelize) =>
  Monster.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dropItem: {
        type: DataTypes.JSON,
        allowNull: false,
        field: "drop_item",
      },
    },
    {
      sequelize,
      timestamps: false,
    }
  );

export const typeEnumerations = [
  {
    type: 13,
    name: "水",
  },
  {
    type: 14,
    name: "獸",
  },
  {
    type: 15,
    name: "蟲",
  },
  {
    type: 16,
    name: "植",
  },
  {
    type: 17,
    name: "人",
  },
  {
    type: 18,
    name: "機",
  },
  {
    type: 19,
    name: "妖",
  },
];
