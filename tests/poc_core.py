"""
ProductPulse AI - Phase 1 POC (ported off emergentintegrations)
Tests the CORE workflow in isolation against the active analysis engine:
- Claude via the official Anthropic SDK when ANTHROPIC_API_KEY is set
- the deterministic local analyzer otherwise (offline mode)

1. Analysis returns schema-valid structured JSON
   (facts, failure_category, root_cause, confidence, severity, fix)
2. Validation + auto-retry (Claude path) / determinism (local path)
3. Similarity clustering stub (token overlap) for similar_case_count
4. Business impact math

PASS CRITERIA (mirrors the original POC):
- All test complaints produce schema-valid JSON
- failure_category always in allowed enum, within expected set per case
- Demo earbuds complaint -> "Component Failure"
- recommended_fix is specific (mentions the product, not generic)

Run standalone (python tests/poc_core.py) or via pytest (test_poc_core).
"""
import asyncio
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(REPO_ROOT / "backend" / ".env")

from ai_engine import (  # noqa: E402
    run_claude_analysis, validate_analysis, analysis_engine,
    business_impact, FAILURE_CATEGORIES,
)


# ---- Similarity clustering stub (token overlap - same as backend uses) ----
STOPWORDS = set("the a an and or but after was were is are it its this that of to in on for with my i had have has not no".split())


def tokenize(text):
    return set(w for w in re.findall(r"[a-z']+", text.lower()) if w not in STOPWORDS and len(w) > 2)


def similarity(a, b):
    """Overlap coefficient: intersection / size of smaller set (better for short texts)."""
    ta, tb = tokenize(a), tokenize(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / min(len(ta), len(tb))


PRIOR_COMPLAINTS = [
    "Left earbud stopped working after 3 days of use",
    "The left speaker died within a week, right one still fine",
    "Earbuds worked at first but left side went silent after a few days",
    "Charging case fine but left bud has no sound anymore",
    "Yoga mat is way thinner than I expected from the photos",
    "Charger cable frayed and broke after one week",
]


def cluster(message, prior):
    return sum(1 for p in prior if similarity(message, p) >= 0.15)


TEST_CASES = [
    {
        "name": "DEMO earbuds complaint (must be Component Failure)",
        "product": "Wireless Earbuds", "supplier": "Supplier B", "platform": "TikTok Shop", "source": "Return request",
        "message": "The headphones arrived working, but after three days the left speaker stopped working.",
        "expect_category": ["Component Failure"],
        "expect_severity": ["High", "Critical", "Medium"],
    },
    {
        "name": "Yoga mat thickness (Expectation/Description Mismatch)",
        "product": "Yoga Mat", "supplier": "FlexFit Co", "platform": "Amazon", "source": "Review",
        "message": "The photos made this mat look thick and cushioned but it's paper thin. My knees hurt during practice. Not what I expected at all.",
        "expect_category": ["Expectation Mismatch", "Description Mismatch"],
        "expect_severity": ["Low", "Medium"],
    },
    {
        "name": "Charger cable breakage (Durability)",
        "product": "Phone Charger", "supplier": "VoltEdge", "platform": "Shopify", "source": "Support chat",
        "message": "The cable started fraying near the connector and completely broke after just one week of normal use.",
        "expect_category": ["Durability Issue", "Quality Control Issue", "Supplier Defect"],
        "expect_severity": ["Medium", "High"],
    },
    {
        "name": "Glass bottle shattered (Shipping Damage)",
        "product": "Glass Water Bottle", "supplier": "PureGlass", "platform": "Etsy", "source": "Email",
        "message": "The box arrived crushed and the bottle was shattered into pieces inside. The packaging was just a thin layer of paper.",
        "expect_category": ["Shipping Damage", "Packaging Failure"],
        "expect_severity": ["Medium", "High", "Critical"],
    },
]


async def main():
    print("=" * 70)
    print(f"ProductPulse AI - CORE POC (engine: {analysis_engine()})")
    print("=" * 70)
    results = []

    # --- Test 1: structured analysis for each test complaint ---
    for tc in TEST_CASES:
        print(f"\n[TEST] {tc['name']}")
        try:
            data = await run_claude_analysis(
                tc["product"], tc["supplier"], tc["platform"], tc["source"], tc["message"])
            errors = validate_analysis(data)
            if errors:
                raise RuntimeError(f"schema errors: {errors}")
            cat, sev, conf = data["failure_category"], data["severity"], data["confidence_score"]
            fix = data["recommended_fix"]
            print(f"  category={cat} | severity={sev} | confidence={conf}")
            print(f"  root_cause: {data['root_cause']}")
            print(f"  fix: {fix}")
            ok = True
            if cat not in FAILURE_CATEGORIES:
                print(f"  WARN: category {cat} not in enum")
                ok = False
            if cat not in tc["expect_category"]:
                print(f"  WARN: category {cat} not in expected {tc['expect_category']}")
                ok = False
            if sev not in tc["expect_severity"]:
                print(f"  WARN: severity {sev} not in expected {tc['expect_severity']}")
            if not any(w.lower() in fix.lower() for w in tc["product"].split()):
                print(f"  WARN: fix does not mention product")
                ok = False
            results.append((tc["name"], ok))
            print(f"  RESULT: {'PASS' if ok else 'SOFT-FAIL'}")
        except Exception as e:
            print(f"  RESULT: FAIL - {e}")
            results.append((tc["name"], False))

    # --- Test 2: similarity clustering stub ---
    print(f"\n[TEST] Similarity clustering stub")
    msg = "The headphones arrived working, but after three days the left speaker stopped working."
    count = cluster(msg, PRIOR_COMPLAINTS)
    print(f"  earbuds message matched {count} of {len(PRIOR_COMPLAINTS)} prior complaints (expect >=2, <=4)")
    clustering_ok = 2 <= count <= 4
    results.append(("Clustering stub", clustering_ok))
    print(f"  RESULT: {'PASS' if clustering_ok else 'FAIL'}")

    # --- Test 3: business impact math ---
    print(f"\n[TEST] Business impact math")
    impact = business_impact(27, 143, 45)
    monthly_loss = impact["estimated_monthly_loss"]
    prevented = impact["estimated_future_complaints_prevented"]
    exposure = impact["estimated_refund_exposure"]
    print(f"  monthly_loss=${monthly_loss} (expect 3861) | prevented={prevented} (expect 9) | exposure=${exposure} (expect 1215)")
    impact_ok = monthly_loss == 3861.0 and prevented == 9 and exposure == 1215.0
    results.append(("Business impact math", impact_ok))
    print(f"  RESULT: {'PASS' if impact_ok else 'FAIL'}")

    print("\n" + "=" * 70)
    passed = sum(1 for _, ok in results if ok)
    print(f"SUMMARY: {passed}/{len(results)} passed")
    for name, ok in results:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    print("=" * 70)
    if passed == len(results):
        print("POC: SUCCESS - core is proven")
        return 0
    print("POC: FAILURES PRESENT")
    return 1


def test_poc_core():
    """pytest entry point."""
    assert asyncio.run(main()) == 0, "POC pass criteria not met"


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
