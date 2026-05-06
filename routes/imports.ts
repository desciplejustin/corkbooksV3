// Imports API Routes
import { Env, Import, StagedTransaction, ImportTemplate, ApiResponse, CSVParserConfig, PDFParserConfig } from '../types';
import { authenticateRequest } from '../middleware/auth';
import { hasRole } from '../middleware/rbac';
import { nanoid } from 'nanoid';
import { parseCSV } from '../utils/csv-parser';
import { parsePDFText } from '../utils/pdf-parser';
import { saveStatementFile } from '../storage/index';

function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/imports/upload
export async function handleUploadImport(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  if (!hasRole(user, ['admin', 'editor'])) {
    return jsonResponse({ success: false, error: 'Insufficient permissions' }, 403);
  }

  try {
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    const bankAccountId = formData.get('bank_account_id') as string;
    const statementMonth = formData.get('statement_month') as string; // YYYY-MM
    const notes = formData.get('notes') as string | null;
    const templateId = formData.get('template_id') as string | null;

    if (!(fileEntry instanceof File)) {
      return jsonResponse({ success: false, error: 'Missing uploaded file' }, 400);
    }

    const file = fileEntry;

    if (!bankAccountId) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }

    // Security: Enforce file size limit (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return jsonResponse({ success: false, error: 'File size exceeds 10MB limit' }, 400);
    }

    // Security: Validate file type
    const allowedTypes = ['text/csv', 'text/plain', 'application/pdf', 'application/vnd.ms-excel'];
    if (file.type && !allowedTypes.includes(file.type)) {
      return jsonResponse({ success: false, error: 'Invalid file type. Only CSV and PDF files are allowed.' }, 400);
    }

    // Validate statement month format if provided
    if (statementMonth && !/^\d{4}-\d{2}$/.test(statementMonth)) {
      return jsonResponse({ success: false, error: 'Invalid statement_month format. Use YYYY-MM' }, 400);
    }

    const bankAccount = await env.DB.prepare(`
      SELECT id, default_import_template_id
      FROM bank_accounts
      WHERE id = ?
      LIMIT 1
    `).bind(bankAccountId).first<{ id: string; default_import_template_id: string | null }>();

    if (!bankAccount) {
      return jsonResponse({ success: false, error: 'Bank account not found' }, 404);
    }

    const resolvedTemplateId = templateId || bankAccount.default_import_template_id;
    if (!resolvedTemplateId) {
      return jsonResponse({ 
        success: false, 
        error: 'No default import template linked to this bank account' 
      }, 400);
    }

    const importTemplate = await env.DB.prepare(`
      SELECT * FROM import_templates
      WHERE id = ? AND is_active = 1
      LIMIT 1
    `).bind(resolvedTemplateId).first<ImportTemplate>();

    if (!importTemplate) {
      return jsonResponse({
        success: false,
        error: 'Import template not found or inactive',
      }, 400);
    }

    // Support CSV and PDF
    if (importTemplate.format_type !== 'csv' && importTemplate.format_type !== 'pdf') {
      return jsonResponse({ 
        success: false, 
        error: `Format type ${importTemplate.format_type} not yet supported` 
      }, 400);
    }

    let parseResult;

    if (importTemplate.format_type === 'csv') {
      const fileText = await file.text();
      const parserConfig: CSVParserConfig = JSON.parse(importTemplate.parser_config);
      parseResult = parseCSV(fileText, parserConfig);
    } else {
      // PDF: frontend sends pre-extracted text as JSON in `extracted_text` field
      const extractedJson = formData.get('extracted_text') as string | null;
      if (!extractedJson) {
        return jsonResponse({ success: false, error: 'PDF upload requires extracted_text field (use the web UI to upload PDFs)' }, 400);
      }
      let extractedPages: string[][];
      try {
        extractedPages = JSON.parse(extractedJson);
      } catch {
        return jsonResponse({ success: false, error: 'extracted_text must be valid JSON' }, 400);
      }
      const parserConfig: PDFParserConfig = JSON.parse(importTemplate.parser_config);
      // Pass statement year as a hint for DD MMM date formats so old statements
      // are not assigned the current year (e.g. Feb 2025 statement imported in 2026)
      const stmtYear = statementMonth ? parseInt(statementMonth.substring(0, 4), 10) : undefined;
      parseResult = parsePDFText(extractedPages, parserConfig, stmtYear);

      // If nothing parsed, attach diagnostic info about page/line counts
      if (parseResult.rows.length === 0) {
        const pStart = Math.max(0, (parserConfig.pageStart ?? 1) - 1);
        const skip1 = parserConfig.skipLines ?? 0;
        const skipN = (parserConfig as any).skipLinesSubsequent ?? 0;
        const processedPageSummary = extractedPages
          .slice(pStart)
          .map((pg, i) => {
            const s = i === 0 ? skip1 : skipN;
            const avail = Math.max(0, pg.length - s);
            return `page ${pStart + i + 1}: ${pg.length} lines extracted, ${avail} available after skip`;
          })
          .join(' | ');
        const totalAvail = extractedPages.slice(pStart).reduce((sum, pg, i) => {
          const s = i === 0 ? skip1 : skipN;
          return sum + Math.max(0, pg.length - s);
        }, 0);
        const hint = extractedPages.length === 0
          ? 'No pages were extracted from the PDF — the file may be a scanned image or password-protected.'
          : extractedPages.length < (parserConfig.pageStart ?? 1)
          ? `pageStart=${parserConfig.pageStart ?? 1} but the PDF only has ${extractedPages.length} page(s).`
          : totalAvail === 0
          ? `All ${extractedPages.length} page(s) had all their lines consumed by the skip settings. Reduce skipLines (currently ${skip1}/${skipN}).`
          : parseResult.skippedRows === 0
          ? 'Unknown extraction issue — no lines were fed to the regex.'
          : `${parseResult.skippedRows} line(s) were tested but none matched the pattern. Check your regex.`;
        return jsonResponse({
          success: false,
          error: `No transactions found. ${hint}${processedPageSummary ? ' — ' + processedPageSummary : ''}`,
        }, 400);
      }
    }

    // Save original file to R2 regardless of format
    const fileContentForR2: string | ArrayBuffer =
      importTemplate.format_type === 'pdf'
        ? await file.arrayBuffer()
        : await file.text();

    if (!parseResult.success) {
      return jsonResponse({ 
        success: false, 
        error: `Parse error: ${parseResult.error}` 
      }, 400);
    }

    if (parseResult.rows.length === 0) {
      // CSV case (PDF is handled inline above)
      return jsonResponse({ 
        success: false, 
        error: `No valid transactions found in file — ${parseResult.skippedRows} line(s) were read but none matched the configured pattern. Check your column mappings.`
      }, 400);
    }

    // Create import record
    const importId = nanoid();
    const now = new Date().toISOString();

    // Calculate period start/end from transactions
    const dates = parseResult.rows.map(r => r.date).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];

    // Use provided month or derive from date range (multi-month statements)
    const resolvedStatementMonth = statementMonth || periodStart.substring(0, 7);

    // Save original file to R2 for reference
    const fileKey = await saveStatementFile(env, importId, file.name, fileContentForR2);

    await env.DB.prepare(`
      INSERT INTO imports (
        id, bank_account_id, import_template_id, uploaded_by_user_id,
        source_filename, source_file_key, source_format, statement_month, 
        period_start, period_end, notes, status, row_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      importId,
      bankAccountId,
      importTemplate.id,
      user.id,
      file.name,
      fileKey,
      importTemplate.format_type,
      resolvedStatementMonth,
      periodStart,
      periodEnd,
      notes || null,
      parseResult.rows.length,
      now
    ).run();

    // Create staged transactions
    const stagedIds: string[] = [];
    for (const row of parseResult.rows) {
      const stagedId = nanoid();
      stagedIds.push(stagedId);

      await env.DB.prepare(`
        INSERT INTO staged_transactions (
          id, import_id, bank_account_id, transaction_date,
          description, reference, money_in, money_out, net_amount,
          balance, review_status, raw_row_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unallocated', ?, ?, ?)
      `).bind(
        stagedId,
        importId,
        bankAccountId,
        row.date,
        row.description,
        row.reference,
        row.moneyIn,
        row.moneyOut,
        row.netAmount,
        row.balance ?? null,
        JSON.stringify(row.rawData),
        now,
        now
      ).run();
    }

    // Update import status to ready
    await env.DB.prepare(
      'UPDATE imports SET status = ? WHERE id = ?'
    ).bind('ready', importId).run();

    const importRecord = await env.DB.prepare(
      'SELECT * FROM imports WHERE id = ?'
    ).bind(importId).first<Import>();

    return jsonResponse({
      success: true,
      data: {
        import: importRecord,
        parsed_rows: parseResult.rows.length,
        skipped_rows: parseResult.skippedRows,
        staged_transaction_ids: stagedIds
      },
    }, 201);
  } catch (error) {
    console.error('Error uploading import:', error);
    return jsonResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
}

// GET /api/imports
export async function handleListImports(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const url = new URL(request.url);
    const bankAccountId = url.searchParams.get('bank_account_id');
    const status = url.searchParams.get('status');

    // Base query with ownership filter and reviewed count
    let query = `SELECT i.*, 
      (SELECT COUNT(*) FROM staged_transactions st 
       WHERE st.import_id = i.id AND st.review_status != 'unallocated') as reviewed_count
      FROM imports i 
      INNER JOIN bank_accounts ba ON i.bank_account_id = ba.id 
      WHERE 1=1`;
    const params: string[] = [];
    
    // Non-admins only see their own imports
    if (user.role !== 'admin') {
      query += ' AND ba.user_id = ?';
      params.push(user.id);
    }

    if (bankAccountId) {
      query += ' AND i.bank_account_id = ?';
      params.push(bankAccountId);
    }

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await env.DB.prepare(query).bind(...params).all<Import & { reviewed_count: number }>();

    return jsonResponse({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Error listing imports:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

// GET /api/imports/:id
export async function handleGetImport(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const importRecord = await env.DB.prepare(
      'SELECT * FROM imports WHERE id = ?'
    ).bind(id).first<Import>();

    if (!importRecord) {
      return jsonResponse({ success: false, error: 'Import not found' }, 404);
    }

    return jsonResponse({
      success: true,
      data: importRecord,
    });
  } catch (error) {
    console.error('Error getting import:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

// GET /api/imports/:id/staged-transactions
export async function handleGetStagedTransactions(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const importRecord = await env.DB.prepare(
      'SELECT * FROM imports WHERE id = ?'
    ).bind(id).first<Import>();

    if (!importRecord) {
      return jsonResponse({ success: false, error: 'Import not found' }, 404);
    }

    const result = await env.DB.prepare(`
      SELECT * FROM staged_transactions 
      WHERE import_id = ? 
      ORDER BY transaction_date ASC
    `).bind(id).all<StagedTransaction>();

    return jsonResponse({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Error getting staged transactions:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

// PATCH /api/staged-transactions/:id
export async function handleUpdateStagedTransaction(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  if (!hasRole(user, ['admin', 'editor'])) {
    return jsonResponse({ success: false, error: 'Insufficient permissions' }, 403);
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM staged_transactions WHERE id = ?'
    ).bind(id).first<StagedTransaction>();

    if (!existing) {
      return jsonResponse({ success: false, error: 'Staged transaction not found' }, 404);
    }

    const body = await request.json() as Partial<{
      assigned_category_id: string;
      scope: string;
      tax_deductible: number;
      notes: string;
      review_status: string;
      is_transfer: number;
      transfer_account_id: string | null;
    }>;

    const updates: string[] = [];
    const params: any[] = [];

    if (body.assigned_category_id !== undefined) {
      updates.push('assigned_category_id = ?');
      params.push(body.assigned_category_id);
      updates.push('allocation_source = ?');
      params.push('manual');
    }

    if (body.scope !== undefined) {
      updates.push('scope = ?');
      params.push(body.scope);
    }

    if (body.tax_deductible !== undefined) {
      updates.push('tax_deductible = ?');
      params.push(body.tax_deductible);
    }

    if (body.notes !== undefined) {
      updates.push('notes = ?');
      params.push(body.notes);
    }

    if (body.is_transfer !== undefined) {
      updates.push('is_transfer = ?');
      params.push(body.is_transfer);
    }

    if (body.transfer_account_id !== undefined) {
      updates.push('transfer_account_id = ?');
      params.push(body.transfer_account_id);
    }

    if (body.review_status !== undefined) {
      updates.push('review_status = ?');
      params.push(body.review_status);
    }

    if (updates.length === 0) {
      return jsonResponse({ success: false, error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await env.DB.prepare(`
      UPDATE staged_transactions
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM staged_transactions WHERE id = ?'
    ).bind(id).first<StagedTransaction>();

    return jsonResponse({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating staged transaction:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

// GET /api/imports/:id/download
export async function handleDownloadImportFile(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  try {
    const importRecord = await env.DB.prepare(
      'SELECT * FROM imports WHERE id = ?'
    ).bind(id).first<Import>();

    if (!importRecord) {
      return jsonResponse({ success: false, error: 'Import not found' }, 404);
    }

    if (!importRecord.source_file_key) {
      return jsonResponse({ success: false, error: 'No file stored for this import' }, 404);
    }

    const object = await env.STATEMENTS.get(importRecord.source_file_key);
    if (!object) {
      return jsonResponse({ success: false, error: 'File no longer available in storage' }, 404);
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${importRecord.source_filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading import file:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
}


export async function handleFinalizeImport(request: Request, env: Env, id: string): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
  }

  if (!hasRole(user, ['admin', 'editor'])) {
    return jsonResponse({ success: false, error: 'Insufficient permissions' }, 403);
  }

  try {
    const importRecord = await env.DB.prepare(
      'SELECT * FROM imports WHERE id = ?'
    ).bind(id).first<Import>();

    if (!importRecord) {
      return jsonResponse({ success: false, error: 'Import not found' }, 404);
    }

    if (importRecord.status === 'finalised') {
      return jsonResponse({ success: false, error: 'Import already finalised' }, 400);
    }

    // Get all staged transactions that are allocated OR transfers
    const stagedTransactions = await env.DB.prepare(`
      SELECT * FROM staged_transactions 
      WHERE import_id = ? AND (review_status = 'allocated' OR (is_transfer = 1 AND review_status = 'transfer'))
    `).bind(id).all<StagedTransaction>();

    if (!stagedTransactions.results || stagedTransactions.results.length === 0) {
      return jsonResponse({ 
        success: false, 
        error: 'No allocated or transfer transactions to finalize' 
      }, 400);
    }

    const now = new Date().toISOString();
    const transactionIds: string[] = [];
    let skippedDuplicates = 0;

    // Move each staged transaction to final transactions table
    for (const staged of stagedTransactions.results) {
      // --- Transfer rows ---
      if ((staged as any).is_transfer === 1) {
        const transferAccountId = (staged as any).transfer_account_id;
        if (!transferAccountId) continue; // misconfigured, skip

        // Duplicate check for transfer rows (check both sides by transfer_pair shared description)
        const dupCheck = await env.DB.prepare(`
          SELECT id FROM transactions
          WHERE bank_account_id = ? AND transaction_date = ? AND description = ? AND amount = ?
          LIMIT 1
        `).bind(staged.bank_account_id, staged.transaction_date, staged.description, staged.net_amount).first<{ id: string }>();
        if (dupCheck) {
          skippedDuplicates++;
          await env.DB.prepare(`UPDATE staged_transactions SET review_status = 'duplicate' WHERE id = ?`).bind(staged.id).run();
          continue;
        }

        const pairId = nanoid();
        const txIdA = nanoid();
        const txIdB = nanoid();
        transactionIds.push(txIdA, txIdB);

        // Side A: debit from source account (net_amount is negative for money_out)
        await env.DB.prepare(`
          INSERT INTO transactions (
            id, source_staged_transaction_id, import_id, bank_account_id,
            transaction_date, description, reference, amount, balance, category_id,
            scope, tax_deductible, notes, allocation_source, transfer_pair_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          txIdA, staged.id, staged.import_id, staged.bank_account_id,
          staged.transaction_date, staged.description, staged.reference,
          staged.net_amount, staged.balance ?? null, '__transfer__',
          staged.scope || 'personal', staged.tax_deductible || 0, staged.notes,
          'manual', pairId, now, now
        ).run();

        // Side B: credit to destination account (inverted amount)
        await env.DB.prepare(`
          INSERT INTO transactions (
            id, source_staged_transaction_id, import_id, bank_account_id,
            transaction_date, description, reference, amount, balance, category_id,
            scope, tax_deductible, notes, allocation_source, transfer_pair_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          txIdB, staged.id, staged.import_id, transferAccountId,
          staged.transaction_date, staged.description, staged.reference,
          -staged.net_amount, null, '__transfer__',
          staged.scope || 'personal', staged.tax_deductible || 0, staged.notes,
          'manual', pairId, now, now
        ).run();

        continue;
      }

      // --- Normal allocated rows ---
      if (!staged.assigned_category_id) {
        continue; // Skip transactions without category
      }

      // Duplicate check: same account, date, description, and net_amount already finalised
      const duplicate = await env.DB.prepare(`
        SELECT id FROM transactions
        WHERE bank_account_id = ?
          AND transaction_date = ?
          AND description = ?
          AND amount = ?
        LIMIT 1
      `).bind(
        staged.bank_account_id,
        staged.transaction_date,
        staged.description,
        staged.net_amount
      ).first<{ id: string }>();

      if (duplicate) {
        skippedDuplicates++;
        // Mark the staged row as a duplicate so it shows clearly in the UI
        await env.DB.prepare(
          `UPDATE staged_transactions SET review_status = 'duplicate' WHERE id = ?`
        ).bind(staged.id).run();
        continue;
      }

      const transactionId = nanoid();
      transactionIds.push(transactionId);

      await env.DB.prepare(`
        INSERT INTO transactions (
          id, source_staged_transaction_id, import_id, bank_account_id,
          transaction_date, description, reference, amount, balance, category_id,
          scope, tax_deductible, notes, allocation_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        transactionId,
        staged.id,
        staged.import_id,
        staged.bank_account_id,
        staged.transaction_date,
        staged.description,
        staged.reference,
        staged.net_amount,
        staged.balance ?? null,
        staged.assigned_category_id,
        staged.scope || 'personal',
        staged.tax_deductible || 0,
        staged.notes,
        staged.allocation_source || 'manual',
        now,
        now
      ).run();
    }

    // Check whether any unallocated rows remain
    const remaining = await env.DB.prepare(`
      SELECT COUNT(*) as cnt FROM staged_transactions
      WHERE import_id = ? AND review_status NOT IN ('allocated', 'duplicate', 'transfer')
    `).bind(id).first<{ cnt: number }>();

    const hasRemaining = (remaining?.cnt ?? 0) > 0;

    // Mark as finalised only when everything is done; otherwise stay 'ready' (partial)
    await env.DB.prepare(`
      UPDATE imports 
      SET status = ?, finalised_at = ?
      WHERE id = ?
    `).bind(hasRemaining ? 'ready' : 'finalised', now, id).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM imports WHERE id = ?'
    ).bind(id).first<Import>();

    return jsonResponse({
      success: true,
      data: {
        import: updated,
        transactions_created: transactionIds.length,
        transaction_ids: transactionIds,
        partial: hasRemaining,
        remaining_rows: remaining?.cnt ?? 0,
        skipped_duplicates: skippedDuplicates,
      },
    });
  } catch (error) {
    console.error('Error finalizing import:', error);
    return jsonResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
}
