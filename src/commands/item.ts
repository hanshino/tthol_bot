import {
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Sequelize } from "sequelize";
import driverCommand from "./driver";
import backCommand from "./back";
import { createItemRepo } from "../db/itemRepo";
import { itemType } from "../domain/enums";
import {
  buildItemDetail,
  buildResultList,
  failed,
  notFound,
  validateMessage,
} from "../ui";
import { encodePageToken } from "../routing/customId";

const { execute: driver } = driverCommand;
const { execute: back } = backCommand;

const safe = (payload: object) => ({ ...payload, allowedMentions: { parse: [] } });

const replyContainer = async (
  interaction: ChatInputCommandInteraction,
  container: unknown,
) => {
  const problems = validateMessage(container);
  if (problems.length) {
    console.error("Invalid UI message:", problems);
    await interaction.reply(safe({ ...failed("查詢"), flags: MessageFlags.Ephemeral }));
    return;
  }
  await interaction.reply(safe({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  }));
};

const searchItem = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const keyword = options.getString("keyword") ?? "";
  const ownerId = interaction.user.id;
  const repo = createItemRepo(database);

  if (/^\d+$/.test(keyword)) {
    const detail = await repo.getById(Number(keyword));
    if (!detail) return interaction.reply(safe(notFound(keyword)));
    return replyContainer(interaction, buildItemDetail(detail, { ownerId }));
  }

  const rows: any[] = await repo.search(keyword);
  if (rows.length === 0) return interaction.reply(safe(notFound(keyword)));
  if (rows.length === 1) {
    const detail = await repo.getById(Number(rows[0].id));
    if (!detail) return interaction.reply(safe(notFound(keyword)));
    return replyContainer(interaction, buildItemDetail(detail, { ownerId }));
  }

  const token = encodePageToken({ kind: "item", keyword });
  const totalPages = Math.max(1, Math.ceil(rows.length / 25));
  const container = buildResultList({
    title: `搜尋「${keyword}」`,
    entries: rows.slice(0, 25).map((row) => ({
      id: Number(row.id),
      title: row.name,
      subtitle: [
        itemType(row.type_name, row.equip_slot),
        row.base_lv > 0 ? `Lv${row.base_lv}` : null,
        // 只以外裝形式存在的物品才會留在結果裡，標示出來讓使用者一眼分辨
        row.isExtra ? "外裝" : null,
      ]
        .filter(Boolean)
        .join("・"),
      route: { kind: "item" as const, id: Number(row.id), action: "detail" as const },
    })),
    token,
    page: 1,
    totalPages,
    total: rows.length,
    ownerId,
  });
  return replyContainer(interaction, container);
};

const execution = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  switch (options.getSubcommand()) {
    case "back": return back(database, interaction);
    case "driver": return driver(database, interaction);
    case "search": return searchItem(database, interaction);
  }
};

const command = {
  name: "item",
  data: new SlashCommandBuilder()
    .setName("item")
    .setNameLocalizations({ "zh-TW": "道具" })
    .setDescription("查找道具資訊")
    .setDescriptionLocalizations({ "zh-TW": "查詢道具資訊" })
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setNameLocalizations({ "zh-TW": "查詢" })
        .setDescription("查找道具資訊")
        .setDescriptionLocalizations({ "zh-TW": "查詢道具資訊" })
        .addStringOption((option) =>
          option
            .setName("keyword")
            .setNameLocalizations({ "zh-TW": "關鍵字" })
            .setDescription("關鍵字")
            .setDescriptionLocalizations({ "zh-TW": "關鍵字" })
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("back")
        .setDescription("查找背飾資訊")
        .addStringOption((option) =>
          option.setName("keyword").setDescription("關鍵字").setRequired(true).setMinLength(1).setMaxLength(10),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("driver")
        .setDescription("查找座騎資訊")
        .addStringOption((option) =>
          option.setName("keyword").setDescription("關鍵字").setRequired(true).setMinLength(1).setMaxLength(10),
        ),
    ),
  execute: execution,
};

export default command;
