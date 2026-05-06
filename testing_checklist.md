# Testing Checklist

## Frontend
- [ ] Page loads without error
- [ ] Navigation works
- [ ] Forms validate correctly
- [ ] Save button works
- [ ] Edit button works
- [ ] Delete button works if applicable
- [ ] Error messages display clearly

## Backend
- [ ] Server starts
- [ ] Routes respond
- [ ] Validation works
- [ ] Database insert works
- [ ] Database update works
- [ ] Database delete works if applicable

## Database
- [ ] Tables created correctly
- [ ] Required fields enforced
- [ ] Relationships make sense
- [ ] Test data inserted successfully

## Permissions
- [ ] Admin access works
- [ ] Manager access works
- [ ] Restricted users blocked correctly

## Security (Added May 2026)
### Authentication
- [ ] Login with correct password succeeds
- [ ] Login with incorrect password fails
- [ ] Login with 'password123' bypass is blocked
- [ ] JWT token properly signed and verified
- [ ] Token expiration enforced (7 days)
- [ ] Logout clears auth cookie

### CORS
- [ ] Allowed origins can access API
- [ ] Disallowed origins get CORS error
- [ ] No wildcard patterns accepted
- [ ] Credentials properly handled

### CSRF Protection
- [ ] POST/PATCH/PUT/DELETE require Origin header
- [ ] Requests with invalid Origin return 403
- [ ] Requests with valid Origin succeed
- [ ] GET requests work without Origin check

### Upload Security
- [ ] Files over 10MB are rejected
- [ ] Invalid file types are rejected
- [ ] Valid CSV/PDF files are accepted
- [ ] File content is properly parsed

### Input Validation
- [ ] Regex patterns over 500 chars rejected
- [ ] Dangerous regex patterns blocked
- [ ] SQL injection attempts fail
- [ ] XSS attempts are sanitized

### Authorization (TODO)
- [ ] Users can only access their own data
- [ ] Cross-user data access is blocked
- [ ] Admin can access all data
- [ ] Role escalation is prevented