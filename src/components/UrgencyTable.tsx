import React from 'react';
import { ImpactedOrder } from '../types';
import { ShieldCheck, AlertCircle, ArrowUpRight } from 'lucide-react';

interface UrgencyTableProps {
  impactedOrders: ImpactedOrder[];
  onSelectOrder?: (order: ImpactedOrder) => void;
}

export const UrgencyTable: React.FC<UrgencyTableProps> = ({ impactedOrders, onSelectOrder }) => {
  const totalAvoidedPotential = impactedOrders.reduce((sum, ord) => {
    return sum + (ord.options?.option_a_expedite?.avoided_sla || ord.sla_exposure);
  }, 0);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="bg-slate-50 border-b border-[#E2E8F0] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Urgency-Ranked Disruption Impact
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Formula: Tier Multiplier (Strategic ×2.0, Standard ×1.0) × Days Late × (Daily SLA + Base Risk 100)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-bold uppercase border border-indigo-100">
            Strategic ×2.0
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase border border-slate-200">
            Standard ×1.0
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
              <th className="px-6 py-3.5">Rank</th>
              <th className="px-6 py-3.5">Customer / Tier</th>
              <th className="px-6 py-3.5">SKU & Item</th>
              <th className="px-6 py-3.5">Inventory Gap</th>
              <th className="px-6 py-3.5">Projected Slip</th>
              <th className="px-6 py-3.5">SLA Exposure</th>
              <th className="px-6 py-3.5 text-right">Recommended Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {impactedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 bg-slate-50/30">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <span className="font-semibold text-slate-700 block text-xs uppercase tracking-wider">
                    Zero Downstream Orders Compromised
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                    Existing buffer stock absorbs the supply slip or no active disruption is loaded.
                  </p>
                </td>
              </tr>
            ) : (
              impactedOrders.map((order, index) => {
                const isStrategic = order.tier === 'Strategic';
                return (
                  <tr
                    key={order.order_id}
                    className="hover:bg-slate-50/50 transition cursor-pointer"
                    onClick={() => onSelectOrder?.(order)}
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0F172A] text-white text-[10px] font-mono">
                          {index + 1}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {order.urgency_score.toLocaleString()} pts
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#0F172A]">{order.customer}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isStrategic
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {order.tier}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{order.order_id}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-slate-800">{order.sku}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[170px]">{order.sku_name}</div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-rose-600 font-semibold">
                      -{order.deficit} Units
                      <div className="text-[10px] font-sans font-normal text-slate-400">
                        Req: {order.required_quantity} • In-stock: {order.on_hand_at_order}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-rose-500 font-medium text-xs">+{order.days_late} Days</span>
                      <div className="text-[10px] text-slate-400">Committed: {order.committed_ship_date}</div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-[#0F172A]">
                      ${order.sla_exposure.toLocaleString()}
                      <div className="text-[10px] text-slate-400 font-normal">
                        ${order.daily_sla_penalty}/day contract SLA
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 bg-[#0F172A] text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-slate-800 transition shadow-2xs">
                        {order.recommendation}
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </span>
                      <div
                        className="text-[10px] text-slate-400 mt-1 max-w-[200px] ml-auto truncate"
                        title={order.recommendation_reason}
                      >
                        {order.recommendation_reason}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {impactedOrders.length > 0 && (
        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Recommended Mitigation
              </p>
              <p className="text-xs leading-relaxed text-slate-600 italic">
                "Strategic recommendation: Review formulated trade-offs in the Operator Decision Desk. Authorize expedited freight or partial splits to safeguard Strategic customer contracts and mitigate SLA exposure."
              </p>
            </div>
            <div className="flex md:justify-end items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Exposure at Risk
                </p>
                <p className="text-xl font-bold text-emerald-600">
                  ${totalAvoidedPotential.toLocaleString()} Actionable
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
