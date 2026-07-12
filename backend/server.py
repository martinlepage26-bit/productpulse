from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from collections import Counter
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from ai_engine import (
    run_claude_analysis, run_claude_batch_analysis, cluster_complaints, business_impact,
    apply_severity, health_status, FAILURE_CATEGORIES,
)
from seed import seed_demo_data, DEMO_EMAIL, DEMO_PASSWORD

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALGO = 'HS256'
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="ProductPulse AI")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def make_token(user_id: str):
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------- Request models ----------------
class RegisterReq(BaseModel):
    email: str
    password: str
    store_name: str = "My Store"


class LoginReq(BaseModel):
    email: str
    password: str


class SettingsReq(BaseModel):
    store_name: Optional[str] = None
    default_currency: Optional[str] = None
    monthly_order_volume: Optional[int] = None
    average_order_value: Optional[float] = None
    refund_cost_estimate: Optional[float] = None
    enable_mobile_alerts: Optional[bool] = None
    default_platform: Optional[str] = None


class AnalyzeReq(BaseModel):
    # Optional with empty defaults so the handler returns the API's 400 convention
    # (instead of FastAPI's 422) when either field is missing.
    product_name: str = ""
    platform: str = "Other"
    source: str = "Review"
    raw_message: str = ""
    internal_notes: str = ""


class SaveInsightReq(BaseModel):
    product_name: str
    platform: str = "Other"
    source: str = "Review"
    raw_message: str
    internal_notes: str = ""
    analysis: Dict[str, Any]


class StatusReq(BaseModel):
    status: str


INSIGHT_STATUSES = ["Needs Review", "Approved", "In Progress", "Done", "Rejected"]


# ---------------- Auth ----------------
@api_router.post("/auth/register")
async def register(req: RegisterReq):
    email = req.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = {
        "id": str(uuid.uuid4()), "email": email,
        "password_hash": pwd_context.hash(req.password),
        "store_name": req.store_name, "default_currency": "USD",
        "monthly_order_volume": 500, "average_order_value": 40.0,
        "refund_cost_estimate": 60.0, "enable_mobile_alerts": True,
        "default_platform": "Shopify", "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user))
    user.pop("password_hash")
    user.pop("_id", None)
    return {"token": make_token(user["id"]), "user": user}


@api_router.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.strip().lower()})
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user.pop("password_hash")
    user.pop("_id", None)
    return {"token": make_token(user["id"]), "user": user}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------------- Dashboard ----------------
async def _product_rows(user_id):
    products = await db.products.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    rows = []
    for p in products:
        insights = await db.insights.find({"product_id": p["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
        complaint_count = await db.complaints.count_documents({"product_id": p["id"]})
        top_severity = "Low"
        order = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
        for i in insights:
            if order.get(i.get("severity", "Low"), 0) >= order.get(top_severity, 0):
                top_severity = i.get("severity", "Low")
        latest_rec = await db.recommendations.find_one({"product_id": p["id"]}, {"_id": 0}, sort=[("created_at", -1)])
        rows.append({
            **p,
            "complaint_count": complaint_count,
            "severity": top_severity if insights else "—",
            "recommended_fix": (latest_rec or {}).get("title", "—"),
        })
    rows.sort(key=lambda r: r.get("health_score", 100))
    return rows


async def _failure_trends(user_id):
    insights = await db.insights.find({"user_id": user_id}, {"_id": 0, "failure_category": 1}).to_list(2000)
    total = len(insights)
    counts = Counter(i["failure_category"] for i in insights)
    trends = [
        {"category": cat, "count": n, "pct": round(n * 100 / total) if total else 0}
        for cat, n in counts.most_common()
    ]
    return trends


@api_router.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    uid = user["id"]
    rows = await _product_rows(uid)
    critical = sum(1 for r in rows if r["status"] == "Critical")
    open_recs = await db.recommendations.count_documents({"user_id": uid, "status": {"$nin": ["Done", "Rejected"]}})
    acted = await db.recommendations.find({"user_id": uid, "status": {"$in": ["Approved", "In Progress", "Done"]}}, {"_id": 0}).to_list(500)
    loss_prevented = round(sum(r.get("estimated_impact", 0) or 0 for r in acted), 2)
    alerts = await db.alerts.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(6)
    pmap = {p["id"]: p["name"] for p in await db.products.find({"user_id": uid}, {"_id": 0, "id": 1, "name": 1}).to_list(500)}
    for a in alerts:
        a["product_name"] = pmap.get(a.get("product_id"), "")
    return {
        "kpis": {
            "products_monitored": len(rows),
            "critical_products": critical,
            "open_recommendations": open_recs,
            "monthly_loss_prevented": loss_prevented,
        },
        "products": rows,
        "failure_trends": await _failure_trends(uid),
        "alerts": alerts,
    }


# ---------------- Products ----------------
@api_router.get("/products")
async def list_products(user=Depends(get_current_user)):
    return await _product_rows(user["id"])


@api_router.get("/products/{product_id}")
async def product_detail(product_id: str, user=Depends(get_current_user)):
    p = await db.products.find_one({"id": product_id, "user_id": user["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    complaints = await db.complaints.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    insights = await db.insights.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    recs = await db.recommendations.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    imap = {i["complaint_id"]: i for i in insights}
    for c in complaints:
        ins = imap.get(c["id"])
        c["insight"] = {
            "failure_category": ins.get("failure_category"),
            "severity": ins.get("severity"),
            "root_cause": ins.get("root_cause"),
        } if ins else None
    cat_counts = Counter(i["failure_category"] for i in insights)
    main_category = cat_counts.most_common(1)[0][0] if cat_counts else "—"
    top_insight = max(insights, key=lambda i: i.get("similar_case_count", 0), default=None)
    impact = {
        "similar_case_count": (top_insight or {}).get("similar_case_count", 0),
        "estimated_monthly_loss": (top_insight or {}).get("estimated_monthly_loss", 0),
        "estimated_future_complaints_prevented": (top_insight or {}).get("estimated_future_complaints_prevented", 0),
        "estimated_refund_exposure": (top_insight or {}).get("estimated_refund_exposure", 0),
    }
    return {
        "product": p, "complaints": complaints, "insights": insights,
        "recommendations": recs, "main_category": main_category,
        "category_counts": [{"category": c, "count": n} for c, n in cat_counts.most_common()],
        "impact": impact,
    }


# ---------------- Insights (core AI flow) ----------------
@api_router.post("/insights/analyze")
async def analyze(req: AnalyzeReq, user=Depends(get_current_user)):
    if not req.raw_message.strip():
        raise HTTPException(status_code=400, detail="Customer message is required")
    if not req.product_name.strip():
        raise HTTPException(status_code=400, detail="Product name is required")
    uid = user["id"]
    product = await db.products.find_one(
        {"user_id": uid, "name": {"$regex": f"^{re.escape(req.product_name.strip())}$", "$options": "i"}}, {"_id": 0})
    supplier = (product or {}).get("supplier_name")

    try:
        analysis = await run_claude_analysis(
            req.product_name.strip(), supplier, req.platform, req.source,
            req.raw_message.strip(), req.internal_notes.strip())
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=502, detail="AI analysis failed. Please try again.")

    prior_complaints, prior_insights = [], []
    if product:
        prior_complaints = await db.complaints.find({"product_id": product["id"]}, {"_id": 0, "raw_message": 1}).to_list(1000)
        prior_insights = await db.insights.find({"product_id": product["id"]}, {"_id": 0, "failure_category": 1, "similar_case_count": 1}).to_list(1000)
    similar_count, pattern_label, cluster_status = cluster_complaints(
        req.raw_message, analysis["failure_category"], prior_complaints, prior_insights)

    impact = business_impact(similar_count, user.get("refund_cost_estimate", 60), user.get("average_order_value", 40))

    return {
        **analysis,
        "similar_case_count": similar_count,
        "pattern_label": pattern_label,
        "cluster_status": cluster_status,
        **impact,
        "product_exists": bool(product),
        "product_id": (product or {}).get("id"),
        "supplier_name": supplier,
        "disclaimer": "Estimates are directional and based on your settings.",
    }


async def _check_volume_spike(user, product):
    """Week-over-week complaint volume spike detection (deduped to one unread alert per 24h)."""
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    two_weeks_ago = (now - timedelta(days=14)).isoformat()
    cur = await db.complaints.count_documents({"product_id": product["id"], "created_at": {"$gte": week_ago}})
    prev = await db.complaints.count_documents({"product_id": product["id"], "created_at": {"$gte": two_weeks_ago, "$lt": week_ago}})
    if cur < 3 or cur <= prev * 1.3:
        return None
    day_ago = (now - timedelta(hours=24)).isoformat()
    existing = await db.alerts.find_one({
        "product_id": product["id"], "type": "volume_increase",
        "read": False, "created_at": {"$gte": day_ago},
    })
    if existing:
        return None
    pct = round((cur - prev) / max(prev, 1) * 100)
    alert = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "product_id": product["id"],
        "type": "volume_increase", "severity": "High",
        "message": f"{product['name']} complaints increased {pct}% week over week",
        "explanation": f"{cur} complaints in the last 7 days vs {prev} the week before.",
        "recommended_action": f"Review the latest {product['name']} complaints and prioritize the open recommendation.",
        "read": False, "created_at": now_iso(),
    }
    await db.alerts.insert_one(dict(alert))
    alert.pop("_id", None)
    return alert


async def _persist_insight(user, product_name, platform, source, raw_message, internal_notes, a):
    """Shared pipeline: persist complaint + insight, update product health (+history),
    create recommendation, create alerts (critical / repeated root cause / volume spike)."""
    uid = user["id"]
    created_alerts = []
    product = await db.products.find_one(
        {"user_id": uid, "name": {"$regex": f"^{re.escape(product_name.strip())}$", "$options": "i"}}, {"_id": 0})
    if not product:
        product = {
            "id": str(uuid.uuid4()), "user_id": uid, "name": product_name.strip(),
            "platform": platform, "supplier_name": None, "health_score": 100,
            "status": "Healthy", "main_pattern": a["failure_category"],
            "health_history": [{"date": now_iso(), "score": 100}],
            "created_at": now_iso(), "updated_at": now_iso(),
        }
        await db.products.insert_one(dict(product))
        product.pop("_id", None)

    old_status = product["status"]
    new_score, new_status = apply_severity(product["health_score"], a["severity"])
    history = (product.get("health_history") or [])[-59:]
    history.append({"date": now_iso(), "score": new_score})
    await db.products.update_one({"id": product["id"]}, {"$set": {
        "health_score": new_score, "status": new_status,
        "health_history": history, "updated_at": now_iso()}})

    complaint_id = str(uuid.uuid4())
    await db.complaints.insert_one({
        "id": complaint_id, "user_id": uid, "product_id": product["id"],
        "platform": platform, "source": source,
        "raw_message": raw_message.strip(), "internal_notes": (internal_notes or "").strip(),
        "created_at": now_iso(),
    })

    insight_id = str(uuid.uuid4())
    insight = {
        "id": insight_id, "user_id": uid, "complaint_id": complaint_id, "product_id": product["id"],
        "failure_category": a["failure_category"], "root_cause": a["root_cause"],
        "confidence_score": a["confidence_score"], "severity": a["severity"],
        "similar_case_count": a.get("similar_case_count", 0),
        "estimated_monthly_loss": a.get("estimated_monthly_loss", 0),
        "estimated_future_complaints_prevented": a.get("estimated_future_complaints_prevented", 0),
        "estimated_refund_exposure": a.get("estimated_refund_exposure", 0),
        "recommended_fix": a["recommended_fix"], "status": "Needs Review",
        "facts": a.get("facts"), "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.insights.insert_one(dict(insight))
    insight.pop("_id", None)

    rec_id = str(uuid.uuid4())
    recommendation = {
        "id": rec_id, "user_id": uid, "product_id": product["id"], "insight_id": insight_id,
        "title": a["recommended_fix"][:120].rstrip(".") if len(a["recommended_fix"]) > 120 else a["recommended_fix"],
        "description": a["recommended_fix"],
        "estimated_impact": a.get("estimated_monthly_loss", 0),
        "status": "Needs Review", "approved_at": None, "completed_at": None,
        "created_at": now_iso(),
    }
    await db.recommendations.insert_one(dict(recommendation))
    recommendation.pop("_id", None)

    async def add_alert(atype, severity, message, explanation, action):
        alert = {
            "id": str(uuid.uuid4()), "user_id": uid, "product_id": product["id"],
            "type": atype, "severity": severity, "message": message,
            "explanation": explanation, "recommended_action": action,
            "read": False, "created_at": now_iso(),
        }
        await db.alerts.insert_one(dict(alert))
        alert.pop("_id", None)
        created_alerts.append(alert)

    pname = product["name"]
    if new_status == "Critical" and old_status != "Critical":
        await add_alert("critical_status", "Critical", f"{pname} entered Critical status",
                        f"Health score dropped to {new_score} after a new {a['failure_category'].lower()} report.",
                        a["recommended_fix"])
    elif new_status == "Critical":
        await add_alert("critical_status", "Critical", f"{pname} remains Critical after new {a['failure_category'].lower()} report",
                        f"Health score is now {new_score}. Similar cases: {a.get('similar_case_count', 0)}.",
                        a["recommended_fix"])
    elif a.get("similar_case_count", 0) >= 3:
        await add_alert("repeated_root_cause", a["severity"], f"New repeated root cause detected for {pname}",
                        f"{a.get('similar_case_count')} similar {a['failure_category'].lower()} cases found.",
                        a["recommended_fix"])

    spike_alert = await _check_volume_spike(user, product)
    if spike_alert:
        created_alerts.append(spike_alert)

    updated_product = await db.products.find_one({"id": product["id"]}, {"_id": 0})
    return {
        "insight": insight, "recommendation": recommendation,
        "product": updated_product, "alerts": created_alerts,
    }


@api_router.post("/insights/save")
async def save_insight(req: SaveInsightReq, user=Depends(get_current_user)):
    a = req.analysis
    required = ["failure_category", "root_cause", "confidence_score", "severity", "recommended_fix"]
    if any(k not in a for k in required):
        raise HTTPException(status_code=400, detail="Invalid analysis payload")
    return await _persist_insight(
        user, req.product_name, req.platform, req.source,
        req.raw_message, req.internal_notes, a)


@api_router.patch("/insights/{insight_id}/status")
async def update_insight_status(insight_id: str, req: StatusReq, user=Depends(get_current_user)):
    if req.status not in INSIGHT_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {INSIGHT_STATUSES}")
    result = await db.insights.update_one(
        {"id": insight_id, "user_id": user["id"]},
        {"$set": {"status": req.status, "updated_at": now_iso()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Insight not found")
    return await db.insights.find_one({"id": insight_id}, {"_id": 0})


# ---------------- CSV Import ----------------
class ImportRow(BaseModel):
    product_name: str
    platform: str = "Other"
    source: str = "Review"
    raw_message: str
    internal_notes: str = ""


class ImportReq(BaseModel):
    rows: list[ImportRow]


async def _process_import_job(job_id: str, user: dict, rows: list):
    """Background task: batch-analyze complaints with Claude, persist each through the shared pipeline."""
    succeeded, failed, errors = 0, 0, []
    try:
        CHUNK = 6
        processed = 0
        for start in range(0, len(rows), CHUNK):
            chunk = rows[start:start + CHUNK]
            items = []
            for r in chunk:
                product = await db.products.find_one(
                    {"user_id": user["id"], "name": {"$regex": f"^{re.escape(r['product_name'].strip())}$", "$options": "i"}},
                    {"_id": 0, "supplier_name": 1})
                items.append({**r, "supplier_name": (product or {}).get("supplier_name")})
            analyses = await run_claude_batch_analysis(items)
            for offset, (r, a) in enumerate(zip(chunk, analyses)):
                row_num = start + offset + 1
                try:
                    if a is None:
                        # fall back to single-row analysis
                        a = await run_claude_analysis(
                            r["product_name"], items[offset].get("supplier_name"),
                            r.get("platform", "Other"), r.get("source", "Review"),
                            r["raw_message"], r.get("internal_notes", ""), max_retries=1)
                    product = await db.products.find_one(
                        {"user_id": user["id"], "name": {"$regex": f"^{re.escape(r['product_name'].strip())}$", "$options": "i"}}, {"_id": 0})
                    prior_complaints, prior_insights = [], []
                    if product:
                        prior_complaints = await db.complaints.find({"product_id": product["id"]}, {"_id": 0, "raw_message": 1}).to_list(1000)
                        prior_insights = await db.insights.find({"product_id": product["id"]}, {"_id": 0, "failure_category": 1, "similar_case_count": 1}).to_list(1000)
                    similar_count, pattern_label, cluster_status = cluster_complaints(
                        r["raw_message"], a["failure_category"], prior_complaints, prior_insights)
                    impact = business_impact(similar_count, user.get("refund_cost_estimate", 60), user.get("average_order_value", 40))
                    full = {**a, "similar_case_count": similar_count, "pattern_label": pattern_label,
                            "cluster_status": cluster_status, **impact}
                    await _persist_insight(
                        user, r["product_name"], r.get("platform", "Other"), r.get("source", "Review"),
                        r["raw_message"], r.get("internal_notes", ""), full)
                    succeeded += 1
                except Exception as e:
                    failed += 1
                    errors.append({"row": row_num, "error": str(e)[:200]})
                processed += 1
                await db.import_jobs.update_one({"id": job_id}, {"$set": {
                    "processed": processed, "succeeded": succeeded, "failed": failed, "errors": errors}})
        await db.import_jobs.update_one({"id": job_id}, {"$set": {
            "status": "completed", "completed_at": now_iso(),
            "processed": len(rows), "succeeded": succeeded, "failed": failed, "errors": errors}})
    except Exception as e:
        logger.error(f"Import job {job_id} failed: {e}")
        await db.import_jobs.update_one({"id": job_id}, {"$set": {
            "status": "failed", "completed_at": now_iso(), "errors": errors + [{"row": 0, "error": str(e)[:200]}]}})


@api_router.post("/imports")
async def create_import(req: ImportReq, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    rows = [r.model_dump() for r in req.rows if r.product_name.strip() and r.raw_message.strip()]
    if not rows:
        raise HTTPException(status_code=400, detail="No valid rows. Each row needs product_name and raw_message.")
    if len(rows) > 30:
        raise HTTPException(status_code=400, detail="Maximum 30 rows per import.")
    job = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "status": "processing",
        "total": len(rows), "processed": 0, "succeeded": 0, "failed": 0,
        "errors": [], "created_at": now_iso(), "completed_at": None,
    }
    await db.import_jobs.insert_one(dict(job))
    job.pop("_id", None)
    background_tasks.add_task(_process_import_job, job["id"], user, rows)
    return job


@api_router.get("/imports/{job_id}")
async def get_import(job_id: str, user=Depends(get_current_user)):
    job = await db.import_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job


# ---------------- Recommendations ----------------
@api_router.get("/recommendations")
async def list_recommendations(status: Optional[str] = None, user=Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if status and status != "All":
        q["status"] = status
    recs = await db.recommendations.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    pmap = {p["id"]: p for p in await db.products.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)}
    imap = {}
    insight_ids = [r.get("insight_id") for r in recs if r.get("insight_id")]
    if insight_ids:
        for i in await db.insights.find({"id": {"$in": insight_ids}}, {"_id": 0}).to_list(500):
            imap[i["id"]] = i
    for r in recs:
        p = pmap.get(r.get("product_id"), {})
        i = imap.get(r.get("insight_id"), {})
        r["product_name"] = p.get("name", "")
        r["product_status"] = p.get("status", "")
        r["issue"] = i.get("failure_category", p.get("main_pattern", ""))
        r["severity"] = i.get("severity", "")
    return recs


REC_STATUSES = ["Needs Review", "Approved", "In Progress", "Done", "Rejected"]


@api_router.patch("/recommendations/{rec_id}/status")
async def update_rec_status(rec_id: str, req: StatusReq, user=Depends(get_current_user)):
    if req.status not in REC_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {REC_STATUSES}")
    updates = {"status": req.status}
    if req.status == "Approved":
        updates["approved_at"] = now_iso()
    if req.status == "Done":
        updates["completed_at"] = now_iso()
    result = await db.recommendations.update_one(
        {"id": rec_id, "user_id": user["id"]}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec = await db.recommendations.find_one({"id": rec_id}, {"_id": 0})
    if rec and rec.get("insight_id"):
        await db.insights.update_one({"id": rec["insight_id"]}, {"$set": {"status": req.status, "updated_at": now_iso()}})
    return rec


# ---------------- Alerts ----------------
@api_router.get("/alerts")
async def list_alerts(user=Depends(get_current_user)):
    alerts = await db.alerts.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    pmap = {p["id"]: p["name"] for p in await db.products.find({"user_id": user["id"]}, {"_id": 0, "id": 1, "name": 1}).to_list(500)}
    for a in alerts:
        a["product_name"] = pmap.get(a.get("product_id"), "")
    return alerts


@api_router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, user=Depends(get_current_user)):
    result = await db.alerts.update_one({"id": alert_id, "user_id": user["id"]}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True}


@api_router.post("/alerts/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.alerts.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- Settings ----------------
@api_router.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    return user


@api_router.put("/settings")
async def update_settings(req: SettingsReq, user=Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    return await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})


# ---------------- Demo ----------------
@api_router.post("/demo/reset")
async def demo_reset():
    result = await seed_demo_data(db, force=True)
    return result


@api_router.get("/")
async def root():
    return {"app": "ProductPulse AI", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    result = await seed_demo_data(db)
    logger.info(f"Seed check: {result}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
