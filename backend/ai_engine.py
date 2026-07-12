"""ProductPulse AI - Core analysis engine (proven in POC).
Claude structured analysis + clustering + health score + business impact.

Provider layer:
- "claude": official Anthropic SDK, used when ANTHROPIC_API_KEY is set.
- "local": deterministic rule-based analyzer, used when no key is present
  (offline demo mode) and as automatic fallback if the API call fails.
Set FORCE_LOCAL_ANALYSIS=1 to pin the local engine regardless of keys.
"""
import json
import os
import re
import logging

logger = logging.getLogger(__name__)

FAILURE_CATEGORIES = [
    "Packaging Failure", "Supplier Defect", "Sizing Confusion", "Shipping Damage",
    "Description Mismatch", "Durability Issue", "Quality Control Issue",
    "Expectation Mismatch", "Missing Part", "Component Failure", "Unknown",
]
SEVERITIES = ["Low", "Medium", "High", "Critical"]
SEVERITY_DELTA = {"Low": 5, "Medium": 10, "High": 20, "Critical": 30}

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-5")

SYSTEM_PROMPT = """You are ProductPulse AI, a product intelligence engine for ecommerce sellers.
You analyze a single customer complaint and return ONLY a JSON object (no markdown, no prose) with this exact schema:

{
  "facts": {
    "product_issue": "<short description of the issue>",
    "timing": "<when the failure occurred, or 'Not specified'>",
    "defect_description": "<what physically/functionally failed>",
    "customer_expectation": "<what the customer expected>",
    "affected_area": "<likely affected product area/component>"
  },
  "failure_category": "<one of: Packaging Failure | Supplier Defect | Sizing Confusion | Shipping Damage | Description Mismatch | Durability Issue | Quality Control Issue | Expectation Mismatch | Missing Part | Component Failure | Unknown>",
  "root_cause": "<ONE clear sentence stating the likely root cause>",
  "confidence_score": <integer 0-100>,
  "severity": "<one of: Low | Medium | High | Critical>",
  "recommended_fix": "<ONE specific operational action the seller should take. Must reference the specific product and, when known, the supplier. NEVER generic advice like 'improve quality'. Examples: 'Pause advertising for Wireless Earbuds and inspect Supplier B batch before accepting new orders.' or 'Rewrite the Yoga Mat listing to state the exact 4mm thickness and add a side-profile photo.'>"
}

Category definitions (choose the MOST SPECIFIC match):
- Component Failure: a specific component (speaker, button, battery, motor, light, screen, connector) stops functioning partially or fully. If one part of an electronic/mechanical product stops working, this is Component Failure, NOT Durability Issue.
- Durability Issue: the product's material physically wears out, frays, cracks, tears, or breaks apart over time (e.g., cable fraying, fabric tearing, sole peeling).
- Supplier Defect: evidence points to a bad manufacturing batch or supplier-level quality problem.
- Quality Control Issue: unit arrived already defective/DOA, suggesting inspection gaps.
- Shipping Damage: product was damaged in transit (broken/crushed on arrival).
- Packaging Failure: inadequate packaging caused or allowed damage.
- Sizing Confusion: wrong size ordered/received due to unclear size info.
- Description Mismatch: listing text/photos misrepresent the actual product.
- Expectation Mismatch: product works as described but customer expected something different.
- Missing Part: an item or accessory was absent from the box.
- Unknown: cannot determine from the message.

Severity guide: Low = cosmetic/minor annoyance; Medium = partial function loss or wrong expectation; High = product stops working / safety-adjacent / repeated pattern; Critical = total failure affecting many customers or safety hazard.

The recommended_fix MUST explicitly mention the product name.
Return ONLY the raw JSON object."""


def extract_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            return json.loads(m.group(0))
        raise


def validate_analysis(data: dict):
    errors = []
    facts = data.get("facts")
    if not isinstance(facts, dict):
        errors.append("facts missing/not dict")
    else:
        for k in ["product_issue", "timing", "defect_description", "customer_expectation", "affected_area"]:
            if not isinstance(facts.get(k), str) or not facts.get(k):
                errors.append(f"facts.{k} missing")
    if data.get("failure_category") not in FAILURE_CATEGORIES:
        errors.append(f"failure_category invalid: {data.get('failure_category')}")
    if not isinstance(data.get("root_cause"), str) or len(data.get("root_cause", "")) < 10:
        errors.append("root_cause missing/too short")
    cs = data.get("confidence_score")
    if not isinstance(cs, (int, float)) or not (0 <= cs <= 100):
        errors.append(f"confidence_score invalid: {cs}")
    if data.get("severity") not in SEVERITIES:
        errors.append(f"severity invalid: {data.get('severity')}")
    fix = data.get("recommended_fix", "")
    if not isinstance(fix, str) or len(fix) < 20:
        errors.append("recommended_fix missing/too short")
    return errors


# ---------------- Provider selection ----------------

def analysis_engine():
    """Which engine will handle analysis right now."""
    if os.environ.get("FORCE_LOCAL_ANALYSIS", "").lower() in ("1", "true", "yes"):
        return "local"
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "claude"
    return "local"


async def _call_claude(system_prompt: str, user_prompt: str) -> str:
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return "".join(block.text for block in resp.content if block.type == "text")


# ---------------- Local deterministic analyzer ----------------
# Rule-based classifier that mirrors the category definitions above.
# Deterministic on purpose: keeps the demo and the test suite reproducible offline.

_COMPONENT_WORDS = r"(speaker|earbud|earphone|headphone|bud|button|battery|screen|display|light|motor|connector|charging port|bluetooth|audio|sound|mic|microphone|camera|sensor|left side|right side)"
_FAIL_WORDS = r"(stopp?ed working|not working|no longer work|won'?t (turn on|charge|connect)|no sound|went (completely )?silent|completely dead|cut(s)? out|died|dead|failed|no audio|doesn'?t work|disconnect)"
_SAFETY_WORDS = r"(fire|smoke|burn|shock|overheat|melt|explod|hazard|injur|bleed|sparks?)"

_CATEGORY_FIXES = {
    "Component Failure": "Pause advertising for {product} and inspect {supplier} batch before accepting new orders; bench-test the failing component on returned units.",
    "Durability Issue": "Require reinforced materials and a bend/wear test from {supplier} for {product} before the next inventory order.",
    "Supplier Defect": "Quarantine current {product} stock and request a corrective-action report from {supplier} before reordering.",
    "Quality Control Issue": "Add pre-shipment inspection for {product} with {supplier} and include an application/usage insert to cut defective-arrival reports.",
    "Shipping Damage": "Upgrade {product} transit packaging (double-walled box, molded inserts) and file a damage claim pattern report with the carrier.",
    "Packaging Failure": "Redesign {product} packaging with protective inserts and crush-test it with {supplier} before the next batch ships.",
    "Sizing Confusion": "Add an exact-measurement size chart and fit photos to the {product} listing to stop size-driven returns.",
    "Description Mismatch": "Rewrite the {product} listing so text and photos match the shipped product exactly, and remove any overstated claims.",
    "Expectation Mismatch": "Update the {product} listing with precise specs and true-to-scale photos so buyers know exactly what to expect.",
    "Missing Part": "Audit the {product} pack-out checklist with {supplier} and ship the missing item to affected customers immediately.",
    "Unknown": "Contact the customer for details on the {product} issue and log the case for pattern tracking.",
}

_CATEGORY_SEVERITY = {
    "Component Failure": "High", "Supplier Defect": "High",
    "Shipping Damage": "Medium", "Durability Issue": "Medium",
    "Description Mismatch": "Medium", "Expectation Mismatch": "Medium",
    "Sizing Confusion": "Medium", "Missing Part": "Medium",
    "Packaging Failure": "Medium", "Quality Control Issue": "Low",
    "Unknown": "Low",
}

_CATEGORY_AREA = {
    "Component Failure": "internal component", "Durability Issue": "product material",
    "Shipping Damage": "whole unit (transit)", "Packaging Failure": "outer packaging",
    "Sizing Confusion": "product dimensions", "Description Mismatch": "listing content",
    "Expectation Mismatch": "listing content", "Missing Part": "box contents",
    "Quality Control Issue": "unit as shipped", "Supplier Defect": "manufacturing batch",
    "Unknown": "unspecified",
}


def _classify_local(message: str):
    """Return (category, matched_phrase). First matching rule wins; rules are
    ordered most-specific-first to mirror the prompt's category definitions."""
    t = message.lower()
    rules = [
        ("Missing Part", r"(missing|wasn'?t (in|included)|not included|no .{0,20}(in the box|included)|absent from)"),
        ("Shipping Damage", r"(arriv\w+|delivery|transit|shipping|on arrival).{0,60}(shatter|broken|broke|crack|crush|damag|dent)|"
                            r"(shatter|broken|broke|crack|crush|damag|dent).{0,60}(in (shipping|transit)|during (shipping|delivery|transit))"),
        ("Component Failure", _COMPONENT_WORDS + r".{0,80}" + _FAIL_WORDS + "|" + _FAIL_WORDS + r".{0,80}" + _COMPONENT_WORDS),
        ("Quality Control Issue", r"(adhesive|sticky|stick(ing)?|won'?t stay)|((arrived|out of the box|first use|day one).{0,50}(defective|didn'?t work|dead|broken))|(doa\b)"),
        ("Durability Issue", r"(fray|tore|torn|rip(ped)?|snapp?ed|peel|wear(s)? out|wore out|split open|crack|broke|fell apart).{0,60}(after|within|week|day|month|use|normal)|"
                             r"(after|within).{0,30}(week|day|month).{0,60}(fray|tore|torn|rip|snapp?ed|peel|broke|split)"),
        ("Sizing Confusion", r"(wrong size|too (small|big|tight|loose)\b|size chart|doesn'?t fit|runs (small|large))"),
        ("Expectation Mismatch", r"(expect\w*|thought it would|wanted something|hoped for|thinner than|smaller than|bigger than|not what i (expected|imagined)|basically a)"),
        ("Description Mismatch", r"(not as described|misleading|misrepresent|(photos?|pictures?|listing).{0,60}(different|not what|exaggerat|look)|false advertis)"),
        ("Supplier Defect", r"(bad batch|whole batch|every unit|all (of them|three|units)|second (one|cable|unit) .{0,30}(broke|failed|died))"),
        ("Packaging Failure", r"(packag\w+|padding|wrap).{0,60}(thin|inadequate|barely|flimsy|insufficient|just paper|no protection)"),
    ]
    for category, pattern in rules:
        m = re.search(pattern, t)
        if m:
            return category, m.group(0)
    return "Unknown", ""


def _extract_timing(message: str):
    m = re.search(
        r"(after|within|in|for)\s+(about\s+|less than\s+|barely\s+)?"
        r"(a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+"
        r"(day|week|month|year|hour|use)s?", message.lower())
    return m.group(0).capitalize() if m else "Not specified"


def _first_sentence(message: str, limit=140):
    s = re.split(r"(?<=[.!?])\s+", message.strip())[0]
    return (s[:limit] + "…") if len(s) > limit else s


def run_local_analysis(product_name, supplier_name, platform, source, message, internal_notes=""):
    """Deterministic offline analyzer. Same output schema as the Claude path."""
    category, matched = _classify_local(message)
    t = message.lower()
    severity = _CATEGORY_SEVERITY[category]
    if re.search(_SAFETY_WORDS, t):
        severity = "Critical"

    expectation_m = re.search(r"[^.!?]*(expect\w*|thought|wanted|hoped)[^.!?]*[.!?]?", message, re.IGNORECASE)
    expectation = expectation_m.group(0).strip() if expectation_m else f"A fully functional {product_name} performing as listed"

    area = _CATEGORY_AREA[category]
    comp = re.search(_COMPONENT_WORDS, t)
    if category == "Component Failure" and comp:
        area = comp.group(0)

    supplier = supplier_name or "the supplier"
    fix = _CATEGORY_FIXES[category].format(product=product_name, supplier=supplier)

    root_causes = {
        "Component Failure": f"A specific component of the {product_name} ({area}) fails after short use, pointing to a component-quality problem at {supplier}.",
        "Durability Issue": f"The {product_name} material wears out under normal use, indicating insufficient material durability from {supplier}.",
        "Supplier Defect": f"Multiple failing units suggest a defective manufacturing batch of the {product_name} from {supplier}.",
        "Quality Control Issue": f"The {product_name} shows defects that pre-shipment inspection should have caught, indicating a QC gap.",
        "Shipping Damage": f"The {product_name} was damaged in carrier transit, indicating insufficient transit protection.",
        "Packaging Failure": f"The {product_name} packaging provides inadequate protection, allowing damage before delivery.",
        "Sizing Confusion": f"The {product_name} listing's size information is unclear, causing customers to order the wrong size.",
        "Description Mismatch": f"The {product_name} listing misrepresents the actual product, creating a gap between listing and reality.",
        "Expectation Mismatch": f"The {product_name} works as described but the listing sets expectations the product does not meet.",
        "Missing Part": f"The {product_name} pack-out process omitted an item, so orders ship incomplete.",
        "Unknown": f"The root cause for this {product_name} complaint cannot be determined from the message alone.",
    }

    confidence = 68
    if matched:
        confidence += min(12, len(matched) // 6)

    return {
        "facts": {
            "product_issue": _first_sentence(message),
            "timing": _extract_timing(message),
            "defect_description": (matched.strip().capitalize() if matched else _first_sentence(message)),
            "customer_expectation": expectation,
            "affected_area": area,
        },
        "failure_category": category,
        "root_cause": root_causes[category],
        "confidence_score": confidence,
        "severity": severity,
        "recommended_fix": fix,
    }


# ---------------- Single-complaint analysis ----------------

async def run_claude_analysis(product_name, supplier_name, platform, source, message, internal_notes="", max_retries=2):
    """Analyze one complaint. Claude (validated JSON, auto-retry) when a key is
    configured; deterministic local analyzer otherwise or on final failure."""
    engine = analysis_engine()
    if engine == "local":
        data = run_local_analysis(product_name, supplier_name, platform, source, message, internal_notes)
        data["analysis_engine"] = "local"
        return data

    prompt = f"""Product: {product_name}
Supplier: {supplier_name or 'Unknown'}
Platform: {platform}
Complaint source: {source}
Customer message: \"{message}\"
{f'Seller internal notes: {internal_notes}' if internal_notes else ''}

Analyze this complaint and return the JSON object."""
    last_err = None
    for attempt in range(max_retries + 1):
        try:
            resp = await _call_claude(SYSTEM_PROMPT, prompt)
            data = extract_json(resp)
            errors = validate_analysis(data)
            if not errors:
                data["confidence_score"] = int(round(float(data["confidence_score"])))
                data["analysis_engine"] = "claude"
                return data
            last_err = errors
            prompt += f"\n\nYour previous output had these problems: {errors}. Return ONLY corrected raw JSON."
        except Exception as e:
            last_err = str(e)
            logger.warning(f"Claude analysis attempt {attempt} failed: {e}")
    logger.error(f"Claude analysis failed after retries ({last_err}); falling back to local analyzer")
    data = run_local_analysis(product_name, supplier_name, platform, source, message, internal_notes)
    data["analysis_engine"] = "local-fallback"
    return data


# ---------------- Similarity clustering ----------------
STOPWORDS = set("the a an and or but after was were is are it its this that of to in on for with my i had have has not no be been am do did does so just very really".split())


def tokenize(text):
    return set(w for w in re.findall(r"[a-z']+", (text or "").lower()) if w not in STOPWORDS and len(w) > 2)


def similarity(a, b):
    """Overlap coefficient: intersection / size of smaller set."""
    ta, tb = tokenize(a), tokenize(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / min(len(ta), len(tb))


def cluster_complaints(message, failure_category, prior_complaints, prior_insights):
    """Compare complaint against saved complaints + insights for the same product.
    Uses hybrid similarity: TF-IDF cosine (lexical precision) OR overlap coefficient (paraphrase recall).
    Returns similar_case_count, pattern_label, cluster_status (emerging/established).
    """
    prior_messages = [c.get("raw_message", "") for c in prior_complaints]
    text_matches = count_similar_hybrid(message, prior_messages)
    same_category = [i for i in prior_insights if i.get("failure_category") == failure_category]
    category_base = max([i.get("similar_case_count", 0) for i in same_category], default=0)
    category_count = len(same_category)
    similar_case_count = max(category_base, text_matches, category_count)
    cluster_status = "established" if similar_case_count >= 5 else "emerging"
    pattern_label = f"{failure_category}" + (" — repeated pattern" if similar_case_count >= 3 else " — new report")
    return similar_case_count, pattern_label, cluster_status


def count_similar_hybrid(message, prior_messages, tfidf_threshold=0.3, overlap_threshold=0.25):
    """Hybrid similarity counter: a prior message matches if either
    TF-IDF cosine >= tfidf_threshold OR overlap coefficient >= overlap_threshold.
    Falls back to overlap-only if scikit-learn is unavailable."""
    docs = [m for m in prior_messages if m and m.strip()]
    if not docs:
        return 0
    tfidf_scores = [0.0] * len(docs)
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity as _cos
        vec = TfidfVectorizer(stop_words="english")
        matrix = vec.fit_transform(docs + [message])
        tfidf_scores = _cos(matrix[-1], matrix[:-1])[0].tolist()
    except Exception as e:
        logger.warning(f"TF-IDF similarity unavailable, using overlap only: {e}")
    count = 0
    for doc, tf in zip(docs, tfidf_scores):
        if tf >= tfidf_threshold or similarity(message, doc) >= overlap_threshold:
            count += 1
    return count


# ---------------- Batch analysis (CSV import) ----------------
BATCH_SYSTEM_PROMPT = SYSTEM_PROMPT.replace(
    "You analyze a single customer complaint and return ONLY a JSON object (no markdown, no prose) with this exact schema:",
    "You analyze MULTIPLE customer complaints at once. Return ONLY a JSON array (no markdown, no prose) with one object per complaint, in the SAME ORDER as given. Each object must follow this exact schema:",
).replace(
    "Return ONLY the raw JSON object.",
    "Return ONLY the raw JSON array with exactly one object per input complaint, in order.",
)


async def run_claude_batch_analysis(items, max_retries=1):
    """Analyze up to ~8 complaints in one call.
    items: list of dicts {product_name, supplier_name, platform, source, raw_message}
    Returns list of (analysis_dict or None) aligned to items order.
    """
    if analysis_engine() == "local":
        results = []
        for it in items:
            d = run_local_analysis(
                it["product_name"], it.get("supplier_name"), it.get("platform", "Other"),
                it.get("source", "Review"), it["raw_message"], it.get("internal_notes", ""))
            d["analysis_engine"] = "local"
            results.append(d)
        return results

    lines = []
    for idx, it in enumerate(items, 1):
        lines.append(
            f"Complaint {idx}:\n"
            f"Product: {it['product_name']}\n"
            f"Supplier: {it.get('supplier_name') or 'Unknown'}\n"
            f"Platform: {it.get('platform', 'Other')}\n"
            f"Complaint source: {it.get('source', 'Review')}\n"
            f"Customer message: \"{it['raw_message']}\"\n"
        )
    prompt = "\n".join(lines) + f"\nAnalyze all {len(items)} complaints and return the JSON array."
    last_err = None
    for attempt in range(max_retries + 1):
        try:
            text = (await _call_claude(BATCH_SYSTEM_PROMPT, prompt)).strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)
            m = re.search(r"\[.*\]", text, re.DOTALL)
            data = json.loads(m.group(0) if m else text)
            if not isinstance(data, list) or len(data) != len(items):
                raise ValueError(f"Expected array of {len(items)}, got {type(data)} len {len(data) if isinstance(data, list) else 'n/a'}")
            results = []
            for d in data:
                errs = validate_analysis(d) if isinstance(d, dict) else ["not a dict"]
                if not errs:
                    d["confidence_score"] = int(round(float(d["confidence_score"])))
                    d["analysis_engine"] = "claude"
                    results.append(d)
                else:
                    results.append(None)
            return results
        except Exception as e:
            last_err = str(e)
            logger.warning(f"Batch analysis attempt {attempt} failed: {e}")
    logger.error(f"Batch analysis failed ({last_err}); falling back to local analyzer per row")
    results = []
    for it in items:
        d = run_local_analysis(
            it["product_name"], it.get("supplier_name"), it.get("platform", "Other"),
            it.get("source", "Review"), it["raw_message"], it.get("internal_notes", ""))
        d["analysis_engine"] = "local-fallback"
        results.append(d)
    return results


# ---------------- Health score + business impact ----------------

def health_status(score):
    if score >= 80:
        return "Healthy"
    if score >= 50:
        return "Watch"
    return "Critical"


def apply_severity(current_score, severity):
    new_score = max(0, min(100, current_score - SEVERITY_DELTA.get(severity, 10)))
    return new_score, health_status(new_score)


def business_impact(similar_case_count, refund_cost_estimate, average_order_value):
    count = max(similar_case_count, 1)
    return {
        "estimated_monthly_loss": round(count * float(refund_cost_estimate or 25), 2),
        "estimated_future_complaints_prevented": int(round(count * 0.35)),
        "estimated_refund_exposure": round(count * float(average_order_value or 30), 2),
    }
