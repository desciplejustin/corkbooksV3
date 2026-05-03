// CSV Parser Utility for Import Engine
import { CSVParserConfig } from '../types';

export interface ParsedRow {
  date: string;
  description: string;
  reference: string | null;
  moneyIn: number;
  moneyOut: number;
  netAmount: number;
  balance?: number;  // bank-reported running balance (if available from statement)
  rawData: Record<string, string>;
}

export interface CSVParseResult {
  success: boolean;
  rows: ParsedRow[];
  error?: string;
  skippedRows: number;
}

/**
 * Parse CSV text according to configuration
 */
export function parseCSV(csvText: string, config: CSVParserConfig): CSVParseResult {
  try {
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return { success: false, rows: [], error: 'Empty file', skippedRows: 0 };
    }

    let startIndex = config.skipRows || 0;
    let headers: string[] = [];

    if (config.hasHeader) {
      if (lines.length <= startIndex) {
        return { success: false, rows: [], error: 'No data rows after headers and skip rows', skippedRows: 0 };
      }
      headers = parseCSVLine(lines[startIndex], config.delimiter);
      startIndex++;
    }

    const rows: ParsedRow[] = [];
    let skippedRows = 0;

    for (let i = startIndex; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], config.delimiter);
      
      if (values.length === 0 || values.every(v => v.trim() === '')) {
        skippedRows++;
        continue;
      }

      try {
        const row = parseRow(values, headers, config);
        rows.push(row);
      } catch (err) {
        skippedRows++;
        console.warn(`Skipped row ${i + 1}:`, err);
      }
    }

    return {
      success: true,
      rows,
      skippedRows
    };
  } catch (error) {
    return {
      success: false,
      rows: [],
      error: error instanceof Error ? error.message : 'Unknown error parsing CSV',
      skippedRows: 0
    };
  }
}

/**
 * Parse a single CSV line respecting quotes and delimiters
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Parse a single data row into a transaction
 */
function parseRow(values: string[], headers: string[], config: CSVParserConfig): ParsedRow {
  const rawData: Record<string, string> = {};

  // Build raw data object
  if (config.hasHeader && headers.length > 0) {
    headers.forEach((header, index) => {
      rawData[header] = values[index] || '';
    });
  } else {
    values.forEach((value, index) => {
      rawData[`col_${index}`] = value;
    });
  }

  // Extract date
  const dateValue = getValue(rawData, config.dateColumn, headers, values);
  if (!dateValue) {
    throw new Error('Date column not found');
  }
  const date = parseDate(dateValue, config.dateFormat);

  // Extract description
  const description = getValue(rawData, config.descriptionColumn, headers, values);
  if (!description) {
    throw new Error('Description column not found');
  }

  // Extract reference (optional)
  const reference = config.referenceColumn 
    ? getValue(rawData, config.referenceColumn, headers, values) 
    : null;

  // Extract amounts
  let moneyIn = 0;
  let moneyOut = 0;

  if (config.amountColumn) {
    // Single amount column (positive = in, negative = out)
    const amountStr = getValue(rawData, config.amountColumn, headers, values);
    const amount = parseAmount(amountStr);
    if (amount >= 0) {
      moneyIn = amount;
    } else {
      moneyOut = Math.abs(amount);
    }
  } else if (config.debitColumn && config.creditColumn) {
    // Separate debit/credit columns
    const debitStr = getValue(rawData, config.debitColumn, headers, values);
    const creditStr = getValue(rawData, config.creditColumn, headers, values);
    moneyOut = parseAmount(debitStr);
    moneyIn = parseAmount(creditStr);
  } else {
    throw new Error('No amount columns configured');
  }

  const netAmount = moneyIn - moneyOut;

  return {
    date,
    description,
    reference,
    moneyIn,
    moneyOut,
    netAmount,
    rawData
  };
}

/**
 * Get value from row by column name or index
 */
function getValue(rawData: Record<string, string>, column: string, headers: string[], values: string[]): string {
  // Try by header name first
  if (rawData[column] !== undefined) {
    return rawData[column];
  }

  // Try by index if column is a number
  const index = parseInt(column, 10);
  if (!isNaN(index) && index >= 0 && index < values.length) {
    return values[index];
  }

  return '';
}

/**
 * Parse date string according to format
 * Supports: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, YYYYMMDD, DD-MM-YYYY
 */
function parseDate(dateStr: string, format: string): string {
  // YYYYMMDD — no separators, handle before split
  if (format.toUpperCase() === 'YYYYMMDD') {
    const clean = dateStr.trim();
    const year = clean.substring(0, 4);
    const month = clean.substring(4, 6);
    const day = clean.substring(6, 8);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parts = dateStr.split(/[\/\-]/);
  
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  let year: string, month: string, day: string;

  const formatUpper = format.toUpperCase();
  
  if (formatUpper.includes('YYYY')) {
    // Format includes full year
    if (formatUpper.startsWith('YYYY')) {
      // YYYY-MM-DD
      [year, month, day] = parts;
    } else if (formatUpper.startsWith('DD')) {
      // DD/MM/YYYY
      [day, month, year] = parts;
    } else {
      // MM/DD/YYYY
      [month, day, year] = parts;
    }
  } else {
    // Assume YY format, need to convert
    if (formatUpper.startsWith('DD')) {
      // DD/MM/YY
      [day, month, year] = parts;
    } else {
      // MM/DD/YY
      [month, day, year] = parts;
    }
    // Convert 2-digit year to 4-digit (assume 2000s if < 50, else 1900s)
    const yearNum = parseInt(year, 10);
    year = yearNum < 50 ? `20${year}` : `19${year}`;
  }

  // Pad month and day
  month = month.padStart(2, '0');
  day = day.padStart(2, '0');

  // Return ISO date format
  return `${year}-${month}-${day}`;
}

/**
 * Parse amount string to number
 * Handles: 1234.56, 1,234.56, (1234.56), -1234.56, R1234.56
 */
function parseAmount(amountStr: string): number {
  if (!amountStr || amountStr.trim() === '') {
    return 0;
  }

  // Remove currency symbols and spaces
  let cleaned = amountStr.replace(/[R$£€\s]/g, '');

  // Check for negative (parentheses or minus sign)
  const isNegative = cleaned.includes('(') || cleaned.startsWith('-');

  // Remove parentheses and minus signs
  cleaned = cleaned.replace(/[\(\)\-]/g, '');

  // Remove thousands separators (commas)
  cleaned = cleaned.replace(/,/g, '');

  // Parse to float
  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    return 0;
  }

  return isNegative ? -amount : amount;
}
