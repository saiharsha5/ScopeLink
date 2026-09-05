"""
ScopeLink: Mapping the blast radius of supply chain disruption (TRACK_ID=PS08)
Production-grade FastAPI application with deterministic supply chain simulation
and GenAI entity extraction using the official google-genai SDK.
"""

import os
import json
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

app = FastAPI(
    title="ScopeLink: Blast Radius Analysis",
    description="Supply chain disruption mapping and deterministic inventory runway simulation (TRACK_ID=PS08)",
    version="1.0.0"
)

# Enable CORS for decoupled dev environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "mock_db.json")

def load_db() -> Dict[str, Any]:
    """Load mock supply chain database."""
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Mock database not found at {DB_PATH}")
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

# Pydantic Schemas for Strict Parsing & Extraction
class DisruptionNotice(BaseModel):
    raw_text: str = Field(..., description="Unstructured supplier email, carrier alert, or incident log")

class ExtractionSchema(BaseModel):
    supplier_name_or_alias: Optional[str] = Field(None, description="Name or alias of vendor mentioned (e.g., Apex, GBL)")
    carrier_or_tracking_ref: Optional[str] = Field(None, description="Carrier name or tracking reference (e.g., Maersk, DHL, MAEU123)")
    delay_days: int = Field(0, description="Estimated delay in integer days")
    incident_summary: str = Field(..., description="Concise synopsis of the disruption cause")
    severity: str = Field("Moderate", description="Critical, Moderate, or Minor")

def extract_entities_fallback(text: str, db: Dict[str, Any]) -> ExtractionSchema:
    """Deterministic regex-based fallback extractor when LLM key is absent or offline."""
    lower_text = text.lower()
    
    # 1. Match supplier alias
    matched_supplier = None
    for s in db.get("suppliers", []):
        if s["name"].lower() in lower_text:
            matched_supplier = s["name"]
            break
        for a in s.get("aliases", []):
            if a.lower() in lower_text:
                matched_supplier = a
                break

    # 2. Match carrier or tracking
    matched_carrier = None
    for po in db.get("inbound_pos", []):
        if po["carrier"].lower() in lower_text:
            matched_carrier = po["carrier"]
            break
        if po["tracking"].lower() in lower_text:
            matched_carrier = po["tracking"]
            break

    # 3. Match delay days
    delay_days = 0
    delay_patterns = [
        r"(\d+)[ -]day(?:s)?\s+(?:delay|push|hold|setback)",
        r"delay(?:ed)?(?:\s+by)?\s+(\d+)\s+day",
        r"pushed(?:\s+back)?(?:\s+by)?\s+(\d+)\s+day",
        r"(\d+)\s+days?\s+late",
        r"transit\s+extension:\s*(\d+)\s*days?"
    ]
    for pattern in delay_patterns:
        match = re.search(pattern, lower_text)
        if match:
            delay_days = int(match.group(1))
            break
    if delay_days == 0:
        # Generic number of days detection
        generic_match = re.search(r"(\d+)\s+days?", lower_text)
        if generic_match:
            delay_days = int(generic_match.group(1))

    # 4. Severity detection
    severity = "Minor"
    if delay_days >= 7 or "critical" in lower_text or "emergency" in lower_text:
        severity = "Critical"
    elif delay_days >= 3 or "warning" in lower_text or "congestion" in lower_text:
        severity = "Moderate"

    summary = text.strip()[:140] + ("..." if len(text) > 140 else "")

    return ExtractionSchema(
        supplier_name_or_alias=matched_supplier,
        carrier_or_tracking_ref=matched_carrier,
        delay_days=delay_days,
        incident_summary=summary,
        severity=severity
    )

@app.get("/api/db")
async def get_database():
    """Inspection endpoint for mock inventory, active POs, and outbound commitments."""
    return load_db()

@app.post("/api/analyze")
async def analyze_disruption(notice: DisruptionNotice):
    """
    Core blast radius analysis pipeline:
    1. GenAI entity extraction using official google-genai SDK (gemini-3.8-flash).
    2. Deterministic entity & PO mapping.
    3. Deterministic chronological inventory runway simulation.
    4. Urgency ranking and 3-way remediation trade-off calculation.
    """
    db = load_db()
    raw_text = notice.raw_text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Disruption notice text cannot be empty.")

    extracted: ExtractionSchema
    api_key = os.environ.get("GEMINI_API_KEY")

    if api_key and api_key != "MY_GEMINI_API_KEY":
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""You are a specialized supply chain logistics entity extractor.
Analyze the following unstructured disruption notice, vendor email, or carrier update:

\"\"\"{raw_text}\"\"\"

Extract the exact fields according to the schema:
- supplier_name_or_alias: Name or alias of vendor mentioned (e.g., Apex, Apex Co, Shenzhen plant, Global Bearings Ltd). If none mentioned, return null.
- carrier_or_tracking_ref: Carrier name or tracking/voyage ID (e.g., Maersk, DHL, MAEU1234890, ODFL556677). If none mentioned, return null.
- delay_days: Total estimated delay in integer calendar days. Default to 0 if not delayed.
- incident_summary: Concise, factual summary of the incident and operational cause.
- severity: "Critical", "Moderate", or "Minor".
"""
            models_to_try = ["gemini-3.6-flash", "gemini-3.8-flash"]
            response = None
            last_err = None
            for m in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=ExtractionSchema,
                            temperature=0.1
                        )
                    )
                    if response and (response.parsed or response.text):
                        break
                except Exception as err:
                    last_err = err

            # Parse structured output
            if response and response.parsed:
                extracted = response.parsed
            elif response and response.text:
                parsed_json = json.loads(response.text)
                extracted = ExtractionSchema(**parsed_json)
            else:
                raise last_err or Exception("Failed to query Gemini models")
        except Exception as e:
            # Fallback to deterministic regex parser if LLM quota or transient network error occurs
            extracted = extract_entities_fallback(raw_text, db)
    else:
        # Fallback if no Gemini API key configured
        extracted = extract_entities_fallback(raw_text, db)

    # Step 2: Database Inbound Mapping (Purely deterministic)
    matched_pos = []
    matched_supplier_record = None

    # Match by supplier name or aliases
    if extracted.supplier_name_or_alias:
        query_supp = extracted.supplier_name_or_alias.lower().strip()
        for s in db.get("suppliers", []):
            aliases_lower = [a.lower().strip() for a in s.get("aliases", [])]
            if query_supp == s["name"].lower().strip() or query_supp in aliases_lower or any(query_supp in a for a in aliases_lower):
                matched_supplier_record = s
                break
        
        if matched_supplier_record:
            matched_pos = [po for po in db.get("inbound_pos", []) if po["supplier_id"] == matched_supplier_record["id"]]

    # Match by carrier or tracking reference if supplier didn't yield POs
    if not matched_pos and extracted.carrier_or_tracking_ref:
        query_ref = extracted.carrier_or_tracking_ref.lower().strip()
        for po in db.get("inbound_pos", []):
            if query_ref in po["carrier"].lower() or query_ref in po["tracking"].lower():
                matched_pos.append(po)
                if not matched_supplier_record:
                    matched_supplier_record = next((s for s in db.get("suppliers", []) if s["id"] == po["supplier_id"]), None)

    # Edge Case Handling: Unregistered entity or no active POs in pipeline
    if not matched_pos:
        return {
            "has_impact": False,
            "status": "Zero Operational Impact",
            "message": "Zero Operational Impact: No active POs or inventory pipelines map to this entity.",
            "extracted": extracted.model_dump(),
            "matched_supplier": matched_supplier_record,
            "matched_po": None,
            "impacted_orders": [],
            "total_sla_exposure": 0.0,
            "simulation_details": []
        }

    # Step 3 & 4: Blast Radius Simulation & Urgency Ranking (Purely deterministic)
    impacted_orders = []
    simulation_details = []
    total_sla_exposure = 0.0

    for po in matched_pos:
        sku = po["sku"]
        delay_days = max(0, extracted.delay_days)
        original_dock = datetime.strptime(po["dock_date"], "%Y-%m-%d")
        revised_dock = original_dock + timedelta(days=delay_days)

        # Retrieve inventory record
        inv_item = next((i for i in db.get("inventory", []) if i["sku"] == sku), None)
        on_hand = inv_item["on_hand"] if inv_item else 0
        safety_stock = inv_item["safety_stock"] if inv_item else 0
        unit_cost = inv_item["unit_cost"] if inv_item else 0.0

        # Outbound orders for this SKU, chronologically sorted by ship_date
        sku_orders = [o for o in db.get("outbound_orders", []) if o["sku"] == sku]
        sku_orders.sort(key=lambda x: datetime.strptime(x["ship_date"], "%Y-%m-%d"))

        running_stock = on_hand
        po_replenished = False
        po_impacted_for_this_sku = []

        for order in sku_orders:
            order_ship_date = datetime.strptime(order["ship_date"], "%Y-%m-%d")
            
            # Check if order ships before or after revised dock arrival
            if order_ship_date < revised_dock:
                # Order ships before delayed PO docks; relying strictly on running stock
                if running_stock < order["quantity"]:
                    deficit = order["quantity"] - running_stock
                    days_late = (revised_dock - order_ship_date).days
                    
                    # Deterministic Urgency Scoring Formula:
                    # Urgency Score = (Tier Multiplier: Strategic=2.0, Standard=1.0) * (Days Late) * (Daily SLA Penalty + Base Risk)
                    tier_multiplier = 2.0 if order["tier"].lower() == "strategic" else 1.0
                    base_risk = 100.0
                    sla_loss = float(order["sla_penalty"] * days_late)
                    urgency_score = round(tier_multiplier * days_late * (order["sla_penalty"] + base_risk), 2)
                    
                    total_sla_exposure += sla_loss

                    # Remediation Catalog lookup
                    catalog = db.get("remediation_catalog", {}).get(sku, {
                        "expedite_air_fee": 1500,
                        "secondary_source_available": True,
                        "secondary_source_premium": 10.0,
                        "expedite_lead_days": 2
                    })

                    expedite_air_fee = catalog.get("expedite_air_fee", 1000)
                    secondary_premium = catalog.get("secondary_source_premium", 5.0)
                    cost_to_expedite = expedite_air_fee + (deficit * secondary_premium)
                    net_benefit_expedite = sla_loss - cost_to_expedite

                    # Formulation of 3 explicit trade-offs:
                    # Option A: Expedite via air freight or secondary supplier
                    # Option B: Partial ship on-hand quantity and defer balance
                    # Option C: Notify & Reschedule
                    options = {
                        "option_a_expedite": {
                            "name": "Option A: Expedite (Secondary / Air Freight)",
                            "cost": round(cost_to_expedite, 2),
                            "avoided_sla": round(sla_loss, 2),
                            "net_benefit": round(net_benefit_expedite, 2),
                            "lead_time_days": catalog.get("expedite_lead_days", 2),
                            "feasible": True,
                            "breakdown": f"Air base fee ${expedite_air_fee:,.2f} + (${secondary_premium:.2f} × {deficit} units)"
                        },
                        "option_b_partial": {
                            "name": "Option B: Split Delivery (Partial Fulfillment)",
                            "feasible": order["allow_partial"],
                            "units_available_now": running_stock,
                            "units_deferred": deficit,
                            "sla_exposure": round((deficit / order["quantity"]) * sla_loss, 2) if order["quantity"] > 0 else 0,
                            "details": f"Ship {running_stock} units immediately; balance of {deficit} units upon revised dock date ({revised_dock.strftime('%Y-%m-%d')})."
                        },
                        "option_c_reschedule": {
                            "name": "Option C: Notify & Reschedule",
                            "new_delivery_date": revised_dock.strftime("%Y-%m-%d"),
                            "days_delayed": days_late,
                            "total_sla_penalty": round(sla_loss, 2),
                            "details": f"Accept operational slip of +{days_late} days. Incur contract SLA penalty of ${sla_loss:,.2f}."
                        }
                    }

                    # Determine optimal recommendation
                    recommendation = "Option A: Expedite"
                    recommendation_reason = f"Expedite cost (${cost_to_expedite:,.2f}) is significantly lower than SLA liability (${sla_loss:,.2f}). Net savings: ${net_benefit_expedite:,.2f}."

                    if cost_to_expedite >= sla_loss:
                        if order["allow_partial"] and running_stock > 0:
                            recommendation = "Option B: Partial Ship"
                            recommendation_reason = f"Expedite cost exceeds SLA liability. Partial shipment of {running_stock} units softens impact."
                        else:
                            recommendation = "Option C: Notify & Reschedule"
                            recommendation_reason = f"Financial SLA loss (${sla_loss:,.2f}) is lower than expedited procurement overhead (${cost_to_expedite:,.2f})."

                    order_impact = {
                        "order_id": order["order_id"],
                        "customer": order["customer"],
                        "tier": order["tier"],
                        "sku": sku,
                        "sku_name": inv_item["name"] if inv_item else sku,
                        "committed_ship_date": order["ship_date"],
                        "revised_inbound_date": revised_dock.strftime("%Y-%m-%d"),
                        "required_quantity": order["quantity"],
                        "on_hand_at_order": running_stock,
                        "deficit": deficit,
                        "days_late": days_late,
                        "daily_sla_penalty": order["sla_penalty"],
                        "sla_exposure": round(sla_loss, 2),
                        "urgency_score": urgency_score,
                        "allow_partial": order["allow_partial"],
                        "options": options,
                        "recommendation": recommendation,
                        "recommendation_reason": recommendation_reason
                    }
                    impacted_orders.append(order_impact)
                    po_impacted_for_this_sku.append(order_impact)
                    # Running stock is completely depleted
                    running_stock = 0
                else:
                    # Order is fulfilled by available on-hand stock
                    running_stock -= order["quantity"]
            else:
                # Revised dock date has passed; replenish PO quantity if not yet done
                if not po_replenished:
                    running_stock += po["quantity"]
                    po_replenished = True
                
                if running_stock < order["quantity"]:
                    deficit = order["quantity"] - running_stock
                    days_late = max(1, (revised_dock - order_ship_date).days) if order_ship_date < revised_dock else 1
                    tier_multiplier = 2.0 if order["tier"].lower() == "strategic" else 1.0
                    sla_loss = float(order["sla_penalty"] * days_late)
                    urgency_score = round(tier_multiplier * days_late * (order["sla_penalty"] + 100.0), 2)
                    total_sla_exposure += sla_loss

                    order_impact = {
                        "order_id": order["order_id"],
                        "customer": order["customer"],
                        "tier": order["tier"],
                        "sku": sku,
                        "sku_name": inv_item["name"] if inv_item else sku,
                        "committed_ship_date": order["ship_date"],
                        "revised_inbound_date": revised_dock.strftime("%Y-%m-%d"),
                        "required_quantity": order["quantity"],
                        "on_hand_at_order": running_stock,
                        "deficit": deficit,
                        "days_late": days_late,
                        "daily_sla_penalty": order["sla_penalty"],
                        "sla_exposure": round(sla_loss, 2),
                        "urgency_score": urgency_score,
                        "allow_partial": order["allow_partial"],
                        "options": {},
                        "recommendation": "Option C: Reschedule",
                        "recommendation_reason": "Secondary deficit after shipment allocation."
                    }
                    impacted_orders.append(order_impact)
                    po_impacted_for_this_sku.append(order_impact)
                    running_stock = 0
                else:
                    running_stock -= order["quantity"]

        simulation_details.append({
            "po_number": po["po_number"],
            "sku": sku,
            "sku_name": inv_item["name"] if inv_item else sku,
            "original_dock": po["dock_date"],
            "revised_dock": revised_dock.strftime("%Y-%m-%d"),
            "delay_days": delay_days,
            "initial_on_hand": on_hand,
            "po_quantity": po["quantity"],
            "ending_stock_runway": running_stock,
            "impacted_orders_count": len(po_impacted_for_this_sku)
        })

    # Sort impacted orders by urgency score descending
    impacted_orders.sort(key=lambda x: x["urgency_score"], reverse=True)

    has_impact = len(impacted_orders) > 0

    return {
        "has_impact": has_impact,
        "status": "Critical Disruption Detected" if has_impact else "Zero Operational Impact (Absorbed by Buffer)",
        "message": f"Identified {len(impacted_orders)} downstream order breaches across supply pipelines." if has_impact else "Existing inventory runway absorbs the PO slip with 0 customer stockouts.",
        "extracted": extracted.model_dump(),
        "matched_supplier": matched_supplier_record,
        "matched_po": matched_pos[0] if matched_pos else None,
        "all_matched_pos": matched_pos,
        "impacted_orders": impacted_orders,
        "total_sla_exposure": round(total_sla_exposure, 2),
        "simulation_details": simulation_details
    }

# Mount static files directory if present
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting ScopeLink server on http://0.0.0.0:{port}...")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
