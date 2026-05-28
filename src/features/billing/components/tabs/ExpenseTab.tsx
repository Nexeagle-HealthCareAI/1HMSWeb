import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Wallet, TrendingDown, Building2, RefreshCw, AlertCircle, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { expenseService, type ExpenseItem, type UpsertExpenseRequest } from '../../services/expenseService';

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

const inr = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;

const KpiCard: React.FC<{ label: string; value: string; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
    <Card className={cn('border p-4 flex items-center gap-3', tone)}>
        <div className="h-10 w-10 rounded-xl bg-white/60 flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
            <p className="text-xl font-black truncate">{value}</p>
        </div>
    </Card>
);

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
                <KpiCard label="Total Expenses" value={inr(summary.total)} icon={<TrendingDown className="h-5 w-5 text-rose-600" />} tone="border-rose-100 bg-rose-50 text-rose-900" />
                <KpiCard label="Pending Payment" value={inr(summary.pending)} icon={<Wallet className="h-5 w-5 text-amber-600" />} tone="border-amber-100 bg-amber-50 text-amber-900" />
                <KpiCard label="Categories" value={String(summary.categories)} icon={<Building2 className="h-5 w-5 text-indigo-600" />} tone="border-indigo-100 bg-indigo-50 text-indigo-900" />
            </div>

            <Card className="border border-slate-200 flex flex-col flex-1 overflow-hidden bg-white">
                <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search category, vendor…" className="pl-9 bg-white text-sm" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(true); }} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs" onClick={() => load(true)} disabled={refreshing || loading}>
                            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                        </Button>
                        <Button size="sm" className="h-9 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs" onClick={openAdd}>
                            <Plus className="h-3.5 w-3.5" /> Add Expense
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white/50">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <TableRow className="border-none">
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Date</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Category</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Vendor / Description</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Mode</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Status</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">Amount</TableHead>
                                <TableHead className="w-px" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7} className="py-3"><Skeleton className="h-9 w-full" /></TableCell></TableRow>)
                            ) : error ? (
                                <TableRow><TableCell colSpan={7} className="text-center h-32 text-rose-600">
                                    <div className="flex flex-col items-center gap-2">
                                        <AlertCircle className="h-7 w-7" />
                                        <p className="text-xs uppercase font-semibold">{error}</p>
                                        <Button size="sm" variant="outline" onClick={() => load(true)} className="mt-1 h-7 text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
                                    </div>
                                </TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center h-32 text-slate-400 text-xs uppercase tracking-wider">No expenses recorded yet. Click "Add Expense".</TableCell></TableRow>
                            ) : items.map(e => (
                                <TableRow key={e.expenseId} className="border-b border-slate-100 hover:bg-rose-50/30 group">
                                    <TableCell className="text-slate-600 text-xs whitespace-nowrap">{format(new Date(e.expenseDate), 'dd MMM yy')}</TableCell>
                                    <TableCell><Badge variant="outline" className={cn('text-[10px] font-bold', CATEGORY_TONE[e.categoryCode] ?? 'bg-slate-50 text-slate-600 border-slate-200')}>{CAT_LABEL(e.categoryCode)}</Badge></TableCell>
                                    <TableCell>
                                        <div className="font-semibold text-slate-800">{e.vendor || '—'}</div>
                                        {e.description && <div className="text-[10px] text-slate-500">{e.description}</div>}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono uppercase text-slate-500">{e.paymentMode || '—'}</TableCell>
                                    <TableCell><Badge variant="outline" className={cn('text-[10px] font-bold', e.statusCode === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>{e.statusCode}</Badge></TableCell>
                                    <TableCell className="text-right font-mono font-semibold text-slate-800">{inr(e.amount)}</TableCell>
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
