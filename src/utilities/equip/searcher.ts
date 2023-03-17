import { GoogleSpreadsheetRow } from "google-spreadsheet";

export const findByName = (rows: GoogleSpreadsheetRow[], keyword: string) => {
  const result = rows.filter((row) => {
    const name = row["名稱"];
    return name.includes(keyword);
  });
  return result;
};
