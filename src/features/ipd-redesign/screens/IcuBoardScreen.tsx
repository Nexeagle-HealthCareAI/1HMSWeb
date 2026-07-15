import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, RefreshCw, AlertCircle, HeartPulse, Activity, Wind, BedDouble, Info, LayoutGrid, Package2, Siren, ShieldAlert
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
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
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
                    <Button onClick={fetchBoard} variant="outline"><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
                </div>
            );
        }

        return (
            <div className="flex gap-6 h-full items-start min-w-max p-4 md:p-6">
                {columns.map(col => {
                    const colCases = groupedCases[col.id as keyof typeof groupedCases] || [];
                    if (col.id === 'UNASSIGNED' && colCases.length === 0) return null; // Hide unassigned if empty

                    return (
                        <div key={col.id} className="w-80 flex flex-col h-full max-h-full flex-shrink-0">
                            <div className={cn("flex items-center justify-between pb-3 border-b-2 mb-4", col.color)}>
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{col.title}</h3>
                                    <Badge variant="secondary" className={cn(col.bg)}>{colCases.length}</Badge>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-4">
                                    <AnimatePresence>
                                        {colCases.map(c => (
                                            <motion.button
                                                key={c.admissionId}
                                                layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                onClick={() => {
                                                    const targetId = c.encounterId || c.admissionId;
                                                    if (targetId) navigate(`/ipd-workspace/patient/${targetId}?tab=criticalCare`);
                                                }}
                                                className="w-full text-left bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                                            >
                                                <div className="flex items-start justify-between mb-2 gap-2">
                                                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{c.patientName || 'Unknown Patient'}</h4>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {c.hasOpenRapidResponse && (
                                                            <div title="Rapid Response active" className="bg-rose-100 text-rose-700 p-1 rounded-full animate-pulse">
                                                                <Siren className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                        {c.onVentilator && (
                                                            <div title="On Mechanical Ventilation" className="bg-sky-100 text-sky-700 p-1 rounded-full">
                                                                <Wind className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                        {c.hasOverdueBundleCheck && (
                                                            <div title="Device bundle check overdue" className="bg-amber-100 text-amber-700 p-1 rounded-full">
                                                                <ShieldAlert className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                                    <BedDouble className="h-3 w-3" />
                                                    <span className="truncate">{c.wardCode || 'No Ward'} • {c.bedCode || 'No Bed'}</span>
                                                </div>

                                                {c.primaryDiagnosis && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                                                        <span className="font-medium">Dx:</span> {c.primaryDiagnosis}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] font-mono",
                                                        (c.apacheScore ?? 0) >= 15 ? "border-red-200 text-red-700 bg-red-50" : "bg-slate-50"
                                                    )}>
                                                        APACHE: {c.apacheScore != null ? c.apacheScore : '--'}
                                                    </Badge>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] font-mono",
                                                        (c.sofaScore ?? 0) >= 5 ? "border-orange-200 text-orange-700 bg-orange-50" : "bg-slate-50"
                                                    )}>
                                                        SOFA: {c.sofaScore != null ? c.sofaScore : '--'}
                                                    </Badge>
                                                    {c.ewsScore != null && (
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] font-mono",
                                                            c.ewsRiskBand === 'HIGH' ? "border-rose-200 text-rose-700 bg-rose-50"
                                                                : c.ewsRiskBand === 'MEDIUM' ? "border-orange-200 text-orange-700 bg-orange-50"
                                                                : c.ewsRiskBand === 'LOW_MEDIUM' ? "border-amber-200 text-amber-700 bg-amber-50"
                                                                : "bg-slate-50"
                                                        )}>
                                                            EWS: {c.ewsScore}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </motion.button>
                                        ))}
                                        {colCases.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
                                                <Activity className="h-6 w-6 mb-2 opacity-50" />
                                                <span className="text-sm">No Patients</span>
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
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
            {/* Header */}
            <div className="flex-none p-4 md:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <HeartPulse className="h-6 w-6 text-rose-500" />
                            ICU Plan Board
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 hidden sm:block">Centralized monitoring of all critical care patients.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setTab('patients')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-all', tab === 'patients' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                                <LayoutGrid className="h-3.5 w-3.5" /> Patients Board
                            </button>
                            <button onClick={() => setTab('inventory')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-all', tab === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                                <Package2 className="h-3.5 w-3.5" /> ICU Stock / Inventory
                            </button>
                        </div>
                        <Button onClick={fetchBoard} variant="outline" size="sm" className="bg-white/50 backdrop-blur-sm h-8">
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative">
                {tab === 'patients' ? renderPatients() : (
                    <div className="p-4 md:p-6 h-full">
                        <BoardInventoryPanel boardType="ICU" />
                    </div>
                )}
            </div>
        </div>
    );
};
