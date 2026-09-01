import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { pathologyService, PathologyOrderDto } from '../services/pathologyService';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, FileCheck2, ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, Calendar, Printer, Hotel, Stethoscope, MoreVertical, PackageCheck, PenLine, Ban, Loader2, Flame, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store';
import { PathologyDashboardOverview, PathologyDateMode } from './PathologyDashboardOverview';
import { getPathologyStatusColor, getPathologySourceColor } from '../utils/pathologyStatusColor';
import { format } from 'date-fns';
import { PathologyNewOrderModal } from './PathologyNewOrderModal';
import { PathologyTokenPrintModal } from './PathologyTokenPrintModal';
import { formatTokenNumber } from '@/lib/utils';
import { toast } from 'sonner';

const SortableHeader = ({ column, label, sortColumn, sortDirection, onSort, align = 'left' }: any) => {
  const isSorted = sortColumn === column;
  return (
    <th className={`px-4 py-2.5 text-xs font-semibold ${align === 'center' ? 'text-center' : 'text-left'}`}>
      <button
        onClick={() => onSort(column)}
        className={`flex items-center gap-1 hover:text-foreground transition-colors ${align === 'center' ? 'mx-auto' : ''} ${isSorted ? 'text-foreground font-bold' : ''}`}
      >
        {label}
        {isSorted ? (
          sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-brand-500" /> : <ChevronDown className="h-3.5 w-3.5 text-brand-500" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
};

export const PathologyWorkspace: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PathologyOrderDto[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [tokenPrintOrder, setTokenPrintOrder] = useState<PathologyOrderDto | null>(null);

  // Quick actions -- Mark Sample Collected, Edit Notes, Cancel Order -- all reachable straight from
  // the dashboard row instead of requiring a trip into the order detail page first.
  const [collectingSampleOrderId, setCollectingSampleOrderId] = useState<string | null>(null);
  const [notesEditOrder, setNotesEditOrder] = useState<PathologyOrderDto | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [statDraft, setStatDraft] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PathologyOrderDto | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Date filter -- defaults to today only, so a tech opening the dashboard lands on today's
  // worklist first and switches to "All dates"/a range deliberately rather than scrolling past
  // days of backlog to find today's orders.
  const [dateMode, setDateMode] = useState<PathologyDateMode>('day');
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

  const [sortColumn, setSortColumn] = useState<keyof PathologyOrderDto | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof PathologyOrderDto) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedOrders = useMemo(() => {
    if (!sortColumn) return filteredOrders;
    return [...filteredOrders].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? 1 : -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aString = String(aVal).toLowerCase();
      const bString = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aString > bString ? 1 : -1;
      } else {
        return aString < bString ? 1 : -1;
      }
    });
  }, [filteredOrders, sortColumn, sortDirection]);

  // Small, fixed page size so the table never needs its own inner scrollbar -- the page itself
  // scrolls if needed, same "Showing A-B of N" + Prev/Next convention RevenueTab.tsx uses.
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / itemsPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedOrders.slice(start, start + itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedOrders, currentPage]);

  // Jump back to page 1 whenever the visible set changes shape, so a filter/date change never
  // strands the user on a now-empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilterTab, dateMode, dayDate, rangeStart, rangeEnd, sortColumn, sortDirection]);

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

  // The dashboard list doesn't carry per-line detail, so this fetches the order fresh, collects
  // every currently-PENDING line in one go (one draw usually covers every test on the order), and
  // gracefully no-ops with a toast if there's nothing left to collect.
  const handleMarkSampleCollected = async (order: PathologyOrderDto) => {
    if (!hospitalId) return;
    setCollectingSampleOrderId(order.orderId);
    try {
      const details = await pathologyService.getOrderById(hospitalId, order.orderId);
      const pendingLines = details.lines.filter(l => l.status === 'PENDING');
      if (pendingLines.length === 0) {
        toast.info('No pending samples to collect on this order');
        return;
      }
      // Sequential, not Promise.all: every line shares one PathologyOrder row (optimistic
      // concurrency via RowVersion), and concurrent collect-sample calls on the same order race
      // to flip its Status, throwing DbUpdateConcurrencyException on the loser.
      const results: boolean[] = [];
      for (const l of pendingLines) {
        results.push(await pathologyService.collectSample(hospitalId, order.orderId, l.orderLineId));
      }
      if (results.every(Boolean)) {
        toast.success(`Marked ${pendingLines.length} sample${pendingLines.length === 1 ? '' : 's'} collected`);
      } else {
        toast.error('Some samples could not be marked collected');
      }
      await fetchOrders();
    } catch (e) {
      toast.error('Could not mark samples collected');
    } finally {
      setCollectingSampleOrderId(null);
    }
  };

  const openEditNotes = (order: PathologyOrderDto) => {
    setNotesEditOrder(order);
    setNotesDraft(order.notes ?? '');
    setStatDraft(order.isStat);
  };

  const saveNotes = async () => {
    if (!hospitalId || !notesEditOrder) return;
    setIsSavingNotes(true);
    try {
      const success = await pathologyService.updateOrderNotes(hospitalId, notesEditOrder.orderId, notesDraft, statDraft);
      if (!success) {
        toast.error('Could not save changes');
        return;
      }
      toast.success('Order updated');
      setNotesEditOrder(null);
      await fetchOrders();
    } catch (e) {
      toast.error('Could not save changes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const confirmCancel = async () => {
    if (!hospitalId || !cancelTarget) return;
    setIsCancelling(true);
    try {
      const response = await pathologyService.cancelOrder(hospitalId, cancelTarget.orderId);
      if (!response.success) {
        toast.error('Could not cancel order', { description: response.message });
        return;
      }
      toast.success('Order cancelled');
      setCancelTarget(null);
      await fetchOrders();
    } catch (e) {
      toast.error('Could not cancel order');
    } finally {
      setIsCancelling(false);
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
          onClick={() => setIsNewOrderModalOpen(true)}
          disabled={!hospitalId}
          className="gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-md hover:shadow-lg transition-all px-6"
        >
          <Plus className="h-5 w-5" /> New Lab Order
        </Button>
      </div>
      <PathologyDashboardOverview kpis={kpis} />

      {/* Filter tabs + date scope, combined into one premium row -- was two separate rows before. */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-slate-200 rounded-2xl shadow-sm px-3 py-2">
        <div className="flex gap-1 overflow-x-auto">
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
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                activeFilterTab === tab.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full shadow-sm">
            <Calendar className="h-3 w-3" /> {scopeLabel}
          </span>
          <Select value={dateMode} onValueChange={(v) => setDateMode(v as PathologyDateMode)}>
            <SelectTrigger className="h-9 w-[130px] rounded-xl bg-white text-xs">
              <div className="flex items-center gap-1.5 min-w-0"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /><SelectValue /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="day">Single day</SelectItem>
              <SelectItem value="range">Date range</SelectItem>
            </SelectContent>
          </Select>
          {dateMode === 'day' && (
            <Input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} className="h-9 w-[150px] rounded-xl bg-white text-xs" />
          )}
          {dateMode === 'range' && (
            <div className="flex items-center gap-1.5">
              <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="h-9 w-[140px] rounded-xl bg-white text-xs" />
              <span className="text-xs text-slate-400 shrink-0">to</span>
              <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="h-9 w-[140px] rounded-xl bg-white text-xs" />
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-lg bg-card shadow-sm">
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
                <thead className="bg-muted/30 text-muted-foreground select-none">
                  <tr>
                    <SortableHeader column="orderNo" label="Order No" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="tokenNumber" label="Token" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="center" />
                    <SortableHeader column="patientName" label="Patient" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="orderDate" label="Order Date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="sourceType" label="Source" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <th className="px-4 py-2.5 text-xs font-semibold text-left">Tests</th>
                    <SortableHeader column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader column="reportsReadyCount" label="Reports" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="center" />
                    <th className="px-4 py-2.5 text-xs font-semibold text-center">Actions</th>
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
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {order.tokenNumber != null ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="font-bold tabular-nums text-brand-700">{formatTokenNumber(order.tokenNumber)}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setTokenPrintOrder(order); }}
                              className="text-slate-400 hover:text-brand-600 transition-colors"
                              title="Print token"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold">{order.patientName}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>{order.patientId}</span>
                          {order.patientAgeYears != null && <span>· {order.patientAgeYears}y</span>}
                          {order.patientMobile && <span>· {order.patientMobile}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(order.orderDate).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className={`gap-1 ${getPathologySourceColor(order.sourceType)}`}>
                          {order.sourceType === 'IPD' && <Hotel className="h-3 w-3" />}
                          {order.sourceType === 'OPD' && <Stethoscope className="h-3 w-3" />}
                          {order.sourceType ? order.sourceType.replace('_', '-') : 'Self-added'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {order.testNames.slice(0, 3).map((name, i) => (
                            <span key={`${name}-${i}`} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium whitespace-nowrap">
                              {name}
                            </span>
                          ))}
                          {order.testNames.length > 3 && (
                            <span className="text-[11px] text-muted-foreground">+{order.testNames.length - 3} more</span>
                          )}
                        </div>
                      </td>
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
                        {order.reportsReadyCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <FileCheck2 className="h-3.5 w-3.5" />
                            {order.reportsReadyCount}/{order.testCount} ready
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not generated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" disabled={collectingSampleOrderId === order.orderId}>
                              {collectingSampleOrderId === order.orderId ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={order.status === 'CANCELLED' || collectingSampleOrderId === order.orderId}
                              onClick={() => handleMarkSampleCollected(order)}
                            >
                              <PackageCheck className="h-4 w-4 mr-2" /> Mark Sample Collected
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={order.status === 'CANCELLED'} onClick={() => openEditNotes(order)}>
                              <PenLine className="h-4 w-4 mr-2" /> Edit Notes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={order.status === 'CANCELLED' || order.reportsReadyCount > 0}
                              onClick={() => setCancelTarget(order)}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Ban className="h-4 w-4 mr-2" /> Cancel Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <p>No orders found matching the current filters.</p>
          </div>
        )}
      </div>

      <PathologyNewOrderModal
        open={isNewOrderModalOpen}
        onOpenChange={setIsNewOrderModalOpen}
        onSuccess={fetchOrders}
      />

      <PathologyTokenPrintModal
        open={!!tokenPrintOrder}
        onOpenChange={(open) => { if (!open) setTokenPrintOrder(null); }}
        order={tokenPrintOrder}
      />

      <Sheet open={!!notesEditOrder} onOpenChange={(open) => { if (!open) setNotesEditOrder(null); }}>
        {notesEditOrder && (
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader className="text-left">
              <SheetTitle>Edit Order {notesEditOrder.orderNo}</SheetTitle>
              <SheetDescription>{notesEditOrder.patientName} · {notesEditOrder.patientId}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Clinical Notes</label>
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Additional remarks or clinical history..."
                  className="min-h-[120px]"
                />
              </div>
              <button
                type="button"
                onClick={() => setStatDraft(!statDraft)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                  statDraft ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flame className={`h-3.5 w-3.5 ${statDraft ? 'text-red-600' : 'text-slate-400'}`} /> STAT
              </button>
            </div>
            <SheetFooter className="mt-6">
              <Button variant="outline" onClick={() => setNotesEditOrder(null)}>Cancel</Button>
              <Button onClick={saveNotes} disabled={isSavingNotes}>
                {isSavingNotes ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                {isSavingNotes ? 'Saving...' : 'Save Changes'}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      <Sheet open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        {cancelTarget && (
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader className="text-left">
              <SheetTitle>Cancel Order {cancelTarget.orderNo}?</SheetTitle>
              <SheetDescription>{cancelTarget.patientName} · {cancelTarget.patientId}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                This cancels the whole order and voids any charges already billed for it. This can't be undone --
                if the tests are still needed, a new order will have to be placed.
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep Order</Button>
              <Button variant="destructive" onClick={confirmCancel} disabled={isCancelling}>
                {isCancelling ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Ban className="h-4 w-4 mr-1.5" />}
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
};
