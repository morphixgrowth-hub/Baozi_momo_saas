import React, { useState, useEffect } from 'react';
import { ActiveTab, TableOrder, OrderItem, DailyRevenueMetrics } from './types';
import { Header } from './components/Header';
import { CustomerView } from './components/CustomerView';
import { StaffDashboardView } from './components/StaffDashboardView';
import { RawSandboxView } from './components/RawSandboxView';
import { sound } from './utils/audio';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('split');
  const [activeTableNo, setActiveTableNo] = useState<string>('Table 3');
  const [tableOrders, setTableOrders] = useState<{ [tableNo: string]: TableOrder }>({});
  const [revenueMetrics, setRevenueMetrics] = useState<DailyRevenueMetrics | null>(null);

  // Fetch initial table orders and revenue metrics from server
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch('/api/tables');
        const data = await res.json();
        if (data.tableOrders) {
          setTableOrders(data.tableOrders);
        }
        if (data.revenueMetrics) {
          setRevenueMetrics(data.revenueMetrics);
        }
      } catch (err) {
        console.error('Failed to load table orders:', err);
      }
    };

    fetchInitialData();

    // Subscribe to real-time Server-Sent Events (SSE)
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('init', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.tableOrders) {
          setTableOrders(data.tableOrders);
        }
        if (data.revenueMetrics) {
          setRevenueMetrics(data.revenueMetrics);
        }
      } catch (e) {
        console.error('SSE init parse error:', e);
      }
    });

    eventSource.addEventListener('table_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.allTables) {
          setTableOrders(data.allTables);
        } else if (data.tableOrder) {
          setTableOrders((prev) => ({
            ...prev,
            [data.tableOrder.table_no]: data.tableOrder,
          }));
        }

        if (data.revenueMetrics) {
          setRevenueMetrics(data.revenueMetrics);
        }

        // If updated table is currently viewed customer table, alert if served
        if (data.tableOrder && data.tableOrder.table_no === activeTableNo) {
          if (data.tableOrder.status === 'SERVED') {
            sound.playServedChime();
          }
        }
      } catch (e) {
        console.error('SSE table_update parse error:', e);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [activeTableNo]);

  // Handle customer placing / updating order
  const handleCustomerOrderUpdate = async (
    tableNo: string,
    items: OrderItem[],
    status: 'ORDERING' | 'PREPARING'
  ) => {
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(tableNo)}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, status }),
      });
      const data = await res.json();
      if (data.tableOrder) {
        setTableOrders((prev) => ({
          ...prev,
          [tableNo]: data.tableOrder,
        }));
      }
    } catch (err) {
      console.error('Failed to update customer order:', err);
    }
  };

  // Handle staff updating status
  const handleStaffStatusUpdate = async (
    tableNo: string,
    status: 'PREPARING' | 'SERVED' | 'SETTLED',
    staffName: string
  ) => {
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(tableNo)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, staffName }),
      });
      const data = await res.json();
      if (data.tableOrder) {
        setTableOrders((prev) => ({
          ...prev,
          [tableNo]: data.tableOrder,
        }));
      }
    } catch (err) {
      console.error('Failed to update staff status:', err);
    }
  };

  const activePrepCount = Object.values(tableOrders).filter(
    (t) => t.status === 'PREPARING'
  ).length;

  const totalActiveTables = Object.keys(tableOrders).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* SaaS App Header */}
      <Header
        currentTab={currentTab}
        setTab={setCurrentTab}
        activePrepCount={activePrepCount}
        totalActiveTables={totalActiveTables}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {/* Dual Mode Synchronized View (Split Screen) */}
        {currentTab === 'split' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-100">
            {/* Left: Mode 1 Customer Virtual Waiter (5 cols) */}
            <div className="lg:col-span-5 h-full border-r border-slate-200 flex flex-col overflow-hidden bg-white shadow-xs">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>MODE 1: CUSTOMER INTERFACE</span>
                </span>
                <span className="text-slate-500 font-normal">Contactless Virtual Waiter</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <CustomerView
                  activeTableNo={activeTableNo}
                  onTableChange={setActiveTableNo}
                  tableOrder={tableOrders[activeTableNo]}
                  onOrderUpdate={handleCustomerOrderUpdate}
                  compactMode={true}
                />
              </div>
            </div>

            {/* Right: Mode 2 Staff Dashboard & KOT (7 cols) */}
            <div className="lg:col-span-7 h-full flex flex-col overflow-hidden bg-slate-50">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>MODE 2: STAFF DASHBOARD & KOT</span>
                </span>
                <span className="text-slate-500 font-normal">Internal Command Center</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <StaffDashboardView
                  tableOrders={tableOrders}
                  onUpdateStatus={handleStaffStatusUpdate}
                  revenueMetrics={revenueMetrics}
                />
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Mode 1: Customer Interface */}
        {currentTab === 'customer' && (
          <div className="h-full">
            <CustomerView
              activeTableNo={activeTableNo}
              onTableChange={setActiveTableNo}
              tableOrder={tableOrders[activeTableNo]}
              onOrderUpdate={handleCustomerOrderUpdate}
              compactMode={false}
            />
          </div>
        )}

        {/* Dedicated Mode 2: Staff Dashboard & KOT */}
        {currentTab === 'staff' && (
          <div className="h-full">
            <StaffDashboardView
              tableOrders={tableOrders}
              onUpdateStatus={handleStaffStatusUpdate}
              revenueMetrics={revenueMetrics}
            />
          </div>
        )}

        {/* Dedicated AI Engine Sandbox */}
        {currentTab === 'sandbox' && (
          <div className="h-full">
            <RawSandboxView />
          </div>
        )}
      </main>
    </div>
  );
}
