import React, { useState } from 'react';
import { IndianRupee, FileText, ChevronRight, ChevronLeft, Settings2, Database, Bed, Stethoscope, Scissors, Warehouse, Pill, HardDrive, Truck, LogOut, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BillingPolicyConfig } from '@/features/hospital/components/BillingPolicyConfig';
import { PrescriptionConfig } from '@/features/prescription/components/PrescriptionConfig';
import { ChargeMaster } from '@/features/hospital/components/masters/ChargeMaster';
import { BedMaster } from '@/features/hospital/components/masters/BedMaster';
import { OtPlanMaster } from '@/features/hospital/components/masters/OtPlanMaster';
import { DoctorFees } from '@/features/hospital/components/masters/DoctorFees';
import { StoreMaster } from '@/features/hospital/components/masters/StoreMaster';
import { ItemMaster } from '@/features/hospital/components/masters/ItemMaster';
import { EquipmentMaster } from '@/features/hospital/components/masters/EquipmentMaster';
import { VendorMaster } from '@/features/hospital/components/masters/VendorMaster';
import { DischargeLetterheadConfig } from '@/features/ipd-redesign/components/DischargeLetterheadConfig';
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';

export const AdminConfigModule = () => {
    const [activeTab, setActiveTab] = useState('billing');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showMobileList, setShowMobileList] = useState(true);

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
            id: 'discharge-letterhead',
            label: 'Discharge Letterhead',
            description: 'Design the discharge summary letterhead and print layout',
            icon: LogOut,
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
            description: 'Set up floors, rooms and the beds each one holds',
            icon: Bed,
        },
        {
            id: 'ot-plans',
            label: 'OT Plans',
            description: 'Reusable procedure templates by department (e.g. PCNL, Hysterectomy)',
            icon: ClipboardList,
        },
        {
            id: 'doctor-fees',
            label: 'Doctor Fees',
            description: 'Set per-doctor OPD consult & IPD visit fees',
            icon: Stethoscope,
        },
        {
            id: 'store-master',
            label: 'Store Master',
            description: 'Set up the inventory store hierarchy (wards, OT, pharmacy, CSSD...)',
            icon: Warehouse,
        },
        {
            id: 'item-master',
            label: 'Item Master',
            description: 'Set up drugs, consumables & implants with schedule/LASA/high-alert flags',
            icon: Pill,
        },
        {
            id: 'equipment-master',
            label: 'Equipment Master',
            description: 'Biomedical/ICT/facility asset register with AMC & PM scheduling',
            icon: HardDrive,
        },
        {
            id: 'vendor-master',
            label: 'Vendor Master',
            description: 'Set up suppliers/distributors for procurement',
            icon: Truck,
        },
    ];

    return (
        <div className="flex max-lg:flex-col bg-white dark:bg-slate-900 lg:border border-gray-200 dark:border-gray-800 lg:rounded-2xl overflow-hidden shadow-sm lg:h-[calc(100vh-140px)] max-lg:h-[calc(100dvh-150px)] w-full relative z-10 animate-in fade-in duration-500">
            {/* Sidebar */}
            <aside
                className={cn(
                    "bg-gray-50/50 dark:bg-slate-900/50 lg:border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-20 relative",
                    isSidebarCollapsed ? "lg:w-16" : "lg:w-64",
                    !showMobileList ? "max-lg:hidden" : "max-lg:w-full max-lg:flex-1"
                )}
            >
                {/* Toggle Button (Desktop Only) */}
                <div className="absolute -right-3 top-6 z-30 max-lg:hidden">
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
                    <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                        <Settings2 className="h-6 w-6" />
                        {!isSidebarCollapsed && (
                            <span className="font-bold text-lg tracking-tight">Configuration</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 py-4 px-3 max-lg:px-0 max-lg:pt-0 max-lg:pb-24 space-y-2 max-lg:space-y-0 overflow-y-auto hide-scrollbar">
                    {navigationItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => { setActiveTab(item.id); setShowMobileList(false); }}
                            className={cn(
                                "flex items-center w-full lg:p-3 rounded-xl transition-all duration-200 group relative",
                                activeTab === item.id
                                    ? "lg:bg-brand-50 lg:dark:bg-brand-900/20 lg:text-brand-700 lg:dark:text-brand-300 lg:shadow-sm font-medium"
                                    : "text-gray-600 dark:text-gray-400 lg:hover:bg-white lg:dark:hover:bg-slate-800 lg:hover:text-gray-900 lg:dark:hover:text-gray-200 lg:hover:shadow-sm",
                                isSidebarCollapsed ? "lg:justify-center" : "gap-3",
                                "max-lg:p-4 max-lg:border-b max-lg:border-gray-100 max-lg:dark:border-gray-800 max-lg:rounded-none max-lg:bg-white max-lg:dark:bg-slate-950 max-lg:text-gray-900 max-lg:dark:text-white"
                            )}
                            title={isSidebarCollapsed ? item.label : undefined}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 flex-shrink-0 transition-colors",
                                activeTab === item.id ? "text-brand-600 dark:text-brand-400" : "text-gray-400 group-hover:text-brand-500"
                            )} />

                            {!isSidebarCollapsed && (
                                <div className="text-left overflow-hidden flex-1">
                                    <p className="font-semibold text-sm whitespace-nowrap max-lg:text-base max-lg:text-gray-800 max-lg:dark:text-gray-100">{item.label}</p>
                                    <p className="text-[10px] max-lg:text-xs text-gray-400 truncate max-w-[140px] max-lg:max-w-[280px] font-normal mt-0.5">{item.description}</p>
                                </div>
                            )}

                            <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 lg:hidden" />

                            {activeTab === item.id && !isSidebarCollapsed && (
                                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                            )}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className={cn(
                "flex-1 overflow-x-hidden overflow-y-auto hide-scrollbar bg-transparent relative flex flex-col min-h-0",
                showMobileList ? "max-lg:hidden" : "max-lg:flex"
            )}>
                {/* Mobile Back Header */}
                <div className="lg:hidden sticky top-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 p-3 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setShowMobileList(true)} className="h-10 w-10 shrink-0 rounded-full bg-gray-100/50 dark:bg-gray-800/50">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold truncate">
                            {navigationItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                </div>

                <SubscriptionReadOnlyOverlay featureLabel="Managing configuration" className="w-full h-full max-w-[1200px] mx-auto max-lg:p-0 p-4 sm:p-6 lg:p-8 flex-1 min-h-0 flex flex-col">
                    {activeTab === 'billing' && <BillingPolicyConfig />}
                    {activeTab === 'prescriptions' && <PrescriptionConfig />}
                    {activeTab === 'discharge-letterhead' && <DischargeLetterheadConfig />}
                    {activeTab === 'charge-master' && <ChargeMaster />}
                    {activeTab === 'bed-master' && <BedMaster />}
                    {activeTab === 'ot-plans' && <OtPlanMaster />}
                    {activeTab === 'doctor-fees' && <DoctorFees />}
                    {activeTab === 'store-master' && <StoreMaster />}
                    {activeTab === 'item-master' && <ItemMaster />}
                    {activeTab === 'equipment-master' && <EquipmentMaster />}
                    {activeTab === 'vendor-master' && <VendorMaster />}
                </SubscriptionReadOnlyOverlay>
            </main>
        </div>
    );
};
