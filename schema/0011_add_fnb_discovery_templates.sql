-- Insert FNB Template (based on Mel FNB - Mar 2025.pdf)
INSERT INTO import_templates (id, name, template_key, bank_name, format_type, parser_config, is_active, created_at, updated_at)
VALUES (
  lower(hex(randomblob(16))),
  'FNB Melissa FNB (Savings Acc.)',
  'fnb_melissa_savings',
  'FNB',
  'pdf',
  json_object(
    'pageStart', 1,
    'dateFormat', 'DD MMM',
    'skipLines', 32,
    'skipLinesSubsequent', 5,
    'linePattern', '^(?<date>\d{1,2}\s+\w{3})\s+(?<description>.+?)\s+(?<amount>[\d,]+\.\d{2}(?:Cr)?)\s+[\d,]+\.\d{2}Cr'
  ),
  1,
  datetime('now'),
  datetime('now')
);

-- Insert Discovery Template (based on Justin - Cheque account.pdf)
INSERT INTO import_templates (id, name, template_key, bank_name, format_type, parser_config, is_active, created_at, updated_at)
VALUES (
  lower(hex(randomblob(16))),
  'Discovery Justin DISCOVERY (Cheque Acc.)',
  'discovery_justin_cheque',
  'Discovery',
  'pdf',
  json_object(
    'pageStart', 1,
    'dateFormat', 'YYYY-MM-DD',
    'skipLines', 2,
    'skipLinesSubsequent', 1,
    'linePattern', '^(?<date>\d{4}-\d{2}-\d{2})\s+(?<description>.+?)\s+R\s+(?<amount>[\d,]+\.\d{2})\s+R\s+[\d,]+\.\d{2}$'
  ),
  1,
  datetime('now'),
  datetime('now')
);
