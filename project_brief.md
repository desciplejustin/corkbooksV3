Good foundation. I’ll complete this in a way that is **practical, scoped correctly, and aligned to how systems like Xero actually work under the hood—but simplified for your use case.**

---

# Project Brief: CorkBooksV2

## Purpose

I need to compile reports from bank statements/csv's containing transactions of money moving into and out of my and my wife's bank accounts. This would need to act similar to xero/sage in the sense that transactions are allocated to certain category and historical allocations become the training of future allocations. And for each Import, each row needs to be allocated a category before it can be imported. this imported data would then be used to compile budgets, expense records/reports, financial statements etc, especially for SARS. as we are also running a business from home and need to streamline things.

---

## Business Problem

Currently:

* Financial data is fragmented across multiple bank accounts and CSV exports
* Categorisation is manual, repetitive, and inconsistent
* No reliable structure for reporting (personal vs business mixed)
* Difficulty producing clean, audit-ready outputs for South African Revenue Service (SARS)
* No historical intelligence (system does not “learn” from past allocations)

Impact:

* Time-consuming monthly admin
* Increased risk of misclassification
* Poor visibility on cash flow, expenses, and profitability
* Inefficient tax preparation

---

## Users

### Admin (You)

* Full system control
* Import bank statements
* Define/edit categories
* Override or correct allocations
* Generate reports (tax, budget, cash flow)
* Manage rules/automation

### Manager (Wife)

* Import statements
* Review and approve categorisations
* View reports and summaries
* Flag transactions for review

### Future: Accountant

* Read-only or limited edit access
* Access to structured reports
* Export data for tax submissions

---

## Main Workflows

### 1. Import & Staging

1. Upload CSV / bank export
2. System parses and standardises fields:

   * Date
   * Description
   * Amount
   * Account
3. Transactions enter **“Unallocated” staging area**

---

### 2. Categorisation (Core Engine)

1. System attempts auto-allocation using:

   * Historical matches (same description/vendor)
   * Rule-based logic (keywords, amounts, patterns)
2. User reviews each transaction:

   * Accept suggested category OR
   * Manually assign category
3. System learns from confirmed allocations (builds rules/history)
4. All transactions must be allocated before final import

---

### 3. Finalise Import

1. User confirms all rows are categorised
2. Transactions move from staging → main ledger
3. Data becomes available for reporting

---

### 4. Reporting & Outputs

1. Generate standard reports:

   * Expense breakdown by category
   * Monthly cash flow
   * Income vs expenses
2. Generate SARS-ready summaries:

   * Deductible expenses
   * Business vs personal split
3. Export to CSV / PDF

---

### 5. Budgeting (Phase 2)

1. Create monthly budget per category
2. Compare:

   * Actual vs Budget
3. Highlight:

   * Over/under spend
   * Trends

---

## Included

* CSV import and parsing
* Transaction staging layer (unallocated queue)
* Manual + assisted categorisation
* Rule-based learning system (simple, not AI-heavy initially)
* Category management (user-defined categories)
* Multi-account support (you + wife)
* Basic reporting (monthly, category-based, totals)
* Export functionality (CSV/PDF)

---

## Excluded (Important to keep scope tight)

* Full double-entry accounting system (no journals, debtors, creditors)
* Invoice generation or billing
* Payroll functionality
* Real-time bank API integrations (Phase 2+ only)
* Complex tax engine (focus on structured outputs, not calculations)
* Mobile app (start web-first PWA)

---

## Success Criteria

### Functional

* 100% of imported transactions are categorised before finalisation
* System correctly auto-suggests categories for **≥70% of repeat transactions** within 3 months
* Import → categorised dataset takes **<10 minutes per month**

### Reporting

* Monthly reports generated in **<5 seconds**
* SARS-ready export requires **minimal to no manual cleanup**

### Usability

* Simple enough for both you and your wife to use without training
* Clear “inbox” style workflow (like email → process → done)

### Business Outcome

* Reduce monthly finance admin time by **>60%**
* Improve visibility on:

  * Personal vs business expenses
  * Cash flow trends
* Enable structured, consistent financial history

---

## Design Principles (Important for your build)

* **Staging First** → Never import dirty/unallocated data
* **Human-in-the-loop** → You confirm, system learns
* **Simple > Clever** → Rules before AI
* **Auditability** → Every transaction traceable
* **Separation** → Personal vs business tagging early

---