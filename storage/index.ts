// R2 Storage helpers for statement file management
import { Env } from '../types';

/**
 * Save an uploaded file to R2.
 * Key format: statements/{importId}/{filename}
 */
export async function saveStatementFile(
  env: Env,
  importId: string,
  filename: string,
  content: string | ArrayBuffer
): Promise<string> {
  const key = `statements/${importId}/${filename}`;
  const isPdf = filename.toLowerCase().endsWith('.pdf');
  await env.STATEMENTS.put(key, content, {
    httpMetadata: {
      contentType: isPdf ? 'application/pdf' : 'text/plain; charset=utf-8',
    },
    customMetadata: { importId, originalFilename: filename },
  });
  return key;
}

/**
 * Retrieve a stored statement file from R2.
 * Returns the file text content, or null if not found.
 */
export async function getStatementFile(env: Env, key: string): Promise<string | null> {
  const object = await env.STATEMENTS.get(key);
  if (!object) return null;
  return object.text();
}

/**
 * Delete a stored statement file from R2.
 */
export async function deleteStatementFile(env: Env, key: string): Promise<void> {
  await env.STATEMENTS.delete(key);
}
