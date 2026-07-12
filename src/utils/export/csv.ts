/**
 * Safely escape a value for CSV.
 * Handles strings with commas, quotes, and newlines.
 */
export const escapeCsvValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  
  // If the string contains a comma, quote, or newline, it must be quoted.
  // Any internal quotes must be doubled.
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Builds a valid UTF-8 CSV string (with BOM) from an array of arrays.
 */
export const buildCsvString = (rows: any[][]): string => {
  const BOM = '\uFEFF';
  const csvContent = rows
    .map(row => row.map(escapeCsvValue).join(','))
    .join('\n');
    
  return BOM + csvContent;
};
