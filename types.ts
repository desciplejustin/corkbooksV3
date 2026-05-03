// CorkBooksV3 Types

// Cloudflare Worker Environment
export interface Env {
  DB: D1Database;
  STATEMENTS: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

// User & Auth Types
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: UserPublic;
}

// Bank Import Config Types
export type ImportFormatType = 'csv' | 'pdf' | 'ofx' | 'qif';

export interface CSVParserConfig {
  delimiter: string;
  hasHeader: boolean;
  dateColumn: string;
  dateFormat: string;
  descriptionColumn: string;
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  referenceColumn?: string;
  skipRows?: number;
}

export interface PDFParserConfig {
  /** Regex with named groups: date, description, and amount OR debit+credit. Optional: reference. */
  linePattern: string;
  /** Date format, e.g. DD/MM/YYYY */
  dateFormat: string;
  /** Lines to skip at the top of the FIRST page of data (e.g. statement header). Default 0. */
  skipLines?: number;
  /** Lines to skip at the top of pages 2, 3, etc. (usually just column header row). Default 0. */
  skipLinesSubsequent?: number;
  /** First page containing transactions (1-based). Default 1. */
  pageStart?: number;
}

export interface BankImportConfig {
  id: string;
  bank_account_id: string;
  format_type: ImportFormatType;
  parser_config: string; // JSON string
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Import Types
export type ImportStatus = 'draft' | 'ready' | 'finalised';

export interface Import {
  id: string;
  bank_account_id: string;
  import_config_id: string;
  uploaded_by_user_id: string;
  source_filename: string;
  source_file_key: string | null;
  source_format: ImportFormatType;
  statement_month: string; // YYYY-MM
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  status: ImportStatus;
  row_count: number;
  created_at: string;
  finalised_at: string | null;
}

// Staged Transaction Types
export type AllocationSource = 'manual' | 'rule' | 'history';
export type TransactionScope = 'personal' | 'business' | 'shared';
export type ReviewStatus = 'unallocated' | 'allocated' | 'needs_review' | 'duplicate' | 'transfer';

export interface StagedTransaction {
  id: string;
  import_id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  reference: string | null;
  money_in: number;
  money_out: number;
  net_amount: number;
  balance: number | null;  // bank-reported running balance from statement
  suggested_category_id: string | null;
  assigned_category_id: string | null;
  allocation_source: AllocationSource | null;
  scope: TransactionScope | null;
  tax_deductible: number | null;
  notes: string | null;
  review_status: ReviewStatus;
  matched_rule_id: string | null;
  raw_row_json: string | null;
  is_transfer: number;
  transfer_account_id: string | null;
  created_at: string;
  updated_at: string;
}

// Allocation Rule Types
export type RuleMatchType = 'contains' | 'exact';

export interface AllocationRule {
  id: string;
  name: string;
  match_type: RuleMatchType;
  match_value: string;
  bank_account_id: string | null;
  category_id: string;
  scope: TransactionScope;
  tax_deductible: number;
  priority: number;
  is_active: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  last_matched_at: string | null;
}

// Final Transaction Types
export interface Transaction {
  id: string;
  source_staged_transaction_id: string;
  import_id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  reference: string | null;
  amount: number;
  balance: number | null;  // bank-reported running balance from statement
  category_id: string;
  scope: TransactionScope;
  tax_deductible: number;
  notes: string | null;
  allocation_source: AllocationSource;
  transfer_pair_id: string | null;
  created_at: string;
  updated_at: string;
}

