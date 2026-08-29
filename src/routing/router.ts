import { AutocompleteInteraction, Interaction, MessageFlags } from "discord.js";
import { Sequelize } from "sequelize";
import type { Route, Suggester } from "../contracts";
import { element, itemType } from "../domain/enums";
import { createItemRepo } from "../db/itemRepo";
import { createMonsterRepo } from "../db/monsterRepo";
import { createSkillRepo } from "../db/skillRepo";
import { createAchievementRepo } from "../db/achievementRepo";
import { ACHIEVEMENT_PAGE_SIZE, buildAchievementList, buildCategoryIndex, buildItemDetail, buildMonsterDetail, buildResultList, buildSkillDetail, buildSubCategoryList, failed, notFound, notOwner, validateMessage } from "../ui";
import { decode, decodePage, decodePageQuery, encodePageToken, type PageQuery } from "./customId";

const safe = <T extends object>(payload: T): T & { allowedMentions: { parse: never[] } } => ({
  ...payload,
  allowedMentions: { parse: [] },
});

const suggesters: Record<string, Suggester> = {};
export function registerSuggester(command: string, option: string, suggester: Suggester): void { suggesters[`${command}:${option}`] = suggester; }

async function autocomplete(db: Sequelize, i: AutocompleteInteraction): Promise<void> {
  try {
    const focused = i.options.getFocused(true);
    const fn = suggesters[`${i.commandName}:${focused.name}`] ?? suggesters[`${i.commandName}:keyword`];
    await i.respond(fn ? (await fn(focused.value)).slice(0, 25).map((x) => ({ name: x.name.slice(0, 100), value: String(x.value) })) : []);
  } catch (error) { console.error(error); try { await i.respond([]); } catch (notifyError) { console.error(notifyError); } }
}

function ownerMatches(i: any, ownerId?: string): boolean {
  return !ownerId || ownerId === i.user.id;
}

/**
 * 成就清單（子分類瀏覽 / 關鍵字搜尋）共用的一頁。
 *
 * 自己切好當頁再傳，並一併給 total，讓 buildAchievementList 走「entries 已是當頁」
 * 那條路，不會重複切頁。render() 的第三層與 page() 都走這裡，
 * 標題與切頁規則只有一份，翻頁前後標題不會變。
 */
async function achievementPage(db: Sequelize, query: PageQuery, pageNo: number, ownerId?: string): Promise<any | null> {
  const repo = createAchievementRepo(db);
  // customId 來自使用者：Number() 會吃下 ""(→0)、"0x10"(→16)、"1e2"(→100)、"-1"，
  // 等於能用非正規寫法 alias 到別的子分類。先要求 canonical 十進位正整數。
  if (query.kind === "achSubCat" && !/^\d+$/.test(query.keyword)) return null;
  const subCatId = Number(query.keyword);
  if (query.kind === "achSubCat" && !Number.isSafeInteger(subCatId)) return null;
  const rows = query.kind === "achSubCat" ? await repo.bySubCat(subCatId) : await repo.search(query.keyword);
  let title = `搜尋「${query.keyword}」`;
  if (query.kind === "achSubCat") {
    const cat = (await repo.categories()).find((x) => x.subCats.some((s) => s.id === subCatId));
    const sub = cat?.subCats.find((s) => s.id === subCatId);
    if (!rows.length && !cat) return null;
    // 使用者點的是子分類，標題就要講得出子分類名，不能只顯示外層分類
    title = cat ? `${cat.name} · ${sub?.name ?? "子分類"}` : "成就";
  }
  // 頁碼夾在範圍內：越界時 pageRows 會是空的，buildAchievementList 會提前返回
  // 而不放分頁列，使用者就再次卡死。夾住等於「翻到最後一頁」。
  const totalPages = Math.max(1, Math.ceil(rows.length / ACHIEVEMENT_PAGE_SIZE));
  const current = Math.min(Math.max(1, pageNo), totalPages);
  const pageRows = rows.slice((current - 1) * ACHIEVEMENT_PAGE_SIZE, current * ACHIEVEMENT_PAGE_SIZE);
  return buildAchievementList(title, pageRows, { ownerId, page: current, total: rows.length, pageToken: encodePageToken(query) });
}

async function render(db: Sequelize, route: Route, ownerId?: string): Promise<any | null> {
  const item = createItemRepo(db), monster = createMonsterRepo(db), skill = createSkillRepo(db), achievement = createAchievementRepo(db);
  if (route.kind === "item") { const data = await item.getById(route.id); return data && buildItemDetail(data, { ownerId }); }
  if (route.kind === "monster") { const data = await monster.getById(route.id); return data && buildMonsterDetail(data, { ownerId }); }
  if (route.kind === "skill") {
    const lv = route.level ?? Number((await skill.levels(route.id) as any[])[0]?.level);
    if (!lv) return null;
    const data = await skill.getByIdLevel(route.id, lv); return data && buildSkillDetail(data, { ownerId });
  }
  if (route.action === "category") {
    const cat = (await achievement.categories()).find((x) => x.id === route.id);
    return cat && buildSubCategoryList(cat, { ownerId, backRoute: { kind: "achievement", id: route.id, action: "category" } });
  }
  return achievementPage(db, { kind: "achSubCat", keyword: String(route.id) }, 1, ownerId);
}

async function page(db: Sequelize, i: any, token: string, pageNo: number, ownerId?: string): Promise<any | null> {
  const query = decodePageQuery(token); if (!query) return null;
  if (query.kind === "achSubCat" || query.kind === "achSearch") return achievementPage(db, query, pageNo, ownerId);
  const repo: any = query.kind === "item" ? createItemRepo(db) : query.kind === "monster" ? createMonsterRepo(db) : createSkillRepo(db);
  const rows: any[] = await repo.search(query.keyword);
  const totalPages = Math.max(1, Math.ceil(rows.length / 25));
  const entries = rows.slice((pageNo - 1) * 25, pageNo * 25).map((x) => ({
    id: Number(x.id), title: x.name,
    // subtitle 必須跟各 command 的第 1 頁一字不差，否則翻頁後資訊會憑空消失
    subtitle: query.kind === "item"
      ? [itemType(x.type_name, x.equip_slot), x.base_lv > 0 ? `Lv${x.base_lv}` : null, x.isExtra ? "外裝" : null].filter(Boolean).join("・")
      : query.kind === "monster"
        ? [`Lv${x.level}`, element(x.elemental)].filter(Boolean).join("・")
        : `Lv${x.level}`,
    route: query.kind === "item" ? { kind: "item" as const, id: Number(x.id), action: "detail" as const } :
      query.kind === "monster" ? { kind: "monster" as const, id: Number(x.id), action: "detail" as const } :
        { kind: "skill" as const, id: Number(x.id), action: "detail" as const, level: Number(x.level) },
  }));
  return buildResultList({ title: `搜尋「${query.keyword}」`, entries, token, page: Math.min(pageNo, totalPages), totalPages, total: rows.length, ownerId });
}

async function component(db: Sequelize, i: any): Promise<void> {
  const raw = i.isStringSelectMenu() ? i.values[0] : i.customId;
  const p = decodePage(raw);
  const decoded = p ? null : decode(raw);
  const ownerId = p?.ownerId ?? decoded?.ownerId;
  if (!p && !decoded) return;
  try {
    if (!ownerMatches(i, ownerId)) { await i.reply(safe(notOwner())); return; }
    await i.deferUpdate();
    const c = p ? await page(db, i, p.token, p.page, ownerId) : await render(db, decoded!.route, ownerId);
    if (!c) { await i.followUp(safe(notFound())); return; }
    const problems = validateMessage(c); if (problems.length) console.error("Invalid UI message:", problems);
    await i.editReply(safe({ components: [c], flags: MessageFlags.IsComponentsV2 }));
  } catch (error) { console.error(error); try { if (i.deferred || i.replied) await i.followUp(safe(failed("查詢"))); else await i.reply(safe(failed("查詢"))); } catch (notifyError) { console.error(notifyError); } }
}

export function registerDefaultSuggesters(db: Sequelize): void {
  const item = createItemRepo(db), monster = createMonsterRepo(db), skill = createSkillRepo(db);
  for (const command of ["item", "items"]) for (const option of ["keyword", "name"]) registerSuggester(command, option, item.suggest);
  for (const command of ["monster", "monsters"]) registerSuggester(command, "keyword", monster.suggest);
  for (const command of ["skill", "skills"]) registerSuggester(command, "keyword", skill.suggest);
}

export async function dispatchInteraction(db: Sequelize, i: Interaction): Promise<void> {
  if (i.isAutocomplete()) return autocomplete(db, i);
  if (i.isButton() || i.isStringSelectMenu()) return component(db, i);
}

export { encodePageToken };
