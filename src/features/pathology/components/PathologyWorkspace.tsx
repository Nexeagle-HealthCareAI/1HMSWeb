import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { pathologyService, PathologyOrderDto } from '../services/pathologyService';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, FileCheck2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store';
import { PathologyDashboardOverview, PathologyDateMode } from './PathologyDashboardOverview';
import { getPathologyStatusColor } from '../utils/pathologyStatusColor';
import { format } from 'date-fns';

export const PathologyWorkspace: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PathologyOrderDto[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Date filter -- defaults to "all" (not "today", unlike RevenueTab's billing dashboard) since a
  // tech needs to see backlog like an older still-pending STAT order; narrowing to today shouldn't
  // hide orders that are otherwise always visible.
  const [dateMode, setDateMode] = useState<PathologyDateMode>('all');
  const [dayDate, setDayDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // IST calendar-day key (YYYY-MM-DD) for an order's date, for day/range comparison -- mirrors
  // RevenueTab.tsx's dayKey exactly (naive timestamps treated as UTC then shifted +5:30).
  const dayKey = (iso: string) => {
    if (!iso) return '';
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    const d = new Date(hasTz ? iso : `${iso}Z`);
    if (Number.isNaN(d.getTime())) return '';
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
  };

  const dateFilteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (dateMode === 'day' && dayDate) return dayKey(o.orderDate) === dayDate;
      if (dateMode === 'range' && (rangeStart || rangeEnd)) {
        const k = dayKey(o.orderDate);
        if (rangeStart && k < rangeStart) return false;
        if (rangeEnd && k > rangeEnd) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, dateMode, dayDate, rangeStart, rangeEnd]);

  const kpis = useMemo(() => ({
    total: dateFilteredOrders.length,
    stat: dateFilteredOrders.filter(o => o.isStat).length,
    pending: dateFilteredOrders.filter(o => o.status === 'PLACED').length,
    inProgress: dateFilteredOrders.filter(o => o.status === 'IN_PROGRESS').length,
    completed: dateFilteredOrders.filter(o => o.status === 'COMPLETED').length,
  }), [dateFilteredOrders]);

  const scopeLabel = useMemo(() => {
    if (dateMode === 'all') return 'All time';
    if (dateMode === 'range') return (rangeStart || rangeEnd) ? `${rangeStart || '…'} → ${rangeEnd || '…'}` : 'Date range';
    if (!dayDate) return 'Day';
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dayDate === todayKey ? 'Today' : format(new Date(dayDate), 'dd MMM yyyy');
  }, [dateMode, dayDate, rangeStart, rangeEnd]);

  // Worklist filter -- IPD orders show up here too (they're created from the IPD Clinical Order
  // Panel, not this dialog, since they need an active admission to bill against), this just filters
  // the date-scoped set above.
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'OPD' | 'IPD' | 'STAT' | 'COMPLETED'>('ALL');
  const filteredOrders = dateFilteredOrders.filter(o => {
    switch (activeFilterTab) {
      case 'OPD': return o.sourceType !== 'IPD';
      case 'IPD': return o.sourceType === 'IPD';
      case 'STAT': return o.isStat;
      case 'COMPLETED': return o.status === 'COMPLETED';
      default: return true;
    }
  });

  // Small, fixed page size so the table never needs its own inner scrollbar -- the page itself
  // scrolls if needed, same "Showing A-B of N" + Prev/Next convention RevenueTab.tsx uses.
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders, currentPage]);

  // Jump back to page 1 whenever the visible set changes shape, so a filter/date change never
  // strands the user on a now-empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilterTab, dateMode, dayDate, rangeStart, rangeEnd]);

  useEffect(() => {
    if (hospitalId) fetchOrders();
  }, [hospitalId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrders = async () => {
    if (!hospitalId) return;
    setIsLoadingOrders(true);
    try {
      const data = await pathologyService.getOrders(hospitalId);
      setOrders(data);
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Orders Dashboard</h2>
          <p className="text-sm text-muted-foreground">Every order at this lab -- OPD, IPD, walk-in, and self-added.</p>
        </div>
        <Button
          size="lg"
          onClick={() => navigate('/pathology/orders/new')}
          disabled={!hospitalId}
          className="gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-md hover:shadow-lg transition-all px-6"
        >
          <Plus className="h-5 w-5" /> New Lab Order
        </Button>
      </div>
      <PathologyDashboardOverview
        kpis={kpis}
        scopeLabel={scopeLabel}
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        dayDate={dayDate}
        onDayDateChange={setDayDate}
        rangeStart={rangeStart}
        onRangeStartChange={setRangeStart}
        rangeEnd={rangeEnd}
        onRangeEndChange={setRangeEnd}
      />
      <div className="border rounded-lg bg-card">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold text-lg">Orders</h2>
        </div>
        <div className="flex gap-1 px-2 pt-2 pb-1 border-b overflow-x-auto">
          {([
            { key: 'ALL', label: 'All' },
            { key: 'OPD', label: 'OPD' },
            { key: 'IPD', label: 'IPD' },
            { key: 'STAT', label: 'STAT' },
            { key: 'COMPLETED', label: 'Completed' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilterTab(tab.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeFilterTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isLoadingOrders ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-md" />
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5 text-xs">Order No</th>
                    <th className="text-left font-semibold px-4 py-2.5 text-xs">Patient</th>
                    <th className="text-left font-semibold px-4 py-2.5 text-xs">Order Date</th>
                    <th className="text-left font-semibold px-4 py-2.5 text-xs">Source</th>
                    <th className="text-center font-semibold px-4 py-2.5 text-xs">Tests</th>
                    <th className="text-left font-semibold px-4 py-2.5 text-xs">Status</th>
                    <th className="text-left font-semibold px-4 py-2.5 text-xs">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.orderId}
                      onClick={() => navigate(`/pathology/orders/${order.orderId}`)}
                      className={`border-t cursor-pointer hover:bg-muted/40 transition-colors ${
                        order.isStat ? 'border-l-4 border-l-red-500' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{order.orderNo}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{order.patientName}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(order.orderDate).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.sourceType ? order.sourceType.replace('_', '-') : '—'}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{order.testCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {order.isStat && (
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">STAT</Badge>
                          )}
                          <Badge variant="outline" className={getPathologyStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.reportPdfBlobPath ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(order.reportPdfBlobPath!, '_blank'); }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                          >
                            <FileCheck2 className="h-3.5 w-3.5" />
                            {order.reportGeneratedAt ? new Date(order.reportGeneratedAt).toLocaleDateString() : 'View'}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not generated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t text-xs text-muted-foreground">
              <div className="truncate">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-2 font-bold bg-white border rounded-lg tabular-nums whitespace-nowrap">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No orders in this view.
          </div>
        )}
      </div>
    </div>
  );
};

