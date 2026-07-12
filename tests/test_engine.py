"""Unit tests for backend/ai_engine.py — local analyzer, clustering, health, impact.
All offline and deterministic (FORCE_LOCAL_ANALYSIS is set for the analysis tests)."""
import asyncio
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

os.environ["FORCE_LOCAL_ANALYSIS"] = "1"

import pytest  # noqa: E402
from ai_engine import (  # noqa: E402
    run_local_analysis, run_claude_analysis, run_claude_batch_analysis,
    validate_analysis, extract_json, analysis_engine,
    cluster_complaints, count_similar_hybrid, similarity,
    health_status, apply_severity, business_impact,
    FAILURE_CATEGORIES, SEVERITIES,
)


# ---------------- Local analyzer classification ----------------

CASES = [
    ("Wireless Earbuds", "Supplier B",
     "The headphones arrived working, but after three days the left speaker stopped working.",
     "Component Failure", "High"),
    ("Wireless Earbuds", "Supplier B",
     "Left earbud went completely silent after 3 days. Right one still works fine.",
     "Component Failure", "High"),
    ("Phone Charger", "VoltEdge",
     "Cable broke after one week of normal use. It frayed right at the connector.",
     "Durability Issue", "Medium"),
    ("Glass Water Bottle", "PureGlass",
     "The bottle arrived shattered. The box was crushed and there was barely any padding.",
     "Shipping Damage", "Medium"),
    ("LED Strip Lights", "BrightMax",
     "The adhesive stopped sticking after two days and the strips fell off my wall.",
     "Quality Control Issue", "Low"),
    ("Yoga Mat", "FlexFit Co",
     "Expected a thick cushioned mat but this is paper thin. Not what the photos show.",
     "Expectation Mismatch", "Medium"),
    ("T-Shirt", None,
     "Ordered a medium but it runs small, doesn't fit at all.",
     "Sizing Confusion", "Medium"),
    ("Blender", None,
     "The measuring cup was missing from the box when it arrived.",
     "Missing Part", "Medium"),
]


@pytest.mark.parametrize("product,supplier,message,category,severity", CASES)
def test_local_classification(product, supplier, message, category, severity):
    a = run_local_analysis(product, supplier, "Other", "Review", message)
    assert a["failure_category"] == category
    assert a["severity"] == severity
    assert validate_analysis(a) == []
    assert product.lower() in a["recommended_fix"].lower()


def test_local_safety_escalates_to_critical():
    a = run_local_analysis("Phone Charger", None, "Other", "Review",
                           "The charger started to smoke and nearly caught fire after a week.")
    assert a["severity"] == "Critical"


def test_local_unknown_fallback():
    a = run_local_analysis("Mystery Widget", None, "Other", "Review",
                           "I am unhappy with my recent purchase experience overall.")
    assert a["failure_category"] == "Unknown"
    assert validate_analysis(a) == []


def test_local_timing_extraction():
    a = run_local_analysis("Wireless Earbuds", None, "Other", "Review",
                           "The left speaker stopped working after three days.")
    assert a["facts"]["timing"].lower().startswith("after three days")


def test_local_is_deterministic():
    args = ("Wireless Earbuds", "Supplier B", "TikTok Shop", "Review",
            "The left speaker stopped working after three days.")
    assert run_local_analysis(*args) == run_local_analysis(*args)


# ---------------- Engine dispatch ----------------

def test_engine_forced_local():
    assert analysis_engine() == "local"


def test_run_claude_analysis_dispatches_local():
    a = asyncio.run(run_claude_analysis(
        "Wireless Earbuds", "Supplier B", "TikTok Shop", "Return request",
        "The headphones arrived working, but after three days the left speaker stopped working."))
    assert a["analysis_engine"] == "local"
    assert a["failure_category"] == "Component Failure"
    assert validate_analysis(a) == []


def test_batch_analysis_local():
    items = [
        {"product_name": "Phone Charger", "supplier_name": "VoltEdge",
         "raw_message": "Cable broke after just 5 days. Very poor quality."},
        {"product_name": "Yoga Mat", "supplier_name": None,
         "raw_message": "This mat is way too thin. Not what I expected from the photos."},
    ]
    results = asyncio.run(run_claude_batch_analysis(items))
    assert len(results) == 2
    assert all(r is not None and validate_analysis(r) == [] for r in results)
    assert results[0]["failure_category"] == "Durability Issue"
    assert results[1]["failure_category"] == "Expectation Mismatch"


# ---------------- Validation + JSON extraction ----------------

def test_extract_json_handles_fences():
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert extract_json('noise before {"a": 1} noise after') == {"a": 1}


def test_validate_analysis_catches_bad_payloads():
    assert validate_analysis({}) != []
    good = run_local_analysis("X Widget", None, "Other", "Review",
                              "The button stopped working after two days.")
    bad = dict(good, failure_category="Nonsense", severity="Extreme", confidence_score=400)
    errs = validate_analysis(bad)
    assert any("failure_category" in e for e in errs)
    assert any("severity" in e for e in errs)
    assert any("confidence_score" in e for e in errs)


# ---------------- Clustering ----------------

EARBUDS_MSG = "The headphones arrived working, but after three days the left speaker stopped working."
PRIOR = [{"raw_message": m} for m in [
    "Left earbud went completely silent after 3 days. Right one still works fine.",
    "My left speaker stopped working out of nowhere. I barely used them for a few days.",
    "Left side has no sound anymore. It worked for about three days then died.",
]]


def test_cluster_uses_seeded_category_count():
    prior_insights = [{"failure_category": "Component Failure", "similar_case_count": 27}] * 3
    count, label, status = cluster_complaints(EARBUDS_MSG, "Component Failure", PRIOR, prior_insights)
    assert count == 27
    assert status == "established"
    assert "repeated pattern" in label


def test_cluster_new_product_no_priors():
    count, label, status = cluster_complaints("It broke.", "Durability Issue", [], [])
    assert count == 0
    assert status == "emerging"
    assert "new report" in label


def test_similarity_overlap():
    assert similarity("left speaker stopped working", "left speaker stopped working") == 1.0
    assert similarity("left speaker stopped working", "delicious banana bread recipe") == 0.0


def test_count_similar_hybrid_matches_paraphrases():
    priors = [p["raw_message"] for p in PRIOR]
    assert count_similar_hybrid(EARBUDS_MSG, priors) >= 2
    assert count_similar_hybrid(EARBUDS_MSG, []) == 0


# ---------------- Health + impact ----------------

def test_health_status_thresholds():
    assert health_status(100) == "Healthy"
    assert health_status(80) == "Healthy"
    assert health_status(79) == "Watch"
    assert health_status(50) == "Watch"
    assert health_status(49) == "Critical"
    assert health_status(0) == "Critical"


def test_apply_severity_deltas_and_floor():
    assert apply_severity(100, "Low") == (95, "Healthy")
    assert apply_severity(100, "Medium") == (90, "Healthy")
    assert apply_severity(100, "High") == (80, "Healthy")
    assert apply_severity(100, "Critical") == (70, "Watch")
    assert apply_severity(38, "High") == (18, "Critical")
    assert apply_severity(3, "Critical") == (0, "Critical")


def test_business_impact_demo_numbers():
    impact = business_impact(27, 143.0, 45.0)
    assert impact["estimated_monthly_loss"] == 3861.0
    assert impact["estimated_future_complaints_prevented"] == 9
    assert impact["estimated_refund_exposure"] == 1215.0


def test_business_impact_floors_at_one_case():
    impact = business_impact(0, 100.0, 50.0)
    assert impact["estimated_monthly_loss"] == 100.0
    assert impact["estimated_refund_exposure"] == 50.0
