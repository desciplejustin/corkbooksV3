## Main Pages / Screens

### 1. Login Page

**Purpose:** Secure access to the system.

**Fields**

* Username / email
* Password

**Actions**

* Login
* Logout from menu after login

---

### 2. Home / Dashboard

**Purpose:** Simple overview of the system status.

**Shows**

* Total income this month
* Total expenses this month
* Net cash movement
* Unallocated transactions count
* Recent imports

**Actions**

* Go to Import
* Go to Unallocated Transactions
* Go to Reports

---

### 3. Import Transactions

**Purpose:** Upload bank CSV files from multiple banks. But to start "Discovery" and "FNB" 

**Fields**

* Bank account
* Bank
* Account Number/name (maybe managed so its easy to select "Justin Chque acc" or "Melissa's Savings Acc")
* Statement period / month
* CSV file upload
* Optional notes

**Actions**

* Upload CSV
* Preview imported rows
* Cancel import
* Continue to review

---

### 4. Review Import / Staging

**Purpose:** Check transactions before final import.

**Shows**

* Date
* Description
* Money in
* Money out
* Suggested category
* Status: allocated / unallocated / needs review / duplicate / transfer

**Fields per transaction**

* Category
* Personal / Business split
* Notes
* Tax deductible: yes/no

**Actions**

* Accept suggested category
* Change category
* Mark as personal
* Mark as business
* Split transaction
* Save draft
* Finalise import — partial allowed (unallocated rows remain staged)
* **+ New Category button in toolbar** — opens quick-add modal without leaving the page; new category immediately appears in all dropdowns on save
* Per-row + icon — same modal, but auto-selects the new category for that row after save

---

### 5. Unallocated Transactions

**Purpose:** Work through transactions that still need categories.

**Shows**

* List of unallocated transactions
* Suggested category where available

**Fields**

* Category
* Business / personal
* Notes
* Tax deductible yes/no

**Actions**

* Allocate transaction
* Apply same category to similar transactions
* Create rule from allocation
* Mark for later review

---

### 6. Transactions Ledger

**Purpose:** View all finalised transactions.

**Filters**

* Date range
* Account
* Category
* Business / personal
* Tax deductible
* Search description

**Actions**

* View transaction
* Edit category
* Edit notes
* Split transaction
* Export filtered list

---

### 7. Categories

**Purpose:** Manage reporting categories.

**Fields**

* Category name
* Type: Income / Expense
* Group: Personal / Business / Shared
* SARS-related: yes/no
* Active / inactive

**Actions**

* Add category
* Edit category
* Deactivate category
* Merge duplicate categories

---

### 8. Rules / Learning

**Purpose:** Store repeat allocation logic.

**Fields**

* Keyword / description contains
* Bank account
* Category
* Business / personal
* Tax deductible yes/no

**Actions**

* Add rule
* Edit rule
* Delete rule
* Test rule against past transactions

---

### 9. Reports

**Purpose:** Generate simple financial summaries.

**Report options**

* Monthly income and expenses
* Expense by category
* Business expenses
* Personal expenses
* SARS summary
* Cash flow summary
* Budget vs actual later

**Fields**

* Date range
* Account
* Report type
* Include personal / business / both

**Actions**

* View report
* Export PDF
* Export CSV

---

### 9a. Bank Reconciliation (Built ✅)

**Purpose:** Verify that the running balance from the bank statement matches the sum of imported transactions for a period. Catches missing transactions or import gaps.

**Route:** `/reconciliation`

**Shows**

* Account picker
* Date range (from / to)
* Opening balance (last balance before period start)
* + Total money in during period
* − Total money out during period
* = Computed closing balance
* Statement closing balance (last actual balance at/before period end)
* Variance (computed vs statement)
* Status indicator: balanced (green ✓) or out of balance (red ⚠ with amount)
* Summary cards: transaction count, total in, total out, net

**Actions**

* Select account
* Set date range
* View result

**Notes**

* Only works for imports processed after migration 0008 (balance column).
* Pre-migration imports show `has_balance_data: false` warning.

---

### 10. Settings

**Purpose:** Basic system setup.

**Sections**

* Users
* Bank accounts
* Import templates
* Business details
* SARS/tax settings

**Actions**

* Add user
* Add bank account
* Set default categories
* Manage permissions
* Update business details

---

## Keep the First Version Very Simple

Build these first:

1. Login
2. Dashboard
3. Import Transactions
4. Review/Staging
5. Transactions Ledger
6. Categories
7. Reports

Leave these for later:

* Rules/Learning advanced screen
* Budgeting
* Accountant access
* Bank API integration
* PDF styling
* Advanced SARS reports
