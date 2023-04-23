import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  EmbedBuilder,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { Op, Sequelize } from "sequelize";
import driverCommand from "./driver";
import backCommand from "./back";
import item, { Item } from "../models/item";
import { monster } from "../models/monster";
import { MultiResultMenuBuilder } from "../utilities/equip/builder";
import { chunk } from "lodash";
const { execute: driver } = driverCommand;
const { execute: back } = backCommand;

const execution = async (
  database: Sequelize,
  interaction: CommandInteraction
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case "back":
      return await back(database, interaction);
    case "driver":
      return await driver(database, interaction);
    case "search":
      return await searchItem(database, interaction);
  }
};

const searchItem = async (
  database: Sequelize,
  interaction: CommandInteraction
) => {
  await interaction.deferReply();
  const options = interaction.options as CommandInteractionOptionResolver;
  const Item = item(database);
  const Monster = monster(database);
  const keyword = options.getString("keyword") as string;

  const generateResult = async (item: Item) => {
    const embed = new EmbedBuilder()
      .setTitle(item.getDataValue("name"))
      .addFields(
        { name: "種類", value: item.getDataValue("type") || "無" },
        { name: "描述", value: item.getDataValue("summary") }
      );

    const dropMonster = await Monster.findAll({
      where: {
        dropItem: {
          [Op.like]: database.literal(`'%"${item.getDataValue("id")}"%'`),
        },
      },
    });

    if (dropMonster.length !== 0 && dropMonster.length <= 110) {
      const names = dropMonster.map((monster) => monster.getDataValue("name"));
      chunk(names, 100).forEach((names, idx) =>
        embed.addFields({
          name: "掉落怪物" + (idx + 1),
          value: names.join(", "),
        })
      );
    }

    return embed;
  };

  const result = await Item.findAll({
    where: {
      name: {
        [Op.like]: `%${keyword}%`,
      },
    },
  });

  if (result.length === 0) {
    await interaction.editReply("找不到結果");
    return;
  }

  if (result.length >= 25) {
    await interaction.editReply("找到太多結果，請縮小範圍");
    return;
  }

  if (result.length !== 1) {
    const message = await interaction.editReply({
      content: "找到多個結果，請選擇",
      components: [
        MultiResultMenuBuilder({
          customId: "item-search",
          placeholder: "請選擇",
          options: result.map((item: Item) => ({
            label: item.getDataValue("name"),
            value: item.getDataValue("id").toString(),
          })),
        }),
      ],
    });

    const filter = (i: any) => i.customId === "item-search";
    const collector = message.createMessageComponentCollector({
      filter,
      time: 10000,
    });

    collector.on("collect", async (i: any) => {
      const value = i.values[0];
      const item = result.find(
        (item: Item) => item.getDataValue("id").toString() === value
      ) as Item;
      const embed = await generateResult(item);

      await i.update({
        content: `查詢結果: ${item.getDataValue("name")}`,
        embeds: [embed],
        components: [],
      });
    });

    collector.on("end", async (collected) => {
      if (collected.size !== 0) {
        return;
      }

      await (message as Message).edit({
        content: "沒有選擇結果",
        components: [],
      });
    });
    return;
  }

  const [row] = result;
  const embed = await generateResult(row);
  await interaction.editReply({
    content: `查詢結果: ${row.getDataValue("name")}`,
    embeds: [embed],
  });
};

const command = {
  name: "item",
  data: new SlashCommandBuilder()
    .setName("item")
    .setDescription("查找道具資訊")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setDescription("查找道具資訊")
        .addStringOption((option) =>
          option
            .setName("keyword")
            .setDescription("關鍵字")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("back")
        .setDescription("查找背飾資訊")
        .addStringOption((option) =>
          option
            .setName("keyword")
            .setDescription("關鍵字")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("driver")
        .setDescription("查找座騎資訊")
        .addStringOption((option) =>
          option
            .setName("keyword")
            .setDescription("關鍵字")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10)
        )
    ),
  execute: execution,
};

export default command;
