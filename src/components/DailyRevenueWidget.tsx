import React, { useState } from 'react';
import { TableOrder, DailyRevenueMetrics } from '../types';
import {
  TrendingUp,
  Receipt,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Percent,
  Calendar,
  Layers,
  Sparkles,
  Printer,
  FileText,
} from 'lucide-react';

interface DailyRevenueWidgetProps {
  tableOrders: { [tableNo: string]: TableOrder };
  serverMetrics?: DailyRevenueMetrics | null;
}

export const DailyRevenueWidget: React.FC<DailyRevenueWidgetProps> = ({
  tableOrders,
  serverMetrics,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Compute settled orders from active tableOrders + server metrics
  const activeSettledTables = Object.values(tableOrders).filter(
    (t) => t.status === 'SETTLED'
  );

  // Merge with serverMetrics settled orders (de-duplicate by order id)
  const allSettledOrdersMap = new Map<string, TableOrder>();
  if (serverMetrics?.settledOrders) {
    serverMetrics.settledOrders.forEach((o) => allSettledOrdersMap.set(o.id, o));
  }
  activeSettledTables.forEach((o) => allSettledOrdersMap.set(o.id, o));

  const settledOrders = Array.from(allSettledOrdersMap.values());

  // Calculate metrics based on 'SETTLED' table orders and 5% GST
  const netSubtotal = settledOrders.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const totalGstCollected = Math.round(netSubtotal * 0.05 * 100) / 100;
  const totalGrossRevenue = Math.round((netSubtotal + totalGstCollected) * 100) / 100;
  const totalSettledCount = settledOrders.length;
  const averageOrderValue =
    totalSettledCount > 0
      ? Math.round((totalGrossRevenue / totalSettledCount) * 100) / 100
      : 0;

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      {/* Widget Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                Daily Revenue Summary
              </h3>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                5% GST Enforced
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Real-time earnings calculated exclusively from{' '}
              <span className="text-slate-900 font-mono font-bold">'SETTLED'</span> orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors shadow-2xs font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExpanded ? 'Hide Ledger' : `View Settled (${totalSettledCount})`}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          <button
            onClick={handlePrintZReport}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
            title="Print Daily Z-Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Core Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
        {/* Metric 1: Total Gross Revenue */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-mono text-blue-900 font-semibold">
            <span>Total Gross Earnings</span>
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-800">
              ₹{totalGrossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-blue-600/90 font-mono mt-0.5">
              Net Subtotal + 5% GST included
            </div>
          </div>
          <div className="text-[10px] font-mono text-blue-900 pt-1.5 border-t border-blue-200/80 font-bold">
            From {totalSettledCount} Settled Orders
          </div>
        </div>

        {/* Metric 2: Net Food & Beverage Subtotal */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 font-medium">
            <span>Net F&B Subtotal</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              ₹{netSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Raw billings prior to tax
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-600 pt-1.5 border-t border-slate-200 font-medium">
            Base Kitchen Receipts
          </div>
        </div>

        {/* Metric 3: Total 5% GST Collected */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-mono text-amber-900 font-semibold">
            <span>5% GST Collected</span>
            <Percent className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700">
              ₹{totalGstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-amber-800/80 font-mono mt-0.5">
              2.5% CGST + 2.5% SGST
            </div>
          </div>
          <div className="text-[10px] font-mono text-amber-900 pt-1.5 border-t border-amber-200 font-bold">
            Strict 5% GST Compliance
          </div>
        </div>

        {/* Metric 4: Average Order Value & Volume */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 font-medium">
            <span>Avg Order Value (AOV)</span>
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
              ₹{averageOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Per settled table ticket
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-600 pt-1.5 border-t border-slate-200 font-medium">
            {totalSettledCount} Completed Cycles
          </div>
        </div>
      </div>

      {/* Expandable Settled Orders Ledger */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-mono font-bold text-slate-800 uppercase">
              Settled Receipts Audit Trail
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Auto-archived upon staff 'Settle Table' action
            </span>
          </div>

          {settledOrders.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              No orders settled yet today. When a table bill is closed and settled, earnings appear here.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {settledOrders.map((order) => {
                const settledTime = order.settledAt
                  ? new Date(order.settledAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Earlier';

                return (
                  <div
                    key={order.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded bg-white border border-slate-200 font-bold text-slate-900 shadow-2xs">
                        {order.table_no}
                      </span>
                      <div>
                        <div className="text-slate-800 font-medium">
                          {order.items.map((it) => `${it.qty}x ${it.name}`).join(', ') ||
                            'Standard Ticket'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Order ID: {order.id} • Settled at {settledTime}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div className="text-[11px] text-slate-600">
                        <span>Subtotal: ₹{order.subtotal}</span>
                        <span className="mx-1 text-slate-400">+</span>
                        <span className="text-amber-700 font-semibold">5% GST: ₹{order.gstAmount}</span>
                      </div>
                      <div className="font-bold text-blue-700 text-sm">
                        ₹{order.grandTotal}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                        PAID
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
