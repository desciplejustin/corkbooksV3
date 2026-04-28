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
  is_active: number;
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
