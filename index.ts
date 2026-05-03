// CorkBooksV3 - Cloudflare Worker Entry Point
import { Env } from './types';
import { handleLogin, handleLogout, handleMe } from './routes/auth';
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Get origin for CORS (supports local dev and production)
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://corkbookv3.pages.dev', // Cloudflare Pages default
    ];
    
    // Allow any *.pages.dev subdomain or configured origin
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.pages.dev') ||
                      (origin.startsWith('https://') && origin.includes('corkbook'));
    
    const corsOrigin = isAllowed ? origin : allowedOrigins[0];

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
