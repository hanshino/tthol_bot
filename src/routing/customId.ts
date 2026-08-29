import type { Route } from "../contracts";

const MAX = 100;
const integer = /^\d+$/;
const MAX_OWNER_LENGTH = 19;
const MAX_PAGE = 999999;
export const MAX_PAGE_KEYWORD_BYTES = 45;

export function encode(route: Route, ownerId = ""): string {
  const parts: (string | number)[] = ["tthol", route.kind, route.id, route.action];
  if (route.kind === "skill" && route.level !== undefined) parts.push(`l${route.level}`);
  if (ownerId) parts.push(ownerId);
  const value = parts.join(":");
  if (value.length > MAX) throw new Error(`customId 超過 ${MAX} 字元：${value}`);
  return value;
}

export function decode(customId: string): { route: Route; ownerId?: string } | null {
  try {
    if (typeof customId !== "string" || customId.length === 0 || customId.length > MAX) return null;
    const p = customId.split(":");
    if (p[0] !== "tthol" || p.some((x) => x.length === 0)) return null;
    if (p[1] === "noop" || p[1] === "page") return null;
    if (!integer.test(p[2])) return null;
    const id = Number(p[2]);
    if (!Number.isSafeInteger(id) || id < 0) return null;
    const kind = p[1];
    const action = p[3];
    let route: Route;
    let ownerId: string | undefined;
    if (kind === "item" || kind === "monster") {
      if ((action !== "detail" && action !== "drops") || (p.length !== 4 && p.length !== 5)) return null;
      ownerId = p[4];
      route = { kind, id, action } as Route;
    } else if (kind === "skill") {
      if (action !== "detail" || p.length < 4 || p.length > 6) return null;
      let level: number | undefined;
      if (p[4]?.startsWith("l")) {
        if (!/^l\d+$/.test(p[4])) return null;
        level = Number(p[4].slice(1));
        if (!Number.isSafeInteger(level) || level < 0) return null;
      } else if (p.length === 6) return null;
      if (p.length === 6 && !/^\d+$/.test(p[5])) return null;
      if (p.length === 6 && !p[4]?.startsWith("l")) return null;
      if (p.length === 5 && p[4]?.startsWith("l") === false) {
        ownerId = p[4];
      }
      if (p.length === 6) ownerId = p[5];
      route = { kind: "skill", id, action: "detail", ...(level === undefined ? {} : { level }) };
    } else if (kind === "achievement") {
      if ((action !== "category" && action !== "subcat") || (p.length !== 4 && p.length !== 5)) return null;
      ownerId = p[4];
      route = { kind: "achievement", id, action };
    } else return null;
    if (ownerId !== undefined && !/^\d+$/.test(ownerId)) return null;
    return ownerId ? { route, ownerId } : { route };
  } catch { return null; }
}

export interface PageQuery { kind: "item" | "monster" | "skill" | "achSubCat" | "achSearch"; keyword: string }

/**
 * kind → 單字元前綴。achSubCat 的 keyword 是 String(subCatId)，其餘是關鍵字。
 * ponytail: 這個 map 是唯一真實來源，反查表與正規表達式都從它推導，
 * 加新 kind 不會漏改其中一處。
 */
const PAGE_KINDS = { item: "i", monster: "m", skill: "s", achSubCat: "c", achSearch: "a" } as const;
const PAGE_KIND_BY_CHAR = Object.fromEntries(
  Object.entries(PAGE_KINDS).map(([kind, char]) => [char, kind]),
) as Record<string, PageQuery["kind"]>;
const PAGE_TOKEN = new RegExp(`^[${Object.values(PAGE_KINDS).join("")}][A-Za-z0-9_-]*$`);
/** 舊 q<JSON> token 只可能是這三種，成就從來沒用過舊格式 */
const LEGACY_KINDS = ["item", "monster", "skill"];

/**
 * Stateless compact token.  The kind is one byte and only the keyword is
 * base64url encoded; unlike the old JSON token this keeps the fixed overhead
 * small enough for Discord's 100-character customId limit.
 */
export function validatePageTokenBudget(token: string, ownerId = "1234567890123456789", page = MAX_PAGE): void {
  if (!/^\d{0,19}$/.test(ownerId) || ownerId.length > MAX_OWNER_LENGTH || !Number.isSafeInteger(page) || page < 1 || page > MAX_PAGE) {
    throw new Error("分頁參數超出可用範圍");
  }
  const customId = ["tthol", "page", token, page, ownerId].filter(Boolean).join(":");
  if (customId.length > MAX) throw new Error(`分頁關鍵字過長，請縮短關鍵字（最多 ${MAX_PAGE_KEYWORD_BYTES} UTF-8 bytes）`);
}

export function encodePageToken(query: PageQuery): string {
  if (Buffer.byteLength(query.keyword, "utf8") > MAX_PAGE_KEYWORD_BYTES) {
    throw new Error(`分頁關鍵字過長，請縮短關鍵字（最多 ${MAX_PAGE_KEYWORD_BYTES} UTF-8 bytes）`);
  }
  const kind = PAGE_KINDS[query.kind];
  if (!kind) throw new Error(`未知的分頁類型：${query.kind}`);
  const token = `${kind}${Buffer.from(query.keyword, "utf8").toString("base64url")}`;
  validatePageTokenBudget(token);
  return token;
}

export function decodePage(customId: string): { token: string; page: number; ownerId?: string } | null {
  if (typeof customId !== "string" || customId.length === 0 || customId.length > MAX) return null;
  const p = customId.split(":");
  if (p.length < 4 || p.length > 5 || p[0] !== "tthol" || p[1] !== "page" || !p[2] || !integer.test(p[3])) return null;
  const page = Number(p[3]);
  if (!Number.isSafeInteger(page) || page < 1 || (p[4] !== undefined && !/^\d+$/.test(p[4]))) return null;
  return p[4] ? { token: p[2], page, ownerId: p[4] } : { token: p[2], page };
}

export function decodePageQuery(token: string): PageQuery | null {
  try {
    const kind = PAGE_KIND_BY_CHAR[token[0]];
    if (kind && PAGE_TOKEN.test(token)) {
      return { kind, keyword: Buffer.from(token.slice(1), "base64url").toString("utf8") };
    }
    // Keep already-rendered messages made by the previous encoder usable.
    if (!token.startsWith("q")) return null;
    const value = JSON.parse(Buffer.from(token.slice(1), "base64url").toString("utf8"));
    return value && LEGACY_KINDS.includes(value.kind) && typeof value.keyword === "string" ? value : null;
  } catch { return null; }
}
