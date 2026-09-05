export interface Supplier {
  id: string;
  name: string;
  aliases: string[];
  origin: string;
  lead_time_days: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  on_hand: number;
  safety_stock: number;
  unit_cost: number;
  category?: string;
}

export interface InboundPO {
  po_number: string;
  supplier_id: string;
  carrier: string;
  tracking: string;
  sku: string;
  dock_date: string;
  quantity: number;
  status: string;
}

export interface OutboundOrder {
  order_id: string;
  customer: string;
  tier: "Strategic" | "Standard";
  sku: string;
  quantity: number;
  ship_date: string;
  sla_penalty: number;
  allow_partial: boolean;
}

export interface RemediationItem {
  expedite_air_fee: number;
  secondary_source_available: boolean;
  secondary_source_premium: number;
  expedite_lead_days: number;
}

export interface MockDB {
  suppliers: Supplier[];
  inventory: InventoryItem[];
  inbound_pos: InboundPO[];
  outbound_orders: OutboundOrder[];
  remediation_catalog: Record<string, RemediationItem>;
}

export interface ExtractedEntities {
  supplier_name_or_alias: string | null;
  carrier_or_tracking_ref: string | null;
  delay_days: number;
  incident_summary: string;
  severity: "Critical" | "Moderate" | "Minor";
}

export interface RemediationOptions {
  option_a_expedite?: {
    name: string;
    cost: number;
    avoided_sla: number;
    net_benefit: number;
    lead_time_days: number;
    feasible: boolean;
    breakdown: string;
  };
  option_b_partial?: {
    name: string;
    feasible: boolean;
    units_available_now: number;
    units_deferred: number;
    sla_exposure: number;
    details: string;
  };
  option_c_reschedule?: {
    name: string;
    new_delivery_date: string;
    days_delayed: number;
    total_sla_penalty: number;
    details: string;
  };
}

export interface ImpactedOrder {
  order_id: string;
  customer: string;
  tier: "Strategic" | "Standard";
  sku: string;
  sku_name: string;
  committed_ship_date: string;
  revised_inbound_date: string;
  required_quantity: number;
  on_hand_at_order: number;
  deficit: number;
  days_late: number;
  daily_sla_penalty: number;
  sla_exposure: number;
  urgency_score: number;
  allow_partial: boolean;
  options: RemediationOptions;
  recommendation: string;
  recommendation_reason: string;
}

export interface SimulationDetail {
  po_number: string;
  sku: string;
  sku_name: string;
  original_dock: string;
  revised_dock: string;
  delay_days: number;
  initial_on_hand: number;
  po_quantity: number;
  ending_stock_runway: number;
  impacted_orders_count: number;
}

export interface AnalysisResponse {
  has_impact: boolean;
  status: string;
  message: string;
  extracted: ExtractedEntities;
  matched_supplier: Supplier | null;
  matched_po: InboundPO | null;
  all_matched_pos: InboundPO[];
  impacted_orders: ImpactedOrder[];
  total_sla_exposure: number;
  simulation_details: SimulationDetail[];
}
