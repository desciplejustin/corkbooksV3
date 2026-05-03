-- Migration 0006: Add source_file_key to imports table
-- Stores the R2 object key for the original uploaded statement file

ALTER TABLE imports ADD COLUMN source_file_key TEXT;
