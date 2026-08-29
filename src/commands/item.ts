import {
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Sequelize } from "sequelize";
import type { EquipStats } from "../contracts";
import { createItemRepo, EQUIPPABLE_TYPES } from "../db/itemRepo";
import { itemType, itemTypeLabels } from "../domain/enums";
import { STAT_LABELS } from "../domain/stats";
import { rank } from "../domain/weighted";
import {
  buildCompare,
  buildItemDetail,
  buildRankList,
  buildResultList,
  failed,
  invalidInput,
  notFound,
  validateMessage,
  type NoticePayload,
  type RankedEquip,
  type StatColumn,
} from "../ui";
import { encodePageToken } from "../routing/customId";

const safe = (payload: object) => ({ ...payload, allowedMentions: { parse: [] } });

/**
 * 短訊息。已經 deferReply 的互動只能 editReply，而 editReply 不能改
 * ephemeral（那是 defer 當下決定的），所以這時只送 content。
 */
const replyNotice = async (
  interaction: ChatInputCommandInteraction,
  payload: NoticePayload,
) => {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(safe({ content: payload.content }));
  }
  return interaction.reply(safe(payload));
};

const replyContainer = async (
  interaction: ChatInputCommandInteraction,
  container: unknown,
) => {
  const problems = validateMessage(container);
  if (problems.length) {
    console.error("Invalid UI message:", problems);
    return replyNotice(interaction, failed("查詢"));
  }
  const payload = safe({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
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

// ─── 排行 ────────────────────────────────────────────────────

/**
 * 可排行的裝備類別。與 repo 的 EQUIPPABLE_TYPES 同一份來源，
 * 「什麼算裝備」只定義在 itemRepo，這裡只負責配上中文名當 choices。
 */
const RANKABLE_TYPES = EQUIPPABLE_TYPES;

/**
 * 每個流派要顯示的欄位，依 weighted.ts 的 WEIGHTS 權重由大到小排。
 * 順序有意義：buildRankList 塞不下時是從後面砍，權重大的要排前面。
 * WEIGHTS 是 weighted.ts 的模組私有常數，改那邊要同步改這裡。
 */
const SERIES_COLUMNS: Record<string, string[]> = {
  "純玄系列": ["wis", "dex", "hit", "extra_def", "magic_def"],
  "純外系列": ["str", "dex", "atk", "hit", "extra_def", "magic_def"],
  "純內系列": ["pow", "dex", "matk", "hit", "extra_def", "magic_def"],
  "玄內系列": ["wis", "pow", "dex", "matk", "hit", "extra_def", "magic_def"],
  "玄外系列": ["wis", "str", "dex", "atk", "hit", "extra_def", "magic_def"],
  "爆刀": ["agi", "str", "critical_hit", "extra_def", "magic_def"],
  "手甲": ["dex", "atk", "hit"],
};

const SERIES = Object.keys(SERIES_COLUMNS);

const columnsOf = (series: string): StatColumn[] =>
  (SERIES_COLUMNS[series] ?? []).map((key) => ({ key, label: STAT_LABELS[key] ?? key }));

/**
 * weighted.rank() 是拿 `r.typeLabel === type` 比對的，而 typeLabel 來自
 * itemType(type_name, equip_slot) —— 飾品會依 slot 變成「左飾/中飾/右飾」，
 * 沒有一列的 typeLabel 會等於 itemTypeLabels.ORNAMENT（「飾品」），
 * 直接傳進去會靜默回 0 筆（實測 79 件全被濾掉）。
 *
 * 這裡改成以「這批資料實際出現的 typeLabel」逐一排名再合併：
 * 同一個 type_name 底下權重表相同，分數本來就可比，合併後重排即可。
 * 單一 label 的類別（劍、座騎…）行為與直接呼叫 rank() 一模一樣。
 */
const rankRows = (rows: EquipStats[], series: string): RankedEquip[] =>
  [...new Set(rows.map((row) => row.typeLabel))]
    .flatMap((label) => rank(rows, series, label))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

const rankItems = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const type = options.getString("type") ?? "";
  const series = options.getString("series") ?? "";
  const typeLabel = itemTypeLabels[type] ?? type;

  // equipStats 要撈整個類別（座騎 238 筆）再查一次圖片，先 defer 保住 3 秒視窗
  await interaction.deferReply();

  const rows = await createItemRepo(database).equipStats(type);
  const ranked = rankRows(rows, series);
  if (ranked.length === 0) {
    return replyNotice(
      interaction,
      notFound(`${typeLabel}・${series}`, "這個類別在該流派沒有加分的裝備，換個流派試試。"),
    );
  }

  return replyContainer(
    interaction,
    buildRankList(`${typeLabel}排行`, ranked, {
      ownerId: interaction.user.id,
      series,
      typeLabel,
      columns: columnsOf(series),
    }),
  );
};

// ─── 比較 ────────────────────────────────────────────────────

/**
 * 把一個參數解成 item id。
 * autocomplete 送回來的是 String(id)，但使用者也可以不選直接打字，
 * 那就退回關鍵字搜尋取第一筆。
 */
const resolveItemId = async (
  database: Sequelize,
  input: string,
): Promise<number | null> => {
  if (/^\d+$/.test(input)) return Number(input);
  const rows: any[] = await createItemRepo(database).search(input);
  return rows.length ? Number(rows[0].id) : null;
};

const compareItems = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const inputs = ["item1", "item2", "item3"]
    .map((name) => ({ name, value: options.getString(name)?.trim() ?? "" }))
    .filter((x) => x.value);

  const labels: Record<string, string> = {
    item1: "裝備一", item2: "裝備二", item3: "裝備三",
  };

  await interaction.deferReply();

  const repo = createItemRepo(database);
  const ids: number[] = [];
  for (const { name, value } of inputs) {
    const id = await resolveItemId(database, value);
    if (id === null) return replyNotice(interaction, notFound(`${labels[name]}：${value}`));
    ids.push(id);
  }

  // 同一件不能比兩次：buildCompare 的下拉會產生兩個相同 value 的選項，Discord 會拒收
  if (new Set(ids).size !== ids.length) {
    return replyNotice(interaction, invalidInput("同一件裝備不能重複比較，請換一件。"));
  }

  // statsByIds 只回玩家裝備，查不到的可能是「不存在」也可能是「不是裝備」，
  // 兩者要給不同訊息：autocomplete 會建議藥水、寵物飾品，使用者選了不該只說「找不到」
  const found = new Map((await repo.statsByIds(ids)).map((row) => [row.id, row]));
  const missingIndex = ids.findIndex((id) => !found.has(id));
  if (missingIndex >= 0) {
    const { name, value } = inputs[missingIndex];
    const detail = await repo.getById(ids[missingIndex]);
    if (!detail) return replyNotice(interaction, notFound(`${labels[name]}：${value}`));
    return replyNotice(
      interaction,
      invalidInput(
        `${labels[name]}「${detail.name}」是${detail.typeLabel}，不是角色裝備，無法比較。` +
        "比較功能只支援武器、防具與座騎／背飾／飾品。",
      ),
    );
  }

  // 保持使用者給的順序，A/B/C 才對得上輸入
  const picked = ids.map((id) => found.get(id)!);
  return replyContainer(
    interaction,
    buildCompare(picked, { ownerId: interaction.user.id }),
  );
};

// ─── 篩選 ────────────────────────────────────────────────────

/**
 * 可篩選的屬性。value 是 DB 欄位名，必須落在 ATTRIBUTE_QUERY_KEYS
 * （= STAT_KEYS）裡，否則 byAttribute 會 throw。
 * 不放 damage_min/max 這種區間欄位，單邊門檻沒有意義；base_lv 也不在白名單。
 */
const FILTER_ATTRIBUTES = [
  "str", "pow", "wis", "dex", "agi", "vit", "hp", "mp", "atk", "matk",
  "extra_def", "magic_def", "critical_hit", "hit", "dodge", "uncanny_dodge",
  "attack_speed", "walk_speed", "fire_def", "water_def", "lightning_def", "wood_def",
];

const filterItems = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  const attribute = options.getString("attribute") ?? "";
  const minimum = options.getInteger("minimum") ?? 1;
  const label = STAT_LABELS[attribute] ?? attribute;

  await interaction.deferReply();

  let rows: any[];
  try {
    rows = await createItemRepo(database).byAttribute(attribute, minimum);
  } catch (error) {
    // addChoices 已經限死 value，走到這裡代表白名單與 choice 脫節
    console.error("byAttribute failed:", error);
    return replyNotice(interaction, failed("查詢"));
  }

  if (!rows.length) return replyNotice(interaction, notFound(`${label} ≥ ${minimum}`));

  // 分頁 token 只編得下關鍵字，帶不了「屬性 + 門檻」，所以照 /monster level
  // 的做法不放分頁，只出前 25 筆並在標題講清楚總數
  const total = rows.length;
  const title = total > 25
    ? `${label} ≥ ${minimum}（共 ${total} 筆，顯示前 25 筆）`
    : `${label} ≥ ${minimum}`;

  return replyContainer(
    interaction,
    buildResultList({
      title,
      entries: rows.slice(0, 25).map((row) => ({
        id: Number(row.id),
        title: row.name,
        subtitle: [
          itemType(row.type_name, row.equip_slot),
          row.base_lv > 0 ? `Lv${row.base_lv}` : null,
          row.isExtra ? "外裝" : null,
        ]
          .filter(Boolean)
          .join("・"),
        route: { kind: "item" as const, id: Number(row.id), action: "detail" as const },
      })),
      total,
      ownerId: interaction.user.id,
    }),
  );
};

const execution = async (
  database: Sequelize,
  interaction: ChatInputCommandInteraction,
) => {
  const options = interaction.options as CommandInteractionOptionResolver;
  switch (options.getSubcommand()) {
    case "search": return searchItem(database, interaction);
    case "rank": return rankItems(database, interaction);
    case "compare": return compareItems(database, interaction);
    case "filter": return filterItems(database, interaction);
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
        .setName("rank")
        .setNameLocalizations({ "zh-TW": "排行" })
        .setDescription("依流派排出裝備排行")
        .setDescriptionLocalizations({ "zh-TW": "依流派排出裝備排行" })
        .addStringOption((option) =>
          option
            .setName("type")
            .setNameLocalizations({ "zh-TW": "類別" })
            .setDescription("裝備類別")
            .setDescriptionLocalizations({ "zh-TW": "裝備類別" })
            .setRequired(true)
            .addChoices(
              ...RANKABLE_TYPES.map((value) => ({
                name: itemTypeLabels[value] ?? value,
                value,
              })),
            ),
        )
        .addStringOption((option) =>
          option
            .setName("series")
            .setNameLocalizations({ "zh-TW": "流派" })
            .setDescription("流派")
            .setDescriptionLocalizations({ "zh-TW": "流派" })
            .setRequired(true)
            .addChoices(...SERIES.map((value) => ({ name: value, value }))),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("compare")
        .setNameLocalizations({ "zh-TW": "比較" })
        .setDescription("比較 2~3 件裝備的數值")
        .setDescriptionLocalizations({ "zh-TW": "比較 2~3 件裝備的數值" })
        .addStringOption((option) =>
          option
            .setName("item1")
            .setNameLocalizations({ "zh-TW": "裝備一" })
            .setDescription("第一件裝備")
            .setDescriptionLocalizations({ "zh-TW": "第一件裝備" })
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(30)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("item2")
            .setNameLocalizations({ "zh-TW": "裝備二" })
            .setDescription("第二件裝備")
            .setDescriptionLocalizations({ "zh-TW": "第二件裝備" })
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(30)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("item3")
            .setNameLocalizations({ "zh-TW": "裝備三" })
            .setDescription("第三件裝備（選填）")
            .setDescriptionLocalizations({ "zh-TW": "第三件裝備（選填）" })
            .setRequired(false)
            .setMinLength(1)
            .setMaxLength(30)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("filter")
        .setNameLocalizations({ "zh-TW": "篩選" })
        .setDescription("依屬性門檻篩選裝備")
        .setDescriptionLocalizations({ "zh-TW": "依屬性門檻篩選裝備" })
        .addStringOption((option) =>
          option
            .setName("attribute")
            .setNameLocalizations({ "zh-TW": "屬性" })
            .setDescription("屬性")
            .setDescriptionLocalizations({ "zh-TW": "屬性" })
            .setRequired(true)
            .addChoices(
              ...FILTER_ATTRIBUTES.map((value) => ({
                name: STAT_LABELS[value] ?? value,
                value,
              })),
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName("minimum")
            .setNameLocalizations({ "zh-TW": "最低值" })
            .setDescription("最低值")
            .setDescriptionLocalizations({ "zh-TW": "最低值" })
            .setRequired(true)
            .setMinValue(1),
        ),
    ),
  execute: execution,
};

export default command;
