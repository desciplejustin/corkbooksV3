# CorkBooksV3

A web-based financial transaction allocation tool for importing bank statements, categorizing transactions, and generating tax reports for SARS (South African Revenue Service).

## 🚀 Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Authentication:** JWT with HTTP-only cookies
- **Authorization:** Role-based access control (RBAC)
- **Hosting:** Cloudflare Pages + Workers

## ✅ Current Status

**Phase 1 Complete:** Authentication System
- JWT authentication with secure cookies
- RBAC middleware (admin, editor, viewer roles)
- Protected routes and login flow
- User management with seed data

**Phase 2 Complete:** Categories & Bank Accounts CRUD
- Full CRUD operations for categories and bank accounts
- Frontend management pages with filters
- Active/inactive status toggling
- 12 pre-seeded categories (income & expense)
- Duplicate name validation

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/desciplejustin/corkbooksV3.git
   cd corkbooksV3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create local environment file**
   Create `.dev.vars` in the root directory:
   ```
   JWT_SECRET=local-dev-secret-key-change-in-production
   ```

4. **Set up the database**
   ```bash
   # Create local D1 database (copy database_id from output to wrangler.toml)
   npx wrangler d1 create corkbookv3_db
   
   # Run migrations
   npx wrangler d1 execute corkbookv3_db --local --file=./schema/0001_init.sql
   npx wrangler d1 execute corkbookv3_db --local --file=./schema/0002_seed.sql
   npx wrangler d1 execute corkbookv3_db --local --file=./schema/0003_categories_and_bank_accounts.sql
   npx wrangler d1 execute corkbookv3_db --local --file=./schema/0004_seed_categories_and_accounts.sql
   ```

5. **Start development servers**

   **Terminal 1 - Worker (Backend):**
   ```bash
   npm run dev:worker
   ```
   Runs on http://localhost:8787

   **Terminal 2 - Frontend:**
   ```bash
   npm run dev
   ```
   Runs on http://localhost:3001

6. **Access the application**
   Open http://localhost:3001/login

   **Test Accounts:**
   - Admin: `admin@corkbooks.test` / `password123`
   - Editor: `editor@corkbooks.test` / `password123`

## 📁 Project Structure

```
corkbooksV3/
├── schema/              # Database migrations
├── middleware/          # Auth and RBAC middleware
├── routes/              # API route handlers
├── src/                 # React frontend
│   ├── components/      # Reusable components
│   ├── pages/          # Page components
│   ├── utils/          # Utility functions
│   ├── api.ts          # API client
│   └── App.tsx         # Main app component
├── types.ts            # TypeScript type definitions
├── index.ts            # Worker entry point
├── wrangler.toml       # Cloudflare configuration
└── vite.config.ts      # Vite configuration
```

## 🗺️ Roadmap

- [x] **Phase 1:** Authentication & RBAC
- [x] **Phase 2:** Categories & Bank Accounts CRUD
- [ ] **Phase 3:** CSV Import Engine
- [ ] **Phase 4:** Transaction Review & Allocation Flow
- [ ] **Phase 5:** Dashboard & Reporting
- [ ] **Phase 6:** Rules Management & V1 Polish

See [build_plan.md](build_plan.md) for detailed implementation plan.

## 📋 Features

### Current Features
- ✅ Secure JWT authentication
- ✅ Role-based access control
- ✅ Categories management (income/expense)
- ✅ Bank accounts management
- ✅ Active/inactive status toggling
- ✅ Filter by type, scope, and status
- ✅ Duplicate validation

### Planned Features
- 📥 CSV bank statement import
- 🏷️ Transaction categorization
- 🤖 Auto-categorization rules
- 📊 Financial reports
- 🇿🇦 SARS tax report generation

## 🔐 Security

- JWT tokens stored in HTTP-only cookies
- CORS configured for allowed origins
- Environment variables for sensitive data
- Role-based access control on all endpoints
- Password hashing (planned for production)

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current user

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category (admin/editor)
- `PATCH /api/categories/:id` - Update category (admin/editor)

### Bank Accounts
- `GET /api/bank-accounts` - List all bank accounts
- `GET /api/bank-accounts/:id` - Get single account
- `POST /api/bank-accounts` - Create account (admin/editor)
- `PATCH /api/bank-accounts/:id` - Update account (admin/editor)

## 🧪 Testing

See [TESTING_PHASE2.md](TESTING_PHASE2.md) for the complete testing checklist.

## 🚀 Deployment

Deployment to Cloudflare will be configured after Phase 2 testing is complete.

## 📄 License

MIT

## 👤 Author

Justin Smit

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome via GitHub issues.

