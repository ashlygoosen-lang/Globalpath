# GlobalPath Immigration — website, client portal and API

```
frontend/   React 19 + Vite 8 + TypeScript (from the Figma Make export, redesigned)
backend/    Node.js + Express API (JSON datastore, file uploads, JWT auth, email)
```

## Run locally

```bash
# 1. API
cd backend
cp .env.example .env          # set ADMIN_PASSWORD at minimum
npm install
npm run dev                   # http://localhost:4000   (npm test runs the API test suite)

# 2. Website
cd ../frontend
npm install
echo "VITE_API_URL=http://localhost:4000" > .env.local
npm run dev                   # http://localhost:8443
```

In development with no `.env`, an admin account is created automatically:
`admin@globalpath.co.za` / `ChangeMe!2026`. Sign in at `/#/admin`.

## What the site does

| Page | Route | Backend |
|---|---|---|
| Home, with the "What brings you to South Africa?" pathway finder | `#/` | — |
| Services, all-visa directory | `#/services` | `GET /api/content/*` |
| Visa detail (17 types: fees, timing, checklist) | `#/visa/:slug` | `GET /api/content/visas/:slug` |
| Insights + article reader, FAQs | `#/resources`, `#/resources/:slug` | `GET /api/content/articles` |
| Contact form | `#/contact` | `POST /api/enquiries` |
| Asylum eligibility check and advice (answers stay in the browser) | `#/asylum` | — |
| Consultation booking (live slots, no double-booking) | `#/book` | `GET /api/consultations/availability`, `POST /api/consultations` |
| Newsletter signup (footer) | — | `POST /api/newsletter` |
| Client portal: applicant details form (required first), official DHA document checklist uploads, locked submission until complete, eligibility check | `#/portal` | `/api/auth/*`, `/api/portal/applicant`, `/api/portal/*`, `/api/assessment` |
| Staff admin: enquiries, consultations, clients, document review, stage updates | `#/admin` | `/api/admin/*` |

Consultations cost R500 for every service and run Mon–Fri, 09:00–15:00 SAST in 45-minute slots with at least 2 hours' notice, bookable up to 60 days ahead (configured in `backend/src/config.js`).
Uploads accept PDF, JPG, PNG and WebP files up to 10 MB, stored under `DATA_DIR/uploads`, and can only be viewed by the client who uploaded them or by staff.

## Deploy on Railway (one service)

The Express API also serves the built website, so a single Railway service runs everything.
The site and API share one domain, so no CORS or `VITE_API_URL` setup is needed.

- Root directory: `/` (repo root). Build: `npm run build`. Start: `npm start`. Healthcheck: `/api/health`.
- Volume mounted at `/data`, with `DATA_DIR=/data`, so data and uploads survive redeploys.
- Database: add a PostgreSQL service and set `DATABASE_URL=${{Postgres.DATABASE_URL}}` on the app service.
  On first start the app creates the `gp_records` table and imports any existing `db.json` data automatically.
  Without `DATABASE_URL` it stores records in `DATA_DIR/db.json`. Uploaded files always stay on the volume.
  `GET /api/health` reports which database is in use.
- Variables: `NODE_ENV=production`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, optional SMTP settings.

To host the frontend separately later, deploy `frontend/` as a static site with `VITE_API_URL` set to the API URL,
and add that site's URL to the API's `CORS_ORIGINS`.

## Before launch
- Replace the placeholder email and social links (in `frontend/src/lib/content.ts` and `layout.tsx`).
- Have the legal pages (`#/legal/privacy`, `/terms`, `/disclaimer`) reviewed by your attorney.
- Re-check DHA fees and turnaround targets each April. They live in `content.json`, and the same file must be copied to both `frontend/src/` and `backend/src/data/`.
- The JSON datastore suits a single-office volume (thousands of records). For larger scale, swap `backend/src/db.js` for Postgres. The rest of the code only talks to the `db` interface.
