import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
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
        <div className="flex flex-col gap-3 p-3 md:p-4 glass-effect rounded-2xl mb-4 shadow-xl animate-fade-in border-none">
            <div className="flex flex-row items-center justify-between gap-2 md:gap-4 w-full">
                {/* Left Section: Doctor identity */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-premium-gradient p-0.5 shadow-md shrink-0">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                            <span className="text-xs md:text-sm font-black text-brand-500">{doctorName[0]}</span>
                        </div>
                    </div>
                    <h1 className="text-sm md:text-base font-black tracking-tight text-gray-900 dark:text-white truncate max-w-[120px] md:max-w-[180px]">
                        {doctorName}
                    </h1>
                </div>

                {/* Right Section (Mobile Action) */}
                <div className="flex md:hidden items-center gap-2">
                    <Button
                        onClick={onAddOverride}
                        size="sm"
                        className="bg-premium-gradient hover:opacity-90 text-white border-none shadow-md px-3 h-8 rounded-lg text-xs font-black uppercase tracking-tight shrink-0 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-3.5 w-3.5 md:mr-1.5" />
                        <span className="hidden sm:inline">{t('doctorCalendar.addOverride', 'Add Override')}</span>
                    </Button>
                </div>

                {/* Center Section: Navigation (Desktop only) */}
                <div className="hidden md:flex items-center bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevious}
                        className="w-8 h-8 rounded-lg hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className="text-sm font-bold tracking-tight text-gray-900 dark:text-white px-3 h-8 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2 min-w-[180px] justify-center"
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
                        className="w-8 h-8 rounded-lg hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Right Section: View Controls & Primary Action (Desktop) */}
                <div className="hidden md:flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDateChange(new Date())}
                        className="h-8 px-3 rounded-lg font-bold border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-brand-500 hover:border-brand-500/30 transition-all"
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
                                        ? "bg-white dark:bg-gray-700 shadow-md text-brand-500"
                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
                                )}
                            >
                                {v.label}
                            </Button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                    <Button
                        onClick={onAddOverride}
                        size="sm"
                        className="bg-premium-gradient hover:opacity-90 text-white border-none shadow-md px-4 h-8 rounded-lg text-xs font-black uppercase tracking-tight shrink-0 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        {t('doctorCalendar.addOverride', 'Add Override')}
                    </Button>
                </div>
            </div>

            {/* Mobile Controls Layer (View Toggle + Nav) */}
            <div className="flex md:hidden flex-col gap-2 w-full">
                <div className="flex w-full p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                    {[
                        { id: 'dayGridMonth', label: t('doctorCalendar.views.month', 'Month') },
                        { id: 'timeGridWeek', label: t('doctorCalendar.views.week', 'Week') },
                        { id: 'timeGridDay', label: t('doctorCalendar.views.day', 'Day') }
                    ].map((v) => (
                        <Button
                            key={v.id}
                            onClick={() => onViewChange(v.id as any)}
                            variant={view === v.id ? 'default' : 'ghost'}
                            className={cn(
                                "flex-1 h-9 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200",
                                view === v.id
                                    ? "bg-white dark:bg-gray-700 shadow-md text-brand-500"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
                            )}
                        >
                            {v.label}
                        </Button>
                    ))}
                </div>

                <div className="flex items-center justify-between glass-effect p-1.5 rounded-lg border-none w-full">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevious}
                        className="w-10 h-10 rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex-1 text-sm font-bold tracking-tight text-gray-900 dark:text-white h-10 hover:bg-transparent flex items-center justify-center gap-2"
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
                        className="w-10 h-10 rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
