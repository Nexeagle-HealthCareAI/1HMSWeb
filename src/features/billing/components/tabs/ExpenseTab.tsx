import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Wallet, TrendingDown, Building2, RefreshCw, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { expenseService, type ExpenseItem, type UpsertExpenseRequest } from '../../services/expenseService';
import { KpiStat } from '../KpiStat';
import { LoadingState, EmptyState, ErrorState } from '../StatePanel';
import { inr } from '../../utils/money';

const CATEGORIES = ['SALARIES', 'PHARMACY_PURCHASE', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'CONSUMABLES', 'RENT', 'OTHER'];
const CAT_LABEL = (c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
const MODES = ['CASH', 'UPI', 'BANK', 'CARD'];

const CATEGORY_TONE: Record<string, string> = {
    SALARIES: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PHARMACY_PURCHASE: 'bg-violet-50 text-violet-700 border-violet-200',
    UTILITIES: 'bg-amber-50 text-amber-700 border-amber-200',
    EQUIPMENT: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    MAINTENANCE: 'bg-teal-50 text-teal-700 border-teal-200',
    CONSUMABLES: 'bg-rose-50 text-rose-700 border-rose-200',
    RENT: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    OTHER: 'bg-slate-50 text-slate-600 border-slate-200',
};

type FormState = {
    expenseId?: string;
    expenseDate: string;
    categoryCode: string;
    vendor: string;
    description: string;
    amount: string;
    paymentMode: string;
    statusCode: string;
    referenceNo: string;
};

const emptyForm = (): FormState => ({
    expenseId: undefined,
    expenseDate: new Date().toISOString().slice(0, 10),
    categoryCode: 'OTHER',
    vendor: '',
    description: '',
    amount: '',
    paymentMode: 'CASH',
    statusCode: 'PAID',
    referenceNo: '',
});

export const ExpenseTab: React.FC = () => {
    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [summary, setSummary] = useState({ total: 0, pending: 0, categories: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await expenseService.list({ search: search.trim() || undefined, pageSize: 200 });
            setItems(res?.items ?? []);
            setSummary({ total: res?.totalAmount ?? 0, pending: res?.pendingAmount ?? 0, categories: res?.categoryCount ?? 0 });
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load expenses');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setForm(emptyForm()); setDialogOpen(true); };
    const openEdit = (e: ExpenseItem) => {
        setForm({
            expenseId: e.expenseId,
            expenseDate: (e.expenseDate ?? new Date().toISOString()).slice(0, 10),
            categoryCode: e.categoryCode || 'OTHER',
            vendor: e.vendor ?? '',
            description: e.description ?? '',
            amount: String(e.amount ?? ''),
            paymentMode: e.paymentMode ?? 'CASH',
            statusCode: e.statusCode ?? 'PAID',
            referenceNo: e.referenceNo ?? '',
        });
        setDialogOpen(true);
    };

    const save = async () => {
        const amount = parseFloat(form.amount || '0');
        if (!form.categoryCode) { toast({ title: 'Category required', variant: 'destructive' }); return; }
        if (!(amount > 0)) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
        setSaving(true);
        try {
            const req: UpsertExpenseRequest = {
                expenseId: form.expenseId,
                expenseDate: form.expenseDate,
                categoryCode: form.categoryCode,
                vendor: form.vendor.trim() || undefined,
                description: form.description.trim() || undefined,
                amount,
                paymentMode: form.paymentMode || undefined,
                statusCode: form.statusCode || undefined,
                referenceNo: form.referenceNo.trim() || undefined,
            };
            await expenseService.upsert(req);
            toast({ title: form.expenseId ? 'Expense updated' : 'Expense added' });
            setDialogOpen(false);
            load(true);
        } catch (e: any) {
            toast({ title: 'Could not save expense', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const doDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await expenseService.remove(deleteId);
            toast({ title: 'Expense deleted' });
            setDeleteId(null);
            load(true);
        } catch (e: any) {
            toast({ title: 'Could not delete', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiStat label="Total Expenses" amount={summary.total} format={inr} icon={<TrendingDown className="h-5 w-5 text-rose-600" />} tone="from-rose-50 to-orange-100/50 text-rose-900" />
                <KpiStat label="Pending Payment" amount={summary.pending} format={inr} icon={<Wallet className="h-5 w-5 text-amber-600" />} tone="from-amber-50 to-yellow-100/50 text-amber-900" />
                <KpiStat label="Categories" value={String(summary.categories)} icon={<Building2 className="h-5 w-5 text-indigo-600" />} tone="from-indigo-50 to-violet-100/50 text-indigo-900" />
            </div>

            <Card className="border-0 ring-1 ring-black/5 rounded-2xl flex flex-col flex-1 overflow-hidden bg-white shadow-lg shadow-rose-500/5">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search category, vendor…" className="pl-9 bg-white text-sm rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(true); }} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs rounded-xl" onClick={() => load(true)} disabled={refreshing || loading}>
                            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                        </Button>
                        <Button size="sm" className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white text-xs shadow-md shadow-rose-500/20" onClick={openAdd}>
                            <Plus className="h-3.5 w-3.5" /> Add Expense
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <LoadingState rows={5} />
                    ) : error ? (
                        <ErrorState message={error} onRetry={() => load(true)} />
                    ) : items.length === 0 ? (
                        <EmptyState icon={<TrendingDown className="h-6 w-6" />} title="No expenses recorded yet" hint="Click “Add Expense” to record your first one." />
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/80 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Category</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Vendor / Description</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Mode</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Amount</TableHead>
                                    <TableHead className="w-px" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map(e => (
                                    <TableRow key={e.expenseId} className="border-b border-slate-50 transition-colors hover:bg-rose-50/40 group">
                                        <TableCell className="text-slate-600 text-xs whitespace-nowrap tabular-nums">{format(new Date(e.expenseDate), 'dd MMM yy')}</TableCell>
                                        <TableCell><Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', CATEGORY_TONE[e.categoryCode] ?? 'bg-slate-50 text-slate-600 border-slate-200')}>{CAT_LABEL(e.categoryCode)}</Badge></TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-slate-800">{e.vendor || '—'}</div>
                                            {e.description && <div className="text-[10px] text-slate-500">{e.description}</div>}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono uppercase text-slate-500">{e.paymentMode || '—'}</TableCell>
                                        <TableCell><Badge variant="outline" className={cn('text-[10px] font-bold rounded-full', e.statusCode === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>{e.statusCode}</Badge></TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-800 tabular-nums">{inr(e.amount)}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap pr-2">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600" onClick={() => setDeleteId(e.expenseId)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>

            {/* Add / edit dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-600" /> {form.expenseId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold">Date</Label>
                            <Input type="date" value={form.expenseDate} onChange={(e) => setForm(f => ({ ...f, expenseDate: e.target.value }))} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Category</Label>
                            <Select value={form.categoryCode} onValueChange={(v) => setForm(f => ({ ...f, categoryCode: v }))}>
                                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CAT_LABEL(c)}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Amount (₹)</Label>
                            <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} className="h-9 mt-1 font-mono" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Vendor</Label>
                            <Input value={form.vendor} onChange={(e) => setForm(f => ({ ...f, vendor: e.target.value }))} className="h-9 mt-1" placeholder="Payee / supplier" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Payment Mode</Label>
                            <Select value={form.paymentMode} onValueChange={(v) => setForm(f => ({ ...f, paymentMode: v }))}>
                                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>{MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Status</Label>
                            <Select value={form.statusCode} onValueChange={(v) => setForm(f => ({ ...f, statusCode: v }))}>
                                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold">Reference #</Label>
                            <Input value={form.referenceNo} onChange={(e) => setForm(f => ({ ...f, referenceNo: e.target.value }))} className="h-9 mt-1 font-mono" placeholder="Bill / txn ref (optional)" />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold">Description</Label>
                            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-sm mt-1" placeholder="Optional notes" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={save} disabled={saving} className="bg-rose-600 hover:bg-rose-700">
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : (form.expenseId ? 'Update' : 'Add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                        <AlertDialogDescription>This removes the expense record permanently.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={doDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700">
                            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ExpenseTab;
