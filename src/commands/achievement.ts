import {
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Sequelize } from "sequelize";
import { createAchievementRepo } from "../db/achievementRepo";
import {
  ACHIEVEMENT_PAGE_SIZE,
  buildAchievementList,
  buildCategoryIndex,
  failed,
  invalidInput,
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
    await interaction.reply(safe({ ...failed("查詢"), flags: MessageFlags.Ephemeral }));
    return;
  }
  await interaction.reply(safe({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  }));
};

const listAchievements = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const categories = await createAchievementRepo(database).categories();
  return replyContainer(interaction, buildCategoryIndex(categories, { ownerId: interaction.user.id }));
};

const searchAchievements = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const keyword = options.getString("keyword") ?? "";
  const entries = await createAchievementRepo(database).search(keyword);
  if (entries.length === 0) return interaction.reply(safe(notFound(keyword)));

  // 指令允許 20 字，20 個中文字＝60 bytes，超過 token 預算。
  // 丟錯不截斷（截斷會產生對不上的查詢），這裡轉成看得懂的提示。
  let pageToken: string;
  try {
    pageToken = encodePageToken({ kind: "achSearch", keyword });
  } catch (error) {
    console.error(error);
    return interaction.reply(safe(invalidInput((error as Error).message)));
  }

  // 自己切第一頁並給 total，避免 buildAchievementList 重複切頁
  return replyContainer(
    interaction,
    buildAchievementList(`搜尋「${keyword}」`, entries.slice(0, ACHIEVEMENT_PAGE_SIZE), {
      ownerId: interaction.user.id,
      page: 1,
      total: entries.length,
      pageToken,
    }),
  );
};

const execute = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  switch (options.getSubcommand()) {
    case "list": return listAchievements(database, interaction);
    case "search": return searchAchievements(database, interaction);
  }
};

const command = {
  name: "achievement",
  data: new SlashCommandBuilder()
    .setName("achievement")
    .setNameLocalizations({ "zh-TW": "成就" })
    .setDescription("查詢成就資訊")
    .setDescriptionLocalizations({ "zh-TW": "查詢成就資訊" })
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setNameLocalizations({ "zh-TW": "列表" })
        .setDescription("瀏覽成就分類")
        .setDescriptionLocalizations({ "zh-TW": "瀏覽成就分類" }),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setNameLocalizations({ "zh-TW": "查詢" })
        .setDescription("搜尋成就")
        .setDescriptionLocalizations({ "zh-TW": "搜尋成就" })
        .addStringOption((option) =>
          option
            .setName("keyword")
            .setNameLocalizations({ "zh-TW": "關鍵字" })
            .setDescription("關鍵字")
            .setDescriptionLocalizations({ "zh-TW": "關鍵字" })
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(15), // 45 bytes ÷ 中文每字 3 bytes
        ),
    ),
  execute,
};

export default command;
