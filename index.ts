// CorkBooksV3 - Cloudflare Worker Entry Point
import { Env } from './types';
import { handleLogin, handleLogout, handleMe } from './routes/auth';
import {
  handleListUsers,
  handleGetUser,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleGetUserPermissions,
  handleUpdateUserPermissions,
  handleDeleteUserPermissions
} from './routes/users';
import {
  handleGetMenuItems,
  handleListRoles,
  handleGetRole,
  handleUpdateRole
} from './routes/role-management';
import { 
  handleListCategories, 
  handleGetCategory, 
  handleCreateCategory, 
  handleUpdateCategory 
} from './routes/categories';
import { 
  handleListBankAccounts, 
  handleGetBankAccount, 
  handleCreateBankAccount, 
  handleUpdateBankAccount 
} from './routes/bank-accounts';
import {
  handleListImportConfigs,
  handleGetImportConfig,
  handleCreateImportConfig,
  handleUpdateImportConfig
} from './routes/import-configs';
import {
  handleListImportTemplates,
  handleGetImportTemplate,
  handleCreateImportTemplate,
  handleUpdateImportTemplate,
  handleDeleteImportTemplate
} from './routes/import-templates';
import {
  handleUploadImport,
  handleListImports,
  handleGetImport,
  handleGetStagedTransactions,
  handleUpdateStagedTransaction,
  handleFinalizeImport,
  handleDownloadImportFile
} from './routes/imports';
import { handleListTransactions } from './routes/transactions';
import { handleGetReconciliation } from './routes/reconciliation';
import { validateRequestOrigin, csrfErrorResponse } from './middleware/csrf';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Get origin for CORS - strict allowlist only
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://corkbookv3.pages.dev',
      'https://aef0d1be.corkbookv3.pages.dev', // Production deployment
    ];
    
    // Only allow exact matches - no wildcards or pattern matching
    const isAllowed = allowedOrigins.includes(origin);
    
    const corsOrigin = isAllowed ? origin : 'null';

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    if (url.pathname.startsWith('/api/')) {
      // CSRF Protection: Validate origin for state-changing requests
      if (!validateRequestOrigin(request, allowedOrigins)) {
        const csrfResponse = csrfErrorResponse();
        Object.entries(corsHeaders).forEach(([key, value]) => {
          csrfResponse.headers.set(key, value);
        });
        return csrfResponse;
      }

      try {
        let response: Response;

        // Auth routes
        if (url.pathname === '/api/auth/login' && request.method === 'POST') {
          response = await handleLogin(request, env);
        } else if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
          response = await handleLogout();
        } else if (url.pathname === '/api/auth/me' && request.method === 'GET') {
          response = await handleMe(request, env);
        }
        // User management routes (admin only)
        else if (url.pathname === '/api/users' && request.method === 'GET') {
          response = await handleListUsers(request, env);
        } else if (url.pathname === '/api/users' && request.method === 'POST') {
          response = await handleCreateUser(request, env);
        } else if (url.pathname.match(/^\/api\/users\/[^\/]+\/permissions$/) && request.method === 'GET') {
          const id = url.pathname.split('/')[3];
          response = await handleGetUserPermissions(request, env, id);
        } else if (url.pathname.match(/^\/api\/users\/[^\/]+\/permissions$/) && request.method === 'PATCH') {
          const id = url.pathname.split('/')[3];
          response = await handleUpdateUserPermissions(request, env, id);
        } else if (url.pathname.match(/^\/api\/users\/[^\/]+\/permissions$/) && request.method === 'DELETE') {
          const id = url.pathname.split('/')[3];
          response = await handleDeleteUserPermissions(request, env, id);
        } else if (url.pathname.startsWith('/api/users/') && request.method === 'GET') {
          const id = url.pathname.split('/').pop()!;
          response = await handleGetUser(request, env, id);
        } else if (url.pathname.startsWith('/api/users/') && request.method === 'PATCH') {
          const id = url.pathname.split('/').pop()!;
          response = await handleUpdateUser(request, env, id);
        } else if (url.pathname.startsWith('/api/users/') && request.method === 'DELETE') {
          const id = url.pathname.split('/').pop()!;
          response = await handleDeleteUser(request, env, id);
        }
        // Role management routes (admin only)
        else if (url.pathname === '/api/role-management/menu-items' && request.method === 'GET') {
          response = await handleGetMenuItems(request, env);
        } else if (url.pathname === '/api/role-management/roles' && request.method === 'GET') {
          response = await handleListRoles(request, env);
        } else if (url.pathname.match(/^\/api\/role-management\/roles\/[^\/]+$/) && request.method === 'GET') {
          const role = url.pathname.split('/').pop()!;
          response = await handleGetRole(role, request, env);
        } else if (url.pathname.match(/^\/api\/role-management\/roles\/[^\/]+$/) && request.method === 'PATCH') {
          const role = url.pathname.split('/').pop()!;
          response = await handleUpdateRole(role, request, env);
        }
        // Categories routes
        else if (url.pathname === '/api/categories' && request.method === 'GET') {
          response = await handleListCategories(request, env);
        } else if (url.pathname === '/api/categories' && request.method === 'POST') {
          response = await handleCreateCategory(request, env);
        } else if (url.pathname.startsWith('/api/categories/') && request.method === 'GET') {
          const id = url.pathname.split('/').pop()!;
          response = await handleGetCategory(request, env, id);
        } else if (url.pathname.startsWith('/api/categories/') && request.method === 'PATCH') {
          const id = url.pathname.split('/').pop()!;
          response = await handleUpdateCategory(request, env, id);
        }
        // Bank Accounts routes
        else if (url.pathname === '/api/bank-accounts' && request.method === 'GET') {
          response = await handleListBankAccounts(request, env);
        } else if (url.pathname === '/api/bank-accounts' && request.method === 'POST') {
          response = await handleCreateBankAccount(request, env);
        } else if (url.pathname.startsWith('/api/bank-accounts/') && request.method === 'GET') {
          const id = url.pathname.split('/').pop()!;
          response = await handleGetBankAccount(request, env, id);
        } else if (url.pathname.startsWith('/api/bank-accounts/') && request.method === 'PATCH') {
          const id = url.pathname.split('/').pop()!;
          response = await handleUpdateBankAccount(request, env, id);
        }
        // Import Configs routes
        else if (url.pathname === '/api/import-configs' && request.method === 'GET') {
          response = await handleListImportConfigs(request, env);
        } else if (url.pathname === '/api/import-configs' && request.method === 'POST') {
          response = await handleCreateImportConfig(request, env);
        } else if (url.pathname.startsWith('/api/import-configs/') && request.method === 'GET') {
          const id = url.pathname.split('/').pop()!;
          response = await handleGetImportConfig(request, env, id);
        } else if (url.pathname.startsWith('/api/import-configs/') && request.method === 'PATCH') {
          const id = url.pathname.split('/').pop()!;
          response = await handleUpdateImportConfig(request, env, id);
        }
        // Import Templates routes
        else if (url.pathname === '/api/import-templates' && request.method === 'GET') {
          response = await handleListImportTemplates(request, env);
        } else if (url.pathname === '/api/import-templates' && request.method === 'POST') {
          response = await handleCreateImportTemplate(request, env);
        } else if (url.pathname.startsWith('/api/import-templates/') && request.method === 'GET') {
          const id = url.pathname.split('/').pop()!;
          response = await handleGetImportTemplate(request, env, id);
        } else if (url.pathname.startsWith('/api/import-templates/') && request.method === 'PATCH') {
          const id = url.pathname.split('/').pop()!;
          response = await handleUpdateImportTemplate(request, env, id);
        } else if (url.pathname.startsWith('/api/import-templates/') && request.method === 'DELETE') {
          const id = url.pathname.split('/').pop()!;
          response = await handleDeleteImportTemplate(request, env, id);
        }
        // Imports routes
        else if (url.pathname === '/api/imports/upload' && request.method === 'POST') {
          response = await handleUploadImport(request, env);
        } else if (url.pathname === '/api/imports' && request.method === 'GET') {
          response = await handleListImports(request, env);
        } else if (url.pathname.match(/^\/api\/imports\/[^\/]+$/) && request.method === 'GET') {
          const id = url.pathname.split('/').pop()!;
          response = await handleGetImport(request, env, id);
        } else if (url.pathname.match(/^\/api\/imports\/[^\/]+\/staged-transactions$/) && request.method === 'GET') {
          const id = url.pathname.split('/')[3];
          response = await handleGetStagedTransactions(request, env, id);
        } else if (url.pathname.match(/^\/api\/imports\/[^\/]+\/finalize$/) && request.method === 'POST') {
          const id = url.pathname.split('/')[3];
          response = await handleFinalizeImport(request, env, id);
        } else if (url.pathname.match(/^\/api\/imports\/[^\/]+\/download$/) && request.method === 'GET') {
          const id = url.pathname.split('/')[3];
          response = await handleDownloadImportFile(request, env, id);
        } else if (url.pathname.startsWith('/api/staged-transactions/') && request.method === 'PATCH') {
          const id = url.pathname.split('/').pop()!;
          response = await handleUpdateStagedTransaction(request, env, id);
        }
        // Transactions routes
        else if (url.pathname === '/api/transactions' && request.method === 'GET') {
          response = await handleListTransactions(request, env);
        }
        else if (url.pathname === '/api/reconciliation' && request.method === 'GET') {
          response = await handleGetReconciliation(request, env);
        }
        // 404 handler
        else {
          response = new Response(
            JSON.stringify({ success: false, error: 'Not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Add CORS headers to response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Internal server error',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // For non-API routes, return 404
    // In production, this would serve the static frontend from Cloudflare Pages
    return new Response('Not Found', { status: 404 });
  },
};
