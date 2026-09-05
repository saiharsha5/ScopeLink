import React from 'react';
import { ShieldAlert, Package, Users, DollarSign, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { AnalysisResponse } from '../types';

interface MetricCardsProps {
  analysis: AnalysisResponse | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ analysis }) => {
  const hasAnalysis = !!analysis;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* 1. Assessment Status */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
          Assessment
        </p>
        <div className="flex items-baseline gap-2">
          {!hasAnalysis ? (
            <span className="text-xl font-semibold text-slate-300">IDLE</span>
          ) : analysis.has_impact ? (
            <>
              <span className="text-xl font-semibold text-[#0F172A]">CRITICAL</span>
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            </>
          ) : analysis.matched_po ? (
            <>
              <span className="text-xl font-semibold text-[#0F172A]">ABSORBED</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            </>
          ) : (
            <>
              <span className="text-xl font-semibold text-[#0F172A]">NO IMPACT</span>
              <div className="w-2 h-2 bg-slate-300 rounded-full" />
            </>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {hasAnalysis
            ? analysis.has_impact
              ? 'Downstream orders slipping'
              : 'Buffer protected'
            : 'Awaiting notice'}
        </p>
      </div>

      {/* 2. Matched Inbound PO / SKU */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
          Impacted SKU
        </p>
        <div className="text-xl font-semibold text-[#0F172A] truncate">
          {hasAnalysis && analysis.matched_po ? analysis.matched_po.sku : '—'}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {hasAnalysis && analysis.matched_po
            ? `${analysis.matched_po.po_number} (${analysis.matched_po.quantity} pcs)`
            : 'No active PO matched'}
        </p>
      </div>

      {/* 3. Impacted Customer Orders */}
      <div
        className={`bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm transition ${
          hasAnalysis && analysis.impacted_orders.length > 0 ? 'border-l-4 border-l-rose-500' : ''
        }`}
      >
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
          Impacted Orders
        </p>
        <div
          className={`text-xl font-semibold ${
            hasAnalysis && analysis.impacted_orders.length > 0 ? 'text-rose-600' : 'text-[#0F172A]'
          }`}
        >
          {hasAnalysis ? `${analysis.impacted_orders.length} Units` : '0 Units'}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {hasAnalysis && analysis.impacted_orders.length > 0
            ? `${analysis.impacted_orders.filter((o) => o.tier === 'Strategic').length} Strategic tier breaches`
            : '0 stockout events'}
        </p>
      </div>

      {/* 4. Total SLA Exposure */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
          SLA Exposure
        </p>
        <div className="text-xl font-semibold text-[#0F172A] truncate">
          ${hasAnalysis ? analysis.total_sla_exposure.toLocaleString() : '0.00'}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {hasAnalysis && analysis.total_sla_exposure > 0
            ? 'Penalties if unmitigated'
            : 'Zero contractual penalty'}
        </p>
      </div>
    </div>
  );
};
