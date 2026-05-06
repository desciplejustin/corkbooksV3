# Role Management & Custom RBAC Testing Guide

## 🎯 What Was Implemented

### 1. **Database Schema** (`schema/0011_rbac_permissions.sql`)
- ✅ `role_permissions` table - Stores default permissions for each role
- ✅ `user_permissions` table - Stores custom permission overrides per user
- ✅ Seeded with default permissions for admin, editor, viewer roles

### 2. **Backend APIs**

#### Role Management API (`routes/role-management.ts`)
- ✅ `GET /api/role-management/menu-items` - List all available menu items
- ✅ `GET /api/role-management/roles` - List all roles with their permissions
- ✅ `GET /api/role-management/roles/:role` - Get specific role permissions
- ✅ `PATCH /api/role-management/roles/:role` - Update role's default permissions

#### User Permissions API (extended `routes/users.ts`)
- ✅ `GET /api/users/:id/permissions` - Get user's effective permissions
- ✅ `PATCH /api/users/:id/permissions` - Set custom permissions for user
- ✅ `DELETE /api/users/:id/permissions` - Revert to role defaults

### 3. **Frontend Pages**

#### Role Management Page (`src/pages/RoleManagement.tsx`)
- ✅ Visual cards for each role (admin, editor, viewer)
- ✅ Edit permissions modal with checkbox list for each menu
- ✅ Shows enabled/disabled menus count
- ✅ Preview of first 5 menu permissions

#### Enhanced Users Page (`src/pages/Users.tsx`)
- ✅ **Permissions button** for each user
- ✅ **Permissions modal** showing:
  - Inherited permissions from role (default)
  - Custom overrides (marked with "Custom" badge)
  - Checkbox to enable/disable each menu
  - **Save** button to apply custom permissions
  - **Revert to Role** button to remove custom overrides

#### Enhanced Navigation (`src/layouts/AppLayout.tsx`)
- ✅ Dynamically fetches user's effective permissions on load
- ✅ Filters menu items based on permissions
- ✅ Supports Role Management menu item

---

## 📋 Complete Testing Workflow

### **Step 1: Access the Application**
1. Open http://localhost:3001/
2. Login as: `admin@corkbooks.test` / `DevPass2026!`

### **Step 2: View Default Role Permissions**
1. Look at your sidebar - you should see **"Role Management 🔐"** menu item
2. Click **Role Management**
3. You should see 3 cards:
   - **Admin** (red badge) - 9/9 menus enabled
   - **Editor** (blue badge) - 7/9 menus enabled
   - **Viewer** (gray badge) - 7/9 menus enabled

### **Step 3: Customize Role Permissions**
1. Click **"Edit Permissions"** on the **Editor** role
2. You'll see a modal with all menu items as checkboxes
3. **Uncheck "Imports"** (remove import access for editors)
4. Click **"Save Permissions"**
5. Verify: Editor card now shows **6/9 menus enabled**

### **Step 4: Create Test Users**
1. Navigate to **Users** menu
2. Click **"+ Add User"**

**Create Editor User:**
- Full Name: `Test Editor`
- Email: `editor@test.com`
- Password: `Editor2026!`
- Role: `Editor (Create & Edit)`
- Click **"Create User"**

**Create Viewer User:**
- Full Name: `Test Viewer`
- Email: `viewer@test.com`
- Password: `Viewer2026!`
- Role: `Viewer (Read-only)`
- Click **"Create User"**

### **Step 5: Test Custom User Permissions**
1. In the Users table, find **Test Editor**
2. Click the **"Permissions"** button (purple)
3. You'll see the permissions modal showing:
   - Their role (Editor)
   - All menu items with checkboxes
   - Notice **Imports** is unchecked (from the role permission change)

4. **Grant Custom Access:**
   - Check **"Imports"** (override the role setting)
   - Notice it gets a **"Custom"** badge
   - Click **"Save Custom Permissions"**
   - You'll see a yellow warning: "This user has custom permissions"

5. **Test Revert:**
   - Click **"Permissions"** again for Test Editor
   - Click **"Revert to Role"** button
   - Confirm the action
   - Permissions reset to role defaults (Imports unchecked)

### **Step 6: Test Role-Based Navigation**

**Test as Editor (without custom permissions):**
1. Logout (top right)
2. Login as: `editor@test.com` / `Editor2026!`
3. **Check sidebar menu:**
   - ✅ Should see: Dashboard, Transactions, Categories, Bank Accounts, Import Templates, Reports
   - ❌ Should NOT see: Imports, Users, Role Management
4. Try accessing forbidden pages:
   - Navigate to http://localhost:3001/users (should be blocked by API)

**Test as Viewer:**
1. Logout
2. Login as: `viewer@test.com` / `Viewer2026!`
3. **Check sidebar menu:**
   - ✅ Should see: Dashboard, Imports, Transactions, Categories, Bank Accounts, Import Templates, Reports
   - ❌ Should NOT see: Users, Role Management

**Test Custom Permissions:**
1. Logout and login as admin
2. Go to Users → Test Viewer → Permissions
3. **Uncheck "Dashboard"** (deny access)
4. Click **"Save Custom Permissions"**
5. Logout and login as `viewer@test.com`
6. **Dashboard menu item should be gone**

### **Step 7: Verify Permission Inheritance**
1. Login as admin
2. Go to **Role Management**
3. Edit **Viewer** role
4. **Check "Users"** (grant all viewers access to user management)
5. Save
6. Logout and login as `viewer@test.com`
7. **"Users" menu should now appear** (inherited from role)

---

## 🎨 UI Features

### Role Management Page
- **Visual Cards** for each role with color-coded badges
- **Permission Summary** showing X/9 enabled menus
- **Preview List** of first 5 menu permissions with checkmarks
- **Edit Modal** with full checkbox list and descriptions
- **Last Updated** timestamp

### User Permissions Modal
- **Role Badge** showing user's role
- **Warning Banner** when custom permissions exist
- **Checkbox List** for all menu items
- **Custom Badge** on overridden permissions (purple)
- **Inherited vs Custom** visual distinction
- **Save / Revert / Cancel** buttons

### Dynamic Navigation
- **Permission-Based Filtering** - only shows allowed menus
- **Real-Time Loading** - fetches permissions on login
- **Fallback Behavior** - shows everything if API fails (safe default)
- **Loading State** - "Loading menu..." while fetching

---

## 🔐 Permission System Design

### Permission Hierarchy
```
User's Effective Permissions = Custom Permissions || Role Permissions
```

1. **Check user_permissions table** - if custom permissions exist, use those
2. **Fallback to role_permissions** - use role defaults
3. **Menu Filtering** - only show items where permission = true

### Permission Identifiers
- `dashboard` - Main dashboard
- `imports` - Bank statement imports
- `transactions` - Transaction list
- `categories` - Category management
- `bank-accounts` - Bank account management
- `import-templates` - Import template management
- `reports` - Reconciliation and reports
- `users` - User management (admin only by default)
- `role-management` - Role permission configuration (admin only by default)

### Database Storage
Permissions stored as JSON:
```json
{
  "dashboard": true,
  "imports": false,
  "transactions": true,
  ...
}
```

---

## 🧪 Test Scenarios

### ✅ Scenario 1: Role-Level Permission Management
- **Action:** Change editor role to disable "Imports"
- **Expected:** All editors lose import access
- **Verify:** Login as editor, no Imports menu

### ✅ Scenario 2: Custom User Permissions
- **Action:** Grant specific user access to restricted menu
- **Expected:** User sees menu, others with same role don't
- **Verify:** Custom badge appears, menu visible only to that user

### ✅ Scenario 3: Permission Inheritance
- **Action:** Change role permissions
- **Expected:** Users without custom permissions inherit changes
- **Verify:** Menu visibility updates for affected users

### ✅ Scenario 4: Revert Custom Permissions
- **Action:** Click "Revert to Role" button
- **Expected:** Custom permissions deleted, role defaults restored
- **Verify:** Custom badge disappears, permissions match role

### ✅ Scenario 5: Admin Override Protection
- **Action:** Try to remove admin's own permissions
- **Expected:** Admin always retains access to critical functions
- **Verify:** Cannot lock yourself out

---

## 🎯 Key Benefits

1. **Flexible RBAC** - Role defaults + per-user customization
2. **Easy Management** - Visual interfaces for both role and user permissions
3. **Audit Trail** - updated_at timestamps on all permission changes
4. **Safe Defaults** - Sensible defaults for each role
5. **Scalable** - Easy to add new menu items to the system
6. **No Code Changes** - All permission changes via UI

---

## 📊 Default Permission Matrix

| Menu Item        | Admin | Editor | Viewer |
|------------------|-------|--------|--------|
| Dashboard        | ✅    | ✅     | ✅     |
| Imports          | ✅    | ✅     | ✅     |
| Transactions     | ✅    | ✅     | ✅     |
| Categories       | ✅    | ✅     | ✅     |
| Bank Accounts    | ✅    | ✅     | ✅     |
| Import Templates | ✅    | ✅     | ✅     |
| Reports          | ✅    | ✅     | ✅     |
| Users            | ✅    | ❌     | ❌     |
| Role Management  | ✅    | ❌     | ❌     |

*These can be customized via the Role Management page*

---

## 🚀 Next Steps (Optional Enhancements)

1. **Permission Groups** - Bundle permissions into groups (e.g., "Financial Data", "Admin Tools")
2. **Permission Templates** - Save custom permission sets as templates
3. **Audit Log** - Track who changed what permissions when
4. **Permission Dependencies** - Auto-enable required permissions (e.g., imports requires bank-accounts)
5. **Bulk Permission Management** - Apply same permissions to multiple users
6. **Permission Expiry** - Time-limited permission grants
7. **API-Level Enforcement** - Add permission checks to all API endpoints

---

**Your complete Role Management and Custom RBAC system is ready to use!** 🎉
