# ProductPulse AI — PRD & Build Status

## Product
Responsive PWA that turns customer complaints into product intelligence for ecommerce sellers.
Tagline: "Every customer complaint becomes product intelligence."
Stack: FastAPI + React + MongoDB. AI: Anthropic Claude (claude-sonnet-4-6) via Emergent Universal LLM key (emergentintegrations).

## Status: MVP COMPLETE (Phases 1–2 done, tested)
- Phase 1 POC: Claude structured JSON analysis proven in isolation (/app/tests/poc_core.py, 6/6 pass).
- Phase 2: Full app built and tested (testing_agent iteration_1: backend 96.2%, frontend 100%, PWA 100%).

## Core flow (verified end-to-end)
Paste complaint -> POST /api/insights/analyze (Claude: facts, failure_category, root_cause, confidence, severity, recommended_fix; clustering: similar_case_count/pattern/emerging-established; impact math from user settings) -> POST /api/insights/save (persists complaint+insight, health score -= severity delta [5/10/20/30], creates recommendation "Needs Review", creates alerts) -> dashboard updates.
Demo script verified: earbuds complaint -> Component Failure, High, 27 similar cases, $3,861/mo loss, 9 prevented.

## Pages (8)
Login (demo login btn + visible creds), Dashboard (4 KPIs, health table/cards, failure trends, alert feed), New Insight (form + example chips + staged AI loader), Insight Result (analysis + Save/Approve/In Progress/Copy Summary), Product Detail (health, timeline chart+list, recommendations, raw complaints tabs), Recommendations (filterable queue: Approve/Reject/In Progress/Done), Alerts (cards, Open Product, mark read), Settings (store profile, business assumptions, alerts toggle, PWA status + install instructions, logout).

## PWA
manifest.json (ProductPulse AI/ProductPulse, #1d4ed8), sw.js (network-first nav + offline.html fallback, SWR static caching, skips /api), icons (192/512 + maskable), apple meta tags. Desktop sidebar nav; mobile bottom nav (Home, Products, center Add CTA, Alerts, Settings).

## Key files
- Backend: server.py (all routes, /api prefix), ai_engine.py (Claude prompt/validation/retry, clustering, health, impact), seed.py (idempotent demo seed, runs on startup)
- Frontend: src/pages/* (8 pages), components/AppShell.jsx, components/widgets.jsx, lib/api.js, lib/status.js, context/AuthContext.js
- PWA: public/manifest.json, public/sw.js, public/offline.html, public/icons/

## Credentials & utilities
- Demo: demo@productpulse.ai / demo123 (JWT auth, 7-day expiry)
- POST /api/demo/reset — restores pristine seed (5 products, 27 complaints, 5 recs [1 Approved, 1 In Progress, 3 Needs Review], 3 alerts)
- backend/.env: EMERGENT_LLM_KEY, JWT_SECRET (do not modify MONGO_URL/DB_NAME)

## Seeded demo data
Products: Wireless Earbuds (38 Critical, Supplier B, 9 component-failure complaints), Yoga Mat (62 Watch, 6 expectation mismatch), Phone Charger (55 Watch, 5 durability), LED Strip Lights (68 Watch, 4 QC/adhesive), Glass Water Bottle (82 Healthy, 3 shipping damage). Settings: AOV $45, refund cost $143 (=> 27 x 143 = $3,861).

## Business logic
Health: start 100, -5 Low, -10 Medium, -20 High, -30 Critical, min 0. Status: 80-100 Healthy / 50-79 Watch / 0-49 Critical.
Impact: monthly_loss = cases x refund_cost; prevented = cases x 0.35; exposure = cases x AOV. Disclaimer shown.

## Explicitly NOT built (per spec)
Return portals, shipping labels, refund processing, CRM, helpdesk, chat, external integrations, payments, push notification infra.

## Possible next steps (Phase 3+)
Embedding-based clustering upgrade, health score trend history, alert generation on volume spikes, PWA push notifications, CSV import of complaints.
