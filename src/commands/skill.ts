import {
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Sequelize } from "sequelize";
import { createSkillRepo } from "../db/skillRepo";
import {
  buildResultList,
  buildSkillDetail,
  failed,
  notFound,
  validateMessage,
} from "../ui";
import { encodePageToken } from "../routing/customId";
const safe = (payload: object) => ({
  ...payload,
  allowedMentions: { parse: [] },
});
const replyContainer = async (
  interaction: ChatInputCommandInteraction,
  container: unknown,
) => {
  const problems = validateMessage(container);
  if (problems.length) {
    console.error("Invalid UI message:", problems);
    return interaction.reply(
      safe({ ...failed("查詢"), flags: MessageFlags.Ephemeral }),
    );
  }
  return interaction.reply(
    safe({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    }),
  );
};
const replyDetail = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
  id: number,
  level: number,
) => {
  const data = await createSkillRepo(database).getByIdLevel(id, level);
  if (!data) return interaction.reply(safe(notFound(`${id}:${level}`)));
  return replyContainer(
    interaction,
    buildSkillDetail(data, { ownerId: interaction.user.id }),
  );
};
const search = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const keyword = options.getString("keyword") ?? "";
  const repo = createSkillRepo(database);
  const selected = keyword.match(/^(\d+):(\d+)$/);
  if (selected) {
    return replyDetail(
      database,
      interaction,
      Number(selected[1]),
      Number(selected[2]),
    );
  }
  if (/^\d+$/.test(keyword)) {
    const levels: any[] = await repo.levels(Number(keyword));
    if (!levels[0]) return interaction.reply(safe(notFound(keyword)));
    return replyDetail(database, interaction, Number(keyword), Number(levels[0].level));
  }
  const requested = options.getInteger("level");
  const rows: any[] = await repo.search(keyword);
  if (!rows.length) return interaction.reply(safe(notFound(keyword)));
  // ponytail: 指定 level 時沿用既有行為，取搜尋結果第一個技能，避免擴大需求。
  if (requested !== null) {
    return replyDetail(database, interaction, Number(rows[0].id), requested);
  }
  if (rows.length === 1) {
    return replyDetail(database, interaction, Number(rows[0].id), Number(rows[0].level));
  }
  const totalPages = Math.ceil(rows.length / 25);
  const container = buildResultList({
    title: `搜尋「${keyword}」`,
    entries: rows.slice(0, 25).map((row) => ({
      id: Number(row.id),
      title: row.name,
      subtitle: `Lv${row.level}`,
      route: {
        kind: "skill" as const,
        id: Number(row.id),
        action: "detail" as const,
        level: Number(row.level),
      },
    })),
    token: encodePageToken({ kind: "skill", keyword }),
    page: 1,
    totalPages,
    total: rows.length,
    ownerId: interaction.user.id,
  });
  return replyContainer(interaction, container);
};
const command = {
  name: "skill",
  data: new SlashCommandBuilder()
    .setName("skill")
    .setNameLocalizations({ "zh-TW": "技能" })
    .setDescription("查詢技能資訊")
    .setDescriptionLocalizations({ "zh-TW": "查詢技能資訊" })
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setNameLocalizations({ "zh-TW": "查詢" })
        .setDescription("查詢技能資訊")
        .setDescriptionLocalizations({ "zh-TW": "查詢技能資訊" })
        .addStringOption((option) =>
          option
            .setName("keyword")
            .setNameLocalizations({ "zh-TW": "關鍵字" })
            .setDescription("關鍵字")
            .setDescriptionLocalizations({ "zh-TW": "關鍵字" })
            .setRequired(true)
            .setMaxLength(10)
            .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("level")
            .setNameLocalizations({ "zh-TW": "等級" })
            .setDescription("等級")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(80),
        ),
    ),
  execute: search,
};
export default command;
