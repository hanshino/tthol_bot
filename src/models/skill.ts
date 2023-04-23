import { DataTypes, Model, Sequelize } from "sequelize";

export class Skill extends Model {}

export default (sequelize: Sequelize) =>
  Skill.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      clan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      clan2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      target: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      help: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      castEffect: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "cast_effect",
      },
      range: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      spendMp: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "spend_mp",
      },
      stun: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      statusParam: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "status_param",
      },
      extraStatus: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "extra_status",
      },
      time: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      funcDmg: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "func_dmg",
      },
      funcDmgP1: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "func_dmg_p1",
      },
      funcDmgP2: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "func_dmg_p2",
      },
      funcDmgP3: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "func_dmg_p3",
      },
      funcDmgP4: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "func_dmg_p4",
      },
      funcDmgP5: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "func_dmg_p5",
      },
      funcHit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "func_hit",
      },
      funcHitP1: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "func_hit_p1",
      },
      skillType: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "skill_type",
      },
      spendHp: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "spend_hp",
      },
      rechargeTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "recharge_time",
      },
      hitRange: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "hit_range",
      },
    },
    {
      sequelize,
      modelName: "magic",
      timestamps: false,
    }
  );
