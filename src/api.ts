// Frontend API Client
// All API calls should go through this file

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface RolePermissions {
  role: string;
  permissions: Record<string, boolean>;
  updated_at: string;
}

export interface UserPermissions {
  user_id: string;
  role: string;
  default_permissions: Record<string, boolean>;
  custom_permissions: Record<string, boolean> | null;
  effective_permissions: Record<string, boolean>;
  has_custom_permissions: boolean;
}

export interface Category {
  id: string;
  name: string;
  category_type: 'income' | 'expense';
  scope: 'personal' | 'business' | 'shared';
  sars_related: number;
  is_active: number;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_number_masked: string;
  owner_name: string;
  account_type: string | null;
  default_import_template_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ImportTemplate {
  id: string;
  name: string;
  template_key: string;
  bank_name: string | null;
  format_type: 'csv' | 'pdf' | 'ofx' | 'qif';
  parser_config: string;
  is_active: number;
  is_system: number;
  version: number;
  created_at: string;
  updated_at: string;
}

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
  dateFormat: string;
  /** Lines to skip at the top of the first page of data (statement header). Default 0. */
  skipLines?: number;
  /** Lines to skip at the top of pages 2+ (usually just column header row). Default 0. */
  skipLinesSubsequent?: number;
  pageStart?: number;
}

export interface BankImportConfig {
  id: string;
  bank_account_id: string;
  format_type: 'csv' | 'pdf' | 'ofx' | 'qif';
  parser_config: string; // JSON string
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Import {
  id: string;
  bank_account_id: string;
  import_template_id: string;
  uploaded_by_user_id: string;
  source_filename: string;
  source_file_key: string | null;
  source_format: string;
  statement_month: string;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  status: 'draft' | 'ready' | 'finalised';
  row_count: number;
  reviewed_count?: number;
  created_at: string;
  finalised_at: string | null;
}

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
  suggested_category_id: string | null;
  assigned_category_id: string | null;
  allocation_source: string | null;
  scope: 'personal' | 'business' | 'shared' | null;
  tax_deductible: number | null;
  notes: string | null;
  review_status: 'unallocated' | 'allocated' | 'needs_review' | 'duplicate' | 'transfer';
  is_transfer: number;
  transfer_account_id: string | null;
  created_at: string;
  updated_at: string;
}

// Generic API call helper
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Auth API calls
export const authApi = {
  async login(email: string, password: string): Promise<ApiResponse<UserPublic>> {
    return apiCall<UserPublic>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<ApiResponse<null>> {
    return apiCall<null>('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<ApiResponse<UserPublic>> {
    return apiCall<UserPublic>('/api/auth/me', {
      method: 'GET',
    });
  },
};

// Categories API calls
export const categoriesApi = {
  async list(): Promise<ApiResponse<Category[]>> {
    return apiCall<Category[]>('/api/categories', {
      method: 'GET',
    });
  },

  async get(id: string): Promise<ApiResponse<Category>> {
    return apiCall<Category>(`/api/categories/${id}`, {
      method: 'GET',
    });
  },

  async create(data: Partial<Category>): Promise<ApiResponse<Category>> {
    return apiCall<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Category>): Promise<ApiResponse<Category>> {
    return apiCall<Category>(`/api/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Bank Accounts API calls
export const bankAccountsApi = {
  async list(): Promise<ApiResponse<BankAccount[]>> {
    return apiCall<BankAccount[]>('/api/bank-accounts', {
      method: 'GET',
    });
  },

  async get(id: string): Promise<ApiResponse<BankAccount>> {
    return apiCall<BankAccount>(`/api/bank-accounts/${id}`, {
      method: 'GET',
    });
  },

  async create(data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> {
    return apiCall<BankAccount>('/api/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> {
    return apiCall<BankAccount>(`/api/bank-accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const importTemplatesApi = {
  async list(options?: { includeInactive?: boolean; bankName?: string }): Promise<ApiResponse<ImportTemplate[]>> {
    const params = new URLSearchParams();
    if (options?.includeInactive) params.set('include_inactive', '1');
    if (options?.bankName) params.set('bank_name', options.bankName);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiCall<ImportTemplate[]>(`/api/import-templates${qs}`, { method: 'GET' });
  },

  async get(id: string): Promise<ApiResponse<ImportTemplate>> {
    return apiCall<ImportTemplate>(`/api/import-templates/${id}`, { method: 'GET' });
  },

  async create(data: Partial<ImportTemplate>): Promise<ApiResponse<ImportTemplate>> {
    return apiCall<ImportTemplate>('/api/import-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<ImportTemplate>): Promise<ApiResponse<ImportTemplate>> {
    return apiCall<ImportTemplate>(`/api/import-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    return apiCall<null>(`/api/import-templates/${id}`, {
      method: 'DELETE',
    });
  },
};

// Import Configs API calls
export const importConfigsApi = {
  async list(bankAccountId?: string): Promise<ApiResponse<BankImportConfig[]>> {
    const qs = bankAccountId ? `?bank_account_id=${bankAccountId}` : '';
    return apiCall<BankImportConfig[]>(`/api/import-configs${qs}`, { method: 'GET' });
  },

  async get(id: string): Promise<ApiResponse<BankImportConfig>> {
    return apiCall<BankImportConfig>(`/api/import-configs/${id}`, { method: 'GET' });
  },

  async create(data: {
    bank_account_id: string;
    format_type: string;
    parser_config: CSVParserConfig;
  }): Promise<ApiResponse<BankImportConfig>> {
    return apiCall<BankImportConfig>('/api/import-configs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<BankImportConfig>): Promise<ApiResponse<BankImportConfig>> {
    return apiCall<BankImportConfig>(`/api/import-configs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Imports API calls
export const importsApi = {
  async list(filters?: { bank_account_id?: string; status?: string }): Promise<ApiResponse<Import[]>> {
    const params = new URLSearchParams();
    if (filters?.bank_account_id) params.set('bank_account_id', filters.bank_account_id);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiCall<Import[]>(`/api/imports${qs}`, { method: 'GET' });
  },

  async get(id: string): Promise<ApiResponse<Import>> {
    return apiCall<Import>(`/api/imports/${id}`, { method: 'GET' });
  },

  async upload(formData: FormData): Promise<ApiResponse<{
    import: Import;
    parsed_rows: number;
    skipped_rows: number;
  }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/imports/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData, // No Content-Type header – browser sets multipart/form-data
      });
      return response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  async getStagedTransactions(importId: string): Promise<ApiResponse<StagedTransaction[]>> {
    return apiCall<StagedTransaction[]>(`/api/imports/${importId}/staged-transactions`, { method: 'GET' });
  },

  async updateStagedTransaction(id: string, data: {
    assigned_category_id?: string;
    scope?: string;
    tax_deductible?: number;
    notes?: string;
    review_status?: string;
    is_transfer?: number;
    transfer_account_id?: string | null;
  }): Promise<ApiResponse<StagedTransaction>> {
    return apiCall<StagedTransaction>(`/api/staged-transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async finalize(importId: string): Promise<ApiResponse<{ transactions_created: number; partial: boolean; remaining_rows: number; skipped_duplicates: number }>> {
    return apiCall(`/api/imports/${importId}/finalize`, { method: 'POST' });
  },

  downloadUrl(importId: string): string {
    return `${API_BASE_URL}/api/imports/${importId}/download`;
  },
};

// User Management API calls (Admin only)
export const usersApi = {
  async list(includeInactive = false): Promise<ApiResponse<UserPublic[]>> {
    const qs = includeInactive ? '?include_inactive=true' : '';
    return apiCall<UserPublic[]>(`/api/users${qs}`, {
      method: 'GET',
    });
  },

  async get(id: string): Promise<ApiResponse<UserPublic>> {
    return apiCall<UserPublic>(`/api/users/${id}`, {
      method: 'GET',
    });
  },

  async create(data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
  }): Promise<ApiResponse<UserPublic>> {
    return apiCall<UserPublic>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
    is_active?: number;
  }): Promise<ApiResponse<UserPublic>> {
    return apiCall<UserPublic>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    return apiCall<{ id: string; deleted: boolean }>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  async getPermissions(id: string): Promise<ApiResponse<UserPermissions>> {
    return apiCall<UserPermissions>(`/api/users/${id}/permissions`, {
      method: 'GET',
    });
  },

  async updatePermissions(id: string, permissions: Record<string, boolean>): Promise<ApiResponse<any>> {
    return apiCall(`/api/users/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
  },

  async deletePermissions(id: string): Promise<ApiResponse<any>> {
    return apiCall(`/api/users/${id}/permissions`, {
      method: 'DELETE',
    });
  },
};

// Role Management API calls (Admin only)
export const roleManagementApi = {
  async getMenuItems(): Promise<ApiResponse<MenuItem[]>> {
    return apiCall<MenuItem[]>('/api/role-management/menu-items', {
      method: 'GET',
    });
  },

  async listRoles(): Promise<ApiResponse<RolePermissions[]>> {
    return apiCall<RolePermissions[]>('/api/role-management/roles', {
      method: 'GET',
    });
  },

  async getRole(role: string): Promise<ApiResponse<RolePermissions>> {
    return apiCall<RolePermissions>(`/api/role-management/roles/${role}`, {
      method: 'GET',
    });
  },

  async updateRole(role: string, permissions: Record<string, boolean>): Promise<ApiResponse<RolePermissions>> {
    return apiCall<RolePermissions>(`/api/role-management/roles/${role}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
  },
};

// Transaction Types
export interface Transaction {
  id: string;
  import_id: string;
  bank_account_id: string;
  bank_account_name: string;
  bank_name: string;
  transaction_date: string;
  description: string;
  reference: string | null;
  amount: number;
  balance: number | null;  // bank-reported running balance from statement
  category_id: string;
  category_name: string | null;
  category_type: string | null;
  scope: string;
  tax_deductible: number;
  notes: string | null;
  allocation_source: string;
  transfer_pair_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResult {
  transactions: Transaction[];
  total: number;
  total_in: number;
  total_out: number;
  limit: number;
  offset: number;
}

// Reconciliation Types
export interface ReconciliationResult {
  bank_account: { id: string; name: string; bank_name: string };
  period: { from: string; to: string };
  opening_balance: number | null;
  closing_balance: number | null;
  total_in: number;
  total_out: number;
  transaction_count: number;
  computed_closing: number | null;
  variance: number | null;
  balanced: boolean | null;
  has_balance_data: boolean;
}

// Transactions API calls
export const transactionsApi = {
  async list(filters?: {
    bank_account_id?: string;
    category_id?: string;
    month?: string;
    scope?: string;
    search?: string;
    include_transfers?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<TransactionListResult>> {
    const params = new URLSearchParams();
    if (filters?.bank_account_id) params.set('bank_account_id', filters.bank_account_id);
    if (filters?.category_id) params.set('category_id', filters.category_id);
    if (filters?.month) params.set('month', filters.month);
    if (filters?.scope) params.set('scope', filters.scope);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.include_transfers !== undefined) params.set('include_transfers', String(filters.include_transfers));
    if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
    if (filters?.offset !== undefined) params.set('offset', String(filters.offset));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiCall<TransactionListResult>(`/api/transactions${qs}`, { method: 'GET' });
  },
};

// Reconciliation API calls
export const reconciliationApi = {
  async get(
    bankAccountId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ApiResponse<ReconciliationResult>> {
    const params = new URLSearchParams({
      bank_account_id: bankAccountId,
      date_from: dateFrom,
      date_to: dateTo,
    });
    return apiCall<ReconciliationResult>(`/api/reconciliation?${params.toString()}`, { method: 'GET' });
  },
};
