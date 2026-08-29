/**
 * 共用的小元件。各版型都從這裡取材，維持視覺一致。
 */

import {
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "@discordjs/builders";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { ListEntry, Route } from "../contracts";
import { buildPageRoute, encodeRoute, noopId } from "./routes";
import { clamp, escapeInline, joinMeta, LIMITS, subtext } from "./theme";

export const text = (content: string): TextDisplayBuilder =>
  new TextDisplayBuilder().setContent(content);

/** 細分隔線，用在同一主題內的區塊之間 */
export const divider = (): SeparatorBuilder =>
  new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

/** 只留空白不畫線，用在標題與內文之間 */
export const spacer = (): SeparatorBuilder =>
  new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);

/**
 * 標題區：文字 + 右側縮圖，直接掛到容器上。
 * 沒有圖時退回純 TextDisplay，因為 Section 一定要有 accessory。
 * Section 的 TextDisplay 限 1~3 個，這裡截到 3 行。
 */
export function addHeading(
  c: ContainerBuilder,
  lines: (string | null | undefined)[],
  iconUrl?: string | null
): ContainerBuilder {
  const body = lines.filter((l): l is string => Boolean(l)).slice(0, 3);
  if (body.length === 0) return c;

  if (!iconUrl) return c.addTextDisplayComponents(text(body.join("\n")));

  return c.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(...body.map((line) => text(line)))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl))
  );
}

/** 一列可點擊的清單項目：文字在左、前往按鈕在右。title/subtitle 是 DB 文字，要消毒 */
export function entryRow(entry: ListEntry, ownerId?: string, label = "查看"): SectionBuilder {
  const lines = [`**${escapeInline(entry.title)}**`];
  if (entry.subtitle) lines.push(subtext(escapeInline(entry.subtitle)));

  return new SectionBuilder()
    .addTextDisplayComponents(...lines.map((line) => text(line)))
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId(encodeRoute(entry.route, ownerId))
        .setLabel(clamp(label, LIMITS.buttonLabel))
        .setStyle(ButtonStyle.Secondary)
    );
}

/**
 * 把 ListEntry 收成一個下拉選單，一列容納 25 筆。
 * select 的 label/description 是純文字欄位，Discord 不解析 Markdown，
 * 所以這裡只需要壓成單行 + 截長度，不需要跳脫記號。
 */
export function entrySelect(
  entries: ListEntry[],
  customId: string,
  placeholder: string,
  ownerId?: string
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = entries.slice(0, LIMITS.selectOption).map((entry) => {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(clamp(entry.title.replace(/\s+/g, " ").trim() || "（無名稱）", LIMITS.selectLabel))
      .setValue(clamp(encodeRoute(entry.route, ownerId), LIMITS.customId));
    const desc = entry.subtitle?.replace(/\s+/g, " ").trim();
    if (desc) option.setDescription(clamp(desc, LIMITS.selectLabel));
    return option;
  });

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(clamp(customId, LIMITS.customId))
      .setPlaceholder(clamp(placeholder, LIMITS.selectLabel))
      .addOptions(options)
  );
}

/** 一列導覽按鈕，最多 5 顆 */
export function buttonRow(
  buttons: { route: Route; label: string; style?: ButtonStyle }[],
  ownerId?: string
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    buttons.slice(0, LIMITS.buttonsPerRow).map((b) =>
      new ButtonBuilder()
        .setCustomId(encodeRoute(b.route, ownerId))
        .setLabel(clamp(b.label, LIMITS.buttonLabel))
        .setStyle(b.style ?? ButtonStyle.Secondary)
    )
  );
}

export interface PagerOptions {
  /** 這次查詢的識別，由 A3 決定內容 */
  token: string;
  /** 1-based */
  page: number;
  totalPages: number;
  ownerId?: string;
}

/**
 * 分頁列：上一頁 / 頁碼 / 下一頁。
 * 頁碼做成停用按鈕當標籤，省一個 TextDisplay 又能對齊在同一列。
 */
export function pager({
  token,
  page,
  totalPages,
  ownerId,
}: PagerOptions): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildPageRoute(token, page - 1, ownerId))
      .setLabel("上一頁")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(noopId("page"))
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(buildPageRoute(token, page + 1, ownerId))
      .setLabel("下一頁")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages)
  );
}

/** 標題列的中繼資訊，例：`座騎 · Lv80` */
export const metaLine = (...parts: (string | null | undefined)[]): string =>
  subtext(joinMeta(...parts));

/** 建立容器並套上主色 */
export const container = (accent: number): ContainerBuilder =>
  new ContainerBuilder().setAccentColor(accent);
