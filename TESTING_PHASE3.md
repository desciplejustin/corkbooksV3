# Phase 3 Import API Testing Guide

This guide provides examples for testing the import engine API endpoints.

## Prerequisites

1. Backend running: `npm run dev:worker` (http://127.0.0.1:8788)
2. Database migrated with Phase 3 tables
3. Valid auth token (login as admin/editor)
4. At least one bank account created

## Authentication

All endpoints require authentication. First login:

```bash
curl -X POST http://127.0.0.1:8788/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corkbooks.test","password":"password123"}' \
  -c cookies.txt
```

Use `-b cookies.txt` in subsequent requests to include auth cookie.

---

## 1. Import Configuration Endpoints

### 1.1 Create Import Config

Set up CSV parsing configuration for a bank account:

```bash
curl -X POST http://127.0.0.1:8788/api/import-configs \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "bank_account_id": "YOUR_BANK_ACCOUNT_ID",
    "format_type": "csv",
    "parser_config": {
      "delimiter": ",",
      "hasHeader": true,
      "dateColumn": "Date",
      "dateFormat": "DD/MM/YYYY",
      "descriptionColumn": "Description",
      "debitColumn": "Debit",
      "creditColumn": "Credit",
      "referenceColumn": "Reference",
      "skipRows": 0
    }
  }'
```

**Example for single amount column:**

```json
{
  "bank_account_id": "YOUR_BANK_ACCOUNT_ID",
  "format_type": "csv",
  "parser_config": {
    "delimiter": ",",
    "hasHeader": true,
    "dateColumn": "Date",
    "dateFormat": "YYYY-MM-DD",
    "descriptionColumn": "Description",
    "amountColumn": "Amount",
    "skipRows": 1
  }
}
```

### 1.2 List Import Configs

Get all import configs or filter by bank account:

```bash
# All configs
curl -X GET http://127.0.0.1:8788/api/import-configs \
  -b cookies.txt

# By bank account
curl -X GET "http://127.0.0.1:8788/api/import-configs?bank_account_id=YOUR_BANK_ACCOUNT_ID" \
  -b cookies.txt
```

### 1.3 Get Single Import Config

```bash
curl -X GET http://127.0.0.1:8788/api/import-configs/CONFIG_ID \
  -b cookies.txt
```

### 1.4 Update Import Config

```bash
curl -X PATCH http://127.0.0.1:8788/api/import-configs/CONFIG_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "is_active": 0
  }'
```

---

## 2. Import Endpoints

### 2.1 Upload CSV File

Upload a CSV file to create an import session:

```bash
curl -X POST http://127.0.0.1:8788/api/imports/upload \
  -b cookies.txt \
  -F "file=@/path/to/statement.csv" \
  -F "bank_account_id=YOUR_BANK_ACCOUNT_ID" \
  -F "statement_month=2024-12" \
  -F "notes=December statement"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "import": {
      "id": "import_xyz123",
      "bank_account_id": "...",
      "status": "ready",
      "row_count": 45,
      "period_start": "2024-12-01",
      "period_end": "2024-12-31"
    },
    "parsed_rows": 45,
    "skipped_rows": 2,
    "staged_transaction_ids": ["staged_1", "staged_2", ...]
  }
}
```

### 2.2 List Imports

```bash
# All imports
curl -X GET http://127.0.0.1:8788/api/imports \
  -b cookies.txt

# Filter by bank account
curl -X GET "http://127.0.0.1:8788/api/imports?bank_account_id=YOUR_BANK_ACCOUNT_ID" \
  -b cookies.txt

# Filter by status
curl -X GET "http://127.0.0.1:8788/api/imports?status=ready" \
  -b cookies.txt
```

### 2.3 Get Import Details

```bash
curl -X GET http://127.0.0.1:8788/api/imports/IMPORT_ID \
  -b cookies.txt
```

### 2.4 Get Staged Transactions

Retrieve all staged transactions for review:

```bash
curl -X GET http://127.0.0.1:8788/api/imports/IMPORT_ID/staged-transactions \
  -b cookies.txt
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "staged_xyz",
      "import_id": "import_123",
      "transaction_date": "2024-12-15",
      "description": "AMAZON PURCHASE",
      "money_in": 0,
      "money_out": 59.99,
      "net_amount": -59.99,
      "review_status": "unallocated",
      "assigned_category_id": null
    }
  ]
}
```

---

## 3. Staged Transaction Endpoints

### 3.1 Update Staged Transaction

Assign category and metadata to a staged transaction:

```bash
curl -X PATCH http://127.0.0.1:8788/api/staged-transactions/STAGED_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "assigned_category_id": "CATEGORY_ID",
    "scope": "business",
    "tax_deductible": 1,
    "notes": "Office supplies",
    "review_status": "allocated"
  }'
```

**Fields:**
- `assigned_category_id`: Required to finalize
- `scope`: `personal` | `business` | `shared`
- `tax_deductible`: `0` or `1`
- `review_status`: `unallocated` | `allocated` | `needs_review`

### 3.2 Bulk Update (Manual)

Update multiple transactions by calling the endpoint multiple times in a loop.

---

## 4. Finalize Import

Move all allocated transactions to final ledger:

```bash
curl -X POST http://127.0.0.1:8788/api/imports/IMPORT_ID/finalize \
  -b cookies.txt
```

**Response:**

```json
{
  "success": true,
  "data": {
    "import": {
      "id": "import_xyz",
      "status": "finalised",
      "finalised_at": "2024-12-20T10:30:00Z"
    },
    "transactions_created": 45,
    "transaction_ids": ["txn_1", "txn_2", ...]
  }
}
```

**Notes:**
- Only transactions with `review_status = 'allocated'` will be finalized
- Transactions without assigned categories are skipped
- Import status changes from `ready` to `finalised`

---

## 5. CSV File Format Examples

### Example 1: Separate Debit/Credit Columns

```csv
Date,Description,Reference,Debit,Credit
15/12/2024,AMAZON PURCHASE,REF123,59.99,
20/12/2024,SALARY DEPOSIT,SAL456,,3500.00
22/12/2024,UTILITY BILL,UTL789,125.00,
```

**Parser Config:**

```json
{
  "delimiter": ",",
  "hasHeader": true,
  "dateColumn": "Date",
  "dateFormat": "DD/MM/YYYY",
  "descriptionColumn": "Description",
  "debitColumn": "Debit",
  "creditColumn": "Credit",
  "referenceColumn": "Reference"
}
```

### Example 2: Single Amount Column

```csv
Date,Description,Amount
2024-12-15,AMAZON PURCHASE,-59.99
2024-12-20,SALARY DEPOSIT,3500.00
2024-12-22,UTILITY BILL,-125.00
```

**Parser Config:**

```json
{
  "delimiter": ",",
  "hasHeader": true,
  "dateColumn": "Date",
  "dateFormat": "YYYY-MM-DD",
  "descriptionColumn": "Description",
  "amountColumn": "Amount"
}
```

### Example 3: No Headers (Column Index)

```csv
15/12/2024,AMAZON PURCHASE,-59.99
20/12/2024,SALARY DEPOSIT,3500.00
22/12/2024,UTILITY BILL,-125.00
```

**Parser Config:**

```json
{
  "delimiter": ",",
  "hasHeader": false,
  "dateColumn": "0",
  "dateFormat": "DD/MM/YYYY",
  "descriptionColumn": "1",
  "amountColumn": "2"
}
```

---

## 6. Common Workflows

### Workflow 1: Complete Import Process

1. **Setup**: Create import config for bank account
2. **Upload**: POST CSV file to `/api/imports/upload`
3. **Review**: GET `/api/imports/{id}/staged-transactions`
4. **Allocate**: PATCH each `/api/staged-transactions/{id}` with category
5. **Finalize**: POST `/api/imports/{id}/finalize`

### Workflow 2: Update Import Config

1. **Check Current**: GET `/api/import-configs?bank_account_id=xxx`
2. **Deactivate Old**: PATCH old config with `is_active: 0`
3. **Create New**: POST new config (auto-deactivates others)

---

## 7. Error Handling

### No Active Import Config

```json
{
  "success": false,
  "error": "No active import configuration found for this bank account"
}
```

**Solution**: Create an import config first.

### Parse Error

```json
{
  "success": false,
  "error": "CSV parse error: Date column not found"
}
```

**Solution**: Check parser_config matches actual CSV structure.

### Finalize Without Allocations

```json
{
  "success": false,
  "error": "No allocated transactions to finalize"
}
```

**Solution**: Update staged transactions with `assigned_category_id` and `review_status: 'allocated'`.

---

## 8. Production Testing

Apply the same commands to production endpoints:

```bash
# Production Worker
https://corkbookv3.desciplejustin.workers.dev/api/...

# Production Frontend
https://aef0d1be.corkbookv3.pages.dev
```

**Note**: Use production credentials and real bank account IDs from production database.

---

## Next Steps

- Create frontend pages for import configuration
- Create frontend upload and review UI
- Implement allocation rules (auto-suggestion)
- Add batch category assignment
- Add import history and audit trail
