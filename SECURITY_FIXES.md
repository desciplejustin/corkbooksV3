# Security Fixes Applied - May 6, 2026

## Critical Fixes Implemented

### 1. ✅ Authentication Bypass Removed
**Issue**: Password verification was accepting `password123` for any account, bypassing the stored hash.

**Fix Applied**:
- Removed hardcoded password bypass in `routes/auth.ts`
- Implemented proper PBKDF2 password verification using Web Crypto API
- Hash format: `$pbkdf2$iterations$salt$hash`

**Required Actions**:
```bash
# 1. Apply password hash migration
wrangler d1 execute corkbookv3_db --local --file=./schema/0009_update_password_hashes.sql
wrangler d1 execute corkbookv3_db --remote --file=./schema/0009_update_password_hashes.sql

# 2. IMMEDIATELY after migration, change all seed user passwords:
# - Login to each account
# - Update password through user management UI (to be implemented)
# - OR delete seed accounts and create new ones

# 3. Rotate JWT_SECRET
wrangler secret put JWT_SECRET
# Enter a new 128+ character random string
```

### 2. ✅ CORS Policy Hardened
**Issue**: Overly permissive CORS allowed any `*.pages.dev` subdomain and any domain containing "corkbook".

**Fix Applied**:
- Restricted to explicit allowlist in `index.ts`
- Removed wildcard pattern matching
- Only exact origin matches allowed

**Current Allowed Origins**:
```
- http://localhost:3000
- http://localhost:3001
- http://localhost:5173
- https://corkbookv3.pages.dev
- https://aef0d1be.corkbookv3.pages.dev
```

**Action Required**: Update the allowlist if deploying to a new domain.

### 3. ✅ CSRF Protection Added
**Issue**: Cookie-based auth with cross-site cookies but no CSRF protection.

**Fix Applied**:
- Created `middleware/csrf.ts` with Origin/Referer validation
- All POST/PATCH/PUT/DELETE requests now validate request origin
- Integrated into main router in `index.ts`

**How It Works**:
- State-changing requests must have Origin or Referer header matching allowlist
- GET/HEAD/OPTIONS requests pass through (read-only)
- Returns 403 with clear error message on validation failure

### 4. ✅ Upload Security Enhanced
**Issue**: No file size limits or type validation on statement uploads.

**Fix Applied** in `routes/imports.ts`:
- 10MB file size limit enforced
- File type validation (CSV, PDF, plain text only)
- Clear error messages for rejected uploads

### 5. ✅ ReDoS Protection Added
**Issue**: User-supplied regex patterns compiled without validation.

**Fix Applied** in `utils/pdf-parser.ts`:
- Maximum pattern length: 500 characters
- Pattern analysis for dangerous constructs:
  - Multiple `.*` in sequence
  - Multiple `.+` in sequence
  - Deeply nested non-capturing groups
- Validation before compilation

### 6. ✅ Object-Level Authorization Added
**Issue**: Any authenticated user could access all imports, transactions, and bank accounts.

**Fix Applied**:
- Created `middleware/authorization.ts` with ownership checking helpers
- Added `user_id` column to `bank_accounts` table (migration 0010)
- Updated all data access routes:
  - `routes/bank-accounts.ts`: Set user_id on create, filter lists by ownership, check ownership on access
  - `routes/imports.ts`: Validate bank account ownership, filter lists by owned accounts
  - `routes/transactions.ts`: Filter by owned bank accounts only
  - `routes/reconciliation.ts`: Check bank account ownership before reconciliation

**Security Model**:
- **Admin users**: Can access all data (full visibility)
- **Editor/Viewer users**: Can only access their own bank accounts and related data
- **Ownership cascades**: Bank accounts → Imports → Transactions
- **New bank accounts**: Automatically assigned to creating user

**Required Actions**:
```bash
# Apply ownership migration
wrangler d1 execute corkbookv3_db --local --file=./schema/0010_add_bank_account_ownership.sql
wrangler d1 execute corkbookv3_db --remote --file=./schema/0010_add_bank_account_ownership.sql

# Assign existing bank accounts to appropriate users (production)
# Example SQL:
# UPDATE bank_accounts SET user_id = 'user_xxx' WHERE owner_name = 'John Doe';
```

### 7. ✅ Login Rate Limiting Added
**Issue**: No rate limiting on login endpoint, vulnerable to brute force attacks.

**Fix Applied**:
- Created `middleware/rate-limit.ts` with IP-based rate limiting
- Integrated into `routes/auth.ts` login handler
- Limits: 5 attempts per 15 minutes per IP address
- Failed attempts are blocked for 30 minutes after limit exceeded
- Successful login clears the rate limit

**How It Works**:
- Tracks login attempts by IP address (CF-Connecting-IP, X-Forwarded-For, X-Real-IP)
- Returns 429 Too Many Requests with retry-after duration
- In-memory tracking (consider using Workers KV for distributed deployments)
- Automatic cleanup of old entries

**Note**: Current implementation uses in-memory Map. For multi-instance deployments, migrate to:
- Cloudflare Workers KV (persistent, distributed)
- Cloudflare Durable Objects (consistent, stateful)
- External rate limiting service

## Remaining Security Recommendations

### Medium Priority

#### 1. Session Management
**Recommendations**:
- Add session revocation capability
- Store active sessions in KV or D1
- Implement "logout all devices"
- Add session activity logging

#### 2. Audit Logging
**Recommendations**:
- Log all authentication attempts (success/failure)
- Log sensitive data access (imports, transactions)
- Log configuration changes
- Use Workers Analytics Engine or external service

#### 3. Input Validation
**Recommendations**:
- Add JSON schema validation for all API inputs
- Validate date ranges and numeric bounds
- Sanitize all text inputs before storage

#### 4. Shared Account Access
**Current State**: Bank accounts have single owner (user_id)
**Recommendation**: For household sharing, implement:
- Option A: Junction table `bank_account_users` for multi-user access
- Option B: Household/organization concept with member management
- Option C: Explicit share/grant permissions system

### Low Priority (Nice to Have)

#### 5. Content Security Policy
Add CSP headers to frontend:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

#### 6. Secure Headers
Add additional security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

#### 7. Enhanced Rate Limiting
- Migrate from in-memory Map to Workers KV or Durable Objects
- Add rate limiting to other sensitive endpoints (password reset, data export)
- Implement CAPTCHA for repeated failures
- Add rate limit monitoring and alerting

## Testing the Fixes

### 1. Test Authentication
```bash
# Should FAIL with old password
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corkbooks.test","password":"password123"}'

# Should SUCCEED after migration with new temp password
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corkbooks.test","password":"TempDev2026!"}'
```

### 2. Test CORS
```bash
# Should be rejected (bad origin)
curl -X GET http://localhost:8787/api/auth/me \
  -H "Origin: https://evil.com" \
  --cookie "auth_token=..."

# Should succeed (allowed origin)
curl -X GET http://localhost:8787/api/auth/me \
  -H "Origin: http://localhost:5173" \
  --cookie "auth_token=..."
```

### 3. Test CSRF
```bash
# Should be rejected (missing Origin)
curl -X POST http://localhost:8787/api/categories \
  -H "Content-Type: application/json" \
  --cookie "auth_token=..." \
  -d '{"name":"Test","category_type":"expense","scope":"personal"}'

# Should succeed (valid Origin)
curl -X POST http://localhost:8787/api/categories \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  --cookie "auth_token=..." \
  -d '{"name":"Test","category_type":"expense","scope":"personal"}'
```

### 4. Test Upload Limits
```bash
# Create large test file
dd if=/dev/zero of=large.csv bs=1M count=11

# Should be rejected (too large)
curl -X POST http://localhost:8787/api/imports/upload \
  -H "Origin: http://localhost:5173" \
  --cookie "auth_token=..." \
  -F "file=@large.csv" \
  -F "bank_account_id=bank_123" \
  -F "statement_month=2026-05"
```

### 5. Test Rate Limiting
```bash
# Make 6 rapid login attempts with wrong password
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:8787/api/auth/login \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:5173" \
    -d '{"email":"admin@corkbooks.test","password":"wrong"}'
  echo ""
done

# 6th attempt should return 429 Too Many Requests
```

### 6. Test Authorization Scoping
```bash
# Create two users and two bank accounts
# Login as user1, try to access user2's bank account

# Should succeed (own account)
curl -X GET "http://localhost:8787/api/bank-accounts/bank_user1" \
  -H "Origin: http://localhost:5173" \
  --cookie "auth_token=user1_token"

# Should fail with 404/403 (other user's account)
curl -X GET "http://localhost:8787/api/bank-accounts/bank_user2" \
  -H "Origin: http://localhost:5173" \
  --cookie "auth_token=user1_token"

# Admin should succeed for both
curl -X GET "http://localhost:8787/api/bank-accounts/bank_user2" \
  -H "Origin: http://localhost:5173" \
  --cookie "auth_token=admin_token"
```

## Production Deployment Checklist

Before deploying to production:

- [ ] Apply password hash migration (0009_update_password_hashes.sql)
- [ ] Apply bank account ownership migration (0010_add_bank_account_ownership.sql)
- [ ] Assign existing bank accounts to appropriate users
- [ ] Delete seed accounts OR reset all passwords
- [ ] Rotate JWT_SECRET
- [ ] Update CORS allowlist with production domain
- [ ] Test login flow end-to-end
- [ ] Test CSRF protection on all state-changing endpoints
- [ ] Test rate limiting (6 failed logins should block)
- [ ] Test authorization (non-admin cannot access other user's data)
- [ ] Verify file upload limits
- [ ] Review all environment variables
- [ ] Enable Cloudflare security features:
  - [ ] WAF rules
  - [ ] Rate limiting (edge-level, optional supplement)
  - [ ] DDoS protection
  - [ ] Bot management
- [ ] Set up monitoring and alerting
- [ ] Document incident response procedures

## Password Rotation Procedure

### For Seed/Test Accounts
1. Generate new hash: `node -e "import('./utils/password.js').then(m => m.hashPassword('NewSecurePass123!').then(console.log))"`
2. Update database: `UPDATE users SET password_hash = '...' WHERE email = '...'`
3. Document new credentials securely (password manager)

### For Real Users (Future)
1. Implement password reset flow with email verification
2. Implement password change UI in user settings
3. Enforce password complexity requirements
4. Add password history to prevent reuse

## Monitoring Recommendations

Set up alerts for:
- Failed login attempts (>5 per minute per IP) → Rate limiting working
- CSRF validation failures (indicates attack attempts)
- Large file upload attempts (>10MB) → Upload limits working
- Invalid regex patterns submitted → ReDoS protection working
- Unusual data access patterns (rapid queries, mass data export)
- JWT verification failures (token tampering)
- Authorization failures (403 responses) → Users trying to access unauthorized data
- Rate limit blocks (429 responses) → Potential brute force attacks

**Recommended Tools**:
- Cloudflare Analytics for request patterns
- Workers Analytics Engine for custom metrics
- External APM (Sentry, Datadog, New Relic)
- Log aggregation (Logflare, Axiom)

## Additional Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
