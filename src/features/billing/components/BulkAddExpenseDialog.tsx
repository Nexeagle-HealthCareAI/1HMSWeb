import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ListPlus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { expenseService } from '../services/expenseService';

interface LineRow {
    amount: string;
    reason: string;
}

const emptyLine = (): LineRow => ({ amount: '', reason: '' });

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: string[];
    categoryLabel: (c: string) => string;
    paymentModes: string[];
    onSaved: () => void;
}

export const BulkAddExpenseDialog: React.FC<Props> = ({ open, onOpenChange, categories, categoryLabel, paymentModes, onSaved }) => {
    const [categoryCode, setCategoryCode] = useState(categories[0] ?? 'OTHER');
    const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [vendor, setVendor] = useState('');
    const [paymentMode, setPaymentMode] = useState(paymentModes[0] ?? 'CASH');
    const [lines, setLines] = useState<LineRow[]>([emptyLine(), emptyLine()]);
    const [saving, setSaving] = useState(false);

    const reset = () => {
        setCategoryCode(categories[0] ?? 'OTHER');
        setExpenseDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setVendor('');
        setPaymentMode(paymentModes[0] ?? 'CASH');
        setLines([emptyLine(), emptyLine()]);
    };

    const updateLine = (idx: number, patch: Partial<LineRow>) => {
        setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    };

    const validLines = lines.filter(l => parseFloat(l.amount) > 0);
    const total = validLines.reduce((s, l) => s + parseFloat(l.amount), 0);

    const save = async () => {
        if (validLines.length === 0) {
            toast({ title: 'Add at least one expense with an amount', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const res = await expenseService.bulkAdd({
                categoryCode,
                expenseDate,
                vendor: vendor.trim() || undefined,
                paymentMode,
                lines: validLines.map(l => ({ amount: parseFloat(l.amount), reason: l.reason.trim() || undefined })),
            });
            toast({ title: `${res.createdCount} expense(s) added` });
            onOpenChange(false);
            reset();
            onSaved();
        } catch (e: any) {
            toast({ title: 'Could not add expenses', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={o => { if (!saving) { onOpenChange(o); if (!o) reset(); } }}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl space-y-4 bg-white dark:bg-zinc-950">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                        <ListPlus className="h-5 w-5 text-rose-600" /> Add Multiple Expenses
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Log several expenses under one category in one go — each line gets its own amount and reason.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <Label className="text-xs font-semibold">Category</Label>
                        <Select value={categoryCode} onValueChange={setCategoryCode}>
                            <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs font-semibold">Date</Label>
                        <Input type="datetime-local" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="h-10 mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold">Payment Mode</Label>
                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                            <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{paymentModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-3">
                        <Label className="text-xs font-semibold">Vendor (optional, shared by all lines below)</Label>
                        <Input value={vendor} onChange={e => setVendor(e.target.value)} className="h-10 mt-1" placeholder="Payee / supplier" />
                    </div>
                </div>

                <div className="space-y-2.5">
                    <Label className="text-xs font-semibold">Expenses</Label>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {lines.map((line, idx) => (
                            <div key={idx} className="flex gap-2 items-start p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/20">
                                <div className="w-28 shrink-0">
                                    <Input
                                        type="number" min={0} step="0.01" placeholder="Amount"
                                        value={line.amount}
                                        onChange={e => updateLine(idx, { amount: e.target.value })}
                                        className="h-10 font-mono"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Input
                                        placeholder="Reason (e.g. lunch for staff)"
                                        value={line.reason}
                                        onChange={e => updateLine(idx, { reason: e.target.value })}
                                        className="h-10"
                                    />
                                </div>
                                {lines.length > 1 && (
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:bg-rose-50 shrink-0" onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold" onClick={() => setLines(prev => [...prev, emptyLine()])}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                    </Button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-850">
                    <div className="text-sm text-slate-600 dark:text-zinc-400">
                        <span className="font-semibold">{validLines.length}</span> expense(s) · Total{' '}
                        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">₹{total.toLocaleString('en-IN')}</span>
                    </div>
                    <Button onClick={save} disabled={saving} className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold px-6">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListPlus className="h-4 w-4 mr-2" />}
                        Add {validLines.length > 0 ? validLines.length : ''} Expense{validLines.length === 1 ? '' : 's'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
