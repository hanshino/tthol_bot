/**
 * customId 的注入點。
 *
 * A3 擁有實際編碼規則，A2 只需要「Route → customId 字串」這一個函式。
 * 預設實作照 contracts.ts 註解的 `tthol:<kind>:<id>:<action>:<ownerId>` 走，
 * A3 完成後呼叫 setRouteEncoder() 換掉即可，UI 不用改。
 */

import type { Route } from "../contracts";
import { LIMITS } from "./theme";

export type RouteEncoder = (route: Route, ownerId?: string) => string;

/** UI 內部用的非路由按鈕（分頁、關閉），與 Route 分開避免污染契約 */
export type UiAction =
  | { kind: "page"; token: string; page: number }
  | { kind: "noop" };

const defaultEncoder: RouteEncoder = (route, ownerId = "") => {
  const parts: (string | number)[] = ["tthol", route.kind, route.id, route.action];
  if (route.kind === "skill" && route.level !== undefined) parts.push(`l${route.level}`);
  if (ownerId) parts.push(ownerId);
  return parts.join(":");
};

let encoder: RouteEncoder = defaultEncoder;

/** A3 用這個換掉預設編碼 */
export function setRouteEncoder(next: RouteEncoder): void {
  encoder = next;
}

/**
 * Route → customId。超過 100 字元會丟錯，
 * 因為靜默截斷會產生會撞號的 customId，比壞掉更難查。
 */
export function encodeRoute(route: Route, ownerId?: string): string {
  const id = encoder(route, ownerId);
  if (id.length > LIMITS.customId) {
    throw new Error(`customId 超過 ${LIMITS.customId} 字元：${id}`);
  }
  return id;
}

/**
 * 分頁按鈕的 customId。
 * token 是這次查詢的識別（A3 決定內容，例如快取鍵或關鍵字雜湊），
 * UI 只負責把頁碼接上去。
 */
export function buildPageRoute(token: string, page: number, ownerId?: string): string {
  const id = ["tthol", "page", token, page, ownerId ?? ""].filter(Boolean).join(":");
  if (id.length > LIMITS.customId) {
    throw new Error(`分頁 customId 超過 ${LIMITS.customId} 字元：${id}`);
  }
  return id;
}

/** 停用按鈕仍需要唯一 customId，用這個湊數 */
export function noopId(tag: string): string {
  return `tthol:noop:${tag}`.slice(0, LIMITS.customId);
}
