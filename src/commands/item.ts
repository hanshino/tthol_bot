import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { Op, Sequelize } from "sequelize";
import driverCommand from "./driver";
import backCommand from "./back";
import item, { Item } from "../models/item";
import { MultiResultMenuBuilder } from "../utilities/equip/builder";
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
  const keyword = options.getString("keyword") as string;

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

      await i.update({
        content: `查詢結果: ${item.getDataValue("name")}`,
        embeds: [
          {
            title: item.getDataValue("name"),
            description: item.getDataValue("description"),
            fields: [
              {
                name: "種類",
                value: item.getDataValue("type"),
              },
              {
                name: "描述",
                value: item.getDataValue("summary"),
              },
            ],
          },
        ],
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
  await interaction.editReply({
    content: `查詢結果: ${row.getDataValue("name")}`,
    embeds: [
      {
        title: row.getDataValue("name"),
        description: row.getDataValue("description"),
        fields: [
          {
            name: "種類",
            value: row.getDataValue("type") || "無",
          },
          {
            name: "描述",
            value: row.getDataValue("summary"),
          },
        ],
      },
    ],
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
