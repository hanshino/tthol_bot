/**
 * 階段一地基的介面契約。
 * A1(db/domain)、A2(ui)、A3(routing) 三條 lane 都對這份型別寫，才能平行開發。
 *
 * ponytail: 這裡只放跨 lane 共用的型別，不放實作。單一 lane 內部型別留在自己檔案。
 */

// ─── 共用值物件 ──────────────────────────────────────────────

/** 一列「標籤 + 值」，UI 層據此排版，不需要知道欄位語意 */
export interface StatRow {
  label: string;
  value: string;
}

/** 分組後的數值區塊（例：基本屬性 / 傷害參數 / 防禦參數） */
export interface StatGroup {
  title: string;
  rows: StatRow[];
}

/** 清單中的一筆結果，整列可點擊 */
export interface ListEntry {
  id: number;
  title: string;
  /** 次要資訊，例：`座騎・Lv80` */
  subtitle?: string;
  iconUrl?: string;
  /** 點擊後要導向的路由 */
  route: Route;
}

// ─── 實體詳情（A1 產出 → A2 消費）─────────────────────────────

export interface ItemDetail {
  id: number;
  name: string;
  /** type_name 轉中文後的顯示值，例：座騎 */
  typeLabel: string;
  summary: string | null;
  note: string | null;
  level: number;
  iconUrl: string | null;
  /** 大圖，沒有就退回 iconUrl */
  imageUrl: string | null;
  groups: StatGroup[];
  /** 隨機素質，已格式化為「外功：1~3 (20%)」 */
  randomAttributes: string[];
  /** 掉落此物品的怪物，可點擊 */
  dropFrom: ListEntry[];
}

export interface MonsterDetail {
  id: number;
  name: string;
  level: number;
  /** 已正規化，電→雷 */
  elemental: string;
  iconUrl: string | null;
  groups: StatGroup[];
  /** 掉落物，可點擊 */
  drops: ListEntry[];
}

export interface SkillDetail {
  id: number;
  name: string;
  level: number;
  /** clan enum 轉中文，例：少林 */
  clanLabel: string;
  /** target enum 轉中文，例：單體敵人 */
  targetLabel: string;
  help: string | null;
  groups: StatGroup[];
  /** 這個技能存在的所有等級，用來產生等級切換按鈕 */
  availableLevels: number[];
}

export interface AchievementEntry {
  id: number;
  name: string;
  description: string | null;
  points: number;
  /** reset_type > 0 */
  isPeriodic: boolean;
  /** 已格式化，例：`長劍 ×1`；無獎勵為 null */
  rewardLabel: string | null;
  /** 獎勵可點擊時的導向；無則 null */
  rewardRoute: Route | null;
}

export interface AchievementCategory {
  id: number;
  name: string;
  subCats: {
    id: number;
    parentId: number;
    name: string;
    count: number;
    totalPoints: number;
  }[];
}

/** 排行 / 比較用的裝備投影 */
export interface EquipStats {
  id: number;
  name: string;
  typeLabel: string;
  iconUrl: string | null;
  /** 原始數值，key 為 DB 欄位名 */
  stats: Record<string, number>;
}

// ─── 路由（A3 擁有，A1/A2 引用）──────────────────────────────

/**
 * customId 編碼為 `tthol:<kind>:<id>:<action>:<ownerId>`，上限 100 字元。
 * 不放可變長字串，只放 id 與短 action。
 */
export type Route =
  | { kind: "item"; id: number; action: "detail" | "drops" }
  | { kind: "monster"; id: number; action: "detail" | "drops" }
  | { kind: "skill"; id: number; action: "detail"; level?: number }
  | { kind: "achievement"; id: number; action: "category" | "subcat" };

// ─── Autocomplete（A1 提供資料 → A3 消費）────────────────────

export interface SuggestOption {
  /** 顯示給使用者，上限 100 字元 */
  name: string;
  /** 送回 command 的值，這裡放 String(id) */
  value: string;
}

/**
 * autocomplete 必須在 3 秒內回應且不可 defer。
 * 實作要點：只查 id/name、limit 25、輸入為空時回熱門或空陣列。
 */
export type Suggester = (keyword: string) => Promise<SuggestOption[]>;
