import React, { useCallback, useEffect, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuthStore } from '@/store';
import {
  pharmacyReturnApi, SalesTrendPoint, AbcAnalysisRow, GstLiabilityRow, ExpiryLossPreventedResponse,
} from '../services/pharmacyReturnApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BarChart3, TrendingUp, IndianRupee, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CLASS_BADGE: Record<string, string> = {
  A: 'bg-green-100 text-green-700 border-green-200',
  B: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  C: 'bg-slate-100 text-slate-600 border-slate-200',
};

const toDateInputValue = (d: Date) => d.toISOString().slice(0, 10);

export const PharmacyAnalyticsDashboard: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [groupBy, setGroupBy] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');

  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [abc, setAbc] = useState<AbcAnalysisRow[]>([]);
  const [gst, setGst] = useState<{ rows: GstLiabilityRow[]; grandTotalTax: number }>({ rows: [], grandTotalTax: 0 });
  const [expiryLoss, setExpiryLoss] = useState<ExpiryLossPreventedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    setIsLoading(true);
    try {
      const [trend, abcRows, gstData, expiryData] = await Promise.all([
        pharmacyReturnApi.getSalesTrend(from, to, groupBy, hospitalId),
        pharmacyReturnApi.getAbcAnalysis(from, to, hospitalId),
        pharmacyReturnApi.getGstLiability(from, to, hospitalId),
        pharmacyReturnApi.getExpiryLossPrevented(from, to, hospitalId),
      ]);
      setSalesTrend(trend);
      setAbc(abcRows);
      setGst(gstData);
      setExpiryLoss(expiryData);
    } catch {
      toast.error('Could not load pharmacy analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, fromDate, toDate, groupBy]);

  useEffect(() => { load(); }, [load]);

  const totalSales = salesTrend.reduce((sum, p) => sum + p.totalSales, 0);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-600" />
          <h2 className="font-semibold text-lg">Pharmacy Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" className="w-40 h-9" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" className="w-40 h-9" value={toDate} onChange={e => setToDate(e.target.value)} />
          <Select value={groupBy} onValueChange={v => setGroupBy(v as 'DAY' | 'WEEK' | 'MONTH')}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY">Daily</SelectItem>
              <SelectItem value="WEEK">Weekly</SelectItem>
              <SelectItem value="MONTH">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500"><IndianRupee className="h-3.5 w-3.5" />Total Sales</div>
              <div className="text-xl font-bold mt-1">{inr(totalSales)}</div>
            </div>
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500"><TrendingUp className="h-3.5 w-3.5" />GST Liability</div>
              <div className="text-xl font-bold mt-1">{inr(gst.grandTotalTax)}</div>
            </div>
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500"><ShieldCheck className="h-3.5 w-3.5" />Recovered via RTV</div>
              <div className="text-xl font-bold mt-1 text-green-600">{inr(expiryLoss?.recoveredValue ?? 0)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{expiryLoss?.rtvNoteCount ?? 0} notes in range</div>
            </div>
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500"><ShieldCheck className="h-3.5 w-3.5" />At-Risk Stock (now)</div>
              <div className="text-xl font-bold mt-1 text-red-600">{inr(expiryLoss?.atRiskValue ?? 0)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{expiryLoss?.atRiskBatchCount ?? 0} batches expiring &lt;90d</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-3">Sales Trend</h3>
            <div className="h-64">
              {salesTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No pharmacy sales in this range.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ left: 8, right: 8 }}>
                    <defs>
                      <linearGradient id="pharmSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v: number) => inr(v)} />
                    <Area type="monotone" dataKey="totalSales" stroke="#7c3aed" fill="url(#pharmSales)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 mb-3">ABC Analysis</h3>
              {abc.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No data in this range.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader className="bg-gray-50 sticky top-0">
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Cum. %</TableHead>
                        <TableHead className="text-center">Class</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {abc.map(row => (
                        <TableRow key={row.inventoryItemId ?? row.itemName}>
                          <TableCell className="font-medium text-sm">{row.itemName}</TableCell>
                          <TableCell className="text-right text-sm">{inr(row.totalValue)}</TableCell>
                          <TableCell className="text-right text-sm">{row.cumulativePercent.toFixed(1)}%</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={CLASS_BADGE[row.class]}>{row.class}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 mb-3">GST Liability by HSN / Rate</h3>
              {gst.rows.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No data in this range.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader className="bg-gray-50 sticky top-0">
                      <TableRow>
                        <TableHead>HSN</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gst.rows.map((row, idx) => (
                        <TableRow key={`${row.hsnSacCode ?? 'none'}-${row.gstRate ?? 0}-${idx}`}>
                          <TableCell className="text-sm">{row.hsnSacCode ?? '—'}</TableCell>
                          <TableCell className="text-right text-sm">{row.gstRate != null ? `${row.gstRate}%` : '—'}</TableCell>
                          <TableCell className="text-right text-sm">{inr(row.taxableAmount)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{inr(row.totalTax)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
