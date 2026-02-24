import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import '../styles/gamified-calendar.css';

interface GamifiedHeaderProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
    onViewChange: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => void;
    onAddOverride: () => void;
    doctorName: string;
}

export const GamifiedHeader: React.FC<GamifiedHeaderProps> = ({
    currentDate,
    onDateChange,
    view,
    onViewChange,
    onAddOverride,
    doctorName
}) => {
    const { t } = useTranslation();

    const handlePrevious = () => {
        const newDate = new Date(currentDate);
        if (view === 'dayGridMonth') newDate.setMonth(newDate.getMonth() - 1);
        else if (view === 'timeGridWeek') newDate.setDate(newDate.getDate() - 7);
        else if (view === 'timeGridDay') newDate.setDate(newDate.getDate() - 1);
        onDateChange(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (view === 'dayGridMonth') newDate.setMonth(newDate.getMonth() + 1);
        else if (view === 'timeGridWeek') newDate.setDate(newDate.getDate() + 7);
        else if (view === 'timeGridDay') newDate.setDate(newDate.getDate() + 1);
        onDateChange(newDate);
    };

    const getViewLabel = () => {
        switch (view) {
            case 'dayGridMonth': return format(currentDate, 'MMMM yyyy');
            case 'timeGridWeek': return t('doctorCalendar.weekOf', { date: format(currentDate, 'MMM dd, yyyy') });
            case 'timeGridDay': return format(currentDate, 'EEEE, MMMM d, yyyy');
            default: return format(currentDate, 'MMM dd, yyyy');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-3 glass-effect rounded-2xl mb-4 shadow-xl animate-fade-in border-none">
            {/* Left Section: Doctor Profile */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-premium-gradient p-0.5 shadow-md shrink-0">
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                        <span className="text-sm font-black text-poly-primary">{doctorName[0]}</span>
                    </div>
                </div>
                <h1 className="text-base font-black tracking-tight text-gray-900 dark:text-white truncate max-w-[150px]">
                    {doctorName}
                </h1>
            </div>

            {/* Center Section: Navigation */}
            <div className="flex items-center bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    className="w-8 h-8 rounded-lg hover:bg-poly-primary/10 hover:text-poly-primary dark:hover:bg-gray-700 shadow-sm transition-all"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            className="text-sm font-bold tracking-tight text-gray-900 dark:text-white px-3 h-8 hover:bg-poly-primary/10 dark:hover:bg-gray-700 hover:text-poly-primary dark:hover:text-white rounded-lg transition-all flex items-center gap-2 min-w-[180px] justify-center"
                        >
                            <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
                            {getViewLabel()}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="center">
                        <Calendar
                            mode="single"
                            selected={currentDate}
                            onSelect={(date) => date && onDateChange(date)}
                            initialFocus
                            className="glass-effect border-none"
                        />
                    </PopoverContent>
                </Popover>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="w-8 h-8 rounded-lg hover:bg-poly-primary/10 hover:text-poly-primary dark:hover:bg-gray-700 shadow-sm transition-all"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Right Section: View Controls & Primary Action */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDateChange(new Date())}
                    className="h-8 px-3 rounded-lg font-bold border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-poly-primary hover:border-poly-primary/30 transition-all"
                >
                    {t('doctorCalendar.today', 'Today')}
                </Button>

                <div className="flex p-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                    {[
                        { id: 'dayGridMonth', label: t('doctorCalendar.views.month') },
                        { id: 'timeGridWeek', label: t('doctorCalendar.views.week') },
                        { id: 'timeGridDay', label: t('doctorCalendar.views.day') }
                    ].map((v) => (
                        <Button
                            key={v.id}
                            onClick={() => onViewChange(v.id as any)}
                            variant={view === v.id ? 'default' : 'ghost'}
                            className={cn(
                                "h-7 px-3 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200",
                                view === v.id
                                    ? "bg-white dark:bg-gray-700 shadow-md text-poly-primary"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            {v.label}
                        </Button>
                    ))}
                </div>

                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden lg:block" />

                <Button
                    onClick={onAddOverride}
                    className="bg-premium-gradient hover:opacity-90 text-white border-none shadow-md px-4 h-8 rounded-lg text-xs font-black uppercase tracking-tight transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t('doctorCalendar.scheduleAndTimeOff')}
                </Button>
            </div>
        </div>
    );
};
