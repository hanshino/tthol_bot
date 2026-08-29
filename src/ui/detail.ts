/**
 * 實體詳情卡：物品 / 怪物 / 技能。
 *
 * 版型固定為四段，讓三種實體看起來是同一套系統：
 *   標題（名稱 + badge + 縮圖）→ 數值 → 描述 → 導覽
 *
 * component 預算：Container 直接子最多 10，整則訊息最多 40。
 * 數值不管幾組都壓在 2 個 TextDisplay 內，所以子元素數量固定，
 * 不會因為某個物品欄位特別多就爆掉。
 */

import { ContainerBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";
import type { ItemDetail, ListEntry, MonsterDetail, Route, SkillDetail } from "../contracts";
import {
  addHeading,
  buttonRow,
  container,
  divider,
  entryRow,
  entrySelect,
  metaLine,
  pager,
  spacer,
  text,
} from "./components";
import { encodeRoute } from "./routes";
import {
  BUDGET,
  bold,
  clampSafe,
  code,
  colorOfElement,
  escapeInline,
  escapeText,
  h2,
  h3,
  LIMITS,
  packBlocks,
  palette,
  quote,
  renderGroups,
  subtext,
} from "./theme";

export interface DetailOptions {
  /** 用來鎖定互動只有發起者能按，A3 決定要不要帶 */
  ownerId?: string;
}

// ─── 關聯清單 ────────────────────────────────────────────────

/**
 * 關聯實體（掉落來源 / 掉落物）。
 * 少量用整列按鈕，看得到也按得到；量多改成一段文字清單 + 一個下拉，
 * 因為 10 個 Section 就要吃掉 30 個 component。
 *
 * 這裡不放「完整清單」按鈕：專屬 drops 分頁尚未實作，
 * route action "drops" 會被 router 導回同一張 detail，變成原地打轉的死按鈕。
 * 清單本身已經可點，先只留清單。
 */
function appendRelated(
  c: ContainerBuilder,
  title: string,
  entries: ListEntry[],
  selectId: string,
  placeholder: string,
  ownerId?: string
): void {
  if (entries.length === 0) return;

  c.addSeparatorComponents(divider());

  if (entries.length <= 3) {
    c.addTextDisplayComponents(text(h3(title)));
    for (const entry of entries) c.addSectionComponents(entryRow(entry, ownerId));
    return;
  }

  const shown = entries.slice(0, LIMITS.selectOption);
  const names = shown.map((e) => {
    const sub = e.subtitle ? ` ${escapeInline(e.subtitle)}` : "";
    return `・${escapeInline(e.title)}${sub}`;
  });

  // 沒有總數 contract，只能講「目前取得的筆數」，不聲稱是 DB 完整總數
  const heading =
    entries.length > shown.length
      ? `${title}（顯示前 ${shown.length} 筆）`
      : `${title}（${entries.length}）`;
  const more =
    entries.length > shown.length
      ? `\n${subtext(`另有 ${entries.length - shown.length} 筆未列出，可用搜尋指令查看`)}`
      : "";

  c.addTextDisplayComponents(text(`${h3(heading)}\n${subtext(names.join("\n"))}${more}`));
  c.addActionRowComponents(entrySelect(shown, selectId, placeholder, ownerId));
}

// ─── 物品 ────────────────────────────────────────────────────

export function buildItemDetail(item: ItemDetail, opts: DetailOptions = {}): ContainerBuilder {
  const { ownerId } = opts;
  const c = container(palette.primary);

  addHeading(
    c,
    [h2(escapeInline(item.name)), metaLine(item.typeLabel, item.level > 0 ? `Lv${item.level}` : null)],
    item.imageUrl ?? item.iconUrl
  );

  c.addSeparatorComponents(spacer());

  const blocks = [...renderGroups(item.groups)];

  if (item.randomAttributes.length > 0) {
    blocks.push(
      `${h3("隨機素質")}\n${item.randomAttributes.map((a) => `・${escapeInline(a)}`).join("\n")}`
    );
  }
  if (item.summary) blocks.push(quote(escapeText(item.summary)));
  if (item.note) blocks.push(subtext(escapeText(item.note)));

  for (const chunk of packBlocks(blocks)) c.addTextDisplayComponents(text(chunk));

  appendRelated(
    c,
    "掉落來源",
    item.dropFrom,
    `tthol:sel:item:${item.id}:from`,
    "選擇怪物查看詳情",
    ownerId
  );

  return c;
}

// ─── 怪物 ────────────────────────────────────────────────────

export function buildMonsterDetail(
  monster: MonsterDetail,
  opts: DetailOptions = {}
): ContainerBuilder {
  const { ownerId } = opts;
  const c = container(colorOfElement(monster.elemental));

  addHeading(
    c,
    [h2(escapeInline(monster.name)), metaLine(`Lv${monster.level}`, `${monster.elemental}屬`)],
    monster.iconUrl
  );

  c.addSeparatorComponents(spacer());

  for (const chunk of packBlocks(renderGroups(monster.groups))) {
    c.addTextDisplayComponents(text(chunk));
  }

  appendRelated(
    c,
    "掉落物",
    monster.drops,
    `tthol:sel:mon:${monster.id}:drop`,
    "選擇物品查看詳情",
    ownerId
  );

  return c;
}

// ─── 技能 ────────────────────────────────────────────────────

/**
 * 等級切換。5 級以內排成按鈕，一眼看得到現在在哪一級；
 * 更多就收進下拉，避免佔掉兩三列。
 */
function addLevelSwitcher(c: ContainerBuilder, skill: SkillDetail, ownerId?: string): void {
  const levels = skill.availableLevels;
  if (levels.length <= 1) return;

  c.addSeparatorComponents(divider());
  c.addTextDisplayComponents(text(subtext(`共 ${levels.length} 個等級`)));

  if (levels.length <= LIMITS.buttonsPerRow) {
    c.addActionRowComponents(
      buttonRow(
        levels.map((lv) => ({
          route: { kind: "skill" as const, id: skill.id, action: "detail" as const, level: lv },
          label: `Lv${lv}`,
          style: lv === skill.level ? ButtonStyle.Primary : ButtonStyle.Secondary,
        })),
        ownerId
      )
    );
    return;
  }

  c.addActionRowComponents(
    entrySelect(
      levels.slice(0, LIMITS.selectOption).map((lv) => ({
        id: skill.id,
        title: `Lv${lv}${lv === skill.level ? "（目前）" : ""}`,
        route: { kind: "skill" as const, id: skill.id, action: "detail" as const, level: lv },
      })),
      `tthol:sel:skl:${skill.id}:lv`,
      "切換技能等級",
      ownerId
    )
  );
}

export function buildSkillDetail(skill: SkillDetail, opts: DetailOptions = {}): ContainerBuilder {
  const { ownerId } = opts;
  const c = container(palette.plum);

  c.addTextDisplayComponents(
    text(
      `${h2(escapeInline(skill.name))}\n${metaLine(skill.clanLabel, `Lv${skill.level}`, skill.targetLabel)}`
    )
  );

  c.addSeparatorComponents(spacer());

  const blocks = renderGroups(skill.groups);
  if (skill.help) blocks.push(quote(escapeText(skill.help)));

  for (const chunk of packBlocks(blocks)) c.addTextDisplayComponents(text(chunk));

  addLevelSwitcher(c, skill, ownerId);

  return c;
}

// ─── 成就 ────────────────────────────────────────────────────

/** 成就一筆。與 contracts 的 AchievementEntry 同形，這裡不 import 以免綁死 */
export interface AchievementRow {
  id: number;
  name: string;
  description: string | null;
  points: number;
  isPeriodic: boolean;
  rewardLabel: string | null;
  rewardRoute: Route | null;
}

/**
 * 成就每頁筆數。
 * 10 筆是可讀性與 component 預算的平衡：每筆兩行（標題 + 描述），
 * 10 筆約 20 行，一個螢幕看得完，也不用捲很久。
 */
export const ACHIEVEMENT_PAGE_SIZE = 10;

/** 單筆成就描述的截斷長度。夠一句話，太長會把整頁撐開 */
const DESCRIPTION_MAX = 120;

export interface AchievementListOptions extends DetailOptions {
  /** 1-based。不給就當第 1 頁 */
  page?: number;
  /** 每頁筆數，預設 10 */
  pageSize?: number;
  /**
   * 全部成就總筆數。
   * entries 若已經是「當頁資料」，A1/A3 應該一併給 total；
   * 不給就退回 entries.length，此時視 entries 為完整資料由 UI 自己切頁。
   */
  total?: number;
  /** 分頁按鈕用的查詢識別。沒有就不產分頁器，只顯示當頁並提示還有更多 */
  pageToken?: string;
}

/**
 * 成就明細列表。
 *
 * 兩種餵法都支援：
 *   A. entries 已是當頁資料 → 一併給 total，UI 直接用
 *   B. entries 是完整資料   → UI 依 page/pageSize 自己切
 * 判斷依據是 entries.length 有沒有超過 pageSize。
 *
 * 不再把全部筆數合成一大塊再 clamp：257 筆那樣做會截掉九成內容，
 * 而且使用者永遠看不到後面的資料。
 */
export function buildAchievementList(
  title: string,
  entries: AchievementRow[],
  opts: AchievementListOptions = {}
): ContainerBuilder {
  const {
    ownerId,
    page = 1,
    pageSize = ACHIEVEMENT_PAGE_SIZE,
    total,
    pageToken,
  } = opts;

  const grandTotal = total ?? entries.length;
  const totalPages = Math.max(1, Math.ceil(grandTotal / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);

  // entries 超過一頁的量，代表呼叫端給的是完整資料，UI 自己切
  const pageRows =
    entries.length > pageSize ? entries.slice((current - 1) * pageSize, current * pageSize) : entries;

  const c = container(palette.celadon);
  const pagePoints = pageRows.reduce((sum, e) => sum + e.points, 0);

  c.addTextDisplayComponents(
    text(
      `${h2(escapeInline(title))}\n${metaLine(
        `共 ${grandTotal} 個成就`,
        totalPages > 1 ? `第 ${current} / ${totalPages} 頁` : null,
        `本頁 ${pagePoints} 點`
      )}`
    )
  );
  c.addSeparatorComponents(spacer());

  if (pageRows.length === 0) {
    c.addTextDisplayComponents(text(subtext("這一頁沒有資料")));
    return c;
  }

  const lines = pageRows.map((e) => {
    const head = `${bold(escapeInline(e.name))} ${code(`${e.points}點`)}${
      e.isPeriodic ? " 〔週期〕" : ""
    }`;
    const desc = e.description ? clampSafe(escapeInline(e.description), DESCRIPTION_MAX) : null;
    const detail = [desc, e.rewardLabel ? `獎勵：${escapeInline(e.rewardLabel)}` : null]
      .filter(Boolean)
      .join(" · ");
    return detail ? `${head}\n${subtext(detail)}` : head;
  });

  for (const chunk of packBlocks([lines.join("\n\n")])) c.addTextDisplayComponents(text(chunk));

  // 只放當頁有獎勵的成就，數量天然 ≤ pageSize，不會撞到 select 的 25 上限
  const rewards = pageRows.filter((e) => e.rewardRoute);
  if (rewards.length > 0) {
    c.addSeparatorComponents(divider());
    c.addActionRowComponents(
      entrySelect(
        rewards.map((e) => ({
          id: e.id,
          title: e.rewardLabel ?? e.name,
          subtitle: e.name,
          route: e.rewardRoute!,
        })),
        `tthol:sel:ach:reward:${current}`,
        "查看獎勵物品",
        ownerId
      )
    );
  }

  if (totalPages > 1) {
    c.addSeparatorComponents(divider());
    if (pageToken) {
      c.addActionRowComponents(pager({ token: pageToken, page: current, totalPages, ownerId }));
    } else {
      // 沒有 token 就沒辦法產生可用的分頁 customId，寧可不放按鈕也不放死按鈕
      c.addTextDisplayComponents(
        text(subtext(`還有 ${totalPages - 1} 頁未顯示，請用指令指定頁數查看`))
      );
    }
  }

  return c;
}

/** 讓 A3 在送出前自己驗一次的輔助（實際計數在 theme.countComponents） */
export const DETAIL_BUDGET = BUDGET;
export { encodeRoute };
