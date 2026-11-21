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
pnpm install                  # or npm install
echo "VITE_API_URL=http://localhost:4000" > .env.local
pnpm dev                      # http://localhost:8443
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
| Consultation booking (live slots, no double-booking) | `#/book` | `GET /api/consultations/availability`, `POST /api/consultations` |
| Newsletter signup (footer) | — | `POST /api/newsletter` |
| Client portal: sign up, progress, document uploads, eligibility check | `#/portal` | `/api/auth/*`, `/api/portal/*`, `/api/assessment` |
| Staff admin: enquiries, consultations, clients, document review, stage updates | `#/admin` | `/api/admin/*` |

Consultations run Mon–Fri, 09:00–15:00 SAST in 45-minute slots with at least 2 hours' notice, bookable up to 60 days ahead (configured in `backend/src/config.js`).
Uploads accept PDF, JPG, PNG and WebP files up to 10 MB, stored under `DATA_DIR/uploads`, and can only be viewed by the client who uploaded them or by staff.

## Deploy on Railway (two services, same repo)

**Backend service:** set the root directory to `backend`. The start command is `npm start`.
- Add a **volume** mounted at `/data`, and set `DATA_DIR=/data`. Without a volume, data and uploads are lost on every redeploy.
- Set `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGINS` (your frontend URL), and optionally the SMTP variables.

**Frontend service:** set the root directory to `frontend`.
- Build: `pnpm install && pnpm build`. Start: `pnpm start` (serves `dist/` on `$PORT`).
- Set `VITE_API_URL` to the backend's public URL **before** the build.

## Before launch
- Replace the placeholder phone number, email, address and social links (in `frontend/src/lib/content.ts` and `layout.tsx`).
- Have the legal pages (`#/legal/privacy`, `/terms`, `/disclaimer`) reviewed by your attorney.
- Re-check DHA fees and turnaround targets each April. They live in `content.json`, and the same file must be copied to both `frontend/src/` and `backend/src/data/`.
- The JSON datastore suits a single-office volume (thousands of records). For larger scale, swap `backend/src/db.js` for Postgres. The rest of the code only talks to the `db` interface.
