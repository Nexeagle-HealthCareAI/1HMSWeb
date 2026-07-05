import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, X, Loader2, RefreshCw, AlertCircle, Archive, Truck, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { vendorService, type VendorItem, type UpsertVendorInput } from '@/features/hospital/services/vendorService';

type EditingVendor = Partial<UpsertVendorInput> & { vendorId?: string };

type VendorErrors = { vendorCode?: string; vendorName?: string };
const validateVendor = (rec: EditingVendor | null): VendorErrors => {
    const e: VendorErrors = {};
    if (!rec) return e;
    if (!String(rec.vendorCode ?? '').trim()) e.vendorCode = 'Vendor code is required';
    if (!String(rec.vendorName ?? '').trim()) e.vendorName = 'Vendor name is required';
    return e;
};

export const VendorMaster: React.FC = () => {
    const [vendors, setVendors] = useState<VendorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<EditingVendor | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const loadVendors = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await vendorService.getVendors(undefined, true);
            setVendors(res);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load vendors');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadVendors(); }, [loadVendors]);

    const filteredVendors = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return vendors;
        return vendors.filter(v =>
            v.vendorName.toLowerCase().includes(q) ||
            v.vendorCode.toLowerCase().includes(q) ||
            (v.contactPerson ?? '').toLowerCase().includes(q));
    }, [vendors, searchTerm]);

    const handleOpenDrawer = (vendor: VendorItem | null = null) => {
        if (vendor) {
            setEditingVendor({
                vendorId: vendor.vendorId,
                vendorCode: vendor.vendorCode,
                vendorName: vendor.vendorName,
                contactPerson: vendor.contactPerson ?? undefined,
                phone: vendor.phone ?? undefined,
                email: vendor.email ?? undefined,
                address: vendor.address ?? undefined,
                gstNumber: vendor.gstNumber ?? undefined,
                drugLicenseNumber: vendor.drugLicenseNumber ?? undefined,
                paymentTermsDays: vendor.paymentTermsDays,
                isActive: vendor.isActive,
            });
        } else {
            setEditingVendor({ vendorCode: '', vendorName: '', paymentTermsDays: 0, isActive: true });
        }
        setIsDrawerOpen(true);
    };

    const formErrors = validateVendor(editingVendor);
    const isValid = Object.keys(formErrors).length === 0;

    const handleSave = async () => {
        const errs = validateVendor(editingVendor);
        const firstErr = errs.vendorCode || errs.vendorName;
        if (firstErr || !editingVendor) {
            toast({ title: 'Validation Error', description: firstErr, variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const res: any = await vendorService.upsertVendor({
                vendorId: editingVendor.vendorId,
                vendorCode: editingVendor.vendorCode!.trim(),
                vendorName: editingVendor.vendorName!.trim(),
                contactPerson: editingVendor.contactPerson,
                phone: editingVendor.phone,
                email: editingVendor.email,
                address: editingVendor.address,
                gstNumber: editingVendor.gstNumber,
                drugLicenseNumber: editingVendor.drugLicenseNumber,
                paymentTermsDays: Number(editingVendor.paymentTermsDays ?? 0),
                isActive: editingVendor.isActive ?? true,
            });
            if (res?.success === false) throw new Error(res.message ?? 'Could not save vendor');
            toast({ title: editingVendor.vendorId ? 'Vendor updated' : 'Vendor created', description: editingVendor.vendorName });
            setIsDrawerOpen(false);
            await loadVendors(true);
        } catch (e: any) {
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search vendor name, code, contact..." className="pl-9 bg-gray-50 dark:bg-slate-950" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => loadVendors(true)} disabled={refreshing || loading} className="gap-1.5">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> Add Vendor
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-slate-950/50">
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                    </div>
                )}
                {!loading && loadError && (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-600 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-semibold">{loadError}</p>
                        <Button size="sm" variant="outline" onClick={() => loadVendors(true)} className="mt-2"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
                    </div>
                )}
                {!loading && !loadError && (
                    filteredVendors.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {filteredVendors.map(v => (
                                <motion.div
                                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={v.vendorId}
                                    className={`relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col group transition-shadow hover:shadow-md ${!v.isActive ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                >
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                                                    <Truck className="h-4 w-4 text-gray-400 shrink-0" />
                                                    <span className="truncate">{v.vendorName}</span>
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate">{v.vendorCode} {v.contactPerson ? `• ${v.contactPerson}` : ''}</p>
                                            </div>
                                            {!v.isActive && <Badge variant="secondary" className="text-[10px] shrink-0">Inactive</Badge>}
                                        </div>
                                        <div className="space-y-1 mb-2">
                                            {v.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="h-3 w-3" /> {v.phone}</p>}
                                            {v.email && <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /> {v.email}</p>}
                                        </div>
                                        <div className="mt-auto flex items-end justify-between">
                                            <div className="flex flex-col">
                                                <div className="text-[10px] text-gray-400 uppercase font-semibold">Payment Terms</div>
                                                <div className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">{v.paymentTermsDays} days</div>
                                            </div>
                                            {v.drugLicenseNumber && <Badge variant="outline" className="text-[9px] font-bold">Drug Lic.</Badge>}
                                        </div>
                                    </div>
                                    <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-gray-100 dark:border-gray-800" onClick={() => handleOpenDrawer(v)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 text-gray-500 dark:text-gray-400">
                            <Archive className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">{vendors.length === 0 ? 'No vendors configured yet' : 'No vendors match your search'}</p>
                            <p className="text-sm mt-1 max-w-sm">{vendors.length === 0 ? 'Click "Add Vendor" to set up your first pharma distributor or supplier.' : 'Try a different search.'}</p>
                        </div>
                    )
                )}
            </div>

            <AnimatePresence>
                {isDrawerOpen && editingVendor && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]" onClick={() => setIsDrawerOpen(false)} />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col">
                            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-600 to-violet-600">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0"><Truck className="h-5 w-5 text-white" /></div>
                                    <h2 className="text-lg font-bold text-white leading-tight">{editingVendor.vendorId ? 'Edit Vendor' : 'Add Vendor'}</h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/15" onClick={() => setIsDrawerOpen(false)}><X className="h-5 w-5" /></Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Vendor Code <span className="text-red-500">*</span></Label>
                                        <Input className={formErrors.vendorCode ? 'border-red-500' : ''} value={editingVendor.vendorCode ?? ''} onChange={e => setEditingVendor(p => ({ ...p!, vendorCode: e.target.value }))} />
                                        {formErrors.vendorCode && <p className="text-[10px] text-red-500">{formErrors.vendorCode}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Vendor Name <span className="text-red-500">*</span></Label>
                                        <Input className={formErrors.vendorName ? 'border-red-500' : ''} value={editingVendor.vendorName ?? ''} onChange={e => setEditingVendor(p => ({ ...p!, vendorName: e.target.value }))} />
                                        {formErrors.vendorName && <p className="text-[10px] text-red-500">{formErrors.vendorName}</p>}
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Contact Person</Label>
                                        <Input value={editingVendor.contactPerson ?? ''} onChange={e => setEditingVendor(p => ({ ...p!, contactPerson: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Phone</Label>
                                        <Input value={editingVendor.phone ?? ''} onChange={e => setEditingVendor(p => ({ ...p!, phone: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Email</Label>
                                        <Input type="email" value={editingVendor.email ?? ''} onChange={e => setEditingVendor(p => ({ ...p!, email: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>GST Number</Label>
                                        <Input value={editingVendor.gstNumber ?? ''} onChange={e => setEditingVendor(p => ({ ...p!, gstNumber: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2">
                                        <Label>Address</Label>
                                        <Input value={editingVendor.address ?? ''} onChange={e => setEditingVendor(p => ({ ...p!, address: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Drug License No. <span className="text-xs text-muted-foreground font-normal">(Opt)</span></Label>
                                        <Input value={editingVendor.drugLicenseNumber ?? ''} onChange={e => setEditingVendor(p => ({ ...p!, drugLicenseNumber: e.target.value }))} />
                                    </div>
                                    <div className="grid gap-2 col-span-2 sm:col-span-1">
                                        <Label>Payment Terms (days)</Label>
                                        <Input type="number" min={0} value={editingVendor.paymentTermsDays ?? 0} onChange={e => setEditingVendor(p => ({ ...p!, paymentTermsDays: Number(e.target.value) }))} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50/50 dark:bg-slate-900/40">
                                    <div>
                                        <Label className="cursor-pointer font-semibold">Active</Label>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Inactive vendors are hidden from procurement pickers.</p>
                                    </div>
                                    <Switch checked={editingVendor.isActive ?? true} onCheckedChange={v => setEditingVendor(p => ({ ...p!, isActive: v }))} className="data-[state=checked]:bg-green-500" />
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                                <Button disabled={isSaving || !isValid} onClick={handleSave} className="bg-brand-600 hover:bg-brand-700 text-white">
                                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingVendor.vendorId ? 'Save' : 'Create Vendor')}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VendorMaster;
