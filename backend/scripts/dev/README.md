# Development-only scripts — NOT FOR PRODUCTION

> **These scripts are exclusively for local development and debugging.**
> They exit immediately when `NODE_ENV=production`.
> They never print full XML, PDF, secrets, or complete personal data.
> Email addresses are partially redacted in output.

## Usage

```powershell
# List recent invoices (redacted)
npm run dev:list-invoices

# Show recent job queue entries
npm run dev:show-jobs

# Enqueue an ISSUE_INVOICE job for the most recent PENDING invoice
npm run dev:enqueue-invoice-job

# Insert a synthetic test job
npm run dev:insert-test-job
```

All scripts require `DATABASE_URL` pointing to a local or test database.
