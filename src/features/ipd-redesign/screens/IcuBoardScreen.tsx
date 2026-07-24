import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, RefreshCw, AlertCircle, HeartPulse, Activity, Wind, BedDouble, Info, LayoutGrid, Package2, Siren, ShieldAlert, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { icuApi, type IcuBoardCase } from '../services/icuApi';
import { cn } from '@/lib/utils';
import { BoardInventoryPanel } from '../components/BoardInventoryPanel';

export const IcuBoardScreen: React.FC = () => {
    const navigate = useNavigate();
    const [board, setBoard] = useState<IcuBoardCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'patients' | 'inventory'>('patients');

    const fetchBoard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await icuApi.getBoard();
            setBoard(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load ICU board');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBoard();
    }, [fetchBoard]);

    const groupedCases = useMemo(() => {
        return {
            'LEVEL_3': board.filter(c => c.icuLevel === 'LEVEL_3'),
            'LEVEL_2': board.filter(c => c.icuLevel === 'LEVEL_2'),
            'LEVEL_1': board.filter(c => c.icuLevel === 'LEVEL_1'),
            'UNASSIGNED': board.filter(c => !c.icuLevel)
        };
    }, [board]);

    const columns = [
        { id: 'LEVEL_3', title: 'Level 3 (Intensive)', color: 'border-red-500', bg: 'bg-red-500/10' },
        { id: 'LEVEL_2', title: 'Level 2 (High Dependency)', color: 'border-orange-500', bg: 'bg-orange-500/10' },
        { id: 'LEVEL_1', title: 'Level 1 (Ward + Monitoring)', color: 'border-yellow-500', bg: 'bg-yellow-500/10' },
        { id: 'UNASSIGNED', title: 'Pending / Unassigned', color: 'border-slate-500', bg: 'bg-slate-500/10' }
    ];

    const renderPatients = () => {
        if (loading && board.length === 0) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 h-full w-full absolute inset-0">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-500 mb-4" />
                    <p>Loading ICU Board...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 h-full w-full absolute inset-0">
                    <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                    <p className="text-slate-800 font-medium mb-2">Error Loading Board</p>
                    <p className="text-sm mb-6 text-center max-w-md">{error}</p>
                    <Button onClick={fetchBoard} variant="outline" className="rounded-xl"><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
                </div>
            );
        }

        return (
            <div className="flex gap-6 h-full items-start min-w-max px-6 pb-6 overflow-x-auto">
                {columns.map(col => {
                    const colCases = groupedCases[col.id as keyof typeof groupedCases] || [];
                    if (col.id === 'UNASSIGNED' && colCases.length === 0) return null; // Hide unassigned if empty

                    return (
                        <div key={col.id} className="w-80 flex flex-col max-h-[calc(100vh-210px)] bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-4 shrink-0 shadow-sm">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800 mb-4 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", col.id === 'LEVEL_3' ? 'bg-red-500' : col.id === 'LEVEL_2' ? 'bg-orange-500' : col.id === 'LEVEL_1' ? 'bg-yellow-500' : 'bg-slate-500')} />
                                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-200">{col.title}</h3>
                                </div>
                                <Badge className={cn("rounded-full font-bold px-2 py-0.5 text-[10px] border-none", col.bg, col.id === 'LEVEL_3' ? 'text-red-750' : col.id === 'LEVEL_2' ? 'text-orange-750' : col.id === 'LEVEL_1' ? 'text-yellow-750' : 'text-slate-750')}>{colCases.length}</Badge>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pb-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    <AnimatePresence>
                                        {colCases.map(c => (
                                            <motion.button
                                                key={c.admissionId}
                                                layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                onClick={() => {
                                                    const targetId = c.encounterId || c.admissionId;
                                                    if (targetId) navigate(`/ipd-workspace/patient/${targetId}?tab=criticalCare`);
                                                }}
                                                className="w-full text-left bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-4 hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all active:scale-[0.98] group flex flex-col min-h-[140px]"
                                            >
                                                <div className="flex items-start justify-between mb-2.5 gap-2 w-full">
                                                    <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-sm truncate leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{c.patientName || 'Unknown Patient'}</h4>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {c.hasOpenRapidResponse && (
                                                            <div title="Rapid Response active" className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 p-1 rounded-full animate-pulse">
                                                                <Siren className="h-3.5 w-3.5" />
                                                            </div>
                                                        )}
                                                        {c.onVentilator && (
                                                            <div title="On Mechanical Ventilation" className="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 p-1 rounded-full">
                                                                <Wind className="h-3.5 w-3.5" />
                                                            </div>
                                                        )}
                                                        {c.hasOverdueBundleCheck && (
                                                            <div title="Device bundle check overdue" className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 p-1 rounded-full">
                                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 mb-3">
                                                    <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="truncate font-medium">{c.wardCode || 'No Ward'} • {c.bedCode || 'No Bed'}</span>
                                                </div>

                                                {c.primaryDiagnosis && (
                                                    <div className="text-xs text-slate-650 dark:text-zinc-350 mb-4 line-clamp-2">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-zinc-550 block mb-0.5">Primary Diagnosis</span>
                                                        <span className="font-medium">{c.primaryDiagnosis}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex-wrap">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-mono font-bold rounded-full px-2 py-0.5 shrink-0 border",
                                                        (c.apacheScore ?? 0) >= 15 ? "border-red-200 text-red-750 bg-red-50/50 dark:bg-red-950/20" : "bg-slate-50/50 dark:bg-zinc-800/30 text-slate-600 dark:text-zinc-400 border-slate-200/60 dark:border-zinc-800"
                                                    )}>
                                                        APACHE: {c.apacheScore != null ? c.apacheScore : '--'}
                                                    </Badge>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-mono font-bold rounded-full px-2 py-0.5 shrink-0 border",
                                                        (c.sofaScore ?? 0) >= 5 ? "border-orange-200 text-orange-750 bg-orange-50/50 dark:bg-orange-950/20" : "bg-slate-50/50 dark:bg-zinc-800/30 text-slate-600 dark:text-zinc-400 border-slate-200/60 dark:border-zinc-800"
                                                    )}>
                                                        SOFA: {c.sofaScore != null ? c.sofaScore : '--'}
                                                    </Badge>
                                                    {c.ewsScore != null && (
                                                        <Badge variant="outline" className={cn(
                                                            "text-[9px] font-mono font-bold rounded-full px-2 py-0.5 shrink-0 border",
                                                            c.ewsRiskBand === 'HIGH' ? "border-rose-250 text-rose-750 bg-rose-50/50 dark:bg-rose-950/20"
                                                                : c.ewsRiskBand === 'MEDIUM' ? "border-orange-250 text-orange-750 bg-orange-50/50 dark:bg-orange-950/20"
                                                                : c.ewsRiskBand === 'LOW_MEDIUM' ? "border-amber-250 text-amber-750 bg-amber-50/50 dark:bg-amber-950/20"
                                                                : "bg-slate-50/50 dark:bg-zinc-800/30 text-slate-600 dark:text-zinc-400 border-slate-200/60 dark:border-zinc-800"
                                                        )}>
                                                            EWS: {c.ewsScore}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </motion.button>
                                        ))}
                                        {colCases.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-32 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400 dark:text-zinc-550 bg-slate-50/20">
                                                <Activity className="h-6 w-6 mb-2 opacity-50 text-slate-400" />
                                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">No Patients</span>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 overflow-hidden pb-20 sm:pb-0">
            {/* Header */}
            <div className="flex-none p-5 bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-zinc-900 dark:to-zinc-900 text-white shadow-lg shadow-brand-500/10 rounded-2xl shrink-0 gap-4 flex flex-col sm:flex-row sm:items-center sm:justify-between z-10 m-4 mb-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 rounded-xl active:scale-[0.98] transition-all" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <HeartPulse className="h-5 w-5 text-rose-300 animate-pulse" />
                            ICU Plan Board
                        </h1>
                        <p className="text-xs text-white/80 mt-0.5">Centralized monitoring of critical care patients.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-black/15 dark:bg-black/30 backdrop-blur-sm p-1 rounded-full w-full sm:w-auto">
                        <button
                            onClick={() => setTab('patients')}
                            className={cn(
                                'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold active:scale-[0.98] transition-all border-none shadow-none',
                                tab === 'patients'
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-white/80 hover:text-white'
                            )}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" /> Patients Board
                        </button>
                        <button
                            onClick={() => setTab('inventory')}
                            className={cn(
                                'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold active:scale-[0.98] transition-all border-none shadow-none',
                                tab === 'inventory'
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-white/80 hover:text-white'
                            )}
                        >
                            <Package2 className="h-3.5 w-3.5" /> ICU Stock / Inventory
                        </button>
                    </div>
                    <Button onClick={fetchBoard} variant="outline" size="sm" className="h-9 rounded-xl active:scale-[0.98] transition-all bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold shrink-0">
                        <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative">
                {tab === 'patients' ? renderPatients() : (
                    <div className="p-4 md:p-6 h-full overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <BoardInventoryPanel boardType="ICU" />
                    </div>
                )}
            </div>
        </div>
    );
};
