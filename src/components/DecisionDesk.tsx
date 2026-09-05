import React, { useState } from 'react';
import { ImpactedOrder } from '../types';
import { Plane, Split, CalendarClock, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';

interface DecisionDeskProps {
  impactedOrders: ImpactedOrder[];
  onApprove: (orderId: string, customer: string, optionName: string) => void;
}

export const DecisionDesk: React.FC<DecisionDeskProps> = ({ impactedOrders, onApprove }) => {
  const [approvedOrders, setApprovedOrders] = useState<Record<string, string>>({});

  const handleApprove = (orderId: string, customer: string, optionName: string) => {
    setApprovedOrders((prev) => ({ ...prev, [orderId]: optionName }));
    onApprove(orderId, customer, optionName);
  };

  if (impactedOrders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Operator Decision Desk: Trade-off Formulations
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Compare financial and operational trade-offs for each compromised order. Authorize human sign-off.
          </p>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {impactedOrders.length} Order Action Plans Required
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {impactedOrders.map((order) => {
          const optA = order.options?.option_a_expedite;
          const optB = order.options?.option_b_partial;
          const optC = order.options?.option_c_reschedule;
          const approvedPlan = approvedOrders[order.order_id];

          return (
            <div
              key={order.order_id}
              className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4 transition ${
                approvedPlan
                  ? 'border-emerald-300 ring-1 ring-emerald-400'
                  : 'border-[#E2E8F0]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-semibold text-[#0F172A] text-sm">{order.customer}</h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      {order.order_id} • {order.sku}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    Deficit: {order.deficit} pcs
                  </span>
                </div>

                {/* 3 Explicit Trade-offs */}
                <div className="mt-4 space-y-3">
                  {/* Option A: Expedite */}
                  {optA && (
                    <div
                      className={`p-3 rounded-lg border text-xs transition ${
                        order.recommendation.includes('Expedite')
                          ? 'border-[#0F172A] bg-slate-50/80 ring-1 ring-slate-900'
                          : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-[#0F172A] mb-1">
                        <span className="flex items-center gap-1.5">
                          <Plane className="w-3.5 h-3.5 text-slate-700" />
                          Option A: Expedite (Air Freight)
                        </span>
                        <span className="font-mono">${optA.cost.toLocaleString()}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        {optA.breakdown} • Transit: {optA.lead_time_days} days
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200 font-medium">
                        <span className="text-emerald-700">Avoided SLA: ${optA.avoided_sla.toLocaleString()}</span>
                        <span className="text-slate-800">Net Benefit: +${optA.net_benefit.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Option B: Partial Ship */}
                  {optB && (
                    <div
                      className={`p-3 rounded-lg border text-xs transition ${
                        order.recommendation.includes('Partial')
                          ? 'border-[#0F172A] bg-slate-50/80 ring-1 ring-slate-900'
                          : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-[#0F172A] mb-1">
                        <span className="flex items-center gap-1.5">
                          <Split className="w-3.5 h-3.5 text-slate-700" />
                          Option B: Partial Delivery
                        </span>
                        <span
                          className={`font-semibold text-[10px] uppercase tracking-wider ${
                            optB.feasible ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {optB.feasible ? 'Permitted' : 'Prohibited'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{optB.details}</p>
                    </div>
                  )}

                  {/* Option C: Reschedule */}
                  {optC && (
                    <div
                      className={`p-3 rounded-lg border text-xs transition ${
                        order.recommendation.includes('Reschedule')
                          ? 'border-[#0F172A] bg-slate-50/80 ring-1 ring-slate-900'
                          : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-[#0F172A] mb-1">
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 text-slate-700" />
                          Option C: Reschedule & Incur SLA
                        </span>
                        <span className="text-rose-600 font-bold font-mono">${optC.total_sla_penalty.toLocaleString()}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{optC.details}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendation & Approval Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Recommended</span>
                  <strong className="text-[#0F172A]">{order.recommendation}</strong>
                </div>

                {approvedPlan ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Plan Approved</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleApprove(order.order_id, order.customer, order.recommendation)}
                    className="bg-[#0F172A] hover:bg-slate-800 active:bg-slate-950 text-white text-[10px] font-bold uppercase px-4 py-2 rounded-lg transition shadow-sm cursor-pointer"
                  >
                    Approve Plan
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
