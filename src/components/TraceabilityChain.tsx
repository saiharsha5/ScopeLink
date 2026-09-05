import React from 'react';
import { ArrowRight, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { AnalysisResponse } from '../types';

interface TraceabilityChainProps {
  analysis: AnalysisResponse | null;
}

export const TraceabilityChain: React.FC<TraceabilityChainProps> = ({ analysis }) => {
  const hasAnalysis = !!analysis;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Traceability Chain
        </h2>
        <span className="text-[10px] text-slate-400 font-mono">
          {hasAnalysis ? 'Pipeline Mapped' : 'Awaiting Disruption Input'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
        {/* Step 1: Disruption Detected */}
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
            1
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase text-[#0F172A] truncate">
              {hasAnalysis ? 'Disruption Detected' : 'Notice Input'}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {hasAnalysis && analysis.extracted.supplier_name_or_alias
                ? `${analysis.extracted.supplier_name_or_alias} (+${analysis.extracted.delay_days}d)`
                : 'Awaiting supplier log'}
            </p>
          </div>
        </div>

        {/* Step 2: Matched Inbound PO */}
        <div
          className={`flex items-start gap-3 relative z-10 transition ${
            !hasAnalysis ? 'opacity-40' : ''
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 ${
              hasAnalysis && analysis.matched_po ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          >
            2
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase text-[#0F172A] truncate">
              Matched Inbound PO
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {hasAnalysis && analysis.matched_po
                ? `${analysis.matched_po.po_number}: ${analysis.matched_po.quantity}x ${analysis.matched_po.sku}`
                : 'Entity not in pipeline'}
            </p>
          </div>
        </div>

        {/* Step 3: Stock Depletion */}
        <div
          className={`flex items-start gap-3 relative z-10 transition ${
            !hasAnalysis ? 'opacity-40' : ''
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 ${
              !hasAnalysis
                ? 'bg-slate-300'
                : analysis.has_impact
                ? 'bg-rose-500'
                : 'bg-emerald-500'
            }`}
          >
            3
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase text-[#0F172A] truncate">
              Stock Depletion
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {!hasAnalysis
                ? 'Buffer calculation'
                : analysis.has_impact
                ? `Buffer exhausted before dock`
                : 'Runway absorbs slip'}
            </p>
          </div>
        </div>

        {/* Step 4: Resolution Path */}
        <div
          className={`flex items-start gap-3 relative z-10 transition ${
            !hasAnalysis ? 'opacity-40' : ''
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 ${
              !hasAnalysis
                ? 'bg-slate-300'
                : analysis.has_impact
                ? 'bg-rose-600'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            4
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase text-[#0F172A] truncate">
              Resolution Path
            </p>
            <p
              className={`text-[11px] truncate mt-0.5 ${
                hasAnalysis && analysis.has_impact ? 'text-rose-600 font-medium' : 'text-slate-500'
              }`}
            >
              {!hasAnalysis
                ? 'Action formulation'
                : analysis.has_impact
                ? `${analysis.impacted_orders.length} orders need action`
                : 'Milestones protected'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
