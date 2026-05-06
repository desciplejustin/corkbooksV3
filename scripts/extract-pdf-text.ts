// Temporary script to extract text from PDFs for analysis
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractPDFText(pdfPath: string): Promise<string[][]> {
  const dataBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  
  const pages: string[][] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lines: string[] = [];
    
    // Group text items by Y position to form lines
    const lineMap: Map<number, string[]> = new Map();
    
    for (const item of textContent.items) {
      if ('str' in item) {
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push(item.str);
      }
    }
    
    // Sort by Y position (top to bottom) and join text items
    const sortedLines = Array.from(lineMap.entries())
      .sort((a, b) => b[0] - a[0]) // Descending Y (top to bottom)
      .map(([_, items]) => items.join(' ').trim())
      .filter(line => line.length > 0);
    
    pages.push(sortedLines);
  }
  
  return pages;
}

async function main() {
  const pdfFiles = [
    path.join(__dirname, '..', 'docs', 'Mel FNB - Mar 2025.pdf'),
    path.join(__dirname, '..', 'docs', 'Justin - Cheque account.pdf'),
  ];
  
  for (const pdfPath of pdfFiles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Extracting: ${path.basename(pdfPath)}`);
    console.log('='.repeat(80));
    
    try {
      const pages = await extractPDFText(pdfPath);
      
      pages.forEach((lines, pageIndex) => {
        console.log(`\n--- Page ${pageIndex + 1} ---`);
        lines.forEach((line, lineIndex) => {
          console.log(`${String(lineIndex).padStart(3, ' ')}: ${line}`);
        });
      });
    } catch (error) {
      console.error(`Error extracting ${path.basename(pdfPath)}:`, error);
    }
  }
}

main().catch(console.error);
