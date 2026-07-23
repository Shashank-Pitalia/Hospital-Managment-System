import React, { useEffect, useState, useCallback } from 'react';
import { fetchDashboardMetrics, DashboardMetrics } from '../../api/dashboard.api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardScreenProps {
  authToken?: string;
  token?: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ authToken, token }) => {
  const activeToken = authToken || token || '';
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardMetrics(activeToken);
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [activeToken]);

  useEffect(() => {
    loadMetrics();

    if (!autoRefresh) return;
    // Auto-refresh every 5 minutes (300,000 ms) per NFR-PERF target
    const interval = setInterval(() => {
      loadMetrics();
    }, 300000);

    return () => clearInterval(interval);
  }, [loadMetrics, autoRefresh]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>📊</span> ESIC Executive Admin Dashboard & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time aggregate analytics across OPD, IPD, Inventory, Procurement & Billing • Zero
            write side effects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-bold text-gray-400 block uppercase">
              Data Freshness
            </span>
            <span className="text-xs font-semibold text-gray-700">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Updating...'}
            </span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              autoRefresh
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {autoRefresh ? '🔄 Auto 5m On' : '⏸ Auto Off'}
          </button>
          <button
            onClick={loadMetrics}
            disabled={loading}
            className="px-3.5 py-2 bg-esic-primary hover:bg-esic-primary-dark text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            ⚡ Refresh Metrics
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 text-gray-500">
          Loading live aggregate metrics...
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-red-50 text-red-600 rounded-xl border border-red-200">
          ❌ {error}
        </div>
      ) : metrics ? (
        <>
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                OPD Visits Today
              </span>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {metrics.opd.totalVisits}
              </div>
              <div className="text-xs text-amber-600 font-semibold mt-0.5">
                ⏳ {metrics.opd.waitingQueue} in queue
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Bed Occupancy Rate
              </span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {metrics.ipd.bedOccupancyRate}%
              </div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">
                {metrics.ipd.occupiedBeds} / {metrics.ipd.totalBeds} beds occupied
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Low Stock Alerts
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {metrics.inventory.lowStockAlerts}
              </div>
              <div className="text-xs text-red-600 font-semibold mt-0.5">
                ⚠️ {metrics.inventory.quarantinedBatches} quarantined
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Pending Requisitions
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {metrics.procurement.pendingRequisitions}
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                ✅ {metrics.procurement.approvedRequisitions} approved
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Billing Ledger
              </span>
              <div className="text-2xl font-black text-purple-700 mt-1">
                {metrics.billing.totalTransactions}
              </div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">
                💳 {metrics.billing.paidTransactions} paid purchases
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IPD Category Split Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center justify-between">
                <span>🏨 Admissions by Employee Category</span>
                <span className="text-xs font-semibold text-indigo-600">Active IPD Admissions</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.ipd.categorySplit}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Expiry Breakdown Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center justify-between">
                <span>⏰ Pharmacy Batch Expiry Risk Profile</span>
                <span className="text-xs font-semibold text-amber-600">FEFO Automation Engine</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Expiring 90d', count: metrics.inventory.expiring90Days },
                      { name: 'Expiring 30d', count: metrics.inventory.expiring30Days },
                      { name: 'Quarantined', count: metrics.inventory.quarantinedBatches },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Permanent vs Contractual Pie Chart */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-800 text-sm">
                🛡️ Permanent vs Contractual Benefit Utilization
              </h3>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'Permanent (Free/Covered)',
                          value: metrics.billing.permanentUtilizationPct,
                        },
                        {
                          name: 'Contractual (Paid Purchase)',
                          value: metrics.billing.contractualUtilizationPct,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${(name || '').split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#8B5CF6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Procurement Status Widget */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-800 text-sm">
                🚚 Procurement & Supply Chain Status
              </h3>
              <div className="space-y-2.5 text-xs pt-2">
                <div className="flex justify-between items-center p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="font-semibold text-amber-900">Pending Requisitions</span>
                  <span className="font-bold text-amber-700 text-sm">
                    {metrics.procurement.pendingRequisitions}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="font-semibold text-emerald-900">Approved Requisitions</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {metrics.procurement.approvedRequisitions}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="font-semibold text-blue-900">Open Purchase Orders</span>
                  <span className="font-bold text-blue-700 text-sm">
                    {metrics.procurement.openPurchaseOrders}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Exception Feed */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center justify-between">
                <span>🔐 Dispensing Audit Feed</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-bold">
                  {metrics.auditExceptions.count} Events
                </span>
              </h3>
              <div className="space-y-2 text-xs overflow-y-auto max-h-48 pt-1">
                {(metrics.auditExceptions.recentExceptions || []).map((exc) => (
                  <div key={exc.id} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-bold text-esic-primary mr-1">[{exc.action}]</span>
                    <span className="text-gray-700">{exc.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
