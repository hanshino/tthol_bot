import { GoogleSpreadsheet } from "google-spreadsheet";
import credential from "../../../config/credential.json";

const documentId = "1I4TjN0yWh72syHHAzLcwkA-l-PKb5KMzev3cdBNsZLE";
const doc = new GoogleSpreadsheet(documentId);

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
  await authenticate();
  await doc.loadInfo();
}

export const authenticate = () => {
  return doc.useServiceAccountAuth({
    client_email: credential.client_email,
    private_key: credential.private_key,
  });
};

export const sheetByType = async (type: SheetType) => {
  await makeSureLoaded();
  return doc.sheetsById[sheetIdMap[type]];
};

export default doc;
