import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExternalLink, HeartPulse, Pill, Activity, Droplets, FileText, X } from 'lucide-react';
import { VitalsPanel } from './VitalsPanel';
import { GlucoseChartPanel } from './GlucoseChartPanel';
import { MarPanel } from './MarPanel';
import { IntakeOutputPanel } from './IntakeOutputPanel';
import { RoundNotePanel } from './RoundNotePanel';
import type { NursingStationPatientItem } from '../services/nursingStationApi';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admissionId: string | null;
    patientSummary?: NursingStationPatientItem;
}

export const NurseQuickActionDialog: React.FC<Props> = ({ open, onOpenChange, admissionId, patientSummary }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('vitals');

    if (!admissionId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] xl:max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden bg-slate-50 dark:bg-zinc-950 p-0 border-slate-200/60 dark:border-zinc-800 rounded-2xl sm:rounded-[2rem]">
                <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-row items-center justify-between sticky top-0 z-20">
                    <div>
                        <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                            {patientSummary?.patientName || 'Patient Details'}
                        </DialogTitle>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Bed {patientSummary?.bedCode || '—'} · {patientSummary?.patientAge ?? ''}{patientSummary?.patientSex ?? ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => navigate(`/ipd-workspace/patient/${admissionId}`)}
                            className="bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-400 border-none font-bold shadow-sm"
                        >
                            <ExternalLink className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Full Workspace</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100/50 dark:bg-zinc-800/50"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-6 bg-slate-200/50 dark:bg-zinc-900 p-1 rounded-xl mb-4 h-auto shadow-sm">
                            <TabsTrigger value="vitals" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm py-2">
                                <HeartPulse className="h-4 w-4 sm:mr-2 shrink-0" /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">Vitals</span>
                            </TabsTrigger>
                            <TabsTrigger value="glucose" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm py-2">
                                <Activity className="h-4 w-4 sm:mr-2 shrink-0" /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">Glucose</span>
                            </TabsTrigger>
                            <TabsTrigger value="meds" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm py-2">
                                <Pill className="h-4 w-4 sm:mr-2 shrink-0" /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">MAR</span>
                            </TabsTrigger>
                            <TabsTrigger value="io" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm py-2">
                                <Droplets className="h-4 w-4 sm:mr-2 shrink-0" /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">I/O</span>
                            </TabsTrigger>
                            <TabsTrigger value="notes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm py-2">
                                <FileText className="h-4 w-4 sm:mr-2 shrink-0" /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">Notes</span>
                            </TabsTrigger>
                            <TabsTrigger value="cssd" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm py-2">
                                <CssdIcon className="h-4 w-4 sm:mr-2 shrink-0" /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">Sterile</span>
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-sm p-1 sm:p-4 min-h-[400px]">
                            <TabsContent value="vitals" className="m-0 border-none focus-visible:ring-0">
                                <VitalsPanel admissionId={admissionId} isActive={activeTab === 'vitals'} />
                            </TabsContent>
                            <TabsContent value="glucose" className="m-0 border-none focus-visible:ring-0">
                                <GlucoseChartPanel admissionId={admissionId} isActive={activeTab === 'glucose'} />
                            </TabsContent>
                            <TabsContent value="meds" className="m-0 border-none focus-visible:ring-0">
                                <MarPanel admissionId={admissionId} isActive={activeTab === 'meds'} />
                            </TabsContent>
                            <TabsContent value="io" className="m-0 border-none focus-visible:ring-0">
                                <IntakeOutputPanel admissionId={admissionId} isActive={activeTab === 'io'} />
                            </TabsContent>
                            <TabsContent value="notes" className="m-0 border-none focus-visible:ring-0">
                                <RoundNotePanel admissionId={admissionId} isActive={activeTab === 'notes'} />
                            </TabsContent>
                            <TabsContent value="cssd" className="m-0 border-none focus-visible:ring-0 p-2 sm:p-0">
                                <CssdTabContent admissionId={admissionId} patientSummary={patientSummary} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ── Inline CSSD icon (shield shape) ──────────────────────────────────────────
const CssdIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

// ── Lazy-loaded CSSD tab content ──────────────────────────────────────────────
const CssdTabContent: React.FC<{
    admissionId: string;
    patientSummary?: NursingStationPatientItem;
}> = ({ admissionId, patientSummary }) => {
    const [Panel, setPanel] = React.useState<React.ComponentType<any> | null>(null);

    React.useEffect(() => {
        import('./CssdRequestPanel').then(m => setPanel(() => m.CssdRequestPanel));
    }, []);

    if (!Panel) return (
        <div className="flex items-center justify-center py-12 text-slate-400">
            <svg className="h-5 w-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading...
        </div>
    );

    const bedCode = patientSummary?.bedCode;
    const locationLabel = bedCode
        ? `Bed ${bedCode}${patientSummary?.patientName ? ` (${patientSummary.patientName})` : ''}`
        : 'Ward';

    return <Panel admissionId={admissionId} locationLabel={locationLabel} />;
};
