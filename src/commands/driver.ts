import {
  CommandInteraction,
  SlashCommandBuilder,
  CommandInteractionOptionResolver,
  Message,
  StringSelectMenuInteraction,
  ComponentType,
  bold,
  blockQuote,
  codeBlock,
} from "discord.js";
import { sheetByType } from "../utilities/equip/sheet";
import { get } from "lodash";
import { findByName } from "../utilities/equip/searcher";
import { Op, Sequelize } from "sequelize";
import item, { Item } from "../models/item";
import {
  MultiResultMenuBuilder,
  EquipEmbedBuilder,
} from "../utilities/equip/builder";
import equipConfig from "../../config/equip.json";

const execution = async (
  database: Sequelize,
  interaction: CommandInteraction
) => {
  await interaction.deferReply();
  const options = interaction.options as CommandInteractionOptionResolver;
  const keyword = options.getString("keyword") as string;
  const textOnly = options.getBoolean("text_only");
  const sheet = await sheetByType("driver");
  const rows = await sheet.getRows({ offset: 1, limit: sheet.rowCount });
  const Item = item(database);

  const sheetResult = findByName(rows, keyword);
  const sqliteResult = await Item.findAll({
    where: {
      name: {
        [Op.like]: `%${keyword}%`,
      },
      type: "座騎",
    },
  });

  if (sqliteResult.length === 0) {
    await interaction.editReply("找不到結果");
    return;
  }

  const generateResult = async (row: Item) => {
    const name = row.getDataValue("name");

    // sheet result has multiple rows
    const sheetTarget = sheetResult.find((row) => row["名稱"] === name);
    const image = get(sheetTarget, "新版圖片", get(sheetTarget, "圖片網址"));

    const options = {
      title: name,
      description: row.getDataValue("summary").replace(/\\n/g, "\n"),
      fields: generateFields(row),
      image,
    };

    if (textOnly) {
      const text = [
        bold(name),
        blockQuote(row.getDataValue("summary").replace(/\\n/g, "\n")),
        codeBlock(
          options.fields
            .map((field) => `${field.name}:${field.value}`)
            .join("\n")
        ),
      ];

      return text.join("\n");
    }

    return EquipEmbedBuilder(options);
  };

  if (sqliteResult.length === 1) {
    const [row] = sqliteResult;
    const result = await generateResult(row);

    if (typeof result === "string") {
      await interaction.editReply(result);
      return;
    }

    return await interaction.editReply({
      content: "查詢結果",
      embeds: [result],
    });
  }

  // reply menu let user choose
  const menu = MultiResultMenuBuilder({
    customId: "driver",
    placeholder: "請選擇要查詢的座騎",
    options: sqliteResult.map((row) => ({
      label: row.getDataValue("name"),
      value: row.getDataValue("name"),
    })),
  });

  const message = await interaction.editReply({
    content: "查詢到多個結果，請選擇要查詢的座騎",
    components: [menu],
  });

  const filter = (i: StringSelectMenuInteraction) => {
    return i.customId === "driver" && i.user.id === interaction.user.id;
  };

  const collector = message.createMessageComponentCollector({
    filter,
    componentType: ComponentType.StringSelect,
    time: 15000,
  });

  collector.on("collect", async (i) => {
    const value = i.values[0];
    const row = sqliteResult.find((row) => row.getDataValue("name") === value);
    const result = await generateResult(row as Item);

    if (typeof result === "string") {
      await i.update({
        content: result,
        components: [],
      });
      return;
    }

    await i.update({
      content: "查詢結果",
      embeds: [result],
      components: [],
    });
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await (message as Message).edit({
        content: "沒有選擇結果",
        components: [],
      });
    }
  });
};

function generateFields(equip: Item) {
  const skipFields = ["id", "name", "type", "note", "summary", "picture"];

  return equipConfig
    .filter((config) => !skipFields.includes(config.key))
    .filter((config) => equip.getDataValue(config.key))
    .map((config) => ({
      name: config.note,
      value: `${equip.getDataValue(config.key)}`,
      inline: true,
    }));
}

const command = {
  name: "driver",
  data: new SlashCommandBuilder()
    .setName("driver")
    .setDescription("查找座騎資訊")
    .addStringOption((option) =>
      option
        .setName("keyword")
        .setDescription("關鍵字")
        .setRequired(true)
        .setMaxLength(10)
    )
    .addBooleanOption((option) =>
      option.setName("text_only").setDescription("僅文字").setRequired(false)
    ),
  execute: execution,
};

export default command;
