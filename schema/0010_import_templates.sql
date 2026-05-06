-- Migration 0010: Import templates and bank-account template linking
-- Introduces reusable statement parser templates and links bank accounts to a default template.

CREATE TABLE IF NOT EXISTS import_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    template_key TEXT NOT NULL UNIQUE,
    bank_name TEXT,
    format_type TEXT NOT NULL CHECK(format_type IN ('csv', 'pdf', 'ofx', 'qif')),
    parser_config TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_system INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_import_templates_bank_name ON import_templates(bank_name);
CREATE INDEX idx_import_templates_format_type ON import_templates(format_type);
CREATE INDEX idx_import_templates_active ON import_templates(is_active);

INSERT INTO import_templates (
    id, name, template_key, bank_name, format_type, parser_config,
    is_active, is_system, version, created_at, updated_at
)
SELECT
    'tpl_' || c.id,
    COALESCE(NULLIF(TRIM(a.bank_name || ' ' || a.name || ' Template'), ''), 'Imported Template'),
    'legacy_' || c.id,
    a.bank_name,
    c.format_type,
    c.parser_config,
    c.is_active,
    0,
    1,
    c.created_at,
    c.updated_at
FROM bank_import_configs c
LEFT JOIN bank_accounts a ON a.id = c.bank_account_id;

ALTER TABLE bank_accounts ADD COLUMN default_import_template_id TEXT REFERENCES import_templates(id);

UPDATE bank_accounts
SET default_import_template_id = (
    SELECT 'tpl_' || c.id
    FROM bank_import_configs c
    WHERE c.bank_account_id = bank_accounts.id
      AND c.is_active = 1
    ORDER BY c.updated_at DESC, c.created_at DESC
    LIMIT 1
);

ALTER TABLE imports RENAME TO imports_legacy;

CREATE TABLE imports (
    id TEXT PRIMARY KEY,
    bank_account_id TEXT NOT NULL,
    import_template_id TEXT NOT NULL,
    uploaded_by_user_id TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    source_file_key TEXT,
    source_format TEXT NOT NULL CHECK(source_format IN ('csv', 'pdf', 'ofx', 'qif')),
    statement_month TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'ready', 'finalised')),
    row_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    finalised_at TEXT,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (import_template_id) REFERENCES import_templates(id),
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);

INSERT INTO imports (
    id, bank_account_id, import_template_id, uploaded_by_user_id,
    source_filename, source_file_key, source_format, statement_month,
    period_start, period_end, notes, status, row_count, created_at, finalised_at
)
SELECT
    id,
    bank_account_id,
    'tpl_' || import_config_id,
    uploaded_by_user_id,
    source_filename,
    source_file_key,
    source_format,
    statement_month,
    period_start,
    period_end,
    notes,
    status,
    row_count,
    created_at,
    finalised_at
FROM imports_legacy;

DROP TABLE imports_legacy;

CREATE INDEX idx_imports_bank_account ON imports(bank_account_id);
CREATE INDEX idx_imports_template ON imports(import_template_id);
CREATE INDEX idx_imports_user ON imports(uploaded_by_user_id);
CREATE INDEX idx_imports_month ON imports(statement_month);
CREATE INDEX idx_imports_status ON imports(status);
CREATE INDEX idx_imports_format ON imports(source_format);