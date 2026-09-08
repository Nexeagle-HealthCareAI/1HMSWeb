import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { UnifiedWardBoard } from '../components/UnifiedWardBoard';

const NursingStationPage: React.FC = () => {
    const navigate = useNavigate();
    const roles = useAuthStore((state) => state.userRoles ?? (state.userRole ? [state.userRole] : []));
    const canManageRoster = roles.some(r => r === 'Admin' || r === 'AdminDoctor');

    return (
        <div className="flex flex-col h-full w-full bg-transparent overflow-hidden gap-4 pb-20 sm:pb-0">
            <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 text-white shadow-lg shadow-brand-500/10 rounded-2xl shrink-0 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 mt-1">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 rounded-xl active:scale-[0.98] transition-all" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Nursing Station</h1>
                        <p className="text-xs text-white/80 mt-0.5">Interactive Ward Whiteboard</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="h-full">
                    <UnifiedWardBoard />
                </motion.div>
            </div>
        </div>
    );
};

export default NursingStationPage;
