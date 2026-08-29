/**
 * 搜尋結果清單與三層導覽。
 *
 * 清單的可點擊有兩種做法，這裡兩種都用，依筆數切換：
 *   ≤5 筆  → Section + Button，每列看得到副標題，一眼掃完直接點
 *   >5 筆  → 文字清單 + 一個 StringSelect，資訊照樣全列出，但只花 2 個 component
 *
 * 理由：25 筆全做 Section 需要 75 個 component，直接爆掉 40 的上限；
 * 就算沒有上限，25 顆按鈕在手機上也是滑不完的一片灰。
 * 反過來只有 3 筆卻要「先開下拉再選」則是多一次點擊，不划算。
 */

import { ContainerBuilder } from "@discordjs/builders";
import type { AchievementCategory, ListEntry, Route } from "../contracts";
import {
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
import { BUDGET, bold, code, escapeInline, h2, LIMITS, packBlocks, palette, subtext } from "./theme";

export interface ListOptions {
  /** 標題，例：搜尋「長劍」 */
  title: string;
  entries: ListEntry[];
  /** 分頁用的查詢識別，由 A3 決定內容；沒有就不顯示分頁 */
  token?: string;
  /** 1-based */
  page?: number;
  totalPages?: number;
  /** 總筆數，用來顯示「共 N 筆」 */
  total?: number;
  ownerId?: string;
  accent?: number;
  /** 下拉的 customId，需要時由 A3 指定 */
  selectId?: string;
}

/** 一頁最多幾筆。對齊 select 的 25 上限 */
export const PAGE_SIZE = LIMITS.selectOption;

export function buildResultList({
  title,
  entries,
  token,
  page = 1,
  totalPages = 1,
  total,
  ownerId,
  accent = palette.primary,
  selectId = "tthol:sel:list",
}: ListOptions): ContainerBuilder {
  const c = container(accent);
  const count = total ?? entries.length;

  c.addTextDisplayComponents(
    text(
      `${h2(escapeInline(title))}\n${metaLine(
        `共 ${count} 筆`,
        totalPages > 1 ? `第 ${page} / ${totalPages} 頁` : null
      )}`
    )
  );
  c.addSeparatorComponents(spacer());

  if (entries.length === 0) {
    c.addTextDisplayComponents(text(subtext("這一頁沒有資料")));
    return c;
  }

  if (entries.length <= BUDGET.inlineButtonMax) {
    for (const entry of entries) c.addSectionComponents(entryRow(entry, ownerId));
  } else {
    const shown = entries.slice(0, LIMITS.selectOption);
    const lines = shown.map((e, i) => {
      const index = code(String(i + 1).padStart(2, " "));
      return e.subtitle
        ? `${index} ${bold(escapeInline(e.title))}\n${subtext(`　　 ${escapeInline(e.subtitle)}`)}`
        : `${index} ${bold(escapeInline(e.title))}`;
    });
    for (const chunk of packBlocks([lines.join("\n")])) c.addTextDisplayComponents(text(chunk));
    c.addActionRowComponents(entrySelect(shown, selectId, "選擇項目查看詳情", ownerId));
  }

  if (token && totalPages > 1) {
    c.addSeparatorComponents(divider());
    c.addActionRowComponents(pager({ token, page, totalPages, ownerId }));
  }

  return c;
}

// ─── 三層導覽（成就）─────────────────────────────────────────

/** 第一層：所有分類。每個分類一列，顯示子分類數與總點數 */
export function buildCategoryIndex(
  categories: AchievementCategory[],
  opts: { ownerId?: string; selectId?: string } = {}
): ContainerBuilder {
  const { ownerId, selectId = "tthol:sel:ach:cat" } = opts;
  const c = container(palette.celadon);

  const totalAch = categories.reduce(
    (sum, cat) => sum + cat.subCats.reduce((s, sc) => s + sc.count, 0),
    0
  );
  const totalPoints = categories.reduce(
    (sum, cat) => sum + cat.subCats.reduce((s, sc) => s + sc.totalPoints, 0),
    0
  );

  c.addTextDisplayComponents(
    text(`${h2("成就")}\n${metaLine(`${categories.length} 個分類`, `${totalAch} 個成就`, `共 ${totalPoints} 點`)}`)
  );
  c.addSeparatorComponents(spacer());

  const entries: ListEntry[] = categories.slice(0, LIMITS.selectOption).map((cat) => {
    const count = cat.subCats.reduce((s, sc) => s + sc.count, 0);
    const points = cat.subCats.reduce((s, sc) => s + sc.totalPoints, 0);
    return {
      id: cat.id,
      title: cat.name,
      subtitle: `${cat.subCats.length} 個子分類 · ${count} 個成就 · ${points} 點`,
      route: { kind: "achievement", id: cat.id, action: "category" },
    };
  });

  if (entries.length <= BUDGET.inlineButtonMax) {
    for (const entry of entries) c.addSectionComponents(entryRow(entry, ownerId, "展開"));
  } else {
    const lines = entries.map(
      (e) => `${bold(escapeInline(e.title))}\n${subtext(`　${e.subtitle}`)}`
    );
    for (const chunk of packBlocks([lines.join("\n")])) c.addTextDisplayComponents(text(chunk));
    c.addActionRowComponents(entrySelect(entries, selectId, "選擇分類", ownerId));
  }

  return c;
}

/**
 * 第二層：單一分類下的子分類。
 *
 * backRoute 是選填。Route 目前只有 category/subcat 兩種 action，
 * 指回自己的 category id 會重畫同一頁，所以「沒有正確的上層 route 就不要放按鈕」——
 * 呼叫端只有在真的有第一層入口時才傳 backRoute。
 */
export function buildSubCategoryList(
  category: AchievementCategory,
  opts: { ownerId?: string; selectId?: string; backRoute?: Route } = {}
): ContainerBuilder {
  const { ownerId, selectId = `tthol:sel:ach:sub:${category.id}`, backRoute } = opts;
  const c = container(palette.celadon);

  const count = category.subCats.reduce((s, sc) => s + sc.count, 0);
  const points = category.subCats.reduce((s, sc) => s + sc.totalPoints, 0);

  c.addTextDisplayComponents(
    text(
      `${h2(escapeInline(category.name))}\n${metaLine(
        `${category.subCats.length} 個子分類`,
        `${count} 個成就`,
        `共 ${points} 點`
      )}`
    )
  );
  c.addSeparatorComponents(spacer());

  const entries: ListEntry[] = category.subCats.slice(0, LIMITS.selectOption).map((sc) => ({
    id: sc.id,
    title: sc.name,
    subtitle: `${sc.count} 個成就 · ${sc.totalPoints} 點`,
    route: { kind: "achievement", id: sc.id, action: "subcat" },
  }));

  if (entries.length === 0) {
    c.addTextDisplayComponents(text(subtext("這個分類底下沒有子分類")));
  } else if (entries.length <= BUDGET.inlineButtonMax) {
    for (const entry of entries) c.addSectionComponents(entryRow(entry, ownerId, "展開"));
  } else {
    const lines = entries.map(
      (e) => `${bold(escapeInline(e.title))}\n${subtext(`　${e.subtitle}`)}`
    );
    for (const chunk of packBlocks([lines.join("\n")])) c.addTextDisplayComponents(text(chunk));
    c.addActionRowComponents(entrySelect(entries, selectId, "選擇子分類", ownerId));
  }

  // 只有拿到真正指向上層的 route 才放返回按鈕
  if (backRoute && !(backRoute.kind === "achievement" && backRoute.id === category.id)) {
    c.addSeparatorComponents(divider());
    c.addActionRowComponents(buttonRow([{ route: backRoute, label: "返回分類" }], ownerId));
  }

  return c;
}
