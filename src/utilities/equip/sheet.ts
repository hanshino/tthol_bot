import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import credential from "../../../config/credential.json";

const documentId = "1I4TjN0yWh72syHHAzLcwkA-l-PKb5KMzev3cdBNsZLE";
const auth = new JWT({
  email: credential.client_email,
  key: credential.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const doc = new GoogleSpreadsheet(documentId, auth);

export interface EquipSheetRow {
  "名稱": string;
  "新版圖片"?: string;
  "圖片網址"?: string;
}

type SheetType = "driver" | "back" | "mid" | "left" | "right" | "hat";
const sheetIdMap = {
  driver: "1820863038",
  back: "1508012721",
  mid: "1931774774",
  left: "1626960585",
  hat: "126919644",
  right: "1930946969",
};

async function makeSureLoaded() {
  await doc.loadInfo();
}

export const sheetByType = async (type: SheetType) => {
  await makeSureLoaded();
  return doc.sheetsById[Number(sheetIdMap[type])];
};

export default doc;
