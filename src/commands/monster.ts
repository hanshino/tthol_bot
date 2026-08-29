import {
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Sequelize } from "sequelize";
import { createMonsterRepo } from "../db/monsterRepo";
import { element } from "../domain/enums";
import {
  buildMonsterDetail,
  buildResultList,
  failed,
  notFound,
  validateMessage,
} from "../ui";
import { encodePageToken } from "../routing/customId";
const safe = (payload: object) => ({ ...payload, allowedMentions: { parse: [] } });
const replyContainer = async (
  interaction: ChatInputCommandInteraction,
  container: unknown,
) => {
  const problems = validateMessage(container);
  if (problems.length) {
    console.error("Invalid UI message:", problems);
    return interaction.reply(safe({ ...failed("查詢"), flags: MessageFlags.Ephemeral }));
  }
  return interaction.reply(safe({ components: [container], flags: MessageFlags.IsComponentsV2 }));
};
const replyDetail = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
  id: number,
) => {
  const data = await createMonsterRepo(database).getById(id);
  if (!data) return interaction.reply(safe(notFound(String(id))));
  return replyContainer(interaction, buildMonsterDetail(data, { ownerId: interaction.user.id }));
};
const replyList = async (
  interaction: ChatInputCommandInteraction,
  rows: any[],
  title: string,
  token?: string,
) => {
  const totalPages = token ? Math.ceil(rows.length / 25) : undefined;
  const container = buildResultList({
    title,
    entries: rows.slice(0, 25).map((row) => ({
      id: Number(row.id),
      title: row.name,
      subtitle: [`Lv${row.level}`, element(row.elemental)].filter(Boolean).join("・"),
      route: { kind: "monster" as const, id: Number(row.id), action: "detail" as const },
    })),
    ...(token ? { token, page: 1, totalPages } : {}),
    total: rows.length,
    ownerId: interaction.user.id,
  });
  return replyContainer(interaction, container);
};
const search = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const keyword = options.getString("keyword") ?? "";
  if (/^\d+$/.test(keyword)) {
    return replyDetail(database, interaction, Number(keyword));
  }
  const rows: any[] = await createMonsterRepo(database).search(keyword);
  if (!rows.length) return interaction.reply(safe(notFound(keyword)));
  if (rows.length === 1) {
    return replyDetail(database, interaction, Number(rows[0].id));
  }
  return replyList(
    interaction,
    rows,
    `搜尋「${keyword}」`,
    encodePageToken({ kind: "monster", keyword }),
  );
};
const filteredList = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
  type: string | null,
  min: number,
  max: number,
) => {
  const repo = createMonsterRepo(database);
  const rows: any[] = type
    ? await repo.byElement(type, min, max)
    : await repo.byLevel(min, max);
  const keyword = type ?? `${min}~${max}`;
  if (!rows.length) return interaction.reply(safe(notFound(keyword)));
  if (rows.length === 1) {
    return replyDetail(database, interaction, Number(rows[0].id));
  }
  const title = type
    ? `${type}屬性怪物（共 ${rows.length} 筆，顯示前 25 筆）`
    : `等級 ${min}~${max}（共 ${rows.length} 筆，顯示前 25 筆）`;
  return replyList(interaction, rows, title);
};
const command = {
  name: "monster",
  data: new SlashCommandBuilder()
    .setName("monster")
    .setNameLocalizations({ "zh-TW": "怪物" })
    .setDescription("查詢怪物資訊")
    .setDescriptionLocalizations({ "zh-TW": "查詢怪物資訊" })
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setNameLocalizations({ "zh-TW": "查詢" })
        .setDescription("查詢怪物資訊")
        .setDescriptionLocalizations({ "zh-TW": "查詢怪物資訊" })
        .addStringOption((option) =>
          option
            .setName("keyword")
            .setNameLocalizations({ "zh-TW": "關鍵字" })
            .setDescription("關鍵字")
            .setDescriptionLocalizations({ "zh-TW": "關鍵字" })
            .setRequired(true)
            .setMaxLength(10)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("level")
        .setNameLocalizations({ "zh-TW": "等級" })
        .setDescription("依等級查詢")
        .setDescriptionLocalizations({ "zh-TW": "依等級查詢" })
        .addIntegerOption((option) =>
          option
            .setName("min")
            .setNameLocalizations({ "zh-TW": "最低" })
            .setDescription("最低等級")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("max")
            .setNameLocalizations({ "zh-TW": "最高" })
            .setDescription("最高等級")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("element")
        .setNameLocalizations({ "zh-TW": "屬性" })
        .setDescription("依屬性查詢")
        .setDescriptionLocalizations({ "zh-TW": "依屬性查詢" })
        .addStringOption((option) =>
          option
            .setName("type")
            .setNameLocalizations({ "zh-TW": "屬性" })
            .setDescription("屬性")
            .setRequired(true)
            .addChoices(
              ...["木", "水", "火", "無", "雷"].map((value) => ({
                name: value,
                value,
              })),
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName("min")
            .setNameLocalizations({ "zh-TW": "最低" })
            .setDescription("最低等級")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("max")
            .setNameLocalizations({ "zh-TW": "最高" })
            .setDescription("最高等級")
            .setRequired(false),
        ),
    ),
  execute: async (
    database: Sequelize,
    interaction: ChatInputCommandInteraction,
  ) => {
    const options = interaction.options as CommandInteractionOptionResolver;
    const subcommand = options.getSubcommand();
    if (subcommand === "search") return search(database, interaction);
    const min = options.getInteger("min") ?? 0;
    const max = options.getInteger("max") ?? 999;
    return filteredList(
      database,
      interaction,
      options.getString("type"),
      min,
      max,
    );
  },
};
export default command;
