// RFC 4180-compliant CSV parser.
//
// The previous implementation split on newlines first, which corrupted any
// record containing a quoted field with an embedded newline. In Case.csv two
// records were split across lines, yielding 6417 parsed rows against 6415 real
// ones plus four junk rows with empty names and garbage province codes.
// This scanner walks the text character by character so quoted fields may
// contain commas, newlines and escaped ("") quotes.

const parseRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldWasQuoted = false;

  // Strip UTF-8 BOM so the first header key isn't prefixed with ﻿.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const endField = () => {
    // Only trim unquoted fields; quoted ones may legitimately hold whitespace.
    row.push(fieldWasQuoted ? field : field.trim());
    field = '';
    fieldWasQuoted = false;
  };

  const endRow = () => {
    endField();
    // Skip blank lines (a single empty field and nothing else).
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      fieldWasQuoted = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\r') {
      // handled by the \n branch; CRLF and lone CR both terminate a row
      if (src[i + 1] !== '\n') endRow();
    } else if (ch === '\n') {
      endRow();
    } else {
      field += ch;
    }
  }

  // Flush trailing record when the file doesn't end in a newline.
  if (field !== '' || row.length > 0) endRow();

  return rows;
};

export const parseCSV = <T,>(csvText: string): T[] => {
  const rows = parseRows(csvText);
  if (rows.length < 2) return [];

  // 'FirstOfcaseName' is an Access export artifact; expose it as 'caseName'.
  const headers = rows[0].map((h) => (h === 'FirstOfcaseName' ? 'caseName' : h));

  const result: T[] = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[c] ?? '';
    }
    result.push(obj as T);
  }
  return result;
};
