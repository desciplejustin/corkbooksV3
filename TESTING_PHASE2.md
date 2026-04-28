# Phase 2 Testing Guide: Categories & Bank Accounts CRUD

## Testing Checklist

### Prerequisites
- ✅ Frontend server running on http://localhost:3001  
- ✅ Worker server running on http://localhost:8787  
- ✅ Browser opened to http://localhost:3001/login

---

## Test Flow

### 1. Authentication Test
- [ ] Login with: `admin@corkbooks.test` / `password123`
- [ ] Verify redirect to Dashboard
- [ ] Verify navigation shows: Dashboard | Categories | Bank Accounts

### 2. Categories - List View
- [ ] Click "Categories" in navigation
- [ ] Verify 12 seeded categories are visible
- [ ] Categories should include:
  - **Income:** Salary, Business Income, Investment Income, Rental Income
  - **Expense:** Groceries, Utilities, Office Supplies, Internet & Phone, Fuel, Medical, Insurance, Home Office
- [ ] Verify each category shows:
  - Name
  - Type badge (income = green, expense = red)
  - Scope (personal/business/shared)
  - SARS checkbox (✓ or -)
  - Active button (green)
  - Edit button

### 3. Categories - Filters
- [ ] Filter by Type: "Income" → Verify only 4 income categories display
- [ ] Filter by Type: "Expense" → Verify only 8 expense categories display
- [ ] Filter by Scope: "Personal" → Verify only personal categories display
- [ ] Filter by Scope: "Business" → Verify only business categories display
- [ ] Reset filters to "All" / "All"

### 4. Categories - Create New
- [ ] Click "+ New Category" button
- [ ] Fill in form:
  - Name: "Consulting Income"
  - Type: Income
  - Scope: Business
  - SARS Tax Related: ✓ (checked)
- [ ] Click "Create"
- [ ] Verify success: New category appears in the list
- [ ] Verify it has a green "Active" button and shows SARS checkmark

### 5. Categories - Edit Existing
- [ ] Click "Edit" on "Groceries" category
- [ ] Change Name to "Food & Groceries"
- [ ] Click "Update"
- [ ] Verify the name updated in the list

### 6. Categories - Toggle Active Status
- [ ] Find "Fuel" category
- [ ] Click the green "Active" button
- [ ] Verify button turns red and says "Inactive"
- [ ] Click again to reactivate
- [ ] Verify button turns green and says "Active"

### 7. Bank Accounts - List View
- [ ] Click "Bank Accounts" in navigation
- [ ] Verify 2 seeded accounts are visible:
  - Justin's Discovery Cheque
  - Melissa's FNB Savings
- [ ] Verify each account shows:
  - Account Name
  - Bank Name
  - Masked Account Number
  - Owner Name
  - Account Type
  - Status button (Active)
  - Edit button

### 8. Bank Accounts - Create New
- [ ] Click "+ New Bank Account" button
- [ ] Fill in form:
  - Account Name: "Justin's Capitec Credit"
  - Bank Name: "Capitec Bank"
  - Account Number (Masked): "****5678"
  - Owner Name: "Justin Smit"
  - Account Type: "Credit Card"
- [ ] Click "Create"
- [ ] Verify success: New account appears in the list

### 9. Bank Accounts - Edit Existing
- [ ] Click "Edit" on "Melissa's FNB Savings"
- [ ] Change Account Type to "Money Market"
- [ ] Click "Update"
- [ ] Verify the account type updated in the list

### 10. Bank Accounts - Toggle Active Status
- [ ] Find "Justin's Discovery Cheque"
- [ ] Click the green "Active" button
- [ ] Verify button turns red and says "Inactive"
- [ ] Click again to reactivate
- [ ] Verify button turns green and says "Active"

### 11. Role-Based Access (Optional - Editor Test)
- [ ] Logout
- [ ] Login with: `editor@corkbooks.test` / `password123`
- [ ] Verify you can also Create/Edit categories and bank accounts
- [ ] (Both admin and editor roles should have full access to these features)

### 12. Error Handling
- [ ] Try creating a category with a duplicate name (e.g., "Salary")
- [ ] Verify error message: "A category with this name already exists"
- [ ] Try creating a bank account with a duplicate name
- [ ] Verify error message: "A bank account with this name already exists"

---

## Known Issues
- TypeScript compile errors in form event handlers (type annotations) - these are non-blocking and don't affect runtime
- Login.tsx has similar type issues - also non-blocking

---

## Success Criteria
✅ All seeded data loads correctly  
✅ Can create new categories and bank accounts  
✅ Can edit existing items  
✅ Can toggle active/inactive status  
✅ Filters work on Categories page  
✅ No runtime JavaScript errors in browser console  
✅ Auth cookies work properly (no unexpected logouts)  

---

## If Issues Occur

### "Unauthorized" errors
- Check browser console for cookie issues
- Verify both servers are running
- Try hard refresh (Ctrl+Shift+R)
- Clear cookies and login again

### Database errors
- Check wrangler terminal for SQL errors
- Verify migrations ran successfully:
  ```
  npx wrangler d1 execute corkbookv3_db --local --command "SELECT COUNT(*) FROM categories"
  ```
  Should return: 12 (or more if you created new ones)

### Frontend errors
- Check browser console for JavaScript errors
- Check Vite terminal for build errors
- Try restarting the frontend: `npm run dev`

---

## Next Steps After Testing
Once all tests pass, Phase 2 is complete and ready to:
1. Mark "Test & Deploy" checkbox in build_plan.md
2. (Optional) Deploy to Cloudflare for remote testing
3. Move to Phase 3 - Import Engine
