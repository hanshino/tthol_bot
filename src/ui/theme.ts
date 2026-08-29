/**
 * UI 設計語彙：配色、Markdown 層級、等寬對齊。
 *
 * Discord 沒有 CSS，能用的只有 Container accent color 與 Markdown。
 * 這裡把姊妹專案（LINE bot / genbu）的武俠 palette 對應到這兩種手段。
 */

import type { StatGroup, StatRow } from "../contracts";

// ─── 配色 ────────────────────────────────────────────────────

/** 與 LINE bot / genbu 共用的武俠色票 */
export const palette = {
  /** 朱紅：主標題、重要強調、負向差異 */
  primary: 0xb6322d,
  /** 青瓷綠：正向差異、速度命中類 */
  celadon: 0x54967a,
  /** 靛藍：MP、次要分類 */
  indigo: 0x2c6194,
  /** 紫：特殊數值、流派標記 */
  plum: 0x744c7d,
  ink: 0x171b22,
  muted: 0x585e68,
} as const;

/** 怪物元素色。elemental 由 A1 正規化過（電→雷） */
export const elementColor: Record<string, number> = {
  火: palette.primary,
  水: palette.indigo,
  雷: palette.plum,
  木: palette.celadon,
  無: palette.muted,
};

export function colorOfElement(elemental: string): number {
  return elementColor[elemental] ?? palette.muted;
}

// ─── Discord 硬限制 ──────────────────────────────────────────

export const LIMITS = {
  /** 一則訊息的 component 總數 */
  message: 40,
  /** Container 直接子 component */
  containerChildren: 10,
  /**
   * TextDisplay content 字元數。
   * 依 @discordjs/builders 的 textDisplayContentPredicate（dist/index.js:2483）：
   * lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(4e3)
   */
  textDisplay: 4000,
  /** TextDisplay 不接受空字串 */
  textDisplayMin: 1,
  customId: 100,
  buttonLabel: 80,
  selectOption: 25,
  selectLabel: 100,
  buttonsPerRow: 5,
} as const;

/** 留安全邊際，避免正好踩線 */
export const BUDGET = {
  /** 詳情卡內文最多切成幾個 TextDisplay */
  bodyChunks: 2,
  /** 清單超過這個數量就改用 select，否則用 Section + Button */
  inlineButtonMax: 5,
} as const;

// ─── Markdown 層級 ───────────────────────────────────────────
//
// 只有四個層級可用，對應到 palette 的角色：
//   ##        → 主標題（朱紅的位置，配合 accent color）
//   ###       → 分組標題
//   **粗體**  → 強調
//   `code`    → 數值（等寬 + 淺底，等同 card 表面）
//   -# subtext→ 次要資訊（muted #585e68）
//   > quote   → 描述（左側細線，等同 border #dbd7cf）

export const h2 = (s: string): string => `## ${s}`;
export const h3 = (s: string): string => `### ${s}`;
export const bold = (s: string): string => `**${s}**`;
export const code = (s: string): string => `\`${s}\``;

/** 次要文字，Discord 會縮小並轉灰 */
export const subtext = (s: string): string =>
  s
    .split("\n")
    .map((line) => `-# ${line}`)
    .join("\n");

/** 引用區塊，用來放描述 */
export const quote = (s: string): string =>
  s
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

/** 用「·」串接次要資訊，空值自動略過 */
export const joinMeta = (...parts: (string | null | undefined)[]): string =>
  parts.filter((p): p is string => Boolean(p && p.trim())).join(" · ");

// ─── DB 文字消毒 ─────────────────────────────────────────────
//
// 只用在「不可信的 DB 文字」：名稱、描述、summary、note、清單標題副標題。
// 我們自己產生的 Markdown（## 標題、-# subtext、``` 表格）不會經過這裡，
// 否則層級就沒了。

/**
 * 中和 DB 文字裡會破壞版面的 Markdown 記號。
 *
 * 處理三類：
 *   1. 行首的 heading / quote / list 記號（`#`、`>`、`-#`）→ 前面插零寬空格，
 *      讓 Discord 不當成區塊語法，但視覺上還看得到原字元。
 *   2. inline 記號（` * _ ~ |）→ 反斜線跳脫。backtick 尤其重要，
 *      一個落單的 ` 會把後面整段吃進 code span，三個會開 code block。
 *   3. 換行正規化，避免 \r 造成的怪排版。
 *
 * mention 不在這裡處理：routing 已經設 allowedMentions，
 * 在 UI 再跳脫一次會讓 @everyone 這種正常字串顯示成 @\everyone。
 */
export function escapeText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/([`*_~|\\])/g, "\\$1")
    .split("\n")
    .map((line) => line.replace(/^(\s*)([#>\-+*]|\d+\.)/, "$1\u200b$2"))
    .join("\n");
}

/** escapeText + 壓成單行，用在 select label / button label 這種不能換行的地方 */
export function escapeInline(raw: string | null | undefined): string {
  return escapeText(raw).replace(/\n+/g, " ").trim();
}

// ─── 字元寬度（中文對齊的關鍵）──────────────────────────────

/**
 * 全形字在等寬字體佔兩格，用 String.length 對齊會歪。
 * ponytail: 只涵蓋 CJK 常用區段，夠中文標籤用；要完整 East Asian Width 再換表。
 */
function charWidth(cp: number): number {
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

/** 以顯示格數計算字串寬度 */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += charWidth(ch.codePointAt(0)!);
  return w;
}

/** 以顯示格數補空白至指定寬度 */
export function padWidth(s: string, width: number): string {
  const pad = width - displayWidth(s);
  return pad > 0 ? s + " ".repeat(pad) : s;
}

/** 截斷到 Discord 的字元上限，超出時補「…」 */
export function clamp(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/**
 * 安全截斷：不會把 Markdown 記號切成一半。
 *
 * 四個要避開的切點：
 *   1. 落單的反斜線（`\` 跟它跳脫的字元被切開）→ 退掉那個反斜線
 *   2. 切在記號中間（`**` 被切成 `*`、``` 被切成 ``）→ 退掉整串記號
 *   3. 未閉合的 code fence / code span → 補上收尾，避免吃掉後面內容
 *   4. 切在行中間 → 優先退到最近的換行，讀起來完整
 */
export function clampSafe(s: string, max: number): string {
  if (s.length <= max) return s;

  const ellipsis = "…";
  let cut = s.slice(0, max - ellipsis.length);

  // 1. 尾端連續反斜線若為奇數，代表最後一個正在跳脫被切掉的字元
  const trailing = /\\+$/.exec(cut);
  if (trailing && trailing[0].length % 2 === 1) cut = cut.slice(0, -1);

  // 2. 切點正好落在同一種記號的連續串中間，整串退掉
  const last = cut.at(-1);
  if (last && "`*_~".includes(last) && s[cut.length] === last) {
    cut = cut.replace(new RegExp(`\\${last}+$`), "");
  }

  // 4. 退到最近的換行，但不要退掉超過四分之一內容
  const lastBreak = cut.lastIndexOf("\n");
  if (lastBreak > max * 0.75) cut = cut.slice(0, lastBreak);

  let out = `${cut.trimEnd()}${ellipsis}`;

  // 3. code fence / code span 補收尾
  const fences = (out.match(/```/g) ?? []).length;
  if (fences % 2 === 1) out += "\n```";
  const ticks = (out.replace(/```/g, "").match(/(?<!\\)`/g) ?? []).length;
  if (ticks % 2 === 1) out += "`";

  return out;
}

// ─── 數值表格 ────────────────────────────────────────────────

/**
 * 兩欄排版的寬度上限。手機的 code block 會橫向捲動，
 * ponytail: 42 格是實測手機不需捲動的安全值；要更寬先在手機確認。
 */
const TWO_COLUMN_MAX_WIDTH = 42;

/** 少於這個列數不值得分兩欄，單欄比較好讀 */
const TWO_COLUMN_MIN_ROWS = 6;

function renderColumn(rows: StatRow[]): { lines: string[]; width: number } {
  const labelW = Math.max(0, ...rows.map((r) => displayWidth(r.label)));
  const valueW = Math.max(0, ...rows.map((r) => displayWidth(r.value)));
  const lines = rows.map((r) => `${padWidth(r.label, labelW)}  ${padWidth(r.value, valueW)}`);
  return { lines, width: labelW + 2 + valueW };
}

/**
 * 把 StatRow[] 排成等寬表格。
 * 列數夠多且塞得下就分兩欄（直向閱讀：左欄由上往下，再換右欄），否則單欄。
 */
export function statTable(rows: StatRow[]): string {
  if (rows.length === 0) return "";

  if (rows.length >= TWO_COLUMN_MIN_ROWS) {
    const half = Math.ceil(rows.length / 2);
    const left = renderColumn(rows.slice(0, half));
    const right = renderColumn(rows.slice(half));
    if (left.width + 3 + right.width <= TWO_COLUMN_MAX_WIDTH) {
      const lines = left.lines.map((l, i) =>
        right.lines[i] ? `${padWidth(l, left.width)}   ${right.lines[i]}`.trimEnd() : l.trimEnd()
      );
      return lines.join("\n");
    }
  }

  return renderColumn(rows)
    .lines.map((l) => l.trimEnd())
    .join("\n");
}

/** 一個 StatGroup 排成「### 標題 + 等寬區塊」 */
export function renderGroup(group: StatGroup): string {
  const table = statTable(group.rows);
  if (!table) return "";
  return `${h3(group.title)}\n\`\`\`\n${table}\n\`\`\``;
}

export function renderGroups(groups: StatGroup[]): string[] {
  return groups.map(renderGroup).filter(Boolean);
}

// ─── 內文分塊 ────────────────────────────────────────────────

/**
 * 把數個 Markdown 區塊塞進有限個 TextDisplay。
 * 一定在區塊邊界切，不會把 code block 切一半。
 * 超出配額的區塊直接丟掉並附註，避免 Container 子元素爆量。
 */
export function packBlocks(
  blocks: string[],
  maxChunks: number = BUDGET.bodyChunks,
  maxLength: number = LIMITS.textDisplay
): string[] {
  const chunks: string[] = [];
  let current = "";
  let dropped = 0;

  for (const block of blocks) {
    if (!block) continue;
    const candidate = current ? `${current}\n\n${block}` : block;
    // Discord 算的是字元數，不是顯示寬度
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (chunks.length >= maxChunks) {
      dropped += 1;
      current = "";
      continue;
    }
    current = block.length <= maxLength ? block : clampSafe(block, maxLength);
  }

  if (current && chunks.length < maxChunks) chunks.push(current);

  if (dropped > 0 && chunks.length > 0) {
    const note = subtext(`另有 ${dropped} 組資料未顯示`);
    const last = chunks.length - 1;
    if (chunks[last].length + note.length + 2 <= maxLength) {
      chunks[last] = `${chunks[last]}\n\n${note}`;
    }
  }

  return chunks;
}

// ─── 安全網 ──────────────────────────────────────────────────

/**
 * 遞迴數出一則訊息實際會送出幾個 component。
 * Discord 超過 40 會回 400，送出前可以先用這個擋。
 */
export function countComponents(node: unknown): number {
  if (Array.isArray(node)) {
    return node.reduce<number>((sum, child) => sum + countComponents(child), 0);
  }
  if (!node || typeof node !== "object") return 0;

  const obj = node as Record<string, unknown>;
  const json =
    typeof obj.toJSON === "function" ? (obj.toJSON as () => unknown)() : node;
  const data = json as Record<string, unknown>;
  if (!data || typeof data !== "object" || typeof data.type !== "number") return 0;

  let total = 1;
  if (Array.isArray(data.components)) total += countComponents(data.components);
  if (data.accessory) total += countComponents(data.accessory);
  if (Array.isArray(data.items)) total += (data.items as unknown[]).length;
  return total;
}

/**
 * 送出前的最後一道檢查。回傳問題清單，空陣列代表可以送。
 * A3 可以在 editReply 前呼叫，把問題寫 log 而不是讓 Discord 回 400。
 */
export function validateMessage(node: unknown): string[] {
  const problems: string[] = [];
  const total = countComponents(node);
  if (total > LIMITS.message) problems.push(`component 總數 ${total} 超過 ${LIMITS.message}`);

  const json = (
    node && typeof (node as { toJSON?: unknown }).toJSON === "function"
      ? (node as { toJSON(): unknown }).toJSON()
      : node
  ) as Record<string, unknown> | null;

  if (json && Array.isArray(json.components) && json.type === 17) {
    if (json.components.length > LIMITS.containerChildren) {
      problems.push(
        `Container 直接子 ${json.components.length} 超過 ${LIMITS.containerChildren}`
      );
    }
  }

  // TextDisplay content 長度：依 builders 的 predicate 是 1~4000
  const walkText = (n: unknown): void => {
    if (Array.isArray(n)) {
      n.forEach(walkText);
      return;
    }
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    if (o.type === 10 && typeof o.content === "string") {
      if (o.content.length > LIMITS.textDisplay) {
        problems.push(`TextDisplay 內容 ${o.content.length} 字元超過 ${LIMITS.textDisplay}`);
      }
      if (o.content.length < LIMITS.textDisplayMin) {
        problems.push("TextDisplay 內容為空");
      }
    }
    for (const v of Object.values(o)) {
      if (v && typeof v === "object") walkText(v);
    }
  };
  walkText(json);

  return problems;
}
