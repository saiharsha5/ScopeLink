import React from 'react';
import { Database, Activity } from 'lucide-react';

interface NavbarProps {
  onOpenDatabase: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDatabase }) => {
  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-8 sticky top-0 z-30 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0F172A] rounded flex items-center justify-center text-white shrink-0 shadow-xs">
          <div className="w-3.5 h-3.5 border-2 border-white rotate-45" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg sm:text-xl font-semibold tracking-tight uppercase text-[#0F172A]">
            ScopeLink
          </span>
          <span className="text-slate-400 font-light text-xs sm:text-sm hidden sm:inline">
            | Disruption Mapping
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onOpenDatabase}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-medium text-slate-700 transition cursor-pointer shadow-2xs"
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Data Catalog</span>
        </button>

        <span className="text-xs font-mono bg-[#F1F5F9] px-2.5 py-1 rounded border border-[#E2E8F0] text-slate-700 font-medium">
          TRACK_ID: PS08
        </span>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 hidden sm:inline">
            System Live
          </span>
        </div>
      </div>
    </header>
  );
};
