# Quotation System

A multi-business quotation and invoicing application. The frontend is a React/Vite app; the API is an Express service backed by MySQL or MariaDB.

## Features

- Separate workspaces for superadmins, business owners, and staff
- Customer records and customer history
- Business-specific product catalog; owners manage products and staff can select saved products for quotations
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

## Saved products

Quotation and invoice lists show 10 rows per page with Previous/Next controls. **From date** and **To date** filter the quotation date or invoice date respectively, including both boundary dates. Either date may be left empty. Search, status and date filters combine, reset to page 1 when changed, and totals reflect only matching documents.

Owners can add, edit, and delete entries from **Products** in the sidebar. Each product stores an optional article code, description, unit, unit price (EUR), and IVA rate (21%, 10%, or 4%). Staff can view the catalog and use it in quotations, but cannot modify it. Each business sees only its own products.

Quotation entry prioritizes saved products: use **Search saved products** and click **Add to quotation** beside a result. Search matches every entered word across article code and description, ignores surrounding/repeated whitespace, and treats `%`/`_` as literal characters. Results include price, unit and IVA, with pagination so products beyond the first page remain accessible. Each click adds an independent item with quantity 1 and discount 0.

Added items show compact quantity, price, discount and line-total controls. Expand **Edit item details / manual entry** to change code, description, unit or IVA. Use **Add manual item** only when a product is not in the catalog; its details open automatically. All copied fields remain editable. Products are copied as document snapshots: later product edits or deletion never change existing quotations, invoices, or PDFs.

Existing installations must apply `backend/migrations/002_add_products.sql` once before deploying this feature. It creates a new table without changing existing documents. Fresh installations get the same table from `schema/schema.sql`. Do not re-import the initial schema into a live database or re-run a migration already applied.

## Configuration

The backend reads these values from `backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | API port; defaults to `5000` |
| `NODE_ENV` | Runtime environment |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL/MariaDB connection |
| `JWT_SECRET` | Private signing key for authentication tokens |
| `JWT_EXPIRES_IN` | Token lifetime; defaults to `8h` |

Do not commit `.env` files, database credentials, or uploaded/generated files. For production, use a strong private JWT secret, HTTPS, and backups. The deployment below serves the frontend and API from the same origin, so no production CORS allowlist change is needed.

## Hostinger Git deployment (frontend and backend together)

Use **Node.js Web App / Import Git repository**, not the generic Git feature that only copies files to `public_html`. One Node.js process serves the built React frontend, `/api`, and `/uploads` on the site's domain.

Configure these settings once in hPanel:

| Setting | Value |
|---|---|
| Repository | `mubasharayub169/quotation-system` |
| Branch | `master` |
| Framework preset | **Other** (server application, not React/static) |
| Node.js version | **24** |
| Root directory | `/` (repository root, not `backend` or `frontend`) |
| Package manager | npm |
| Build script | `build` (select the npm script; if the field expects a command, use `npm run build`) |
| Entry file | `server.js` |
| Output directory | Leave empty; with Other and an entry file it is ignored |
| Start command, if shown | `npm start` |

In the app's **Environment Variables**, set `NODE_ENV=production`, all five `DB_*` values, `JWT_SECRET`, and optionally `JWT_EXPIRES_IN=8h`. Use your Hostinger database credentials directly in hPanel; do not put them in Git or in frontend environment variables. Let Hostinger provide `PORT`; do not set a conflicting port.

On each push to `master`, Hostinger installs the root package, runs `build`, then starts/restarts the root entry file. The build installs the backend's production dependencies and frontend build dependencies using their lockfiles, runs backend tests and frontend lint, and creates `frontend/dist`. A failed command stops the build. There is no separate frontend server to start.

Frontend-serving regression tests exercise Express and file responses in memory, without listening on a local TCP port, so they can run in restricted hosting build environments.

The entry file starts the existing backend from its own directory, retaining local `.env` and relative-path behavior. Express serves `frontend/dist` and falls back to `index.html` for client routes such as `/login` and `/quotations/7`. Missing API endpoints, upload files, and assets still return 404, not the frontend HTML. Production startup fails explicitly if the frontend build is missing.

After the first deployment:

1. Assign the domain to this Node.js app in hPanel, point its DNS to Hostinger, and enable SSL.
2. Confirm the app shows **Auto-deployment** and the deployment logs show a successful build.
3. Open `https://YOUR-DOMAIN/api/health`, then `https://YOUR-DOMAIN/login`.
4. Log in, refresh a quotation detail URL directly, and test a logo upload and both quotation/invoice PDFs.
5. Confirm uploaded logos survive a redeployment. `backend/uploads` is runtime data, not in Git: back it up and confirm persistent file storage with Hostinger before client handoff. Do not assume deployment directories preserve uploads.

Puppeteer's browser cache is configured inside `backend/node_modules/.cache/puppeteer` so its installed browser is included with the backend dependencies rather than relying on the build user's home cache. Do not set `PUPPETEER_SKIP_DOWNLOAD=true`. PDF rendering still requires the hosting runtime's Linux Chrome libraries; if PDF logs report missing libraries, have Hostinger confirm Chrome support before delivery. A successful React build alone does not prove PDF support.

Deployments do **not** automatically import the initial schema, run seed scripts, or modify the live database. Apply future database migrations deliberately after a backup. The audit migration already applied to the existing database must not be applied a second time.

For a local rehearsal of the combined deployment:

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

Official Hostinger references: [build settings](https://docs.hostinger.com/node.js/build-settings) and [GitHub auto-deployment](https://docs.hostinger.com/node.js/github).

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
