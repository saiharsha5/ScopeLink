import React from 'react';
import { Send, FileText, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { ExtractedEntities } from '../types';

interface InputConsoleProps {
  rawText: string;
  setRawText: (val: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  extracted: ExtractedEntities | null;
}

export const SAMPLES = {
  sample1: `Subject: Urgent Shipping Update - PO-8821
Hi Team,

Our Shenzhen plant (Apex Precision / Apex Co) has reported a 7-day delay due to port congestion and customs holds at Yantian. Ocean carrier Maersk Line (Tracking: MAEU1234890) estimates the promised dock date will be pushed back by 7 days. Micro motor assemblies (SKU: MOT-001) are onboard.`,

  sample2: `Standard Operations Notice:
Please be advised that scheduled cleaning services at North Warehouse will take place on Saturday morning between 08:00 and 12:00. No inbound receipts or inventory movements will be affected.`,

  sample3: `Carrier Exception Report - PO-3344:
Old Dominion Freight reports a 3-day transit delay for Flange Bolt shipment (SKU: FLG-99) originating from Titan Fasteners Corp due to blizzard conditions along the I-80 corridor. Revised dock arrival scheduled.`
};

export const InputConsole: React.FC<InputConsoleProps> = ({
  rawText,
  setRawText,
  onAnalyze,
  isLoading,
  extracted
}) => {
  const loadSample = (key: keyof typeof SAMPLES) => {
    setRawText(SAMPLES[key]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Input Console
          </h2>
          <span className="text-[10px] text-slate-400 italic">
            {isLoading ? 'Processing Pipeline...' : 'Awaiting Raw Logs...'}
          </span>
        </div>

        <label htmlFor="rawInput" className="sr-only">
          Unstructured Supplier Disruption Notice
        </label>
        <textarea
          id="rawInput"
          rows={7}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste supplier notice or carrier exception log..."
          className="bg-slate-50 rounded-lg p-4 border border-[#F1F5F9] focus:border-[#E2E8F0] focus:bg-white font-mono text-xs leading-relaxed text-slate-700 mb-4 outline-none transition placeholder:text-slate-400 resize-y"
        />

        <button
          onClick={onAnalyze}
          disabled={isLoading || !rawText.trim()}
          className="w-full bg-[#0F172A] text-white py-3 rounded-lg font-semibold text-sm hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-lg shadow-slate-200 cursor-pointer flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Extracting & Simulating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-slate-300" />
              <span>Run Blast Radius Analysis</span>
            </>
          )}
        </button>

        {/* Quick Samples */}
        <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Preset Scenarios
            </span>
            <span className="text-[10px] text-slate-400">1-click test</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => loadSample('sample1')}
              className="text-left p-2.5 rounded-lg border border-[#E2E8F0] bg-slate-50/70 hover:bg-white hover:border-slate-300 transition text-xs font-medium text-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-rose-600 font-semibold mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Active Shenzhen Delay
              </div>
              <span className="text-slate-500 text-[10px] block truncate">
                Apex: 7-day port slip (Critical)
              </span>
            </button>

            <button
              type="button"
              onClick={() => loadSample('sample2')}
              className="text-left p-2.5 rounded-lg border border-[#E2E8F0] bg-slate-50/70 hover:bg-white hover:border-slate-300 transition text-xs font-medium text-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Zero Impact Notice
              </div>
              <span className="text-slate-500 text-[10px] block truncate">
                Warehouse routine cleaning
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadSample('sample3')}
            className="w-full mt-2 text-left p-2.5 rounded-lg border border-[#E2E8F0] bg-slate-50/70 hover:bg-white hover:border-slate-300 transition text-xs font-medium text-slate-700 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-amber-600 font-semibold mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Buffer-Absorbable Delay
            </div>
            <span className="text-slate-500 text-[10px] block truncate">
              Titan Fasteners: 3-day slip absorbed by existing inventory buffer
            </span>
          </button>
        </div>
      </div>

      {/* LLM Extraction Inspection Box */}
      {extracted && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm transition animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              LLM Extracted Schema
            </h3>
            <span className="text-[10px] font-mono text-slate-400">gemini-3.8-flash</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-slate-500">Supplier / Alias</span>
              <span className="font-medium text-[#0F172A]">
                {extracted.supplier_name_or_alias || 'None identified'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-slate-500">Carrier / Tracking ID</span>
              <span className="font-mono font-medium text-[#0F172A]">
                {extracted.carrier_or_tracking_ref || 'None identified'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-slate-500">Extracted Slip</span>
              <span className="font-semibold text-rose-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                +{extracted.delay_days} calendar days
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-slate-500">Assessed Severity</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                  extracted.severity === 'Critical'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : extracted.severity === 'Moderate'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {extracted.severity}
              </span>
            </div>
            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Operational Summary
              </span>
              <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-[#F1F5F9] leading-relaxed text-xs">
                {extracted.incident_summary}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
