import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { NursingStationScreen } from '../screens/NursingStationScreen';
import { NurseWardRoster } from '@/features/hospital/components/masters/NurseWardRoster';

const NursingStationPage: React.FC = () => {
    const navigate = useNavigate();
    const roles = useAuthStore((state) => state.userRoles ?? (state.userRole ? [state.userRole] : []));
    const canManageRoster = roles.some(r => r === 'Admin' || r === 'AdminDoctor');

    return (
        <Tabs defaultValue="station" className="flex flex-col h-full w-full bg-transparent overflow-hidden gap-4 pb-20 sm:pb-0">
            <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 text-white shadow-lg shadow-brand-500/10 rounded-2xl shrink-0 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 mt-1">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 rounded-xl active:scale-[0.98] transition-all" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Nursing Station</h1>
                        <p className="text-xs text-white/80 mt-0.5">Your rostered patients, and ward staffing.</p>
                    </div>
                </div>
                {canManageRoster && (
                    <TabsList className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm h-auto w-full sm:w-64 border-0 shadow-none shrink-0">
                        <TabsTrigger
                            value="station"
                            className="flex flex-col items-center justify-center py-2 text-center rounded-xl transition-all h-auto bg-transparent border-0 text-brand-50 hover:bg-white/10 hover:text-white data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-900 data-[state=active]:text-brand-600 data-[state=active]:dark:text-brand-400 data-[state=active]:shadow-sm data-[state=active]:hover:bg-white px-1 select-none whitespace-normal flex-1"
                        >
                            <ClipboardList className="h-5 w-5 mb-1 shrink-0" />
                            <span className="text-[9px] font-bold tracking-wide leading-tight">My Patients</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="roster"
                            className="flex flex-col items-center justify-center py-2 text-center rounded-xl transition-all h-auto bg-transparent border-0 text-brand-50 hover:bg-white/10 hover:text-white data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-900 data-[state=active]:text-brand-600 data-[state=active]:dark:text-brand-400 data-[state=active]:shadow-sm data-[state=active]:hover:bg-white px-1 select-none whitespace-normal flex-1"
                        >
                            <Users className="h-5 w-5 mb-1 shrink-0" />
                            <span className="text-[9px] font-bold tracking-wide leading-tight">Roster</span>
                        </TabsTrigger>
                    </TabsList>
                )}
            </div>

            <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                <TabsContent value="station" className="absolute inset-0 mt-0 overflow-y-auto border-none focus-visible:ring-0">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} className="h-full">
                        <NursingStationScreen />
                    </motion.div>
                </TabsContent>

                {canManageRoster && (
                    <TabsContent value="roster" className="absolute inset-0 mt-0 overflow-hidden border-none focus-visible:ring-0">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                            className="h-full bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 overflow-hidden shadow-md"
                        >
                            <NurseWardRoster />
                        </motion.div>
                    </TabsContent>
                )}
            </div>
        </Tabs>
    );
};

export default NursingStationPage;
