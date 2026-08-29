import { AutocompleteInteraction, Interaction, MessageFlags } from "discord.js";
import { Sequelize } from "sequelize";
import type { Route, Suggester } from "../contracts";
import { createItemRepo } from "../db/itemRepo";
import { createMonsterRepo } from "../db/monsterRepo";
import { createSkillRepo } from "../db/skillRepo";
import { createAchievementRepo } from "../db/achievementRepo";
import { buildAchievementList, buildCategoryIndex, buildItemDetail, buildMonsterDetail, buildResultList, buildSkillDetail, buildSubCategoryList, failed, notFound, notOwner, validateMessage } from "../ui";
import { decode, decodePage, decodePageQuery, encodePageToken } from "./customId";

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

async function render(db: Sequelize, route: Route, ownerId?: string): Promise<any | null> {
  const item = createItemRepo(db), monster = createMonsterRepo(db), skill = createSkillRepo(db), achievement = createAchievementRepo(db);
  if (route.kind === "item") { const data = await item.getById(route.id); return data && buildItemDetail(data, { ownerId }); }
  if (route.kind === "monster") { const data = await monster.getById(route.id); return data && buildMonsterDetail(data, { ownerId }); }
  if (route.kind === "skill") {
    const lv = route.level ?? Number((await skill.levels(route.id) as any[])[0]?.level);
    if (!lv) return null;
    const data = await skill.getByIdLevel(route.id, lv); return data && buildSkillDetail(data, { ownerId });
  }
  const categories = await achievement.categories();
  if (route.action === "category") { const cat = categories.find((x) => x.id === route.id); return cat && buildSubCategoryList(cat, { ownerId, backRoute: { kind: "achievement", id: route.id, action: "category" } }); }
  const entries = await achievement.bySubCat(route.id);
  const cat = categories.find((x) => x.subCats.some((s) => s.id === route.id));
  return entries.length || cat ? buildAchievementList(cat ? `${cat.name} · 子分類` : "成就", entries, { ownerId }) : null;
}

async function page(db: Sequelize, i: any, token: string, pageNo: number, ownerId?: string): Promise<any | null> {
  const query = decodePageQuery(token); if (!query) return null;
  const repo: any = query.kind === "item" ? createItemRepo(db) : query.kind === "monster" ? createMonsterRepo(db) : createSkillRepo(db);
  const rows: any[] = await repo.search(query.keyword);
  const totalPages = Math.max(1, Math.ceil(rows.length / 25));
  const entries = rows.slice((pageNo - 1) * 25, pageNo * 25).map((x) => ({
    id: Number(x.id), title: x.name,
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
