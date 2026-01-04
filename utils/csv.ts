export const parseCSV = <T,>(csvText: string): T[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const result: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quotes and commas roughly
    const currentLine = lines[i];
    if (!currentLine) continue;

    // Simple split by comma, handling potential quoted fields is complex without a library.
    // For this dataset, we assume standard CSV. If needed, a more complex regex splitter can be added.
    // This regex splits by comma but ignores commas inside quotes.
    const matches = currentLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    
    // Fallback if match fails or for simple csv
    const values = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^"|"$/g, ''));

    const obj: any = {};
    headers.forEach((header, index) => {
      // Map 'FirstOfcaseName' to 'caseName' for consistency if needed, otherwise keep header
      const key = header === 'FirstOfcaseName' ? 'caseName' : header;
      obj[key] = values[index] || '';
    });
    result.push(obj as T);
  }

  return result;
};
