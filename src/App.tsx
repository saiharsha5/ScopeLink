import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InputConsole, SAMPLES } from './components/InputConsole';
import { MetricCards } from './components/MetricCards';
import { TraceabilityChain } from './components/TraceabilityChain';
import { UrgencyTable } from './components/UrgencyTable';
import { DecisionDesk } from './components/DecisionDesk';
import { DatabaseModal } from './components/DatabaseModal';
import { AnalysisResponse, MockDB, ImpactedOrder } from './types';
import { AlertTriangle, CheckCircle2, ShieldCheck, X, Check } from 'lucide-react';

export default function App() {
  const [rawText, setRawText] = useState<string>(SAMPLES.sample1);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dbData, setDbData] = useState<MockDB | null>(null);
  const [isDbOpen, setIsDbOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ImpactedOrder | null>(null);

  // Fetch initial mock DB for catalog inspector
  useEffect(() => {
    fetch('/api/db')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setDbData(data);
      })
      .catch((err) => console.error('Failed to load DB:', err));
  }, []);

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawText })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: AnalysisResponse = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePlan = (orderId: string, customer: string, optionName: string) => {
    setToastMessage({
      title: `Plan Approved: ${orderId}`,
      desc: `Authorized "${optionName}" for ${customer}. Dispatched to ERP & warehouse logistics.`
    });

    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans antialiased selection:bg-[#0F172A] selection:text-white">
      <Navbar onOpenDatabase={() => setIsDbOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Two Column Layout: Left (Input Console) | Right (Metrics & Traceability) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <InputConsole
              rawText={rawText}
              setRawText={setRawText}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              extracted={analysis?.extracted || null}
            />
          </div>

          {/* Right Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <MetricCards analysis={analysis} />
            <TraceabilityChain analysis={analysis} />

            {/* Assessment Status Banner */}
            {analysis && (
              <div
                className={`p-4 rounded-xl border bg-white shadow-sm text-xs flex items-start gap-3 transition ${
                  analysis.has_impact
                    ? 'border-[#E2E8F0] border-l-4 border-l-rose-500 text-[#0F172A]'
                    : analysis.matched_po
                    ? 'border-[#E2E8F0] border-l-4 border-l-emerald-500 text-[#0F172A]'
                    : 'border-[#E2E8F0] text-slate-700'
                }`}
              >
                {analysis.has_impact ? (
                  <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                ) : analysis.matched_po ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      {analysis.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-600 leading-relaxed font-mono text-[11px]">
                    {analysis.message}
                  </p>
                  {analysis.has_impact && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">
                      Immediate action required: review trade-off mitigations below and authorize execution.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Urgency-Ranked Orders Table */}
        <div className="space-y-6">
          <UrgencyTable
            impactedOrders={analysis?.impacted_orders || []}
            onSelectOrder={(order) => setSelectedOrder(order)}
          />

          {/* Operator Decision Desk */}
          <DecisionDesk
            impactedOrders={analysis?.impacted_orders || []}
            onApprove={handleApprovePlan}
          />
        </div>
      </main>

      {/* Database Inspector Drawer/Modal */}
      <DatabaseModal
        isOpen={isDbOpen}
        onClose={() => setIsDbOpen(false)}
        dbData={dbData}
      />

      {/* Approval Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 max-w-md bg-[#0F172A] text-white p-4 rounded-xl shadow-xl border border-slate-700 z-50 flex items-start gap-3 animate-fade-in">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">{toastMessage.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5">{toastMessage.desc}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-sm cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Clean Utility Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] mt-12 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0F172A]">ScopeLink</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-slate-500">TRACK_ID: PS08</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            Deterministic Runway Engine & GenAI Disruption Mapping
          </span>
        </div>
      </footer>
    </div>
  );
}
