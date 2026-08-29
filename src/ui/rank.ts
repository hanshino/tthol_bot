/**
 * 裝備排行與裝備比較。
 *
 * 兩者都是「資訊密度高、要橫向對齊」的畫面，所以主體都用等寬 code block，
 * 與 item/monster 詳情卡的數值區同一套語言（`### 標題` + ``` 表格）。
 * 點擊入口沿用 list.ts 的策略：筆數多就用 StringSelect，不逐列放按鈕。
 */

import { ContainerBuilder } from "@discordjs/builders";
import type { EquipStats, ListEntry } from "../contracts";
import { STAT_LABELS } from "../domain/stats";
import {
  container,
  divider,
  entrySelect,
  metaLine,
  spacer,
  text,
} from "./components";
import {
  bold,
  displayWidth,
  escapeInline,
  h2,
  LIMITS,
  padWidth,
  palette,
  subtext,
} from "./theme";

/** 排行的一列：EquipStats 加上 weighted.rank() 算出的分數 */
export type RankedEquip = EquipStats & { score: number };

/** 比較表要顯示的欄位。key 是 DB 欄位名 */
export interface StatColumn {
  key: string;
  label: string;
}

/**
 * 手機不橫向捲動的寬度上限。
 * 與 theme.statTable 的 42 同一個依據，這裡自己算是因為欄數不固定。
 */
const MAX_WIDTH = 42;

/** 前幾名要與其他人分開 */
const PODIUM = 3;

/** 以顯示格數靠右對齊（theme.padWidth 是靠左，這裡需要相反的） */
function padStartWidth(s: string, width: number): string {
  const pad = width - displayWidth(s);
  return pad > 0 ? " ".repeat(pad) + s : s;
}

/** 名稱在等寬表格裡要截到固定格數，超出用「…」收尾 */
function truncWidth(s: string, width: number): string {
  if (displayWidth(s) <= width) return s;
  let out = "";
  let w = 0;
  for (const ch of s) {
    const cw = displayWidth(ch);
    if (w + cw > width - 1) break;
    out += ch;
    w += cw;
  }
  return `${out}…`;
}

/**
 * code block 內的文字消毒。
 *
 * 這裡不能用 theme.escapeInline：``` 區塊裡 Discord 不解析 Markdown，
 * 反斜線會原樣顯示成 `\*\*名稱\*\*`，反而更難讀。
 * 真正會出事的只有 backtick（提早收掉區塊）與換行（打亂對齊），
 * 所以只處理這兩個。
 */
function codeSafe(raw: string): string {
  return raw.replace(/`/g, "ˋ").replace(/\s+/g, " ").trim();
}

// ─── 排行 ────────────────────────────────────────────────────

export interface RankListOptions {
  /** 鎖定互動只有發起者能按 */
  ownerId?: string;
  /** 流派名稱，例：爆刀。顯示在標題下方 */
  series?: string;
  /** 裝備類別，例：劍 */
  typeLabel?: string;
  /**
   * 額外顯示的數值欄位，通常帶該流派實際看重的那幾項。
   * 塞不下的欄位會自動從後面砍掉，不會擠爆版面。
   */
  columns?: StatColumn[];
  /** select 的 customId，預設 tthol:sel:rank */
  selectId?: string;
  accent?: number;
}

/**
 * 依寬度預算決定實際排幾個數值欄。
 * 名次 + 名稱 + 分數是必要的，剩下的格數才分給 columns。
 * 整欄都是 0 的欄位直接不排 —— 佔了寬度卻沒有資訊（例如衣服的排名靠防禦，
 * 帶進來的外功/技巧/命中全是 0）。
 */
function fitColumns(
  rows: RankedEquip[],
  columns: StatColumn[],
  nameWidth: number,
  rankWidth: number,
  scoreWidth: number
): { cols: StatColumn[]; widths: number[] } {
  const used = rankWidth + 2 + nameWidth + 2 + scoreWidth;
  const cols: StatColumn[] = [];
  const widths: number[] = [];
  let budget = MAX_WIDTH - used;

  for (const col of columns) {
    const values = rows.map((r) => r.stats[col.key] ?? 0);
    if (values.every((v) => v === 0)) continue;

    const valueWidth = Math.max(
      displayWidth(col.label),
      ...values.map((v) => displayWidth(String(v)))
    );
    const cost = 2 + valueWidth;
    if (cost > budget) break;
    cols.push(col);
    widths.push(valueWidth);
    budget -= cost;
  }
  return { cols, widths };
}

/**
 * 排行榜。
 *
 * 版面：等寬表格（名次｜名稱｜分數｜流派看重的數值），前三名下面畫一條線隔開，
 * 再用一個 StringSelect 當作點進詳情的入口。
 * 30 筆逐列放 Section 會用掉 90 個 component，這裡固定 7~8 個。
 */
export function buildRankList(
  title: string,
  rows: RankedEquip[],
  opts: RankListOptions = {}
): ContainerBuilder {
  const {
    ownerId,
    series,
    typeLabel,
    columns = [],
    selectId = "tthol:sel:rank",
    accent = palette.primary,
  } = opts;

  const c = container(accent);

  c.addTextDisplayComponents(
    text(`${h2(escapeInline(title))}\n${metaLine(typeLabel, series, `${rows.length} 件`)}`)
  );
  c.addSeparatorComponents(spacer());

  if (rows.length === 0) {
    c.addTextDisplayComponents(text(subtext("沒有符合條件的裝備")));
    return c;
  }

  // ── 欄寬 ──
  const rankWidth = displayWidth(String(rows.length));
  const scoreWidth = Math.max(
    displayWidth("分數"),
    ...rows.map((r) => displayWidth(String(r.score)))
  );
  const rawNameWidth = Math.max(...rows.map((r) => displayWidth(codeSafe(r.name))));
  // 名稱最多吃掉一半寬度，其餘留給數值
  const nameWidth = Math.min(rawNameWidth, Math.floor(MAX_WIDTH / 2));
  const { cols, widths } = fitColumns(rows, columns, nameWidth, rankWidth, scoreWidth);

  // ── 表頭 ──
  const header = [
    " ".repeat(rankWidth),
    padWidth("名稱", nameWidth),
    padStartWidth("分數", scoreWidth),
    ...cols.map((col, i) => padStartWidth(col.label, widths[i])),
  ].join("  ");

  const lines = rows.map((r, i) => {
    const cells = [
      padStartWidth(String(i + 1), rankWidth),
      padWidth(truncWidth(codeSafe(r.name), nameWidth), nameWidth),
      padStartWidth(String(r.score), scoreWidth),
      ...cols.map((col, ci) => padStartWidth(String(r.stats[col.key] ?? 0), widths[ci])),
    ];
    return cells.join("  ").trimEnd();
  });

  // 前三名與其餘之間畫一條線。純排版符號，不用表情符號
  const rule = "─".repeat(
    Math.min(Math.max(displayWidth(header), ...lines.map((l) => displayWidth(l))), MAX_WIDTH)
  );
  const body: string[] = [header, rule];
  lines.forEach((line, i) => {
    if (i === PODIUM && lines.length > PODIUM) body.push(rule);
    body.push(line);
  });

  c.addTextDisplayComponents(text(`\`\`\`\n${body.join("\n")}\n\`\`\``));

  // ── 點進詳情 ──
  const shown = rows.slice(0, LIMITS.selectOption);
  const entries: ListEntry[] = shown.map((r, i) => ({
    id: r.id,
    title: `${i + 1}. ${r.name}`,
    subtitle: `${r.score} 分 · Lv${r.stats.base_lv ?? 0}`,
    route: { kind: "item", id: r.id, action: "detail" },
  }));

  c.addSeparatorComponents(divider());
  c.addActionRowComponents(entrySelect(entries, selectId, "選擇裝備查看詳情", ownerId));

  if (rows.length > shown.length) {
    c.addTextDisplayComponents(
      text(subtext(`選單只能列 ${LIMITS.selectOption} 項，第 ${shown.length + 1} 名之後請用搜尋查看`))
    );
  }

  return c;
}

// ─── 比較 ────────────────────────────────────────────────────

export interface CompareOptions {
  ownerId?: string;
  /** 標題，預設「裝備比較」 */
  title?: string;
  /** 要比對的欄位順序，預設用 STAT_LABELS 的順序 */
  keys?: string[];
  selectId?: string;
  accent?: number;
}

/** 表頭用的代號，名稱太長塞不進欄位，改用代號 + 上方對照 */
const MARKS = ["A", "B", "C"] as const;

/**
 * 要合併成區間的欄位組。
 *
 * 武器的 str/atk 常常是 0，實際威力全在 damage_min~damage_max，
 * 拆成四列既佔版面又看不出區間。這裡併成一列顯示。
 *
 * ponytail: 不 import domain/stats 的 formatRange，UI 不該依賴 domain；
 * 格式邏輯很短，對齊行為即可。
 */
const RANGE_ROWS: { label: string; min: string; max: string }[] = [
  { label: "傷害", min: "damage_min", max: "damage_max" },
  { label: "內勁傷害", min: "pdamage_min", max: "pdamage_max" },
];

/** 比較表的一列：顯示字串與排序用數值分開 */
interface CompareRow {
  label: string;
  /** 實際印出來的字串，區間是 `1360~1396` */
  display: string[];
  /** 標記「誰最高」用的數值，區間取上限 */
  compare: number[];
}

/**
 * 區間格式。對齊 domain/stats.ts 的 formatRange：
 * 兩端相同只印一個數字，否則 `min~max`。
 * 其中一端是 0（資料只填了一半）就只印有值的那個，不要印出 `1360~0`。
 */
function formatSpan(min: number, max: number): string {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (hi === 0) return "0";
  if (lo === 0 || lo === hi) return String(hi);
  return `${lo}~${hi}`;
}

/**
 * 裝備比較（2~3 件）。
 *
 * 版面：上方一行代號對照（A/B/C ↔ 名稱），下方等寬表格逐項對照。
 * 名稱普遍 4~6 字（8~12 格），直接當欄位標題會擠爆手機寬度，所以改用代號。
 * 每列最高的值標一個「*」，一眼看得出誰贏；全部一樣的列不標，避免整片星號。
 */
export function buildCompare(items: EquipStats[], opts: CompareOptions = {}): ContainerBuilder {
  const {
    ownerId,
    title = "裝備比較",
    keys = Object.keys(STAT_LABELS),
    selectId = "tthol:sel:cmp",
    accent = palette.indigo,
  } = opts;

  const picked = items.slice(0, MARKS.length);
  const c = container(accent);

  c.addTextDisplayComponents(
    text(
      `${h2(escapeInline(title))}\n${metaLine(
        picked[0]?.typeLabel,
        `${picked.length} 件`
      )}`
    )
  );
  c.addSeparatorComponents(spacer());

  if (picked.length < 2) {
    c.addTextDisplayComponents(text(subtext("至少要兩件裝備才能比較")));
    return c;
  }

  // ── 代號對照 ──
  c.addTextDisplayComponents(
    text(
      picked
        .map((it, i) => `${bold(MARKS[i])} ${escapeInline(it.name)}`)
        .join(" · ")
    )
  );

  // ── 組列：一般欄位逐列，min/max 併成區間列 ──
  // 區間列插在它第一個出現的成員欄位位置，維持呼叫端給的欄位順序。
  // 不假設 min 一定排在 max 前面，兩者哪個先出現都只產生一列。
  const rows: CompareRow[] = [];
  const emitted = new Set<string>();

  for (const key of keys) {
    const span = RANGE_ROWS.find((r) => r.min === key || r.max === key);
    if (span) {
      if (emitted.has(span.label)) continue;
      emitted.add(span.label);

      const mins = picked.map((it) => it.stats[span.min] ?? 0);
      const maxs = picked.map((it) => it.stats[span.max] ?? 0);
      rows.push({
        label: span.label,
        display: mins.map((lo, i) => formatSpan(lo, maxs[i])),
        // 以上限當比較基準：區間的天花板是玩家最在意的數字
        compare: maxs.map((hi, i) => Math.max(hi, mins[i])),
      });
      continue;
    }

    const values = picked.map((it) => it.stats[key] ?? 0);
    rows.push({
      label: STAT_LABELS[key] ?? key,
      display: values.map(String),
      compare: values,
    });
  }

  // ── 只留至少一件不為 0 的欄位 ──
  const shown = rows.filter((r) => r.compare.some((v) => v !== 0));

  if (shown.length === 0) {
    c.addTextDisplayComponents(text(subtext("這幾件裝備沒有可比較的數值")));
    return c;
  }

  const labelWidth = Math.max(...shown.map((r) => displayWidth(r.label)));

  /**
   * 欄間距與區間格式一起決定，目標是整張表不超過 MAX_WIDTH。
   *
   * 三段降級（先讓步排版，最後才讓步資訊）：
   *   1. 欄間距 2 格 → 1 格
   *   2. 區間只印上限（`1360~1396` → `1396`），下限資訊在詳情卡看得到
   * 現行資料是四位數，走不到第 2 段；留著是因為改版加數值是常態。
   */
  const widthOf = (disp: string[][], gapSize: number): number => {
    const vw = Math.max(1, ...disp.flat().map((v) => displayWidth(v)));
    return labelWidth + (gapSize + vw + 1) * picked.length;
  };

  const full = shown.map((r) => r.display);
  const capped = shown.map((r, i) =>
    r.display.map((v, j) => (v.includes("~") ? String(shown[i].compare[j]) : v))
  );

  let display = full;
  let gap = "  ";
  if (widthOf(full, 2) > MAX_WIDTH) {
    gap = " ";
    if (widthOf(full, 1) > MAX_WIDTH) display = capped;
  }
  const capping = display === capped;

  // 值欄寬 = 最寬的顯示字串（區間比一般數值寬），再加一格給「*」標記
  const valueWidth = Math.max(1, ...display.flat().map((v) => displayWidth(v)));

  // 表頭的代號對齊數字欄（不含標記那一格），不然 A/B/C 會偏右一格
  const header = [
    " ".repeat(labelWidth),
    ...picked.map((_, i) => `${padStartWidth(MARKS[i], valueWidth)} `),
  ]
    .join(gap)
    .trimEnd();

  let marked = false;
  const body = shown.map((r, ri) => {
    const max = Math.max(...r.compare);
    // 全部一樣就不標，標了也沒有資訊量
    const mark = r.compare.some((v) => v !== max);
    if (mark) marked = true;
    const cells = display[ri].map((v, i) => {
      const cell = padStartWidth(v, valueWidth);
      return `${cell}${mark && r.compare[i] === max ? "*" : " "}`;
    });
    return [padWidth(r.label, labelWidth), ...cells].join(gap).trimEnd();
  });

  const width = Math.min(
    Math.max(displayWidth(header), ...body.map((l) => displayWidth(l))),
    MAX_WIDTH
  );
  c.addTextDisplayComponents(
    text(`\`\`\`\n${header}\n${"─".repeat(width)}\n${body.join("\n")}\n\`\`\``)
  );

  const legend = [
    marked ? "「*」為該項最高" : null,
    capping ? "傷害欄寬度不足，只顯示上限" : null,
  ].filter(Boolean);
  if (legend.length > 0) c.addTextDisplayComponents(text(subtext(legend.join(" · "))));

  // ── 點進單件詳情 ──
  const entries: ListEntry[] = picked.map((it, i) => ({
    id: it.id,
    title: `${MARKS[i]} ${it.name}`,
    subtitle: it.typeLabel,
    route: { kind: "item", id: it.id, action: "detail" },
  }));

  c.addSeparatorComponents(divider());
  c.addActionRowComponents(entrySelect(entries, selectId, "選擇裝備查看詳情", ownerId));

  return c;
}
