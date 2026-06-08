import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    HelpCircle,
    Calendar,
    Filter,
    Activity,
    Printer,
    FileText,
    UserCheck,
    Clock
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardQuickGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const DashboardQuickGuide: React.FC<DashboardQuickGuideProps> = ({
    open,
    onOpenChange
}) => {
    const { t } = useTranslation();

    const guideSections = [
        {
            title: t('dashboardGuide.sections.overview.title', 'Dashboard Overview'),
            icon: <Activity className="h-5 w-5 text-brand-500" />,
            content: t('dashboardGuide.sections.overview.content', 'Monitor real-time appointment status, doctor availability, and patient flow. Toggle between Current, Past, and Future appointments using the tabs at the top.')
        },
        {
            title: t('dashboardGuide.sections.filters.title', 'Smart Filtering'),
            icon: <Filter className="h-5 w-5 text-purple-500" />,
            content: t('dashboardGuide.sections.filters.content', 'Quickly find appointments by filtering by Doctor, Status (e.g., "Vitals Required", "Ready"), or searching by Patient Name/ID.')
        },
        {
            title: t('dashboardGuide.sections.actions.title', 'Quick Actions'),
            icon: <Clock className="h-5 w-5 text-green-500" />,
            content: t('dashboardGuide.sections.actions.content', 'Perform key tasks directly from the list: Print Tokens, Record Vitals, View Case Sheets, and Print Prescriptions.')
        },
        {
            title: t('dashboardGuide.sections.stats.title', 'Live Statistics'),
            icon: <UserCheck className="h-5 w-5 text-orange-500" />,
            content: t('dashboardGuide.sections.stats.content', 'Click on the colored status cards (Vitals Required, Completed) or Doctor Cards to instantly filter the list for that specific category.')
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none bg-white dark:bg-gray-900 shadow-2xl">
                <div className="p-6 bg-gradient-to-r from-brand-600 to-brand-600 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
                            <HelpCircle className="h-6 w-6" />
                            {t('dashboardGuide.title', 'Quick Guide')}
                        </DialogTitle>
                        <DialogDescription className="text-brand-100 text-base mt-2">
                            {t('dashboardGuide.subtitle', 'Master your Appointment Dashboard with these key features.')}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="flex-1 p-6 bg-gray-50 dark:bg-gray-900/50">
                    <div className="grid gap-6 md:grid-cols-2">
                        {guideSections.map((section, index) => (
                            <div
                                key={index}
                                className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:scale-110 transition-transform duration-200">
                                        {section.icon}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                                            {section.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {section.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl flex gap-4 items-start">
                        <div className="p-2 bg-brand-100 dark:bg-brand-800 rounded-full flex-shrink-0 text-brand-600 dark:text-brand-300">
                            <span className="text-lg">💡</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-brand-900 dark:text-brand-300 mb-1">
                                {t('dashboardGuide.proTip.title', 'Pro Tip')}
                            </h4>
                            <p className="text-sm text-brand-800 dark:text-brand-400">
                                {t('dashboardGuide.proTip.content', 'Clicking on a "Doctor Card" effectively filters the entire dashboard for that doctor. Click it again to view all doctors.')}
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
