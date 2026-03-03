import React from 'react';
import {
    HelpCircle,
    Plus,
    Edit,
    Search,
    Filter,
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

interface BillingQuickGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const BillingQuickGuide: React.FC<BillingQuickGuideProps> = ({
    open,
    onOpenChange
}) => {
    const guideSections = [
        {
            title: 'Add New Items',
            icon: <Plus className="h-5 w-5 text-indigo-500" />,
            content: 'Click the "Add Item" button to create a new charge. "Display Name" is mandatory. You can set default rates and discounts (0-100%).'
        },
        {
            title: 'Edit & Manage',
            icon: <Edit className="h-5 w-5 text-blue-500" />,
            content: 'Click the pencil icon to edit items inline. Changes are saved instantly when you click the Save icon. Use the "X" button to cancel changes.'
        },
        {
            title: 'Search & Sort',
            icon: <Search className="h-5 w-5 text-purple-500" />,
            content: 'Use the search bar to find items by name. Click any column header (Name, Type, Rate) to sort the list ascending or descending.'
        },
        {
            title: 'Filter by Type',
            icon: <Filter className="h-5 w-5 text-green-500" />,
            content: 'Use the dropdown to filter items by Visit Type (OPD, LAB, IPD, etc.) to quickly find specific categories of charges.'
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none bg-white dark:bg-gray-900 shadow-2xl">
                <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
                            <HelpCircle className="h-6 w-6" />
                            Billing Configuration Guide
                        </DialogTitle>
                        <DialogDescription className="text-indigo-100 text-base mt-2">
                            Manage your hospital's service rates and charge catalog efficiently.
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

                    <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex gap-4 items-start">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full flex-shrink-0 text-blue-600 dark:text-blue-300">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                                Pro Tip
                            </h4>
                            <p className="text-sm text-blue-800 dark:text-blue-400">
                                Rates and Discounst support decimal values (e.g. 50.50). Ensure your "Discount Upto" value does not exceed 100%.
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
