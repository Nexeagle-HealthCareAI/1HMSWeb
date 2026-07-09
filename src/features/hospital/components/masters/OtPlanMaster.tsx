import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Pencil, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { otPlanApi, OTPlanItem, RoomCategory, IcuLevel } from '@/features/hospital/services/otPlanApi';
import { departmentApi, Department } from '@/features/hospital/services/departmentApi';
import { packageTypeApi, PackageTypeItem } from '@/features/hospital/services/packageTypeApi';
import { PackageTypePicker } from '@/features/hospital/components/masters/PackageTypePicker';
import { useAuthStore } from '@/store/authStore';

const ROOM_CATEGORIES: RoomCategory[] = ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE'];
const ICU_LEVELS: IcuLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

type EditingPlan = Partial<OTPlanItem>;
type EditingPackageType = Partial<PackageTypeItem> & { componentsText?: string };

export const OtPlanMaster: React.FC = () => {
    const hospitalId = useAuthStore(s => s.getHospitalId?.() || '');

    const [activeTab, setActiveTab] = useState<'PLANS' | 'PACKAGE_TYPES'>('PLANS');

    const [plans, setPlans] = useState<OTPlanItem[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
    const [filterActive, setFilterActive] = useState<string>('ALL');

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [packageTypes, setPackageTypes] = useState<PackageTypeItem[]>([]);
    const [loadingPackageTypes, setLoadingPackageTypes] = useState(true);
    const [pkgLoadError, setPkgLoadError] = useState<string | null>(null);
    const [isPkgDrawerOpen, setIsPkgDrawerOpen] = useState(false);
    const [editingPkg, setEditingPkg] = useState<EditingPackageType | null>(null);
    const [isPkgSaving, setIsPkgSaving] = useState(false);
    const [isPkgSuccess, setIsPkgSuccess] = useState(false);

    const loadDepartments = useCallback(async () => {
        if (!hospitalId) return;
        try {
            const res = await departmentApi.getDepartmentsByHospitalId(hospitalId);
            setDepartments(res?.departments ?? []);
        } catch {
            setDepartments([]);
        }
    }, [hospitalId]);

    const loadPlans = useCallback(async (silent = false) => {
        if (!hospitalId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setLoadError(null);
        try {
            const res = await otPlanApi.list({ hospitalId, includeInactive: true });
            setPlans(res?.plans ?? []);
        } catch (e: any) {
            setLoadError(e?.message ?? 'Failed to load OT Plans');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [hospitalId]);

    const loadPackageTypes = useCallback(async (silent = false) => {
        if (!hospitalId) return;
        if (!silent) setLoadingPackageTypes(true);
        setPkgLoadError(null);
        try {
            const res = await packageTypeApi.list({ hospitalId, includeInactive: true });
            setPackageTypes(res?.packageTypes ?? []);
        } catch (e: any) {
            setPkgLoadError(e?.message ?? 'Failed to load Package Types');
        } finally {
            setLoadingPackageTypes(false);
        }
    }, [hospitalId]);

    useEffect(() => { loadDepartments(); }, [loadDepartments]);
    useEffect(() => { loadPlans(); }, [loadPlans]);
    useEffect(() => { loadPackageTypes(); }, [loadPackageTypes]);

    const filteredPlans = useMemo(() => {
        return plans.filter(p => {
            const matchesSearch = p.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.procedureName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDepartment = filterDepartment === 'ALL' ||
                (filterDepartment === 'NONE' ? !p.departmentId : p.departmentId === filterDepartment);
            const matchesActive = filterActive === 'ALL' ||
                (filterActive === 'ACTIVE' && p.isActive) ||
                (filterActive === 'INACTIVE' && !p.isActive);
            return matchesSearch && matchesDepartment && matchesActive;
        }).sort((a, b) => a.displayOrder - b.displayOrder || a.planName.localeCompare(b.planName));
    }, [plans, searchTerm, filterDepartment, filterActive]);

    const handleOpenDrawer = (plan: OTPlanItem | null = null) => {
        setEditingPlan(plan ? { ...plan } : {
            planName: '', procedureName: '', departmentId: null, packageTypeId: null,
            defaultRoomCategory: null, suggestedIcuLevel: null,
            isActive: true, displayOrder: (plans.length + 1) * 10,
        });
        setIsDrawerOpen(true);
    };

    const handleSaveDrawer = async () => {
        if (!editingPlan?.planName?.trim() || !editingPlan?.procedureName?.trim()) {
            toast({ title: 'Validation Error', description: 'Plan Name and Procedure Name are required.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            const res = await otPlanApi.upsert({
                otPlanId: editingPlan.otPlanId,
                hospitalId,
                departmentId: editingPlan.departmentId || null,
                packageTypeId: editingPlan.packageTypeId || null,
                planName: editingPlan.planName.trim(),
                procedureName: editingPlan.procedureName.trim(),
                defaultRoomCategory: editingPlan.defaultRoomCategory || null,
                suggestedIcuLevel: editingPlan.suggestedIcuLevel || null,
                isActive: editingPlan.isActive ?? true,
                displayOrder: editingPlan.displayOrder ?? 0,
            });
            if (!res?.success) throw new Error(res?.message ?? 'Could not save');

            setIsSaving(false);
            setIsSuccess(true);
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.8 }, colors: ['#3b82f6', '#10b981', '#8b5cf6'], ticks: 200 });
            toast({ title: 'Success', description: `OT Plan ${editingPlan.otPlanId ? 'updated' : 'created'} successfully.` });

            setTimeout(() => {
                setIsSuccess(false);
                setIsDrawerOpen(false);
                setEditingPlan(null);
            }, 900);
            await loadPlans(true);
        } catch (e: any) {
            setIsSaving(false);
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    const handleToggleActive = async (plan: OTPlanItem) => {
        const next = !plan.isActive;
        setPlans(prev => prev.map(p => p.otPlanId === plan.otPlanId ? { ...p, isActive: next } : p));
        try {
            const res = await otPlanApi.upsert({
                otPlanId: plan.otPlanId, hospitalId,
                departmentId: plan.departmentId || null,
                packageTypeId: plan.packageTypeId || null,
                planName: plan.planName, procedureName: plan.procedureName,
                defaultRoomCategory: plan.defaultRoomCategory || null,
                suggestedIcuLevel: plan.suggestedIcuLevel || null,
                isActive: next, displayOrder: plan.displayOrder,
            });
            if (!res?.success) throw new Error(res?.message ?? 'Could not update');
        } catch (e: any) {
            setPlans(prev => prev.map(p => p.otPlanId === plan.otPlanId ? { ...p, isActive: !next } : p));
            toast({ title: 'Could not update status', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    const handleOpenPkgDrawer = (pkg: PackageTypeItem | null = null) => {
        setEditingPkg(pkg ? { ...pkg, componentsText: pkg.components?.join(', ') ?? '' } : {
            name: '', price: null, componentsText: '', isActive: true,
        });
        setIsPkgDrawerOpen(true);
    };

    const handleSavePkgDrawer = async () => {
        if (!editingPkg?.name?.trim()) {
            toast({ title: 'Validation Error', description: 'Name is required.', variant: 'destructive' });
            return;
        }

        setIsPkgSaving(true);
        try {
            const components = (editingPkg.componentsText ?? '').split(',').map(c => c.trim()).filter(Boolean);
            const res = await packageTypeApi.upsert({
                packageTypeId: editingPkg.packageTypeId,
                hospitalId,
                name: editingPkg.name.trim(),
                price: editingPkg.price ?? null,
                components,
                isActive: editingPkg.isActive ?? true,
            });
            if (!res?.success) throw new Error(res?.message ?? 'Could not save');

            setIsPkgSaving(false);
            setIsPkgSuccess(true);
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.8 }, colors: ['#3b82f6', '#10b981', '#8b5cf6'], ticks: 200 });
            toast({ title: 'Success', description: `Package Type ${editingPkg.packageTypeId ? 'updated' : 'created'} successfully.` });

            setTimeout(() => {
                setIsPkgSuccess(false);
                setIsPkgDrawerOpen(false);
                setEditingPkg(null);
            }, 900);
            await loadPackageTypes(true);
        } catch (e: any) {
            setIsPkgSaving(false);
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    const handleTogglePkgActive = async (pkg: PackageTypeItem) => {
        const next = !pkg.isActive;
        setPackageTypes(prev => prev.map(p => p.packageTypeId === pkg.packageTypeId ? { ...p, isActive: next } : p));
        try {
            const res = await packageTypeApi.upsert({
                packageTypeId: pkg.packageTypeId, hospitalId,
                name: pkg.name, price: pkg.price ?? null,
                components: pkg.components, isActive: next,
            });
            if (!res?.success) throw new Error(res?.message ?? 'Could not update');
        } catch (e: any) {
            setPackageTypes(prev => prev.map(p => p.packageTypeId === pkg.packageTypeId ? { ...p, isActive: !next } : p));
            toast({ title: 'Could not update status', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 font-sans relative overflow-hidden">
            {/* TAB SWITCHER */}
            <div className="flex gap-1 px-4 pt-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <button
                    onClick={() => setActiveTab('PLANS')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'PLANS'
                        ? 'bg-white dark:bg-slate-950 text-brand-600 dark:text-brand-400 border border-b-0 border-gray-100 dark:border-gray-800'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                >
                    Plans
                </button>
                <button
                    onClick={() => setActiveTab('PACKAGE_TYPES')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'PACKAGE_TYPES'
                        ? 'bg-white dark:bg-slate-950 text-brand-600 dark:text-brand-400 border border-b-0 border-gray-100 dark:border-gray-800'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                >
                    Package Types
                </button>
            </div>

            {activeTab === 'PLANS' && (
            <>
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search plans..."
                            className="pl-9 bg-white dark:bg-slate-900 shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 text-sm overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                            <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 shadow-sm h-10">
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Departments</SelectItem>
                                <SelectItem value="NONE">General (no department)</SelectItem>
                                {departments.map(d => <SelectItem key={d.departmentID} value={d.departmentID}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterActive} onValueChange={setFilterActive}>
                            <SelectTrigger className="w-[110px] bg-white dark:bg-slate-900 shadow-sm h-10">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button variant="outline" size="sm" onClick={() => loadPlans(true)} disabled={refreshing || loading} className="gap-1.5 bg-white dark:bg-slate-900 shadow-sm text-gray-700 dark:text-gray-300">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> New OT Plan
                    </Button>
                </div>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto p-4 hide-scrollbar relative">
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50/80 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Plan Name</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Department</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Procedure</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Default Room</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">ICU</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-center">Active</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading && Array.from({ length: 4 }).map((_, i) => (
                                <tr key={`sk-${i}`}>
                                    <td colSpan={7} className="px-4 py-3"><Skeleton className="h-9 w-full" /></td>
                                </tr>
                            ))}
                            {!loading && loadError && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-rose-600">
                                            <AlertCircle className="h-8 w-8" />
                                            <p className="font-semibold">{loadError}</p>
                                            <Button size="sm" variant="outline" onClick={() => loadPlans(true)} className="mt-2 h-7 text-xs">
                                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && !loadError && filteredPlans.map(plan => (
                                <motion.tr
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={plan.otPlanId}
                                    className="hover:bg-brand-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{plan.planName}</td>
                                    <td className="px-4 py-3">
                                        {plan.departmentName ? (
                                            <Badge variant="outline" className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-semibold border-gray-200 dark:border-gray-700">
                                                {plan.departmentName}
                                            </Badge>
                                        ) : <span className="text-gray-300 dark:text-gray-600">General</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{plan.procedureName}</td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{plan.defaultRoomCategory?.replace('_', ' ') ?? '—'}</td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{plan.suggestedIcuLevel?.replace('_', ' ') ?? '—'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <Switch
                                            checked={plan.isActive}
                                            onCheckedChange={() => handleToggleActive(plan)}
                                            className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800" onClick={() => handleOpenDrawer(plan)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </motion.tr>
                            ))}
                            {!loading && !loadError && filteredPlans.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="font-medium text-base">{plans.length === 0 ? 'No OT Plans configured yet' : 'No plans match your filters'}</p>
                                            <p className="text-sm">{plans.length === 0 ? 'Click "New OT Plan" to add your first procedure template.' : 'Try tweaking your search or filters.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT DRAWER: CREATE/EDIT */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {editingPlan?.otPlanId ? 'Edit OT Plan' : 'New OT Plan'}
                                </h2>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid gap-2">
                                    <Label>Plan Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. PCNL Plan"
                                        value={editingPlan?.planName || ''}
                                        onChange={e => setEditingPlan(p => ({ ...p!, planName: e.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Department</Label>
                                    <Select
                                        value={editingPlan?.departmentId || 'NONE'}
                                        onValueChange={v => setEditingPlan(p => ({ ...p!, departmentId: v === 'NONE' ? null : v }))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NONE">General (any department)</SelectItem>
                                            {departments.map(d => <SelectItem key={d.departmentID} value={d.departmentID}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <PackageTypePicker
                                    hospitalId={hospitalId}
                                    value={editingPlan?.packageTypeId}
                                    onChange={v => setEditingPlan(p => ({ ...p!, packageTypeId: v }))}
                                />

                                <div className="grid gap-2">
                                    <Label>Procedure Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. Percutaneous Nephrolithotomy"
                                        value={editingPlan?.procedureName || ''}
                                        onChange={e => setEditingPlan(p => ({ ...p!, procedureName: e.target.value }))}
                                    />
                                    <p className="text-xs text-muted-foreground">Pre-fills the Surgery Case's procedure name when this plan is applied.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Default Room</Label>
                                        <Select
                                            value={editingPlan?.defaultRoomCategory || 'NONE'}
                                            onValueChange={v => setEditingPlan(p => ({ ...p!, defaultRoomCategory: v === 'NONE' ? null : v as RoomCategory }))}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">Not set</SelectItem>
                                                {ROOM_CATEGORIES.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Suggested ICU</Label>
                                        <Select
                                            value={editingPlan?.suggestedIcuLevel || 'NONE'}
                                            onValueChange={v => setEditingPlan(p => ({ ...p!, suggestedIcuLevel: v === 'NONE' ? null : v as IcuLevel }))}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">Not expected</SelectItem>
                                                {ICU_LEVELS.map(l => <SelectItem key={l} value={l}>{l.replace('_', ' ')}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                    <div>
                                        <Label className="font-semibold cursor-pointer">Active</Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">Available for doctors to select</p>
                                    </div>
                                    <Switch
                                        checked={editingPlan?.isActive ?? true}
                                        onCheckedChange={v => setEditingPlan(p => ({ ...p!, isActive: v }))}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-between items-center gap-2">
                                <Button variant="ghost" onClick={() => setIsDrawerOpen(false)} className="text-gray-500">Cancel</Button>
                                <motion.button
                                    disabled={isSaving || isSuccess}
                                    onClick={handleSaveDrawer}
                                    className={`flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all min-w-[100px] h-10 px-4 ${isSuccess
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20'
                                        }`}
                                    animate={isSuccess ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } } : {}}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {isSaving ? 'Saving...' : isSuccess ? (<><CheckCircle2 className="h-4 w-4" /> Saved!</>) : 'Save'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            </>
            )}

            {activeTab === 'PACKAGE_TYPES' && (
            <>
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Reusable billing package labels (e.g. Full Package, Non Package) — optionally attach a price and included components.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button variant="outline" size="sm" onClick={() => loadPackageTypes(true)} disabled={loadingPackageTypes} className="gap-1.5 bg-white dark:bg-slate-900 shadow-sm text-gray-700 dark:text-gray-300">
                        <RefreshCw className={`h-4 w-4 ${loadingPackageTypes ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => handleOpenPkgDrawer(null)} className="flex-1 sm:flex-none gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                        <Plus className="h-4 w-4" /> New Package Type
                    </Button>
                </div>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto p-4 hide-scrollbar relative">
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50/80 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Name</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Price</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Components</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-center">Active</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loadingPackageTypes && Array.from({ length: 3 }).map((_, i) => (
                                <tr key={`pkg-sk-${i}`}>
                                    <td colSpan={5} className="px-4 py-3"><Skeleton className="h-9 w-full" /></td>
                                </tr>
                            ))}
                            {!loadingPackageTypes && pkgLoadError && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-rose-600">
                                            <AlertCircle className="h-8 w-8" />
                                            <p className="font-semibold">{pkgLoadError}</p>
                                            <Button size="sm" variant="outline" onClick={() => loadPackageTypes(true)} className="mt-2 h-7 text-xs">
                                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loadingPackageTypes && !pkgLoadError && packageTypes.map(pkg => (
                                <motion.tr
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={pkg.packageTypeId}
                                    className="hover:bg-brand-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{pkg.name}</td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{pkg.price != null ? `₹${pkg.price.toLocaleString('en-IN')}` : '—'}</td>
                                    <td className="px-4 py-3">
                                        {pkg.components?.length ? (
                                            <div className="flex flex-wrap gap-1">
                                                {pkg.components.map((c, i) => (
                                                    <Badge key={i} variant="outline" className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-normal border-gray-200 dark:border-gray-700">
                                                        {c}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Switch
                                            checked={pkg.isActive}
                                            onCheckedChange={() => handleTogglePkgActive(pkg)}
                                            className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800" onClick={() => handleOpenPkgDrawer(pkg)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </motion.tr>
                            ))}
                            {!loadingPackageTypes && !pkgLoadError && packageTypes.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="font-medium text-base">No Package Types configured yet</p>
                                            <p className="text-sm">Click "New Package Type" to add your first one, e.g. "Full Package".</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT DRAWER: CREATE/EDIT PACKAGE TYPE */}
            <AnimatePresence>
                {isPkgDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[55]"
                            onClick={() => setIsPkgDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-[60] flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {editingPkg?.packageTypeId ? 'Edit Package Type' : 'New Package Type'}
                                </h2>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsPkgDrawerOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid gap-2">
                                    <Label>Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. Full Package"
                                        value={editingPkg?.name || ''}
                                        onChange={e => setEditingPkg(p => ({ ...p!, name: e.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Price (optional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 50000"
                                        value={editingPkg?.price ?? ''}
                                        onChange={e => setEditingPkg(p => ({ ...p!, price: e.target.value === '' ? null : Number(e.target.value) }))}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Components (optional)</Label>
                                    <Input
                                        placeholder="Comma separated — e.g. OT Med, Ward Med, Room Rent, Procedure"
                                        value={editingPkg?.componentsText || ''}
                                        onChange={e => setEditingPkg(p => ({ ...p!, componentsText: e.target.value }))}
                                    />
                                    <p className="text-xs text-muted-foreground">Free-text labels of what's bundled — for reference only, no per-item pricing.</p>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                                    <div>
                                        <Label className="font-semibold cursor-pointer">Active</Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">Available for selection on OT Plans / Advise Admission</p>
                                    </div>
                                    <Switch
                                        checked={editingPkg?.isActive ?? true}
                                        onCheckedChange={v => setEditingPkg(p => ({ ...p!, isActive: v }))}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 flex justify-between items-center gap-2">
                                <Button variant="ghost" onClick={() => setIsPkgDrawerOpen(false)} className="text-gray-500">Cancel</Button>
                                <motion.button
                                    disabled={isPkgSaving || isPkgSuccess}
                                    onClick={handleSavePkgDrawer}
                                    className={`flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all min-w-[100px] h-10 px-4 ${isPkgSuccess
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20'
                                        }`}
                                    animate={isPkgSuccess ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } } : {}}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {isPkgSaving ? 'Saving...' : isPkgSuccess ? (<><CheckCircle2 className="h-4 w-4" /> Saved!</>) : 'Save'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            </>
            )}
        </div>
    );
};
