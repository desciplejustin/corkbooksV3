# Security Implementation Quick Reference

## Files Modified

### Core Security Middleware
- **middleware/csrf.ts** (NEW) - CSRF protection with Origin/Referer validation
- **middleware/authorization.ts** (NEW) - Object-level authorization helpers
- **middleware/rate-limit.ts** (NEW) - IP-based rate limiting with configurable windows
- **middleware/auth.ts** (EXISTING) - JWT authentication

### Route Modifications
- **routes/auth.ts** - PBKDF2 password verification + rate limiting
- **routes/bank-accounts.ts** - User ownership on create, filter by ownership
- **routes/imports.ts** - Validate bank account ownership, filter by owned accounts
- **routes/transactions.ts** - Filter by owned bank accounts
- **routes/reconciliation.ts** - Check bank account ownership

### Entry Point
- **index.ts** - CORS hardening + CSRF validation integration

### Utilities
- **utils/password.ts** (NEW) - PBKDF2 password hashing utility
- **utils/pdf-parser.ts** - ReDoS protection (pattern validation)

### Database Migrations
- **schema/0009_update_password_hashes.sql** - Update seed user password format
- **schema/0010_add_bank_account_ownership.sql** - Add user_id to bank_accounts

### Scripts & Documentation
- **scripts/generate-password-hash.ts** (NEW) - CLI tool for password hash generation
- **SECURITY_FIXES.md** - Complete security audit and implementation guide
- **testing_checklist.md** - Updated with security test cases

---

## Security Features Summary

### 1. Authentication Hardening
- ✅ Password bypass removed
- ✅ PBKDF2 with 100k iterations (SHA-256)
- ✅ Web Crypto API implementation
- ✅ Format: `$pbkdf2$iterations$salt$hash`

### 2. Authorization
- ✅ Object-level ownership checks
- ✅ Bank account ownership model
- ✅ Admin role sees all data
- ✅ Non-admin roles see only owned data
- ✅ Cascading ownership: bank_accounts → imports → transactions

### 3. CORS Protection
- ✅ Explicit allowlist (no wildcards)
- ✅ Exact origin matching only
- ✅ Credentials allowed only for approved origins

### 4. CSRF Protection
- ✅ Origin/Referer validation on state-changing requests
- ✅ POST/PATCH/PUT/DELETE methods validated
- ✅ GET/HEAD/OPTIONS bypass validation
- ✅ Returns 403 on invalid origin

### 5. Rate Limiting
- ✅ IP-based login throttling
- ✅ 5 attempts per 15 minutes
- ✅ 30-minute block after exceeded
- ✅ Successful login clears limit
- ✅ Uses CF-Connecting-IP header

### 6. Input Validation
- ✅ 10MB file size limit on uploads
- ✅ Content-type validation (CSV/PDF only)
- ✅ Regex pattern length limit (500 chars)
- ✅ Dangerous regex pattern detection
- ✅ ReDoS protection

---

## Authorization Flow

```
User Request → Authenticate (JWT) → Check Ownership → Allow/Deny

Example: GET /api/imports/import_123

1. Extract JWT from cookie
2. Verify JWT signature and expiration
3. Get user from JWT (id, role)
4. Query: SELECT bank_account_id FROM imports WHERE id = 'import_123'
5. If user.role = 'admin': ALLOW
6. If user.role != 'admin': Check bank_account ownership
   - Query: SELECT user_id FROM bank_accounts WHERE id = bank_account_id
   - If user_id = user.id: ALLOW
   - Else: DENY (403)
```

---

## Security Headers Reference

### CORS Headers (Set by index.ts)
```
Access-Control-Allow-Origin: <exact-origin>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### Auth Cookie (Set by routes/auth.ts)
```
auth_token=<jwt>
HttpOnly
Secure (production only)
SameSite=None (production) / Lax (development)
Max-Age=604800 (7 days)
Path=/
```

### Rate Limit Response (429)
```json
{
  "success": false,
  "error": "Too many login attempts. Please try again in 1800 seconds."
}
```

### CSRF Error Response (403)
```json
{
  "success": false,
  "error": "Invalid request origin - possible CSRF attack"
}
```

### Authorization Error Response (403/404)
```json
{
  "success": false,
  "error": "Bank account not found or access denied"
}
```

---

## Migration Commands

### Development (Local)
```bash
# Apply password format migration
wrangler d1 execute corkbookv3_db --local --file=./schema/0009_update_password_hashes.sql

# Apply ownership migration
wrangler d1 execute corkbookv3_db --local --file=./schema/0010_add_bank_account_ownership.sql
```

### Production (Remote)
```bash
# Apply password format migration
wrangler d1 execute corkbookv3_db --remote --file=./schema/0009_update_password_hashes.sql

# Apply ownership migration
wrangler d1 execute corkbookv3_db --remote --file=./schema/0010_add_bank_account_ownership.sql

# Assign bank accounts to users
wrangler d1 execute corkbookv3_db --remote --command \
  "UPDATE bank_accounts SET user_id = '<user_id>' WHERE owner_name = 'John Doe'"
```

### Rotate Secrets
```bash
# Generate new JWT secret (128+ characters recommended)
openssl rand -base64 96

# Update Cloudflare Workers secret
wrangler secret put JWT_SECRET
```

---

## Testing Commands

See [SECURITY_FIXES.md](SECURITY_FIXES.md) for detailed test procedures.

### Quick Smoke Test
```bash
# 1. Test CORS (should fail - wrong origin)
curl -X GET http://localhost:8787/api/auth/me \
  -H "Origin: https://evil.com" \
  --cookie "auth_token=..."

# 2. Test CSRF (should fail - missing Origin)
curl -X POST http://localhost:8787/api/categories \
  -H "Content-Type: application/json" \
  --cookie "auth_token=..." \
  -d '{"name":"Test"}'

# 3. Test Rate Limit (6th attempt should fail)
for i in {1..6}; do curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corkbooks.test","password":"wrong"}'; done

# 4. Test Authorization (non-admin accessing other user's data)
curl -X GET http://localhost:8787/api/bank-accounts/<other_user_account_id> \
  -H "Origin: http://localhost:5173" \
  --cookie "auth_token=<non_admin_token>"
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Run all migrations (0009, 0010)
- [ ] Assign bank account ownership
- [ ] Rotate JWT_SECRET
- [ ] Update CORS allowlist with production URL
- [ ] Delete or reset seed user passwords
- [ ] Run security smoke tests
- [ ] Enable Cloudflare WAF
- [ ] Set up monitoring/alerts
- [ ] Document incident response plan

---

## Performance Notes

### Rate Limiting
- **Current**: In-memory Map (suitable for single-instance Workers)
- **Scale**: Migrate to Workers KV or Durable Objects for multi-instance deployments
- **Cleanup**: Automatic cleanup of entries >24 hours old

### Authorization Queries
- **Overhead**: +1 JOIN per query (bank_accounts table)
- **Indexes**: user_id indexed (migration 0010)
- **Caching**: Consider caching user→bank_accounts mapping for hot paths

### CSRF Validation
- **Overhead**: Header check on every state-changing request (minimal)
- **No Database**: Validation is stateless

---

## Future Improvements

### Short Term
1. Migrate rate limiting to Workers KV (distributed state)
2. Add audit logging for sensitive operations
3. Implement session management and revocation
4. Add multi-user bank account sharing

### Medium Term
1. Implement CAPTCHA after repeated rate limit blocks
2. Add content security policy headers
3. Implement password reset flow with email verification
4. Add 2FA/MFA support

### Long Term
1. Move to Durable Objects for stateful rate limiting
2. Implement OAuth2/OIDC integration
3. Add device fingerprinting
4. Implement anomaly detection (ML-based)

---

## Security Contact

For security issues or questions:
- Review: [SECURITY_FIXES.md](SECURITY_FIXES.md)
- Test procedures: [testing_checklist.md](testing_checklist.md)
- Architecture: [project_brief.md](project_brief.md), [api_plan.md](api_plan.md)
