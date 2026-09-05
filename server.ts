import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

interface Supplier {
  id: string;
  name: string;
  aliases: string[];
  origin: string;
  lead_time_days: number;
}

interface InventoryItem {
  sku: string;
  name: string;
  on_hand: number;
  safety_stock: number;
  unit_cost: number;
  category?: string;
}

interface InboundPO {
  po_number: string;
  supplier_id: string;
  carrier: string;
  tracking: string;
  sku: string;
  dock_date: string;
  quantity: number;
  status: string;
}

interface OutboundOrder {
  order_id: string;
  customer: string;
  tier: "Strategic" | "Standard";
  sku: string;
  quantity: number;
  ship_date: string;
  sla_penalty: number;
  allow_partial: boolean;
}

interface RemediationItem {
  expedite_air_fee: number;
  secondary_source_available: boolean;
  secondary_source_premium: number;
  expedite_lead_days: number;
}

interface MockDB {
  suppliers: Supplier[];
  inventory: InventoryItem[];
  inbound_pos: InboundPO[];
  outbound_orders: OutboundOrder[];
  remediation_catalog: Record<string, RemediationItem>;
}

const DB_PATH = path.join(process.cwd(), "data", "mock_db.json");

function loadDb(): MockDB {
  const content = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(content) as MockDB;
}

// Fallback extractor using regex when Gemini key is absent or offline
function extractEntitiesFallback(text: string, db: MockDB) {
  const lower = text.toLowerCase();

  // Match supplier
  let matchedSupplier: string | null = null;
  for (const s of db.suppliers) {
    if (lower.includes(s.name.toLowerCase())) {
      matchedSupplier = s.name;
      break;
    }
    for (const a of s.aliases) {
      if (lower.includes(a.toLowerCase())) {
        matchedSupplier = a;
        break;
      }
    }
    if (matchedSupplier) break;
  }

  // Match carrier or tracking
  let matchedCarrier: string | null = null;
  for (const po of db.inbound_pos) {
    if (lower.includes(po.carrier.toLowerCase())) {
      matchedCarrier = po.carrier;
      break;
    }
    if (lower.includes(po.tracking.toLowerCase())) {
      matchedCarrier = po.tracking;
      break;
    }
  }

  // Match delay days
  let delayDays = 0;
  const patterns = [
    /(\d+)[ -]day(?:s)?\s+(?:delay|push|hold|setback)/i,
    /delay(?:ed)?(?:\s+by)?\s+(\d+)\s+day/i,
    /pushed(?:\s+back)?(?:\s+by)?\s+(\d+)\s+day/i,
    /(\d+)\s+days?\s+late/i,
    /transit\s+extension:\s*(\d+)\s*days?/i
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match && match[1]) {
      delayDays = parseInt(match[1], 10);
      break;
    }
  }
  if (delayDays === 0) {
    const generic = text.match(/(\d+)\s+days?/i);
    if (generic && generic[1]) {
      delayDays = parseInt(generic[1], 10);
    }
  }

  let severity = "Minor";
  if (delayDays >= 7 || lower.includes("critical") || lower.includes("emergency") || lower.includes("urgent")) {
    severity = "Critical";
  } else if (delayDays >= 3 || lower.includes("warning") || lower.includes("congestion")) {
    severity = "Moderate";
  }

  const summary = text.slice(0, 140).trim() + (text.length > 140 ? "..." : "");

  return {
    supplier_name_or_alias: matchedSupplier,
    carrier_or_tracking_ref: matchedCarrier,
    delay_days: delayDays,
    incident_summary: summary,
    severity
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "ScopeLink Supply Chain Intelligence", track_id: "PS08" });
  });

  // DB inspection endpoint
  app.get("/api/db", (_req: Request, res: Response) => {
    try {
      const db = loadDb();
      res.json(db);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Core Blast Radius Analysis endpoint
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const rawText: string = (req.body?.raw_text || "").trim();
      if (!rawText) {
        return res.status(400).json({ error: "raw_text parameter is required." });
      }

      const db = loadDb();
      let extracted: {
        supplier_name_or_alias: string | null;
        carrier_or_tracking_ref: string | null;
        delay_days: number;
        incident_summary: string;
        severity: string;
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build"
              }
            }
          });

          const prompt = `You are a specialized supply chain logistics entity extractor.
Analyze the following unstructured disruption notice, vendor email, or carrier update:

"""${rawText}"""

Extract the exact fields according to the schema:
- supplier_name_or_alias: Name or alias of vendor mentioned (e.g., Apex, Apex Co, Shenzhen plant, Global Bearings Ltd). If none mentioned, return null.
- carrier_or_tracking_ref: Carrier name or tracking/voyage ID (e.g., Maersk, DHL, MAEU1234890, ODFL556677). If none mentioned, return null.
- delay_days: Total estimated delay in integer calendar days. Default to 0 if not delayed.
- incident_summary: Concise, factual summary of the incident and operational cause.
- severity: "Critical", "Moderate", or "Minor".`;

          const modelsToTry = ["gemini-3.6-flash", "gemini-3.8-flash"];
          let response = null;
          let lastError: any = null;

          for (const model of modelsToTry) {
            try {
              response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      supplier_name_or_alias: {
                        type: Type.STRING,
                        description: "Name or alias of vendor mentioned, or null"
                      },
                      carrier_or_tracking_ref: {
                        type: Type.STRING,
                        description: "Carrier name or tracking reference, or null"
                      },
                      delay_days: {
                        type: Type.INTEGER,
                        description: "Delay in calendar days"
                      },
                      incident_summary: {
                        type: Type.STRING,
                        description: "Concise summary of disruption cause"
                      },
                      severity: {
                        type: Type.STRING,
                        description: "Critical, Moderate, or Minor"
                      }
                    },
                    required: ["delay_days", "incident_summary", "severity"]
                  }
                }
              });
              if (response && response.text) {
                break;
              }
            } catch (err) {
              lastError = err;
            }
          }

          if (response && response.text) {
            extracted = JSON.parse(response.text);
          } else {
            throw lastError || new Error("No response from Gemini models");
          }
        } catch (llmErr) {
          console.warn("LLM extraction failed, falling back to deterministic regex parser:", llmErr);
          extracted = extractEntitiesFallback(rawText, db);
        }
      } else {
        extracted = extractEntitiesFallback(rawText, db);
      }

      // Step 2: Database Inbound Mapping
      let matchedSupplier: Supplier | null = null;
      let matchedPos: InboundPO[] = [];

      if (extracted.supplier_name_or_alias) {
        const query = extracted.supplier_name_or_alias.toLowerCase().trim();
        for (const s of db.suppliers) {
          const aliasMatch = s.aliases.some((a) => a.toLowerCase().trim() === query || a.toLowerCase().includes(query) || query.includes(a.toLowerCase()));
          if (s.name.toLowerCase().trim() === query || aliasMatch) {
            matchedSupplier = s;
            break;
          }
        }
        if (matchedSupplier) {
          matchedPos = db.inbound_pos.filter((po) => po.supplier_id === matchedSupplier!.id);
        }
      }

      if (matchedPos.length === 0 && extracted.carrier_or_tracking_ref) {
        const query = extracted.carrier_or_tracking_ref.toLowerCase().trim();
        matchedPos = db.inbound_pos.filter(
          (po) => po.carrier.toLowerCase().includes(query) || po.tracking.toLowerCase().includes(query)
        );
        if (matchedPos.length > 0 && !matchedSupplier) {
          matchedSupplier = db.suppliers.find((s) => s.id === matchedPos[0].supplier_id) || null;
        }
      }

      // Edge case: Unregistered entity or zero PO match
      if (matchedPos.length === 0) {
        return res.json({
          has_impact: false,
          status: "Zero Operational Impact",
          message: "Zero Operational Impact: No active POs or inventory pipelines map to this entity.",
          extracted,
          matched_supplier: matchedSupplier,
          matched_po: null,
          all_matched_pos: [],
          impacted_orders: [],
          total_sla_exposure: 0,
          simulation_details: []
        });
      }

      // Step 3 & 4: Blast Radius Simulation & Urgency Ranking (Purely deterministic)
      const impactedOrders: any[] = [];
      const simulationDetails: any[] = [];
      let totalSlaExposure = 0;

      for (const po of matchedPos) {
        const sku = po.sku;
        const delayDays = Math.max(0, extracted.delay_days || 0);
        const originalDockDate = new Date(po.dock_date);
        const revisedDockDate = new Date(originalDockDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
        const revisedDockStr = revisedDockDate.toISOString().split("T")[0];

        const invItem = db.inventory.find((i) => i.sku === sku);
        const onHand = invItem ? invItem.on_hand : 0;

        const skuOrders = db.outbound_orders
          .filter((o) => o.sku === sku)
          .sort((a, b) => new Date(a.ship_date).getTime() - new Date(b.ship_date).getTime());

        let runningStock = onHand;
        let poReplenished = false;
        const poImpacted: any[] = [];

        for (const order of skuOrders) {
          const orderDate = new Date(order.ship_date);

          if (orderDate.getTime() < revisedDockDate.getTime()) {
            // Order ships BEFORE delayed PO docks: relies purely on running stock
            if (runningStock < order.quantity) {
              const deficit = order.quantity - runningStock;
              const diffMs = revisedDockDate.getTime() - orderDate.getTime();
              const daysLate = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

              // Deterministic Urgency Scoring Formula:
              // (Tier Multiplier: Strategic=2.0, Standard=1.0) * (Days Late) * (Daily SLA Penalty + Base Risk 100)
              const tierMultiplier = order.tier === "Strategic" ? 2.0 : 1.0;
              const baseRisk = 100.0;
              const slaLoss = order.sla_penalty * daysLate;
              const urgencyScore = Math.round(tierMultiplier * daysLate * (order.sla_penalty + baseRisk) * 100) / 100;
              totalSlaExposure += slaLoss;

              const catalog = db.remediation_catalog[sku] || {
                expedite_air_fee: 1500,
                secondary_source_available: true,
                secondary_source_premium: 10.0,
                expedite_lead_days: 2
              };

              const expediteAirFee = catalog.expedite_air_fee;
              const secondaryPremium = catalog.secondary_source_premium;
              const costToExpedite = expediteAirFee + deficit * secondaryPremium;
              const netBenefitExpedite = slaLoss - costToExpedite;

              const options = {
                option_a_expedite: {
                  name: "Option A: Expedite (Secondary / Air Freight)",
                  cost: Math.round(costToExpedite * 100) / 100,
                  avoided_sla: Math.round(slaLoss * 100) / 100,
                  net_benefit: Math.round(netBenefitExpedite * 100) / 100,
                  lead_time_days: catalog.expedite_lead_days,
                  feasible: true,
                  breakdown: `Air base fee $${expediteAirFee.toLocaleString()} + ($${secondaryPremium.toFixed(2)} × ${deficit} units)`
                },
                option_b_partial: {
                  name: "Option B: Split Delivery (Partial Fulfillment)",
                  feasible: order.allow_partial,
                  units_available_now: runningStock,
                  units_deferred: deficit,
                  sla_exposure: order.allow_partial ? Math.round((deficit / order.quantity) * slaLoss * 100) / 100 : slaLoss,
                  details: `Ship ${runningStock} units immediately; balance of ${deficit} units upon revised dock date (${revisedDockStr}).`
                },
                option_c_reschedule: {
                  name: "Option C: Notify & Reschedule",
                  new_delivery_date: revisedDockStr,
                  days_delayed: daysLate,
                  total_sla_penalty: Math.round(slaLoss * 100) / 100,
                  details: `Accept operational slip of +${daysLate} days. Incur contract SLA penalty of $${slaLoss.toLocaleString()}.`
                }
              };

              let recommendation = "Option A: Expedite";
              let recommendationReason = `Expedite cost ($${costToExpedite.toLocaleString()}) is lower than SLA penalty ($${slaLoss.toLocaleString()}). Net savings: $${netBenefitExpedite.toLocaleString()}.`;

              if (costToExpedite >= slaLoss) {
                if (order.allow_partial && runningStock > 0) {
                  recommendation = "Option B: Partial Ship";
                  recommendationReason = `Expedite cost exceeds SLA liability. Partial fulfillment of ${runningStock} units mitigates operational slip.`;
                } else {
                  recommendation = "Option C: Reschedule";
                  recommendationReason = `Financial SLA loss ($${slaLoss.toLocaleString()}) is lower than expedited procurement overhead ($${costToExpedite.toLocaleString()}).`;
                }
              }

              const orderImpact = {
                order_id: order.order_id,
                customer: order.customer,
                tier: order.tier,
                sku: sku,
                sku_name: invItem ? invItem.name : sku,
                committed_ship_date: order.ship_date,
                revised_inbound_date: revisedDockStr,
                required_quantity: order.quantity,
                on_hand_at_order: runningStock,
                deficit,
                days_late: daysLate,
                daily_sla_penalty: order.sla_penalty,
                sla_exposure: Math.round(slaLoss * 100) / 100,
                urgency_score: urgencyScore,
                allow_partial: order.allow_partial,
                options,
                recommendation,
                recommendation_reason: recommendationReason
              };

              impactedOrders.push(orderImpact);
              poImpacted.push(orderImpact);
              runningStock = 0;
            } else {
              runningStock -= order.quantity;
            }
          } else {
            // Revised dock has occurred; replenish PO quantity
            if (!poReplenished) {
              runningStock += po.quantity;
              poReplenished = true;
            }
            if (runningStock < order.quantity) {
              const deficit = order.quantity - runningStock;
              const daysLate = 1;
              const tierMultiplier = order.tier === "Strategic" ? 2.0 : 1.0;
              const slaLoss = order.sla_penalty * daysLate;
              const urgencyScore = Math.round(tierMultiplier * daysLate * (order.sla_penalty + 100) * 100) / 100;
              totalSlaExposure += slaLoss;

              const orderImpact = {
                order_id: order.order_id,
                customer: order.customer,
                tier: order.tier,
                sku: sku,
                sku_name: invItem ? invItem.name : sku,
                committed_ship_date: order.ship_date,
                revised_inbound_date: revisedDockStr,
                required_quantity: order.quantity,
                on_hand_at_order: runningStock,
                deficit,
                days_late: daysLate,
                daily_sla_penalty: order.sla_penalty,
                sla_exposure: Math.round(slaLoss * 100) / 100,
                urgency_score: urgencyScore,
                allow_partial: order.allow_partial,
                options: {},
                recommendation: "Option C: Reschedule",
                recommendation_reason: "Secondary stockout after PO allocation."
              };
              impactedOrders.push(orderImpact);
              poImpacted.push(orderImpact);
              runningStock = 0;
            } else {
              runningStock -= order.quantity;
            }
          }
        }

        simulationDetails.push({
          po_number: po.po_number,
          sku,
          sku_name: invItem ? invItem.name : sku,
          original_dock: po.dock_date,
          revised_dock: revisedDockStr,
          delay_days: delayDays,
          initial_on_hand: onHand,
          po_quantity: po.quantity,
          ending_stock_runway: runningStock,
          impacted_orders_count: poImpacted.length
        });
      }

      // Sort by urgency score descending
      impactedOrders.sort((a, b) => b.urgency_score - a.urgency_score);

      const hasImpact = impactedOrders.length > 0;

      return res.json({
        has_impact: hasImpact,
        status: hasImpact ? "Critical Disruption Detected" : "Zero Operational Impact (Buffer Absorbed)",
        message: hasImpact
          ? `Identified ${impactedOrders.length} downstream order breaches across supply pipelines.`
          : "Existing inventory runway absorbs the PO slip with 0 customer stockouts.",
        extracted,
        matched_supplier: matchedSupplier,
        matched_po: matchedPos[0] || null,
        all_matched_pos: matchedPos,
        impacted_orders: impactedOrders,
        total_sla_exposure: Math.round(totalSlaExposure * 100) / 100,
        simulation_details: simulationDetails
      });
    } catch (err: any) {
      console.error("Error in /api/analyze:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ScopeLink full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
