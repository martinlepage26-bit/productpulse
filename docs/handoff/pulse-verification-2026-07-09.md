# ProductPulse AI — Verification Handoff (2026-07-09)

## What this is

Independent re-verification of the ProductPulse AI working copy at
`/home/martin/pulse-work/Pulse-main` on host mtl (Linux, `/home/martin`), run
2026-07-09. The July 3 session's claims in `plan.md` and `README.md` were treated as
claims, not facts, and re-tested live.

## Provenance

- `~/.UPLOADS/Pulse-main.zip` (165KB, 132 files) is the pristine Emergent/GitHub
  export of 2026-07-03 02:10, pre-port. It is superseded by this working copy and
  kept only as the upstream snapshot.
- This working copy is the ported standalone version (Anthropic SDK + offline local
  engine, clean requirements, real README, `dev.sh`).

## Verification commands run and results (all on this host, this date)

| Check | Command | Result |
|---|---|---|
| Unit tests (offline) | `backend/.venv/bin/python -m pytest tests/ -q` | 25 passed in 1.75s |
| POC suite (offline) | `backend/.venv/bin/python tests/poc_core.py` | 6/6 PASS, "core is proven" |
| Stack boot | mongo:7 via docker + uvicorn :8001 | API root 200; demo seed present |
| Demo login | `POST /api/auth/login` demo@productpulse.ai | JWT issued |
| Full integration suite | `backend/.venv/bin/python backend/backend_test.py` | 45/45, 100% |
| Core flow E2E | `POST /api/insights/analyze` (earbud complaint, `raw_message` field) | Correct structured JSON: Component Failure, High severity, fix, impact math, `analysis_engine: local` |
| Frontend production build | `npx yarn@1.22.22 build` | Compiles clean, 14.8s |

Teardown after verification: uvicorn stopped, `pulse-mongo` container removed, data
volume `pulse-mongo-data` kept. Rebuild the stack any time with `./dev.sh`.

## State assessment

The app is **complete at MVP scope and passes its own full test pyramid on this
host**. No ANTHROPIC_API_KEY is configured, so analysis runs on the deterministic
local engine by design (`analysis_engine: local` verified in the live response); set
the key in `backend/.env` to switch to Claude analysis with automatic fallback.

Known API detail: `POST /insights/analyze` takes `raw_message` + `product_name`
(optional `platform`, `source`); missing message returns the API-convention 400.

## Gate notes (per ~/.agents/hephaistos/ETHICAL-REVIEW-GATES.md)

- Language: "AI analysis" outputs carry `analysis_engine` and `confidence_score`
  fields plus an on-screen estimates disclaimer — claims are bounded in-product.
- Data boundary: local stack only (Mongo in local Docker); no external calls without
  an explicit API key; JWT auth with per-user scoping. CORS defaults to `*` in
  `.env.example` — tighten before any public deploy.
- Human review / deploy: nothing is deployed; any outward-facing launch is an
  Operator decision and would need CORS, JWT_SECRET rotation, and hosting review.

## Incident during verification

Teardown used `pkill -f "uvicorn server:app"`, which also matched the unrelated
`stacklight-api.service` uvicorn; systemd restarted it within seconds (verified
healthy, 200 on :8091/api/). Lavoie fieldops backend unaffected (start time intact).
Logged as skill-observation #14: kill by captured PID, never by generic pattern.

## Risks

- CORS `*` default and demo credentials are fine locally, unsafe publicly.
- The zip in `.UPLOADS` is stale relative to this copy; anyone unpacking it fresh
  loses the port work.
- No git repo is initialized in this working copy; the port work has no version
  history on this host.

## Next decision (required field)

Decide ProductPulse AI's disposition: (a) product candidate → initialize git, move
under `apps/web-apps/`, add to the CLAUDE.md project table, plan hosting; (b) demo
asset for PHAROS consulting → leave as-is, keep `dev.sh` as the 2-minute demo
launcher; (c) archive. Until decided, it stays runnable at
`/home/martin/pulse-work/Pulse-main` via `./dev.sh`.
