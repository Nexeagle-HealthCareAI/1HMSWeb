import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store';
import { pharmacyApi, PharmacyBillRow } from '../services/pharmacyApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Receipt, IndianRupee, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type DateMode = 'ALL' | 'DAY' | 'RANGE';

const toDateInputValue = (d: Date) => d.toISOString().slice(0, 10);

const MODULE_LABEL: Record<string, string> = {
  PHARMACY_COUNTER: 'Counter',
  PHARMACY_IPD: 'IPD',
};

export const PharmacyBillingHistory: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);

  const [dateMode, setDateMode] = useState<DateMode>('DAY');
  const [dayDate, setDayDate] = useState(() => toDateInputValue(new Date()));
  const [rangeStart, setRangeStart] = useState(() => toDateInputValue(new Date()));
  const [rangeEnd, setRangeEnd] = useState(() => toDateInputValue(new Date()));

  const [bills, setBills] = useState<PharmacyBillRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { fromDate, toDate } = useMemo(() => {
    if (dateMode === 'ALL') return { fromDate: undefined, toDate: undefined };
    if (dateMode === 'DAY') {
      const d = new Date(dayDate);
      return { fromDate: d, toDate: d };
    }
    return { fromDate: new Date(rangeStart), toDate: new Date(rangeEnd) };
  }, [dateMode, dayDate, rangeStart, rangeEnd]);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    try {
      const result = await pharmacyApi.getBillingHistory(fromDate, toDate, hospitalId);
      setBills(result.bills);
      setTotalAmount(result.totalAmount);
    } catch {
      toast.error('Could not load the pharmacy billing history.');
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-brand-600" />
          <h2 className="font-semibold text-lg">Pharmacy Billing History</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateMode} onValueChange={v => setDateMode(v as DateMode)}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY">Single Day</SelectItem>
              <SelectItem value="RANGE">Date Range</SelectItem>
              <SelectItem value="ALL">All Time</SelectItem>
            </SelectContent>
          </Select>
          {dateMode === 'DAY' && (
            <Input type="date" className="w-40 h-9" value={dayDate} onChange={e => setDayDate(e.target.value)} />
          )}
          {dateMode === 'RANGE' && (
            <>
              <Input type="date" className="w-40 h-9" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" className="w-40 h-9" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500"><Receipt className="h-3.5 w-3.5" />Total Bills</div>
          <div className="text-xl font-bold mt-1">{bills.length}</div>
        </div>
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500"><IndianRupee className="h-3.5 w-3.5" />Total Billed</div>
          <div className="text-xl font-bold mt-1">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : bills.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No pharmacy bills in this range.</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Processed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map(b => (
                <TableRow key={b.invoiceId}>
                  <TableCell className="font-mono text-xs">{b.invoiceNo ?? '—'}</TableCell>
                  <TableCell className="text-sm">{new Date(b.invoiceDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{b.patientName ?? 'Walk-in'}</div>
                    {b.patientId && <div className="text-xs text-gray-500">{b.patientId}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                      {MODULE_LABEL[b.sourceModule] ?? b.sourceModule}
                    </Badge>
                  </TableCell>
                  <TableCell>{b.itemCount}</TableCell>
                  <TableCell>{b.totalQty}</TableCell>
                  <TableCell className="text-right font-medium">₹{b.netAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{b.paymentMode ?? '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{b.processedBy ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
