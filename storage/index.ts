// R2 Storage helpers for statement file management
import { Env, StoredStatementFile } from '../types';

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
 * Returns the binary stream and metadata, or null if not found.
 */
export async function getStatementFile(env: Env, key: string): Promise<StoredStatementFile | null> {
  const object = await env.STATEMENTS.get(key);
  if (!object) return null;
  return {
    body: object.body,
    contentType: object.httpMetadata?.contentType || null,
    filename: object.customMetadata?.originalFilename || null,
  };
}

/**
 * Delete a stored statement file from R2.
 */
export async function deleteStatementFile(env: Env, key: string): Promise<void> {
  await env.STATEMENTS.delete(key);
}
