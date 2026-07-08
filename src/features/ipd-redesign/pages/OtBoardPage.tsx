import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, Settings, Package2 } from 'lucide-react';
import { OtBoardScreen } from '../screens/OtBoardScreen';
import { OtMaster } from '@/features/hospital/components/masters/OtMaster';
import { BoardInventoryPanel } from '../components/BoardInventoryPanel';

const OtBoardPage: React.FC = () => {
    return (
        <Tabs defaultValue="board" className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        OT Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage Plan Board and Theatre Configurations.</p>
                </div>
                <TabsList className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-full p-1 h-10">
                    <TabsTrigger value="board" className="gap-2 rounded-full px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300">
                        <LayoutGrid className="h-4 w-4" />
                        Plan Board
                    </TabsTrigger>
                    <TabsTrigger value="master" className="gap-2 rounded-full px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300">
                        <Settings className="h-4 w-4" />
                        Master Configuration
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="gap-2 rounded-full px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300">
                        <Package2 className="h-4 w-4" />
                        Inventory
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative">
                <TabsContent value="board" className="absolute inset-0 mt-0 p-0 overflow-hidden border-none focus-visible:ring-0">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                        <OtBoardScreen />
                    </motion.div>
                </TabsContent>
                
                <TabsContent value="master" className="absolute inset-0 mt-0 p-0 overflow-hidden border-none focus-visible:ring-0">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm p-4 custom-scrollbar overflow-y-auto"
                    >
                        <OtMaster />
                    </motion.div>
                </TabsContent>
                
                <TabsContent value="inventory" className="absolute inset-0 mt-0 p-0 overflow-hidden border-none focus-visible:ring-0">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                        <BoardInventoryPanel boardType="OT" />
                    </motion.div>
                </TabsContent>
            </div>
        </Tabs>
    );
};

export default OtBoardPage;
