import React, { useState } from 'react';
import { IndianRupee, FileText, ChevronRight, ChevronLeft, Settings2, Database, Bed, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BillingPolicyConfig } from '@/features/hospital/components/BillingPolicyConfig';
import { PrescriptionConfig } from '@/features/prescription/components/PrescriptionConfig';
import { ChargeMaster } from '@/features/hospital/components/masters/ChargeMaster';
import { BedMaster } from '@/features/hospital/components/masters/BedMaster';
import { DoctorFees } from '@/features/hospital/components/masters/DoctorFees';

export const AdminConfigModule = () => {
    const [activeTab, setActiveTab] = useState('billing');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const navigationItems = [
        {
            id: 'billing',
            label: 'Billing Policy',
            description: 'Configure global billing rules, discounts & triggers',
            icon: IndianRupee,
        },
        {
            id: 'prescriptions',
            label: 'Prescriptions',
            description: 'Configure prescription layouts and fields',
            icon: FileText,
        },
        {
            id: 'charge-master',
            label: 'Charge Master',
            description: 'Manage comprehensive service & pricing catalog',
            icon: Database,
        },
        {
            id: 'bed-master',
            label: 'Bed Master',
            description: 'Configure wards, rooms, beds and daily rates',
            icon: Bed,
        },
        {
            id: 'doctor-fees',
            label: 'Doctor Fees',
            description: 'Set per-doctor OPD consult & IPD visit fees',
            icon: Stethoscope,
        },
    ];

    return (
        <div className="flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-140px)] w-full relative z-10 animate-in fade-in duration-500">
            {/* Sidebar */}
            <aside
                className={cn(
                    "bg-gray-50/50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-20 relative",
                    isSidebarCollapsed ? "w-16" : "w-64"
                )}
            >
                {/* Toggle Button */}
                <div className="absolute -right-3 top-6 z-30">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 flex items-center justify-center p-0"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    >
                        {isSidebarCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Sidebar Header */}
                <div className={cn(
                    "h-16 flex items-center border-b border-dashed border-gray-200 dark:border-gray-800",
                    isSidebarCollapsed ? "justify-center px-0" : "px-6"
                )}>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Settings2 className="h-6 w-6" />
                        {!isSidebarCollapsed && (
                            <span className="font-bold text-lg tracking-tight">Configuration</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
                    {navigationItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative",
                                activeTab === item.id
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm font-medium"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200 hover:shadow-sm",
                                isSidebarCollapsed ? "justify-center" : "gap-3"
                            )}
                            title={isSidebarCollapsed ? item.label : undefined}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 flex-shrink-0 transition-colors",
                                activeTab === item.id ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-500"
                            )} />

                            {!isSidebarCollapsed && (
                                <div className="text-left overflow-hidden">
                                    <p className="font-semibold text-sm whitespace-nowrap">{item.label}</p>
                                    <p className="text-[10px] text-gray-400 truncate max-w-[140px] font-normal">{item.description}</p>
                                </div>
                            )}

                            {activeTab === item.id && !isSidebarCollapsed && (
                                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            )}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 bg-transparent">
                <div className="w-full h-full max-w-[1200px] mx-auto">
                    {activeTab === 'billing' && <BillingPolicyConfig />}
                    {activeTab === 'prescriptions' && <PrescriptionConfig />}
                    {activeTab === 'charge-master' && <ChargeMaster />}
                    {activeTab === 'bed-master' && <BedMaster />}
                    {activeTab === 'doctor-fees' && <DoctorFees />}
                </div>
            </main>
        </div>
    );
};
