# ProductPulse AI — plan.md (Updated)

## Phase 5 — Standalone Portability (post-Emergent) ✅ COMPLETE (2026-07-03)
- ✅ Replaced `emergentintegrations` with the official Anthropic SDK (`ANTHROPIC_API_KEY`, model via `CLAUDE_MODEL`, default `claude-sonnet-5`).
- ✅ Added deterministic local analysis engine (rule-based, mirrors category definitions) — full app, demo, and tests run offline with no API key; automatic fallback if Claude fails after retries. Responses carry `analysis_engine`.
- ✅ Clean minimal `requirements.txt` (was a pip freeze of the Emergent image incl. a CDN-hosted litellm wheel).
- ✅ Created `backend/.env` + `frontend/.env` (+ `.env.example` both) — were platform-provisioned, absent from repo.
- ✅ Removed platform-only `@emergentbase/visual-edits` dev dep (craco degrades gracefully); production build compiles clean.
- ✅ Fixed the one open defect from iteration_1: `POST /insights/analyze` now returns 400 (API convention) instead of FastAPI's 422 for missing fields.
- ✅ Ported `tests/poc_core.py` to the new engine (6/6 pass offline) + new `tests/test_engine.py` (25 unit tests).
- ✅ `backend_test.py` BASE_URL now env-driven (`PULSE_API_URL`, default localhost:8001) — full suite 45/45 (100%, up from 96.2%).
- ✅ E2E demo flow verified 10/10 against local stack (MongoDB 7 in Docker, uvicorn :8001, production build served on :3000).
- ✅ Real `README.md` + `dev.sh` one-shot launcher.


## 1) Objectives
- ✅ Deliver the **core workflow** end-to-end: complaint text → Claude structured analysis JSON → clustering against saved insights/complaints → severity + health score update → business impact calc → recommended operational fix.
- ✅ Ship a **responsive PWA** with the 8 specified pages, desktop sidebar + mobile bottom nav, offline fallback, and installable manifest.
- ✅ Provide a **2-minute demo flow** using seeded data + demo credentials (demo@productpulse.ai / demo123) with reliable AI outputs and dashboard updates.
- 🎯 Current objective shift: move from “build” to **stabilize + polish + optional enhancements** (better clustering, additional alert automation, richer trends) without expanding scope into returns/helpdesk/integrations.

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation: Claude via Emergent LLM)
**Goal:** validate Anthropic Claude (via `emergentintegrations` + EMERGENT_LLM_KEY) reliably returns the required structured JSON and can be validated/normalized.

**Status:** ✅ COMPLETE
- Implemented POC in `/app/tests/poc_core.py`.
- Prompt tuned to enforce category specificity (e.g., electronics “left speaker stops working” → **Component Failure** not Durability).
- Implemented validation + retry loop.
- Implemented similarity stub using **overlap coefficient** token similarity.
- Verified business impact math.

**POC PASS criteria results:** ✅ 6/6 tests passed
- Schema-valid JSON.
- `failure_category` always in allowed set.
- Earbuds complaint classified as **Component Failure**.
- Specific recommended fix referencing product.
- Similar-case clustering stub returns expected range.

**Phase 1 user stories:** ✅ satisfied

---

### Phase 2 — V1 App Development (MVP app around proven core)
**Goal:** implement the full FastAPI + React + MongoDB app with PWA + seeded demo, prioritizing the New Insight → Insight Result → Dashboard update loop.

**Status:** ✅ COMPLETE

**Backend (FastAPI)**
1. Project scaffold + env config:
   - ✅ `/api` prefix; Mongo connection; UUID ids; CORS.
   - ✅ JWT auth secret configured.
2. Data layer:
   - ✅ MongoDB collections implemented via runtime dicts + schemas.
   - ✅ Idempotent demo seed implemented in `/app/backend/seed.py`.
   - ✅ Demo reset endpoint: `POST /api/demo/reset`.
3. Core endpoints (minimal but complete):
   - ✅ Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
   - ✅ Dashboard: `GET /dashboard` (KPIs, product rows, trends, alert feed).
   - ✅ Products: `GET /products`, `GET /products/{id}`.
   - ✅ Insights:
     - ✅ `POST /insights/analyze` (Claude analysis + clustering + impact calc)
     - ✅ `POST /insights/save` (persist complaint+insight, update product health/status, create recommendation, create alerts)
     - ✅ `PATCH /insights/{id}/status`.
   - ✅ Recommendations: `GET /recommendations` (+ optional `?status=`), `PATCH /recommendations/{id}/status`.
   - ✅ Alerts: `GET /alerts`, `PATCH /alerts/{id}/read`, `POST /alerts/read-all`.
   - ✅ Settings: `GET /settings`, `PUT /settings`.
4. Clustering (MVP):
   - ✅ Implemented lightweight similarity clustering against stored complaints/insights (token overlap coefficient) + seeded cluster behavior to ensure earbuds returns **~27 similar cases**.
5. Health + impact engine:
   - ✅ Implemented severity→health delta + thresholds.
   - ✅ Business impact uses settings (monthly loss, prevented complaints, refund exposure) + disclaimer.

**Frontend (React)**
1. App shell + responsive navigation:
   - ✅ Desktop sidebar: Dashboard, New Insight, Products, Recommendations, Alerts, Settings.
   - ✅ Mobile bottom nav: Home, Products, center Add CTA, Alerts, Settings.
2. Implemented 8 pages per spec:
   - ✅ Login (tagline hero, demo creds visible, Demo Login button)
   - ✅ Dashboard (KPIs, Product Health table + mobile cards, Top Failure Trends, Alert Feed)
   - ✅ New Insight (form + Analyze Complaint)
   - ✅ Insight Result (structured analysis + impact + actions + disclaimer; Copy Summary; Save Insight; Approve/In Progress actions)
   - ✅ Product Detail (health meter, impact, timeline, recommendations history, raw complaints)
   - ✅ Recommendations (filters + approval queue with status actions)
   - ✅ Alerts (cards with severity/type/action, open product)
   - ✅ Settings (store config + PWA install instructions + offline/service worker status)
3. PWA requirements:
   - ✅ `public/manifest.json` (ProductPulse AI / ProductPulse)
   - ✅ `public/sw.js` service worker
   - ✅ `public/offline.html` fallback
   - ✅ icons generated in `public/icons/`
4. UX states:
   - ✅ Staged AI loader during analysis.
   - ✅ Loading + empty states + toasts.
   - ✅ `data-testid` attributes on key UI.

**Phase 2 checkpoint (testing):** ✅ COMPLETE
- `testing_agent_v3` iteration_1:
  - Backend: **96.2%** (only note: 422 vs 400 validation convention, no real bug)
  - Frontend desktop: **100%**
  - Frontend mobile: **100%**
  - PWA: **100%**

---

### Phase 3 — Hardening + Completeness (post-V1)
**Goal:** stabilize quality, tighten clustering/analysis, and ensure the full demo script is bulletproof.

**Status:** ✅ Mostly delivered within Phase 2

**Delivered items (in Phase 2):**
1. ✅ Clustering alignment: earbuds returns **27** similar cases (seed + clustering logic).
2. ✅ Alerts logic: critical status alerts + repeated root cause alerts on save.
3. ✅ Copy/Share actions: Copy Summary implemented (with toast).
4. ✅ PWA polish: installable manifest + service worker + offline fallback + Settings install instructions.

**Remaining optional hardening tasks:**
- Improve clustering quality using embeddings (still MVP-friendly) while keeping deterministic seeded demo.
- Add richer trend history (health score trend over time) rather than point-in-time only.
- Expand alert automation beyond “on save” events (e.g., complaint volume spike detection).

**Phase 3 checkpoint:** optional re-run of `testing_agent_v3` after enhancements.

---

### Phase 4 — Auth/Permissions + Refinements (only after core is stable)
**Goal:** ensure production-friendly auth + data isolation without breaking the demo UX.

**Status:** ✅ COMPLETE (for MVP needs)
- ✅ JWT auth on protected endpoints; user scoping via `user_id`.
- ✅ Logout in UI (topbar + Settings).
- ✅ Token expiry handling: frontend interceptor clears token and redirects to `/login` on 401.
- ✅ Demo reset endpoint to restore deterministic demo state.

**Optional future auth refinements:**
- Token refresh flow (rotating refresh tokens) and multi-device session management.
- Password reset flow (not required for MVP/demo).

---

## 3) Next Actions
**Immediate (keep demo pristine):**
1. ✅ Ensure demo is reset before demos: `POST /api/demo/reset` (already done after testing).
2. ✅ Verify demo script remains <2 minutes end-to-end (confirmed).

**Optional enhancements (post-MVP, only if time):**
3. Upgrade clustering to embedding-based similarity while preserving deterministic seeded counts.
4. Add health trend history and “complaints over time” richer analytics.
5. Add automated volume-spike alerts (scheduled job / cron-like trigger) without external integrations.
6. Consider PWA push notifications (optional; out of MVP scope).
7. Add CSV import for complaints (optional; still no marketplace integrations).

---

## 4) Success Criteria
✅ Achieved:
- POC: structured JSON reliable; earbuds complaint classified as **Component Failure**; clustering + impact math correct.
- Demo flow: demo login → dashboard shows 5 products (earbuds health 38 Critical) → analyze earbuds complaint → Component Failure / High / 27 cases / $3,861 monthly loss / 9 prevented → save → health drops + alert appears → approve recommendation.
- PWA: manifest + service worker working; offline fallback reachable.
- UX: desktop sidebar + mobile bottom nav; responsive layouts; recommendation/alert actions work.
- Testing: `testing_agent_v3` confirms end-to-end success with **zero critical bugs**.

🎯 If pursuing enhancements:
- Embedding-based clustering improves precision/recall without breaking seeded demo determinism.
- Trend history + automated alerts increase ongoing monitoring value without scope creep into returns/helpdesk/integrations.
