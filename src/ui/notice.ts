/**
 * 短訊息：查無結果、權限不符、逾時、出錯。
 *
 * 這些刻意不用 Components v2。啟用 IsComponentsV2 的訊息不能帶 content，
 * 一句「找不到資料」包成 Container 反而更重，而且 ephemeral 回覆混用兩種
 * 格式會讓後續 editReply 的型別打架。純文字最省也最好接。
 *
 * 語氣：直述、給下一步，不要客套也不要驚嘆號。
 */

import { MessageFlags } from "discord.js";

export interface NoticePayload {
  content: string;
  flags: MessageFlags.Ephemeral;
}

/** 只有自己看得到的提示 */
export function notice(content: string): NoticePayload {
  return { content, flags: MessageFlags.Ephemeral };
}

/** 查無結果。有關鍵字就帶上，讓人知道搜的是什麼 */
export function notFound(keyword?: string, hint?: string): NoticePayload {
  const head = keyword ? `找不到符合「${keyword}」的資料。` : "找不到資料。";
  return notice(hint ? `${head}\n-# ${hint}` : `${head}\n-# 可以換個關鍵字，或用下拉選單挑選。`);
}

/** 別人的訊息，非發起者按了按鈕 */
export function notOwner(): NoticePayload {
  return notice("這則訊息是別人查的，請自己執行一次指令。");
}

/** 互動元件過期。Discord 的 message component 15 分鐘後失效 */
export function expired(): NoticePayload {
  return notice("這則訊息的按鈕已經失效，請重新查詢一次。");
}

/** 查詢出錯。細節寫 log，不要往使用者臉上丟 stack */
export function failed(action = "查詢"): NoticePayload {
  return notice(`${action}時發生錯誤，請稍後再試一次。`);
}

/** 資料還在載入但超時 */
export function timedOut(): NoticePayload {
  return notice("查詢時間過長，請稍後再試一次。");
}

/** 參數不合法 */
export function invalidInput(reason: string): NoticePayload {
  return notice(`輸入有問題：${reason}`);
}
