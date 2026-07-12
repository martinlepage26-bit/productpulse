# ProductPulse AI (Pulse)

*Every customer complaint becomes product intelligence.*

A responsive PWA for ecommerce sellers: paste a customer complaint, get a structured AI analysis (failure category, root cause, severity, confidence), automatic clustering against prior complaints, a business-impact estimate, and one specific operational fix — then track product health, recommendations, and alerts across your catalog.

**Stack:** FastAPI + MongoDB (backend) · React 19 + shadcn/Radix + Tailwind (frontend, CRA/craco) · Claude via the official Anthropic SDK.

## Quick start

```bash
./dev.sh            # boots MongoDB (Docker), backend :8001, frontend :3000
```

Or manually:

```bash
# 1. MongoDB
docker run -d --name pulse-mongo -p 27017:27017 -v pulse-mongo-data:/data/db mongo:7

# 2. Backend (Python 3.12)
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env    # then set JWT_SECRET (and optionally ANTHROPIC_API_KEY)
.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001

# 3. Frontend (Node 20, yarn 1.x)
cd frontend
yarn install
yarn start              # dev server on :3000
# or: yarn build && npx serve -s build -l 3000
```

**Demo login:** `demo@productpulse.ai` / `demo123` (seeded automatically on backend startup; `POST /api/demo/reset` restores pristine demo state).

## AI engine

`backend/ai_engine.py` has a two-provider analysis layer:

| Engine | When | Behavior |
|--------|------|----------|
| `claude` | `ANTHROPIC_API_KEY` set | Official Anthropic SDK, structured-JSON prompt, validation + auto-retry; model from `CLAUDE_MODEL` (default `claude-sonnet-5`) |
| `local` | no key, or `FORCE_LOCAL_ANALYSIS=1`, or Claude fails after retries | Deterministic rule-based classifier mirroring the same category definitions — full app and demo work offline |

Both engines return the identical schema; responses carry an `analysis_engine` field (`claude`, `local`, or `local-fallback`).

## Environment

`backend/.env` (see `.env.example`):

| Var | Meaning |
|-----|---------|
| `MONGO_URL` | e.g. `mongodb://localhost:27017` |
| `DB_NAME` | e.g. `productpulse` |
| `JWT_SECRET` | HS256 signing secret (7-day tokens) |
| `ANTHROPIC_API_KEY` | optional — enables real Claude analysis |
| `CLAUDE_MODEL` | optional — default `claude-sonnet-5` |
| `CORS_ORIGINS` | comma-separated, default `*` |
| `FORCE_LOCAL_ANALYSIS` | optional — pin the offline engine |

`frontend/.env`: `REACT_APP_BACKEND_URL=http://localhost:8001`

## Core flow

Complaint → `POST /api/insights/analyze` (analysis + clustering + impact math from user settings) → `POST /api/insights/save` (persists complaint + insight, drops product health by severity delta 5/10/20/30, creates a recommendation and alerts: critical status, repeated root cause, week-over-week volume spike) → dashboard updates.

Health: start 100; `80–100 Healthy / 50–79 Watch / 0–49 Critical`.
Impact: `monthly_loss = cases × refund_cost`, `prevented = cases × 0.35`, `exposure = cases × AOV` (directional, disclaimer shown).

## API surface

All under `/api`, JWT bearer auth except register/login/demo-reset:

- `POST /auth/register` · `POST /auth/login` · `GET /auth/me`
- `GET /dashboard` — KPIs, product health rows, failure trends, alert feed
- `GET /products` · `GET /products/{id}`
- `POST /insights/analyze` · `POST /insights/save` · `PATCH /insights/{id}/status`
- `POST /imports` (≤30 rows CSV batch, background job) · `GET /imports/{job_id}`
- `GET /recommendations[?status=]` · `PATCH /recommendations/{id}/status`
- `GET /alerts` · `PATCH /alerts/{id}/read` · `POST /alerts/read-all`
- `GET /settings` · `PUT /settings`
- `POST /demo/reset`

## Testing

```bash
# Unit + POC (offline, deterministic — 25 tests + 6-point POC)
backend/.venv/bin/python -m pytest tests/
backend/.venv/bin/python tests/poc_core.py

# Full API integration suite (45 tests; backend must be running)
backend/.venv/bin/python backend/backend_test.py       # PULSE_API_URL to override
```

## PWA

Installable manifest, service worker (network-first navigation, offline fallback page, SWR static caching, skips `/api`), 192/512 + maskable icons. Desktop sidebar nav; mobile bottom nav with center Add CTA.

## Provenance

Originally scaffolded on the Emergent platform; this repo has been fully ported to run standalone: `emergentintegrations` replaced with the official Anthropic SDK + offline local engine, clean `requirements.txt`, env-driven test harness, and the platform-only `@emergentbase/visual-edits` dev dependency removed (craco degrades gracefully). Historical build state: `plan.md`, `memory/PRD.md`, `test_reports/`.
