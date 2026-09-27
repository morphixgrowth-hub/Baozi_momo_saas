import React from 'react';
import { ActiveTab } from '../types';
import { LayoutGrid, Smartphone, Terminal, Server, ChefHat } from 'lucide-react';

interface HeaderProps {
  currentTab: ActiveTab;
  setTab: (tab: ActiveTab) => void;
  activePrepCount: number;
  totalActiveTables: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setTab,
  activePrepCount,
  totalActiveTables,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white text-slate-900 border-b border-slate-200 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-3">
          {/* Brand & System Status */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm ring-2 ring-blue-500/20">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                  Restaurant SaaS Engine
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Dual Core
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-medium text-slate-600">Mode 1 [Table: X]</span>
                <span className="text-slate-300">|</span>
                <span className="font-medium text-slate-600">Mode 2 [Staff:]</span>
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTab('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'split'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dual Flow (Sync)</span>
            </button>

            <button
              onClick={() => setTab('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'customer'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mode 1: Customer</span>
            </button>

            <button
              onClick={() => setTab('staff')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                currentTab === 'staff'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Mode 2: Staff & KOT</span>
              {activePrepCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 shadow-xs">
                  {activePrepCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab('sandbox')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'sandbox'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Prompt Sandbox</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
