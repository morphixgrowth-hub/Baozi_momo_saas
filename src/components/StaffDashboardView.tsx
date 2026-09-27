import React, { useState } from 'react';
import { TableOrder, StaffUser, StaffJSONOutput, DailyRevenueMetrics } from '../types';
import { DailyRevenueWidget } from './DailyRevenueWidget';
import { OrderPrepTimer } from './OrderPrepTimer';
import { sound } from '../utils/audio';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Bell,
  Code,
  Flame,
  Send,
  Sparkles,
  RefreshCw,
  Receipt,
  UserCheck,
  RotateCcw,
  Check,
} from 'lucide-react';

interface StaffDashboardViewProps {
  tableOrders: { [tableNo: string]: TableOrder };
  onUpdateStatus: (tableNo: string, status: 'PREPARING' | 'SERVED' | 'SETTLED', staffName: string) => Promise<void>;
  revenueMetrics?: DailyRevenueMetrics | null;
}

const STAFF_MEMBERS: StaffUser[] = [
  { id: 'st-1', name: 'Chef Vikram', role: 'Chef', badge: 'Kitchen KOT' },
  { id: 'st-2', name: 'Waiter Priya', role: 'Floor Waiter', badge: 'Floor Service' },
  { id: 'st-3', name: 'Manager Rajesh', role: 'General Manager', badge: 'Admin Operations' },
];

export const StaffDashboardView: React.FC<StaffDashboardViewProps> = ({
  tableOrders,
  onUpdateStatus,
  revenueMetrics,
}) => {
  const [selectedStaff, setSelectedStaff] = useState<StaffUser>(STAFF_MEMBERS[0]);
  const [commandInput, setCommandInput] = useState<string>('');
  const [activeTabOption, setActiveTabOption] = useState<'1' | '2' | '3'>('1');
  const [aiOutputLog, setAiOutputLog] = useState<{
    text: string;
    json?: StaffJSONOutput;
    timestamp: string;
  } | null>({
    text: `Welcome, ${selectedStaff.name}! You are connected to the central Staff Dashboard & KOT Engine.\n\nActive Dashboard Options:\n1. View Live Orders: Monitor active preparation tickets across all tables.\n2. Update KOT Status: e.g. 'Mark Table 3 as Served'.\n3. Clear Table & Settle Bill: e.g. 'Settle Table 7'.`,
    timestamp: 'Connected',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionLoadingTable, setActionLoadingTable] = useState<string | null>(null);

  const tablesList = Object.values(tableOrders);
  const activePrep = tablesList.filter((t) => t.status === 'PREPARING');
  const servedTables = tablesList.filter((t) => t.status === 'SERVED');

  const handleStaffChange = (staff: StaffUser) => {
    setSelectedStaff(staff);
    sound.playTap();
    setAiOutputLog({
      text: `Welcome, ${staff.name}! You are connected to the central Staff Dashboard & KOT Engine.\n\nActive Dashboard Options:\n1. View Live Orders\n2. Update KOT Status\n3. Clear Table & Settle Bill`,
      timestamp: 'Just now',
    });
  };

  // Execute staff command via Mode 2: [Staff: <Name>]
  const handleExecuteCommand = async (cmdText?: string) => {
    const rawCmd = cmdText || commandInput;
    if (!rawCmd.trim() || isLoading) return;

    sound.playTap();
    setCommandInput('');
    setIsLoading(true);

    const fullStaffPrompt = `[Staff: ${selectedStaff.name}] ${rawCmd.trim()}`;

    try {
      const res = await fetch('/api/ai/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullStaffPrompt }),
      });
      const data = await res.json();

      const responseText = data.response || 'Command executed.';
      const parsedJson: StaffJSONOutput = data.parsedJson;

      if (parsedJson) {
        sound.playKitchenChime();
      }

      setAiOutputLog({
        text: responseText,
        json: parsedJson,
        timestamp: 'Just now',
      });
    } catch (e) {
      console.error(e);
      setAiOutputLog({
        text: 'Error executing staff command. Check system connection.',
        timestamp: 'Error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickMarkServed = async (tableNo: string) => {
    setActionLoadingTable(tableNo);
    sound.playServedChime();
    try {
      await onUpdateStatus(tableNo, 'SERVED', selectedStaff.name);
      handleExecuteCommand(`Mark ${tableNo} as Served`);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingTable(null);
    }
  };

  const handleQuickSettle = async (tableNo: string) => {
    setActionLoadingTable(tableNo);
    sound.playTap();
    try {
      await onUpdateStatus(tableNo, 'SETTLED', selectedStaff.name);
      handleExecuteCommand(`Settle ${tableNo}`);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingTable(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 p-4 sm:p-6 overflow-y-auto">
      {/* 1. Staff Authentication Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs ring-2 ring-blue-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Staff Dashboard & KOT (Mode 2)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                Trigger: [Staff: {selectedStaff.name}]
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Authenticated as <strong className="text-slate-900 font-bold">{selectedStaff.name}</strong> ({selectedStaff.role})</span>
            </p>
          </div>
        </div>

        {/* Staff Switcher Pills */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-slate-200/80 rounded-xl p-1 text-xs">
            {STAFF_MEMBERS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleStaffChange(s)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedStaff.id === s.id
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.name} ({s.role})
              </button>
            ))}
          </div>

          <button
            onClick={() => sound.playKitchenChime()}
            className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200 text-xs flex items-center gap-1.5 transition-colors shadow-2xs font-semibold"
            title="Ring Kitchen Bell"
          >
            <Bell className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden md:inline font-mono">Bell Chime</span>
          </button>
        </div>
      </div>

      {/* 2. Active Dashboard Options Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <button
          onClick={() => {
            setActiveTabOption('1');
            sound.playTap();
          }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTabOption === '1'
              ? 'bg-white border-2 border-blue-600 text-slate-900 shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-semibold">
            Option 1
          </div>
          <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span>View Live Orders</span>
            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {tablesList.length} Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
            Monitor real-time KOT tickets and table progression
          </p>
        </button>

        <button
          onClick={() => {
            setActiveTabOption('2');
            sound.playTap();
          }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTabOption === '2'
              ? 'bg-white border-2 border-amber-500 text-slate-900 shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-semibold">
            Option 2
          </div>
          <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span>Update KOT Status</span>
            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {activePrep.length} Prep
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
            Mark tables as Served to push instant update to customer
          </p>
        </button>

        <button
          onClick={() => {
            setActiveTabOption('3');
            sound.playTap();
          }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTabOption === '3'
              ? 'bg-white border-2 border-emerald-600 text-slate-900 shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-semibold">
            Option 3
          </div>
          <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span>Clear Table & Settle Bill</span>
            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {servedTables.length} Ready
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
            Close order, verify 5% GST bill, and reset table
          </p>
        </button>
      </div>

      {/* 2.5. Daily Revenue Summary Widget (Calculated from SETTLED orders + 5% GST) */}
      <div className="mt-4">
        <DailyRevenueWidget tableOrders={tableOrders} serverMetrics={revenueMetrics} />
      </div>

      {/* 3. Main Dashboard Work Area: Live Table Cards + AI Command Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1">
        {/* Left Column: Live Table Orders Grid (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <span className="text-xs font-mono uppercase font-bold text-slate-700 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Live KOT Queue & Table Operations</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono font-semibold">
                {activeTabOption === '2' ? 'Filter: PREP ONLY' : activeTabOption === '3' ? 'Filter: SETTLE READY' : 'ALL TABLES'}
              </span>
            </span>
            <div className="flex items-center gap-2">
              {activeTabOption !== '1' && (
                <button
                  onClick={() => setActiveTabOption('1')}
                  className="text-[10px] font-mono text-blue-600 hover:text-blue-700 font-bold underline"
                >
                  Show All ({tablesList.length})
                </button>
              )}
              <span className="text-[11px] font-mono text-slate-400">Auto Synced via SSE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1 overflow-y-auto">
            {(activeTabOption === '2'
              ? tablesList.filter((t) => t.status === 'PREPARING')
              : activeTabOption === '3'
              ? tablesList.filter((t) => t.status === 'SERVED' || t.status === 'SETTLED')
              : tablesList
            ).map((order) => {
              const isPrep = order.status === 'PREPARING';
              const isServed = order.status === 'SERVED';
              const isSettled = order.status === 'SETTLED';

              return (
                <div
                  key={order.table_no}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all bg-white shadow-xs ${
                    isPrep
                      ? 'border-amber-400 ring-2 ring-amber-300/30 shadow-sm'
                      : isServed
                      ? 'border-blue-300 ring-1 ring-blue-100'
                      : 'border-slate-200 opacity-80'
                  }`}
                >
                  <div>
                    {/* Top Row: Table & State */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 font-mono shadow-2xs">
                        {order.table_no}
                      </span>

                      {isPrep && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-600" />
                          PREPARING
                        </span>
                      )}

                      {isServed && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          SERVED
                        </span>
                      )}

                      {isSettled && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          SETTLED
                        </span>
                      )}
                    </div>

                    {/* Visual Live Prep Timer for PREPARING orders */}
                    {isPrep && (
                      <OrderPrepTimer
                        createdAt={order.createdAt}
                        targetMinutes={15}
                      />
                    )}

                    {/* Order Items */}
                    <div className="py-2.5 space-y-1">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-800 font-mono">
                          <span>{it.qty}x {it.name}</span>
                          <span className="text-slate-500">₹{it.price * it.qty}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="pt-2 border-t border-slate-100 text-[11px] font-mono space-y-0.5">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal:</span>
                        <span>₹{order.subtotal}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>GST (5%):</span>
                        <span>₹{order.gstAmount}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold">
                        <span>Grand Total:</span>
                        <span className="text-blue-700 font-black">₹{order.grandTotal}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions according to Dashboard Option */}
                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    {isPrep && (
                      <button
                        onClick={() => handleQuickMarkServed(order.table_no)}
                        disabled={actionLoadingTable === order.table_no}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Served</span>
                      </button>
                    )}

                    {(isServed || isPrep) && (
                      <button
                        onClick={() => handleQuickSettle(order.table_no)}
                        disabled={actionLoadingTable === order.table_no}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Settle & Clear</span>
                      </button>
                    )}

                    {isSettled && (
                      <div className="w-full text-center text-[10px] text-slate-400 font-mono py-1.5">
                        Table Cleared & Available
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Staff AI Engine Command Console (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-white border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Command Center Engine</span>
            </span>
            <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              Mode 2 [Staff:]
            </span>
          </div>

          {/* Quick command buttons */}
          <div className="py-2.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => handleExecuteCommand('View Live Orders')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 text-[11px] font-mono transition-colors shadow-2xs font-medium"
            >
              1. View Live Orders
            </button>
            <button
              onClick={() => handleExecuteCommand('Mark Table 3 as Served')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 text-[11px] font-mono transition-colors shadow-2xs font-medium"
            >
              2. Mark Table 3 as Served
            </button>
            <button
              onClick={() => handleExecuteCommand('Settle Table 7')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 text-[11px] font-mono transition-colors shadow-2xs font-medium"
            >
              3. Settle Table 7
            </button>
          </div>

          {/* AI Response Display */}
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 my-2 overflow-y-auto space-y-2 font-mono text-xs shadow-2xs">
            {aiOutputLog ? (
              <>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {aiOutputLog.text}
                </p>

                {aiOutputLog.json && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 text-[11px] space-y-1">
                    <div className="text-slate-300 font-bold border-b border-slate-700 pb-1 flex items-center justify-between">
                      <span>Backend Synced JSON (Role: staff)</span>
                      <span className="text-amber-300">Table {aiOutputLog.json.table_no}</span>
                    </div>
                    <pre className="text-[10px] font-mono text-slate-200 pt-1">
                      {JSON.stringify(aiOutputLog.json, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <span className="text-slate-400">Enter a command or choose a quick option above.</span>
            )}
          </div>

          {/* Command Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteCommand();
            }}
            className="pt-2 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Command as ${selectedStaff.name}... (e.g. 'Mark Table 3 as Served')`}
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-all"
            />
            <button
              type="submit"
              disabled={!commandInput.trim() || isLoading}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-40 shadow-xs transition-all"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Execute</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
