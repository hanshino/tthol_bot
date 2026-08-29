import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { EquipSheetRow } from "./sheet";

export const findByName = (
  rows: GoogleSpreadsheetRow<EquipSheetRow>[],
  keyword: string
) => {
  const result = rows.filter((row) => {
    const name = row.get("名稱");
    return name.includes(keyword);
  });
  return result;
};
