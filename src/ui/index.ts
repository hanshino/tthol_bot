/**
 * UI 層對外入口。A3 只從這裡 import。
 *
 * 送出方式：
 *   interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 })
 * 帶 IsComponentsV2 就不能有 content / embeds。
 * 短訊息走 notice 系列，直接 reply(payload)。
 */

export {
  buildItemDetail,
  buildMonsterDetail,
  buildSkillDetail,
  buildAchievementList,
  ACHIEVEMENT_PAGE_SIZE,
  type DetailOptions,
  type AchievementListOptions,
  type AchievementRow,
} from "./detail";

export {
  buildResultList,
  buildCategoryIndex,
  buildSubCategoryList,
  PAGE_SIZE,
  type ListOptions,
} from "./list";

export {
  notice,
  notFound,
  notOwner,
  expired,
  failed,
  timedOut,
  invalidInput,
  type NoticePayload,
} from "./notice";

export { setRouteEncoder, encodeRoute, buildPageRoute, type RouteEncoder } from "./routes";

export {
  palette,
  colorOfElement,
  countComponents,
  validateMessage,
  escapeText,
  escapeInline,
  clampSafe,
  LIMITS,
  statTable,
} from "./theme";

export { pager, entryRow, entrySelect, buttonRow, container, text } from "./components";
