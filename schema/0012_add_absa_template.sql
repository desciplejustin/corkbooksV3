-- Add ABSA Savings CSV Template

INSERT INTO import_templates (
  id,
  name,
  template_key,
  bank_name,
  format_type,
  parser_config,
  is_active,
  is_system,
  version,
  created_at,
  updated_at
) VALUES (
  'tpl_absa_justin_savings',
  'ABSA Justin Savings',
  'absa_justin_savings',
  'ABSA',
  'csv',
  '{
    "delimiter": ",",
    "hasHeader": true,
    "dateColumn": "Date",
    "dateFormat": "YYYYMMDD",
    "descriptionColumn": "Description",
    "amountColumn": "Amount",
    "skipRows": 0
  }',
  1,
  0,
  1,
  datetime('now'),
  datetime('now')
);
