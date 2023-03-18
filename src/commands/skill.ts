import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { Op, Sequelize } from "sequelize";
import skill, { Skill as TypeSkill } from "../models/skill";
import { MultiResultMenuBuilder } from "../utilities/equip/builder";
import { uniqBy, uniq } from "lodash";

const note = [
  { name: "距離", value: "range" },
  { name: "消耗", value: "spendMp" },
  { name: "僵直", value: "stun" },
  { name: "recharge_time", value: "rechargeTime" },
  { name: "持續時間(ms)", value: "time" },
  { name: "傷害參數", value: "funcDmg" },
  { name: "傷害參數1", value: "funcDmgP1" },
  { name: "傷害參數2", value: "funcDmgP2" },
  { name: "傷害參數3", value: "funcDmgP3" },
  { name: "傷害參數4", value: "funcDmgP4" },
  { name: "傷害參數5", value: "funcDmgP5" },
  { name: "命中參數", value: "funcHit" },
  { name: "命中參數1", value: "funcHitP1" },
];

const execution = async (
  database: Sequelize,
  interaction: CommandInteraction
) => {
  await interaction.deferReply();
  const options = interaction.options as CommandInteractionOptionResolver;
  const keyword = options.getString("keyword") as string;
  const level = options.getInteger("level") as number;
  const Skill = skill(database);

  const results = await Skill.findAll({
    order: [["level", "DESC"]],
    where: {
      name: {
        [Op.like]: `%${keyword}%`,
      },
    },
  });

  const names = uniq(results.map((result) => result.getDataValue("name")));

  if (names.length === 0) {
    await interaction.editReply("找不到結果");
    return;
  }

  const generateResult = async (id: number) => {
    const maxLevelSkill = results.find((result) => {
      const isIdEqual = result.getDataValue("id") === id;
      const isLevelEqual = result.getDataValue("level") === level;
      return level ? isIdEqual && isLevelEqual : isIdEqual;
    }) as TypeSkill;
    const embed = new EmbedBuilder()
      .setTitle(maxLevelSkill.getDataValue("name"))
      .setDescription(maxLevelSkill.getDataValue("help"))
      .addFields({
        name: "等級",
        value: `${maxLevelSkill.getDataValue("level")}`,
      });

    note.forEach((note) => {
      const value = maxLevelSkill.getDataValue(note.value);
      if (value) {
        embed.addFields({ name: note.name, value: `${value}`, inline: true });
      }
    });

    return embed;
  };

  if (names.length > 1) {
    const menuOptions = {
      customId: "skill",
      placeholder: "請選擇一個結果",
      options: uniqBy(results, "name").map((result) => ({
        label: result.getDataValue("name"),
        value: `${result.getDataValue("id")}`,
        inline: true,
      })),
    };
    const menu = MultiResultMenuBuilder(menuOptions);

    const message = await interaction.editReply({
      content: "找到多個結果，請選擇一個",
      components: [menu],
    });

    const filter = (i: StringSelectMenuInteraction) => i.customId === "skill";

    const collector = message.createMessageComponentCollector({
      filter,
      componentType: ComponentType.StringSelect,
      time: 15000,
    });

    collector.on("collect", async (i: StringSelectMenuInteraction) => {
      const value = i.values[0];
      const embed = await generateResult(parseInt(value));

      await i.update({
        content: "查詢結果",
        embeds: [embed],
        components: [],
      });
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          content: "查詢超時",
          components: [],
        });
      }
    });

    return;
  }

  const embed = await generateResult(results[0].getDataValue("id") as number);

  await interaction.editReply({
    content: "查詢結果",
    embeds: [embed],
    components: [],
  });
};

const command = {
  name: "skill",
  data: new SlashCommandBuilder()
    .setName("skill")
    .setDescription("查找技能資訊")
    .addStringOption((option) =>
      option.setName("keyword").setDescription("關鍵字").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("等級")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20)
    ),
  execute: execution,
};

export default command;
