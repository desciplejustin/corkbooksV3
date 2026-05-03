// Frontend PDF text extractor using pdfjs-dist
// Runs in the browser; returns extracted text lines grouped by page.

import * as pdfjs from 'pdfjs-dist';

// Point the worker at the bundled worker file via Vite's ?url import
// @ts-ignore – Vite ?url import
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Extract text from a PDF file.
 *
 * Returns a 2D array: one inner array per page, each containing
 * the text lines on that page (sorted top-to-bottom, left-to-right).
 */
export async function extractPDFPages(file: File): Promise<string[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pages: string[][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items into lines by their y-position (rounded to nearest integer)
    const lineMap = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const str = (item as any).str as string;
      if (!str.trim()) continue;

      const transform = (item as any).transform as number[];
      const x = Math.round(transform[4]);
      const y = Math.round(transform[5]);

      // Round y to nearest 2px bucket so text on the same visual line groups together
      const yBucket = Math.round(y / 2) * 2;

      if (!lineMap.has(yBucket)) lineMap.set(yBucket, []);
      lineMap.get(yBucket)!.push({ x, text: str });
    }

    // Sort lines top-to-bottom (PDF coordinates: y increases upward, so higher y = higher on page)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    const pageLines: string[] = sortedYs.map(y => {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      return items.map(i => i.text).join(' ');
    });

    pages.push(pageLines);
  }

  return pages;
}
