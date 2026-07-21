import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Pencil, X, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
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
import { PackageTypeMultiPicker } from '@/features/hospital/components/masters/PackageTypeMultiPicker';
import { useAuthStore } from '@/store/authStore';

const ROOM_CATEGORIES: RoomCategory[] = ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE'];
const ICU_LEVELS: IcuLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

type EditingPlan = Partial<Omit<OTPlanItem, 'packageTypes'>> & { packageTypeIds?: string[] };
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
        setEditingPlan(plan ? { ...plan, packageTypeIds: plan.packageTypes.map(pt => pt.packageTypeId) } : {
            planName: '', procedureName: '', departmentId: null, packageTypeIds: [],
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
                packageTypeIds: editingPlan.packageTypeIds ?? [],
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
                packageTypeIds: plan.packageTypes.map(pt => pt.packageTypeId),
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
            <div className="flex flex-col gap-3 p-4 border-b border-gray-150 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center w-full">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search plans..."
                            className="pl-9 bg-white dark:bg-slate-900 shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {/* Desktop dropdowns */}
                    <div className="max-sm:hidden flex gap-2 text-sm">
                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                            <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 shadow-sm h-10">
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="ALL">All Departments</SelectItem>
                                <SelectItem value="NONE">General (no department)</SelectItem>
                                {departments.map(d => <SelectItem key={d.departmentID} value={d.departmentID}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterActive} onValueChange={setFilterActive}>
                            <SelectTrigger className="w-[110px] bg-white dark:bg-slate-900 shadow-sm h-10">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Desktop buttons */}
                    <div className="max-sm:hidden flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => loadPlans(true)} disabled={refreshing || loading} className="gap-1.5 bg-white dark:bg-slate-900 shadow-sm text-gray-700 dark:text-gray-300">
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                        </Button>
                        <Button onClick={() => handleOpenDrawer(null)} className="gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                            <Plus className="h-4 w-4" /> New OT Plan
                        </Button>
                    </div>
                </div>

                {/* Mobile horizontal scrolling category chips for departments */}
                <div className="sm:hidden flex gap-1.5 overflow-x-auto pb-1.5 mt-1 w-full hide-scrollbar">
                    <button
                        onClick={() => setFilterDepartment('ALL')}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-bold rounded-full transition-all shrink-0 border",
                            filterDepartment === 'ALL'
                                ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                                : "bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800"
                        )}
                    >
                        All Depts
                    </button>
                    <button
                        onClick={() => setFilterDepartment('NONE')}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-bold rounded-full transition-all shrink-0 border",
                            filterDepartment === 'NONE'
                                ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                                : "bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800"
                        )}
                    >
                        General
                    </button>
                    {departments.map(d => (
                        <button
                            key={d.departmentID}
                            onClick={() => setFilterDepartment(d.departmentID)}
                            className={cn(
                                "px-3.5 py-1.5 text-xs font-bold rounded-full transition-all shrink-0 border",
                                filterDepartment === d.departmentID
                                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                                    : "bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800"
                            )}
                        >
                            {d.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto p-4 hide-scrollbar relative">
                <div className="max-lg:hidden border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50/80 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Plan Name</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Department</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Procedure</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Package Types</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">Default Room</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">ICU</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-center">Active</th>
                                <th className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading && Array.from({ length: 4 }).map((_, i) => (
                                <tr key={`sk-${i}`}>
                                    <td colSpan={8} className="px-4 py-3"><Skeleton className="h-9 w-full" /></td>
                                </tr>
                            ))}
                            {!loading && loadError && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
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
                                    <td className="px-4 py-3">
                                        {plan.packageTypes.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {plan.packageTypes.map(pt => (
                                                    <Badge key={pt.packageTypeId} variant="outline" className="bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-normal border-brand-200 dark:border-brand-800">
                                                        {pt.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </td>
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
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
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

                {/* PLANS MOBILE CARD LIST */}
                {loading ? (
                    <div className="lg:hidden flex flex-col gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : loadError ? (
                    <div className="lg:hidden text-center py-12 text-rose-600 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-2xl">
                        <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="h-8 w-8 text-rose-500" />
                            <p className="font-semibold">{loadError}</p>
                            <Button size="sm" variant="outline" onClick={() => loadPlans(true)} className="mt-2 h-7 text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                        </div>
                    </div>
                ) : filteredPlans.length === 0 ? (
                    <div className="lg:hidden text-center py-12 text-slate-400 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-2xl">
                        <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-slate-355 dark:text-zinc-600" />
                            <p className="font-medium text-xs text-slate-500">{plans.length === 0 ? 'No OT Plans configured yet' : 'No plans match your filters'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="lg:hidden flex flex-col gap-3.5 pb-20">
                        {filteredPlans.map(plan => (
                            <Card key={plan.otPlanId} className={cn(
                                "border border-slate-150 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3 shadow-sm",
                                !plan.isActive && "opacity-75"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 text-xs truncate">{plan.planName}</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">{plan.procedureName}</p>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-full text-slate-450 dark:text-zinc-500 hover:text-brand-600 dark:hover:text-brand-400"
                                        onClick={() => handleOpenDrawer(plan)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Package Types badges */}
                                {plan.packageTypes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {plan.packageTypes.map(pt => (
                                            <Badge key={pt.packageTypeId} variant="outline" className="text-[9px] font-bold rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/80 px-2 py-0.5">
                                                {pt.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Metadata Row */}
                                <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-zinc-500 font-bold bg-slate-50/50 dark:bg-zinc-950/20 rounded-xl p-2 mt-1">
                                    <div>
                                        <span className="text-slate-400 dark:text-zinc-500 font-normal">Room:</span>{' '}
                                        <span className="text-slate-700 dark:text-zinc-350">{plan.defaultRoomCategory?.replace('_', ' ') ?? 'None'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 dark:text-zinc-500 font-normal">ICU:</span>{' '}
                                        <span className="text-slate-700 dark:text-zinc-350">{plan.suggestedIcuLevel?.replace('_', ' ') ?? 'None'}</span>
                                    </div>
                                </div>

                                {/* Bottom active switch */}
                                <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100 dark:border-zinc-800/40">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500">Active Status</span>
                                    <Switch
                                        checked={plan.isActive}
                                        onCheckedChange={() => handleToggleActive(plan)}
                                        className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 scale-90"
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT DRAWER: CREATE/EDIT */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
                            exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 bottom-[68px] sm:inset-y-0 right-0 w-full md:w-[480px] h-[calc(100dvh-68px)] sm:h-screen bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[110] flex flex-col"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-zinc-900/50 bg-slate-50/30 dark:bg-zinc-950/20">
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200" onClick={() => setIsDrawerOpen(false)}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 tracking-tight">
                                        {editingPlan?.otPlanId ? 'Edit OT Plan' : 'New OT Plan'}
                                    </h2>
                                </div>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-5 bg-white dark:bg-slate-950">
                                <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-bold text-slate-550 dark:text-zinc-450">Plan Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. PCNL Plan"
                                        className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-brand-500"
                                        value={editingPlan?.planName || ''}
                                        onChange={e => setEditingPlan(p => ({ ...p!, planName: e.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-bold text-slate-555 dark:text-zinc-455">Department</Label>
                                    <Select
                                        value={editingPlan?.departmentId || 'NONE'}
                                        onValueChange={v => setEditingPlan(p => ({ ...p!, departmentId: v === 'NONE' ? null : v }))}
                                    >
                                        <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 dark:border-zinc-800">
                                            <SelectItem value="NONE">General (any department)</SelectItem>
                                            {departments.map(d => <SelectItem key={d.departmentID} value={d.departmentID}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <PackageTypeMultiPicker
                                    hospitalId={hospitalId}
                                    value={editingPlan?.packageTypeIds ?? []}
                                    onChange={v => setEditingPlan(p => ({ ...p!, packageTypeIds: v }))}
                                />

                                <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-bold text-slate-555 dark:text-zinc-455">Procedure Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. Percutaneous Nephrolithotomy"
                                        className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-brand-500"
                                        value={editingPlan?.procedureName || ''}
                                        onChange={e => setEditingPlan(p => ({ ...p!, procedureName: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Pre-fills the Surgery Case's procedure name when this plan is applied.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                    <div className="grid gap-1.5">
                                        <Label className="text-[11px] font-bold text-slate-555 dark:text-zinc-455">Default Room</Label>
                                        <Select
                                            value={editingPlan?.defaultRoomCategory || 'NONE'}
                                            onValueChange={v => setEditingPlan(p => ({ ...p!, defaultRoomCategory: v === 'NONE' ? null : v as RoomCategory }))}
                                        >
                                            <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-zinc-800">
                                                <SelectItem value="NONE">Not set</SelectItem>
                                                {ROOM_CATEGORIES.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label className="text-[11px] font-bold text-slate-555 dark:text-zinc-455">Suggested ICU</Label>
                                        <Select
                                            value={editingPlan?.suggestedIcuLevel || 'NONE'}
                                            onValueChange={v => setEditingPlan(p => ({ ...p!, suggestedIcuLevel: v === 'NONE' ? null : v as IcuLevel }))}
                                        >
                                            <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-zinc-800">
                                                <SelectItem value="NONE">Not expected</SelectItem>
                                                {ICU_LEVELS.map(l => <SelectItem key={l} value={l}>{l.replace('_', ' ')}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-zinc-900 bg-slate-50/30 dark:bg-zinc-950/20">
                                    <div>
                                        <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer">Active Status</Label>
                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Available for doctors to select</p>
                                    </div>
                                    <Switch
                                        checked={editingPlan?.isActive ?? true}
                                        onCheckedChange={v => setEditingPlan(p => ({ ...p!, isActive: v }))}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-4 pb-10 sm:pb-4 border-t border-slate-100 dark:border-zinc-900/50 bg-white dark:bg-zinc-950 flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsDrawerOpen(false)} 
                                    className="flex-1 h-11 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 font-bold"
                                >
                                    Cancel
                                </Button>
                                <motion.button
                                    disabled={isSaving || isSuccess}
                                    onClick={handleSaveDrawer}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-bold text-sm min-w-[120px] h-11 transition-all ${isSuccess
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 active:scale-[0.98]'
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
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border-b border-gray-150 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Reusable billing package labels (e.g. Full Package, Non Package) — optionally attach a price and included components.</p>
                </div>
                <div className="max-sm:hidden flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
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
                <div className="max-lg:hidden border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
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

                {/* PACKAGE TYPES MOBILE CARD LIST */}
                {loadingPackageTypes ? (
                    <div className="lg:hidden flex flex-col gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : pkgLoadError ? (
                    <div className="lg:hidden text-center py-12 text-rose-600 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-2xl">
                        <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="h-8 w-8 text-rose-500" />
                            <p className="font-semibold">{pkgLoadError}</p>
                            <Button size="sm" variant="outline" onClick={() => loadPackageTypes(true)} className="mt-2 h-7 text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                        </div>
                    </div>
                ) : packageTypes.length === 0 ? (
                    <div className="lg:hidden text-center py-12 text-slate-400 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-2xl">
                        <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-slate-355 dark:text-zinc-650" />
                            <p className="font-medium text-xs text-slate-500">No Package Types configured yet</p>
                        </div>
                    </div>
                ) : (
                    <div className="lg:hidden flex flex-col gap-3.5 pb-20">
                        {packageTypes.map(pkg => (
                            <Card key={pkg.packageTypeId} className={cn(
                                "border border-slate-150 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3 shadow-sm",
                                !pkg.isActive && "opacity-75"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 text-xs truncate">{pkg.name}</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-zinc-550 mt-0.5 font-bold font-mono">
                                            {pkg.price != null ? `₹${pkg.price.toLocaleString('en-IN')}` : 'No price set'}
                                        </p>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-full text-slate-450 dark:text-zinc-500 hover:text-brand-600 dark:hover:text-brand-400"
                                        onClick={() => handleOpenPkgDrawer(pkg)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Components */}
                                {pkg.components?.length ? (
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {pkg.components.map((c, i) => (
                                            <Badge key={i} variant="outline" className="text-[9px] font-bold rounded-full bg-slate-50 dark:bg-zinc-950/40 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800/80 px-2 py-0.5">
                                                {c}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : <span className="text-[10px] text-slate-350 dark:text-zinc-650">—</span>}

                                {/* Bottom active switch */}
                                <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100 dark:border-zinc-800/40">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500">Active Status</span>
                                    <Switch
                                        checked={pkg.isActive}
                                        onCheckedChange={() => handleTogglePkgActive(pkg)}
                                        className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 scale-90"
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT DRAWER: CREATE/EDIT PACKAGE TYPE */}
            <AnimatePresence>
                {isPkgDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setIsPkgDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
                            exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 bottom-[68px] sm:inset-y-0 right-0 w-full md:w-[480px] h-[calc(100dvh-68px)] sm:h-screen bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[110] flex flex-col"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-zinc-900/50 bg-slate-50/30 dark:bg-zinc-950/20">
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200" onClick={() => setIsPkgDrawerOpen(false)}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 tracking-tight">
                                        {editingPkg?.packageTypeId ? 'Edit Package Type' : 'New Package Type'}
                                    </h2>
                                </div>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-5 bg-white dark:bg-slate-950">
                                <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-bold text-slate-550 dark:text-zinc-450">Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. Full Package"
                                        className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-brand-500"
                                        value={editingPkg?.name || ''}
                                        onChange={e => setEditingPkg(p => ({ ...p!, name: e.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-bold text-slate-550 dark:text-zinc-450">Price (optional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 50000"
                                        className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-brand-500"
                                        value={editingPkg?.price ?? ''}
                                        onChange={e => setEditingPkg(p => ({ ...p!, price: e.target.value === '' ? null : Number(e.target.value) }))}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-bold text-slate-550 dark:text-zinc-450">Components (optional)</Label>
                                    <Input
                                        placeholder="Comma separated — e.g. OT Med, Ward Med, Room Rent, Procedure"
                                        className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-brand-500"
                                        value={editingPkg?.componentsText || ''}
                                        onChange={e => setEditingPkg(p => ({ ...p!, componentsText: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Free-text labels of what's bundled — for reference only, no per-item pricing.</p>
                                </div>

                                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-zinc-900 bg-slate-50/30 dark:bg-zinc-950/20">
                                    <div>
                                        <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer">Active Status</Label>
                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Available for selection on OT Plans / Advise Admission</p>
                                    </div>
                                    <Switch
                                        checked={editingPkg?.isActive ?? true}
                                        onCheckedChange={v => setEditingPkg(p => ({ ...p!, isActive: v }))}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-4 pb-10 sm:pb-4 border-t border-slate-100 dark:border-zinc-900/50 bg-white dark:bg-slate-950 flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsPkgDrawerOpen(false)} 
                                    className="flex-1 h-11 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 font-bold"
                                >
                                    Cancel
                                </Button>
                                <motion.button
                                    disabled={isPkgSaving || isPkgSuccess}
                                    onClick={handleSavePkgDrawer}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-bold text-sm min-w-[120px] h-11 transition-all ${isPkgSuccess
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 active:scale-[0.98]'
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

            {/* Mobile Floating Action Button */}
            <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                onClick={activeTab === 'PLANS' ? () => handleOpenDrawer(null) : () => handleOpenPkgDrawer(null)}
                className="fixed bottom-24 right-4 z-40 sm:hidden h-12 px-5 bg-brand-600 text-white rounded-full flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(79,70,229,0.3)] border border-brand-500/20 active:scale-95 transition-all"
            >
                <Plus className="h-5 w-5" strokeWidth={3} />
                <span className="text-[11.5px] font-bold tracking-tight whitespace-nowrap">
                    {activeTab === 'PLANS' ? 'Add OT Plan' : 'Add Package Type'}
                </span>
            </motion.button>
        </div>
    );
};
