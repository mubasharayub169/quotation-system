# Quotation System

A multi-business quotation and invoicing application. The frontend is a React/Vite app; the API is an Express service backed by MySQL or MariaDB.

## Features

- Separate workspaces for superadmins, business owners, and staff
- Customer records and customer history
- Quotations with line-item discounts, Spanish IVA rates, and PDF output
- Invoices, payment status, and PDF output
- Business settings, subscription administration, and staff management
- Owner-only activity log for customer, quotation, invoice, staff, and business changes

## Requirements

- Node.js compatible with the versions in the frontend and backend package manifests
- MySQL or MariaDB
- A database created for the application

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and set the database credentials and a private JWT secret.
2. Import `schema/schema.sql` into a new, empty application database. Back up an existing database before applying any schema changes; this file is an initial schema dump, not a migration system.
3. Install and start the API:

   ```powershell
   cd backend
   npm ci
   npm run dev
   ```

4. In a second terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

5. Open the Vite URL shown in the frontend terminal. During development, Vite proxies `/api` and `/uploads` to the API at `http://localhost:5000`.

Create the initial superadmin with `node create-superadmin.js` from `backend` if the database does not already contain one.

Business owners can review recent activity from **Activity Log** in the sidebar. Events include the actor, action, affected record, timestamp, and a limited change summary. Password values and hashes are never written to the audit log. The API returns at most 100 events per page.

Quotation API validation requires a positive quantity, non-negative unit price and transport charge, no more than two decimal places for quantities/prices/discounts/transport, discounts from 0% to 100%, and IVA rates of 21%, 10%, or 4%. Calculated totals are checked against the database decimal range before saving.

Quotation statuses follow `draft → sent → accepted` or `rejected`. Accepted and rejected quotations cannot be moved to another status; duplicate a quotation to restart the workflow. Only accepted quotations can be converted to invoices.

For an existing installation, back up the database and apply `backend/migrations/001_add_audit_business_id.sql` before deploying the activity-log feature. New databases get this column and index from `schema/schema.sql`.

## Configuration

The backend reads these values from `backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | API port; defaults to `5000` |
| `NODE_ENV` | Runtime environment |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL/MariaDB connection |
| `JWT_SECRET` | Private signing key for authentication tokens |
| `JWT_EXPIRES_IN` | Token lifetime; defaults to `8h` |

Do not commit `.env` files, database credentials, or uploaded/generated files. For production, use a strong private JWT secret, HTTPS, backups, and a reverse proxy. Update the API CORS allowlist in `backend/server.js` to match the production frontend origin.

## Checks

Run backend regression tests:

```powershell
cd backend
npm test
```

Check the frontend:

```powershell
cd frontend
npm run lint
npm run build
```
