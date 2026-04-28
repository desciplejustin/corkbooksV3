# Phase 1 Setup Guide

## Phase 1 - Setup & Auth ✅ COMPLETE & TESTED

**Status:** All tests passing! Authentication system is fully functional.

This guide documents the setup and testing that was completed for Phase 1.

## Prerequisites

- Node.js installed
- Cloudflare account (for deployment, not needed for local testing)
- Terminal/Command Prompt

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variable

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and set a secure JWT secret:
```
JWT_SECRET=my-super-secret-jwt-key-please-change-me
ENVIRONMENT=development
```

For local testing, the default is fine. Change it for production.

### 3. Create and Configure D1 Database

Create the database:
```bash
wrangler d1 create corkbookv3_db
```

You'll see output like this:
```
✅ Successfully created DB 'corkbookv3_db'

[[d1_databases]]
binding = "DB"
database_name = "corkbookv3_db"
database_id = "xxxx-xxxx-xxxx-xxxx"
```

**Update `wrangler.toml`:** Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "corkbookv3_db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Replace this
```

### 4. Run Database Migrations

Initialize the database with the users table:
```bash
wrangler d1 execute corkbookv3_db --local --file=./schema/0001_init.sql
```

Seed test users:
```bash
wrangler d1 execute corkbookv3_db --local --file=./schema/0002_seed.sql
```

### 5. Start Both Development Servers

You'll need **two terminal windows**:

**Terminal 1 - Start the Frontend:**
```bash
npm run dev
```

This starts Vite on http://localhost:3000

**Terminal 2 - Start the Backend Worker:**
```bash
npm run dev:worker
```

This starts the Cloudflare Worker on http://localhost:8787

### 6. Test the Application

1. Open your browser to: **http://localhost:3000**
2. You should see the login page
3. Try logging in with these test accounts:

**Admin Account:**
- Email: `admin@corkbooks.test`
- Password: `password123`

**Editor Account:**
- Email: `editor@corkbooks.test`
- Password: `password123`

## Phase 1 Testing Checklist

✅ All tests completed successfully!

- [x] Frontend loads at http://localhost:3001
- [x] Backend Worker runs at http://localhost:8787
- [x] Login page displays correctly
- [x] Can log in with admin credentials (admin@corkbooks.test / password123)
- [x] Can log in with editor credentials (editor@corkbooks.test / password123)
- [x] Wrong credentials display an error message
- [x] After login, dashboard shows correct user info
- [x] User email and role badge display in header
- [x] Logout button works and redirects to login
- [x] Accessing /dashboard while logged out redirects to login page
- [x] Accessing /dashboard while logged in shows the dashboard

## Testing Complete! 🎉

Phase 1 authentication system is fully functional and ready for Phase 2.

## Troubleshooting

### "Cannot find module" errors
Run `npm install` to ensure all dependencies are installed.

### Database not found
Make sure you've run both migration files:
```bash
wrangler d1 execute corkbookv3_db --local --file=./schema/0001_init.sql
wrangler d1 execute corkbookv3_db --local --file=./schema/0002_seed.sql
```

### Worker not starting
Check that `wrangler.toml` has the correct `database_id`.

### CORS errors in browser
Make sure the Worker is running on port 8787 and the frontend proxy is configured correctly in `vite.config.ts`.

### Login fails with correct credentials
1. Check that the seed data was loaded: `wrangler d1 execute corkbookv3_db --local --command="SELECT * FROM users;"`
2. Verify JWT_SECRET is set in your environment
3. Check browser console for error messages

## What's Next?

Phase 1 is complete and tested! ✅

**Ready for Phase 2:** Categories & Bank Accounts CRUD
- Create database tables for categories and bank accounts
- Build backend CRUD API endpoints
- Create frontend management screens
- Test basic data entry and retrieval
- Deploy to Cloudflare after first CRUD slice works

See [build_plan.md](build_plan.md) for the full Phase 2 breakdown.

## Files Created in Phase 1

**Backend:**
- `wrangler.toml` - Cloudflare Worker configuration
- `index.ts` - Worker entry point and routing
- `types.ts` - TypeScript type definitions
- `schema/0001_init.sql` - Users table schema
- `schema/0002_seed.sql` - Seed user data
- `middleware/auth.ts` - JWT authentication middleware
- `middleware/rbac.ts` - Role-based access control
- `routes/auth.ts` - Login/logout/me endpoints

**Frontend:**
- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration
- `src/main.tsx` - React entry point
- `src/App.tsx` - Main app with routing
- `src/api.ts` - API client functions
- `src/utils/auth.ts` - Auth helper utilities
- `src/pages/Login.tsx` - Login page component
- `src/pages/Dashboard.tsx` - Dashboard page component
- `src/components/ProtectedRoute.tsx` - Protected route wrapper
- `src/nav.ts` - Navigation structure

**Configuration:**
- `.env` - Local environment variables
- `.env.example` - Environment template
