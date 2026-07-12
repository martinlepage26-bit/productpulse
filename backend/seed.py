"""Idempotent demo data seeding for ProductPulse AI."""
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_EMAIL = "demo@productpulse.ai"
DEMO_PASSWORD = "demo123"


def _iso(days_ago, hour=10):
    return (datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hour % 24)).isoformat()


def _id():
    return str(uuid.uuid4())


async def seed_demo_data(db, force=False):
    existing = await db.users.find_one({"email": DEMO_EMAIL})
    if existing and not force:
        return {"seeded": False, "reason": "demo user exists"}

    if existing:
        uid = existing["id"]
        for coll in ["products", "complaints", "insights", "recommendations", "alerts"]:
            await db[coll].delete_many({"user_id": uid})
        await db.users.delete_one({"id": uid})

    user_id = _id()
    await db.users.insert_one({
        "id": user_id,
        "email": DEMO_EMAIL,
        "password_hash": pwd_context.hash(DEMO_PASSWORD),
        "store_name": "Pulse Demo Store",
        "default_currency": "USD",
        "monthly_order_volume": 1200,
        "average_order_value": 45.0,
        "refund_cost_estimate": 143.0,
        "enable_mobile_alerts": True,
        "default_platform": "TikTok Shop",
        "created_at": _iso(60),
    })

    # ---------- Products ----------
    products = [
        {"name": "Wireless Earbuds", "platform": "TikTok Shop", "supplier_name": "Supplier B", "health_score": 38, "status": "Critical", "main_pattern": "Component failure after 3 days"},
        {"name": "Yoga Mat", "platform": "Amazon", "supplier_name": "FlexFit Co", "health_score": 62, "status": "Watch", "main_pattern": "Thickness expectation mismatch"},
        {"name": "Phone Charger", "platform": "Shopify", "supplier_name": "VoltEdge", "health_score": 55, "status": "Watch", "main_pattern": "Cable breaks within a week"},
        {"name": "LED Strip Lights", "platform": "Amazon", "supplier_name": "BrightMax", "health_score": 68, "status": "Watch", "main_pattern": "Adhesive fails to hold"},
        {"name": "Glass Water Bottle", "platform": "Etsy", "supplier_name": "PureGlass", "health_score": 82, "status": "Healthy", "main_pattern": "Damaged in transit"},
    ]
    pid = {}
    for i, p in enumerate(products):
        p_id = _id()
        pid[p["name"]] = p_id
        # 6 weekly health snapshots trending from ~100 down to the current score
        score, history = p["health_score"], []
        for w in range(5, -1, -1):
            frac = w / 5  # 1.0 (oldest) -> 0.0 (now)
            snap = round(score + (100 - score) * frac)
            history.append({"date": _iso(w * 7), "score": min(100, max(0, snap))})
        await db.products.insert_one({
            "id": p_id, "user_id": user_id, **p,
            "health_history": history,
            "created_at": _iso(55 - i), "updated_at": _iso(2 + i),
        })

    # ---------- Complaints + Insights ----------
    # (product, source, message, category, severity, root_cause, fix, similar_count, days_ago)
    C = []
    earbuds_fix = "Pause advertising for Wireless Earbuds and inspect Supplier B batch before accepting new orders."
    earbuds_rc = "The left speaker appears to fail after short use, likely linked to Supplier B component quality."
    earbuds_msgs = [
        ("Return request", "The headphones arrived working, but after three days the left speaker stopped working.", 28),
        ("Review", "Left earbud went completely silent after 3 days. Right one still works fine. Very disappointed.", 25),
        ("Support chat", "My left speaker stopped working out of nowhere. I barely used them for a few days.", 22),
        ("Marketplace message", "Left side has no sound anymore. It worked for about three days then died.", 19),
        ("Return request", "Earbuds stopped charging properly and the left bud cuts out constantly after a week.", 16),
        ("Review", "Sound quality was great at first but one earbud failed within days of purchase.", 13),
        ("Email", "The earbuds keep disconnecting and now one side is completely dead. Only had them a short while.", 10),
        ("Support chat", "Battery drains fast and the left earbud no longer produces any audio.", 6),
        ("Return request", "One earbud stopped working after less than a week of light use. Requesting a refund.", 3),
    ]
    for src, msg, d in earbuds_msgs:
        C.append(("Wireless Earbuds", "TikTok Shop", src, msg, "Component Failure", "High", earbuds_rc, earbuds_fix, 27, d))

    yoga_rc = "Listing photos overstate the mat's cushioning, so customers expect a thicker mat than the 4mm product delivered."
    yoga_fix = "Update Yoga Mat photos to show thickness clearly and state the exact 4mm thickness in the listing title."
    yoga_msgs = [
        ("Review", "This mat is way thinner than it looks in the pictures. My knees hurt during practice.", 20),
        ("Return request", "Expected a thick cushioned mat but this is paper thin. Not what the photos show.", 17),
        ("Review", "Too thin for floor exercises. The listing made it look plush and supportive.", 14),
        ("Social media comment", "Bought this expecting gym-quality thickness. It's basically a towel.", 11),
        ("Email", "The mat thickness is misleading. I wanted something with real padding for my joints.", 7),
        ("Review", "Nice color but much thinner than expected. Photos exaggerate the cushioning a lot.", 4),
    ]
    for src, msg, d in yoga_msgs:
        C.append(("Yoga Mat", "Amazon", src, msg, "Expectation Mismatch", "Medium", yoga_rc, yoga_fix, 6, d))

    charger_rc = "The charger cable lacks strain relief at the connector, causing the cable to fray and break under normal use."
    charger_fix = "Replace Phone Charger cable supplier and require reinforced strain relief with bend-test certification."
    charger_msgs = [
        ("Return request", "Cable broke after one week of normal use. It frayed right at the connector.", 18),
        ("Review", "The charging cable snapped within a week. Cheap wiring inside.", 15),
        ("Support chat", "Cable stopped working after 8 days. The rubber coating split open near the plug.", 12),
        ("Marketplace message", "Second cable from you that broke in a week. The wire bends and dies.", 8),
        ("Review", "Charger cable frayed and stopped charging after about a week. Poor durability.", 5),
    ]
    for src, msg, d in charger_msgs:
        C.append(("Phone Charger", "Shopify", src, msg, "Durability Issue", "Medium", charger_rc, charger_fix, 5, d))

    led_rc = "The factory adhesive backing is too weak to hold the strip weight on painted walls, causing strips to peel off."
    led_fix = "Add stronger adhesive warning to LED Strip Lights listing and include 3M mounting clips in every order."
    led_msgs = [
        ("Review", "The adhesive stopped sticking after two days and the strips fell off my wall.", 16),
        ("Return request", "Lights won't stay up. The sticky backing peels off within hours.", 12),
        ("Support chat", "Adhesive is useless on painted walls. Strips fell and pulled paint with them.", 9),
        ("Review", "Great colors but terrible adhesive. Had to buy mounting tape separately.", 4),
    ]
    for src, msg, d in led_msgs:
        C.append(("LED Strip Lights", "Amazon", src, msg, "Quality Control Issue", "Low", led_rc, led_fix, 4, d))

    glass_rc = "Single-layer paper packaging provides insufficient cushioning for glass during carrier transit."
    glass_fix = "Improve Glass Water Bottle packaging with a double-walled box and molded foam inserts before next shipment batch."
    glass_msgs = [
        ("Email", "The bottle arrived shattered. The box was crushed and there was barely any padding.", 14),
        ("Return request", "Glass bottle broke in shipping. Packaging was just thin paper wrap.", 9),
        ("Review", "Arrived cracked at the base. Shipping box looked like it was dropped.", 5),
    ]
    for src, msg, d in glass_msgs:
        C.append(("Glass Water Bottle", "Etsy", src, msg, "Shipping Damage", "Medium", glass_rc, glass_fix, 3, d))

    insight_ids = {}
    for (pname, platform, src, msg, cat, sev, rc, fix, sim, days) in C:
        c_id, i_id = _id(), _id()
        created = _iso(days)
        await db.complaints.insert_one({
            "id": c_id, "user_id": user_id, "product_id": pid[pname],
            "platform": platform, "source": src, "raw_message": msg,
            "internal_notes": "", "created_at": created,
        })
        await db.insights.insert_one({
            "id": i_id, "user_id": user_id, "complaint_id": c_id, "product_id": pid[pname],
            "failure_category": cat, "root_cause": rc, "confidence_score": 88 + (days % 9),
            "severity": sev, "similar_case_count": sim,
            "estimated_monthly_loss": round(sim * 143.0, 2),
            "estimated_future_complaints_prevented": int(round(sim * 0.35)),
            "estimated_refund_exposure": round(sim * 45.0, 2),
            "recommended_fix": fix, "status": "Needs Review",
            "created_at": created, "updated_at": created,
        })
        insight_ids.setdefault(pname, i_id)

    # ---------- Recommendations ----------
    recs = [
        ("Wireless Earbuds", "Inspect Supplier B batch for Wireless Earbuds", "Pause advertising for Wireless Earbuds and inspect Supplier B batch before accepting new orders. Component failure cluster of 27 similar cases detected.", 3861.0, "Needs Review", None, None, 3),
        ("Yoga Mat", "Update Yoga Mat photos to show thickness clearly", "Replace hero images with side-profile photos showing true 4mm thickness and state thickness in the title to stop expectation mismatch returns.", 858.0, "Needs Review", None, None, 4),
        ("Phone Charger", "Replace Phone Charger cable supplier", "Source a reinforced cable with proper strain relief from a new supplier. Require bend-test certification before the next inventory order.", 715.0, "Needs Review", None, None, 5),
        ("LED Strip Lights", "Add stronger adhesive warning to LED Strip Lights", "Add a pre-purchase note about wall surface compatibility and include 3M mounting clips in every order to cut adhesive complaints.", 572.0, "In Progress", _iso(3), None, 8),
        ("Glass Water Bottle", "Improve Glass Water Bottle packaging", "Switch to double-walled boxes with molded foam inserts to eliminate transit breakage before the next shipment batch.", 429.0, "Approved", _iso(2), None, 6),
    ]
    for pname, title, desc, impact, status, approved_at, completed_at, days in recs:
        await db.recommendations.insert_one({
            "id": _id(), "user_id": user_id, "product_id": pid[pname],
            "insight_id": insight_ids.get(pname), "title": title, "description": desc,
            "estimated_impact": impact, "status": status,
            "approved_at": approved_at, "completed_at": completed_at,
            "created_at": _iso(days),
        })

    # ---------- Alerts ----------
    alerts = [
        ("Wireless Earbuds", "critical_status", "Critical", "Wireless Earbuds entered Critical status", "Health score dropped to 38 after repeated component failure reports.", "Pause ads and inspect Supplier B batch.", 3),
        ("Yoga Mat", "volume_increase", "High", "Yoga Mat complaints increased 38%", "Expectation mismatch complaints about thickness are rising week over week.", "Update listing photos to show true thickness.", 2),
        ("Phone Charger", "repeated_root_cause", "Medium", "Phone Charger has repeated cable-failure reports", "5 durability complaints cite cable breakage within one week of use.", "Replace cable supplier and require strain relief.", 1),
    ]
    for pname, atype, sev, message, explanation, action, days in alerts:
        await db.alerts.insert_one({
            "id": _id(), "user_id": user_id, "product_id": pid[pname],
            "type": atype, "severity": sev, "message": message,
            "explanation": explanation, "recommended_action": action,
            "read": False, "created_at": _iso(days),
        })

    return {"seeded": True, "user_id": user_id, "products": len(products), "complaints": len(C)}
