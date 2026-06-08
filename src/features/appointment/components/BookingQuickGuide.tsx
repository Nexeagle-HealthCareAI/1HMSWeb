import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    HelpCircle,
    Stethoscope,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BookingQuickGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const BookingQuickGuide: React.FC<BookingQuickGuideProps> = ({
    open,
    onOpenChange
}) => {
    const { t } = useTranslation();

    const guideSections = [
        {
            title: t('bookingGuide.sections.selection.title', 'Find Your Doctor'),
            icon: <Stethoscope className="h-5 w-5 text-brand-500" />,
            content: t('bookingGuide.sections.selection.content', 'Choose a Department first, then select a Doctor from the available list. You can see their specialization and availability instantly.')
        },
        {
            title: t('bookingGuide.sections.date.title', 'Pick a Date & Shift'),
            icon: <Calendar className="h-5 w-5 text-purple-500" />,
            content: t('bookingGuide.sections.date.content', 'Select your preferred date from the calendar. Then choose a shift (Morning, Afternoon, Evening) to see relevant time slots.')
        },
        {
            title: t('bookingGuide.sections.slots.title', 'Select Time Slot'),
            icon: <Clock className="h-5 w-5 text-green-500" />,
            content: t('bookingGuide.sections.slots.content', 'Tap on any available green slot to book. Red slots are already booked. Keep an eye out for "Time Off" indicators if a doctor is unavailable.')
        },
        {
            title: t('bookingGuide.sections.confirm.title', 'Book & Confirm'),
            icon: <CheckCircle2 className="h-5 w-5 text-orange-500" />,
            content: t('bookingGuide.sections.confirm.content', 'Enter patient details in the popup form to finalize the appointment. You can also print the token immediately after booking.')
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none bg-white dark:bg-gray-900 shadow-2xl">
                <div className="p-6 bg-gradient-to-r from-brand-600 to-brand-600 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
                            <HelpCircle className="h-6 w-6" />
                            {t('bookingGuide.title', 'Booking Guide')}
                        </DialogTitle>
                        <DialogDescription className="text-brand-100 text-base mt-2">
                            {t('bookingGuide.subtitle', 'Simple steps to book a new appointment.')}
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

                    <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl flex gap-4 items-start">
                        <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-full flex-shrink-0 text-orange-600 dark:text-orange-300">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
                                {t('bookingGuide.note.title', 'Important Note')}
                            </h4>
                            <p className="text-sm text-orange-800 dark:text-orange-400">
                                {t('bookingGuide.note.content', 'Please ensure patient details are accurate. For revisiting patients, you can use the "Search" feature in the patient form to auto-fill details.')}
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
