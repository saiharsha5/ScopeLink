TRACK_ID=PS6

# ScopeLink: Mapping the blast radius of supply chain disruption

ScopeLink is a production-grade supply chain disruption analyzer that maps unstructured vendor incident notifications, carrier alerts, and shipping exception emails directly to inbound Purchase Orders (POs), simulates chronological inventory runway, and determines the precise downstream blast radius across customer order commitments.

---

## 1. Quick Start (Single-Command Execution)

### Prerequisites
- Python 3.11+
- Gemini API Key: Set `GEMINI_API_KEY` in your environment (e.g., `export GEMINI_API_KEY="your_key_here"` or configure in Google AI Studio Secrets). Read exclusively via `os.environ.get("GEMINI_API_KEY")`.

### Execution Commands
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Launch application (backend + served UI)
python app.py
```

The application will start on **`http://localhost:8000`** (or `$PORT` if set). Open this URL in any modern browser.

---

## 2. Architecture & Deterministic Guardrails

ScopeLink enforces a strict boundary between GenAI extraction and deterministic business logic:

1. **LLM Boundary (`gemini-3.8-flash`)**:
   - Used **exclusively** for unstructured entity extraction:
     - `supplier_name_or_alias`: Vendor or plant entity mentioned
     - `carrier_or_tracking_ref`: Carrier or ocean voyage / tracking ID
     - `delay_days`: Projected slip in integer days
     - `incident_summary`: Concise operational root cause
     - `severity`: "Critical", "Moderate", or "Minor"
   - Configured with strict JSON schema parsing (`response_schema=ExtractionSchema`).
   - Resilient fallback heuristic regex parser is included if offline or quota-limited.

2. **Deterministic Simulation Engine**:
   - **Database Inbound Mapping**: Matches extracted entities against `suppliers` aliases, carrier names, and active `inbound_pos`.
   - **Inventory Runway Simulation**: Chronologically tracks on-hand stock vs. scheduled outbound shipments. Calculates exact stockout point when `committed_ship_date < revised_dock_date`.
   - **Urgency Scoring**:
     $$\text{Urgency Score} = (\text{Tier Multiplier: Strategic=2.0, Standard=1.0}) \times (\text{Days Late}) \times (\text{Daily SLA Penalty} + \text{Base Risk 100})$$
   - **3-Way Trade-off Formulation**:
     - **Option A (Expedite)**: Secondary source or air freight ($\text{base fee} + \text{deficit} \times \text{unit premium}$) vs. avoided SLA penalty.
     - **Option B (Partial Ship)**: Release on-hand stock immediately if contract permits (`allow_partial == True`) and defer remainder.
     - **Option C (Notify & Reschedule)**: Push delivery date by `days_late`, incur calculated SLA penalty, and issue customer notification.
     - Automatically selects and justifies the optimal recommendation.

---

## 3. Data Architecture (`data/mock_db.json`)

The mock database covers comprehensive real-world supply chain scenarios:
- **`suppliers`**: ID, formal name, alias list (e.g., `["Apex", "Apex Co", "Shenzhen plant"]`), origin, standard lead time.
- **`inventory`**: SKU, name, on-hand units, safety stock, unit purchase cost. Covers Micro Motors (`MOT-001`), Industrial Bearings (`BRG-202`), and Flange Bolts (`FLG-99`).
- **`inbound_pos`**: Active POs with tracking number, carrier, promised dock date, SKU, and quantity.
- **`outbound_orders`**: Customer orders with customer tier ("Strategic" vs "Standard"), required quantity, ship date, daily SLA penalty, and partial shipment permission (`allow_partial`).
- **`remediation_catalog`**: Air freight fee, secondary source unit premium, expedited lead times.

### Edge Cases Modeled
- **Immediate Multi-Tier Stockout**: Apex 7-day delay on `PO-8821` causes stockout for both Tesla (Strategic) and Generic Robotics (Standard).
- **Buffer-Absorbable Delay**: Titan Fasteners 3-day transit setback on `FLG-99` is fully absorbed by on-hand inventory with 0 downstream slippage.
- **Zero Downstream Impact**: Facilities maintenance notices or unregistered vendors trigger early-exit false alarm prevention.

---

## 4. API Specification

### `POST /api/analyze`
**Request:**
```json
{
  "raw_text": "Subject: Urgent Shipping Update - PO-8821\nHi Team, our Shenzhen plant (Apex Co) has reported a 7-day delay due to port congestion. Ocean carrier Maersk Line (Tracking: MAEU1234890) estimates arrival will be pushed accordingly."
}
```

**Response:**
```json
{
  "has_impact": true,
  "status": "Critical Disruption Detected",
  "message": "Identified 2 downstream order breaches across supply pipelines.",
  "extracted": {
    "supplier_name_or_alias": "Apex Co",
    "carrier_or_tracking_ref": "Maersk Line",
    "delay_days": 7,
    "incident_summary": "7-day delay due to port congestion at Shenzhen plant",
    "severity": "Critical"
  },
  "matched_po": {
    "po_number": "PO-8821",
    "sku": "MOT-001",
    "dock_date": "2025-03-15",
    "quantity": 150
  },
  "impacted_orders": [
    {
      "order_id": "ORD-501",
      "customer": "Tesla Energy & Robotics",
      "tier": "Strategic",
      "sku": "MOT-001",
      "deficit": 70,
      "days_late": 4,
      "sla_exposure": 2000.0,
      "urgency_score": 4800.0,
      "recommendation": "Option A: Expedite",
          "evidence": {
            "po_number": "PO-8821",
            "inventory_sku": "MOT-001",
            "outbound_order_id": "ORD-501"
          },
      "options": { ... }
    }
  ],
  "total_sla_exposure": 2100.0
}
```

---

## 5. Frontend Interface

The frontend is served directly by the backend at `http://localhost:8000`:
- **Clean Enterprise White Theme** (`#FFFFFF` background, `#F8FAFC` light canvas, crisp `#E2E8F0` borders).
- **Input Console** with 3 one-click sample disruption scenarios.
- **Blast Radius Metric Cards** for instant situational awareness.
- **Traceability Chain** showing the 4-step disruption progression.
- **Urgency-Ranked Orders Table** with tier multipliers and financial impact.
- **Operator Decision Desk** with side-by-side trade-off formulations and human approval workflows.

Every recommendation includes evidence identifiers for the matched PO, inventory SKU, and outbound order. The application prepares a plan for operator review; it does not dispatch shipments, notify customers, or mutate warehouse/ERP state.
