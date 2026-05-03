// PDF Text Parser Utility
// Parses pre-extracted PDF text (from pdfjs-dist on the frontend)
// using a user-supplied regex pattern with named capture groups.

import { PDFParserConfig } from '../types';
import { ParsedRow, CSVParseResult } from './csv-parser';

/**
 * Parse PDF extracted text into transaction rows.
 *
 * The `extractedPages` argument is an array of pages, each page being an
 * array of text lines produced by the frontend PDF extractor.
 *
 * Config fields:
 *   linePattern   – regex string with named groups: date, description,
 *                   and either `amount` OR both `debit` + `credit`.
 *                   Optional groups: reference.
 *   dateFormat    – date format string matching csv-parser conventions.
 *   skipLines     – lines to skip at the top of every page (default 0).
 *   pageStart     – first page to process (1-based, default 1).
 */
export function parsePDFText(
  extractedPages: string[][],
  config: PDFParserConfig,
  yearHint?: number,
): CSVParseResult {
  try {
    const regex = new RegExp(config.linePattern, 'i');
    const pageStart = (config.pageStart ?? 1) - 1; // convert to 0-based
    const skipLines = config.skipLines ?? 0;
    const skipLinesSubsequent = config.skipLinesSubsequent ?? 0;
    const rows: ParsedRow[] = [];
    let skippedRows = 0;
    let prevBalance: number | null = null;

    for (let p = pageStart; p < extractedPages.length; p++) {
      // First page of data uses skipLines (full header); subsequent pages use skipLinesSubsequent
      const skip = p === pageStart ? skipLines : skipLinesSubsequent;
      const lines = extractedPages[p].slice(skip);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { skippedRows++; continue; }

        const match = regex.exec(trimmed);
        if (!match?.groups) { skippedRows++; continue; }

        try {
          const g = match.groups;

          const dateStr = g['date'];
          if (!dateStr) throw new Error('No date group in match');
          const date = parsePDFDate(dateStr.trim(), config.dateFormat, yearHint);

          const description = g['description']?.trim() || '(bank charge)';
          // no longer throw when description is absent — fee lines have no description text

          const reference = g['reference']?.trim() || null;

          let moneyIn = 0;
          let moneyOut = 0;
          let balanceForRow: number | undefined;

          if (g['balance'] !== undefined) {
            const balance = parsePDFAmount(g['balance']);
            balanceForRow = balance;
            if (g['amount'] !== undefined) {
              const crdr = getCrDr(g['amount']);
              if (crdr === 'cr') {
                moneyIn = parsePDFAmount(g['amount']);
              } else if (crdr === 'dr') {
                moneyOut = parsePDFAmount(g['amount']);
              } else {
                // No suffix: use balance delta
                if (prevBalance !== null) {
                  const delta = balance - prevBalance;
                  if (delta > 0) moneyIn = Math.abs(delta);
                  else if (delta < 0) moneyOut = Math.abs(delta);
                } else {
                  const amt = parsePDFAmount(g['amount']);
                  if (amt > 0) moneyIn = amt;
                }
              }
            } else if (g['debit'] !== undefined || g['credit'] !== undefined) {
              moneyOut = parsePDFAmount(g['debit'] || '');
              moneyIn = parsePDFAmount(g['credit'] || '');
            }
            prevBalance = balance;
          } else if (g['amount'] !== undefined) {
            // Single amount column: positive = in, negative = out
            const amount = parsePDFAmount(g['amount']);
            if (amount >= 0) {
              moneyIn = amount;
            } else {
              moneyOut = Math.abs(amount);
            }
          } else if (g['debit'] !== undefined || g['credit'] !== undefined) {
            moneyOut = parsePDFAmount(g['debit'] || '');
            moneyIn = parsePDFAmount(g['credit'] || '');
          } else {
            throw new Error('No amount group(s) in match');
          }

          rows.push({
            date,
            description,
            reference,
            moneyIn,
            moneyOut,
            netAmount: moneyIn - moneyOut,
            balance: balanceForRow,
            rawData: { line: trimmed, ...g },
          });
        } catch (err) {
          skippedRows++;
        }
      }
    }

    return { success: true, rows, skippedRows };
  } catch (error) {
    return {
      success: false,
      rows: [],
      error: error instanceof Error ? error.message : 'Unknown error parsing PDF text',
      skippedRows: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCrDr(raw: string): 'cr' | 'dr' | null {
  const t = raw.trim();
  if (/Cr$/i.test(t)) return 'cr';
  if (/Dr$/i.test(t)) return 'dr';
  return null;
}

function parsePDFAmount(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  // Remove currency symbols, Cr/Dr suffix, spaces, thousand separators
  const cleaned = raw.replace(/[R$£€\s,]/g, '').replace(/[Cc][Rr]$|[Dd][Rr]$/, '').trim();
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

function parsePDFDate(raw: string, format: string, yearHint?: number): string {
  // Reuse the same format logic as csv-parser: returns YYYY-MM-DD
  const clean = raw.trim();
  let day: number, month: number, year: number;

  if (format === 'DD/MM/YYYY' || format === 'DD-MM-YYYY') {
    const sep = format.includes('/') ? '/' : '-';
    const parts = clean.split(sep);
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else if (format === 'MM/DD/YYYY' || format === 'MM/DD/YY') {
    const sep = '/';
    const parts = clean.split(sep);
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
  } else if (format === 'YYYY-MM-DD') {
    const parts = clean.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (format === 'YYYYMMDD') {
    year = parseInt(clean.substring(0, 4), 10);
    month = parseInt(clean.substring(4, 6), 10);
    day = parseInt(clean.substring(6, 8), 10);
  } else if (format === 'DD/MM/YY') {
    const parts = clean.split('/');
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10) + 2000;
  } else if (format === 'DD MMM') {
    const months: Record<string, number> = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const parts = clean.split(/\s+/);
    day = parseInt(parts[0], 10);
    month = months[parts[1]?.toLowerCase()] || 0;
    if (yearHint) {
      // Use the statement year directly — trust the user's statement_month selection
      year = yearHint;
    } else {
      const now = new Date(); year = now.getFullYear();
      if (month && new Date(year, month - 1, day).getTime() - now.getTime() > 60 * 24 * 60 * 60 * 1000) year--;
    }
  } else {
    throw new Error(`Unsupported date format: ${format}`);
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Cannot parse date "${raw}" with format "${format}"`);
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
