import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Clock, User, Ban, CalendarDays, AlertCircle } from 'lucide-react';

export interface CalendarEventContentProps {
    event: any;
    timeText: string;
}

export const CalendarEventContent: React.FC<CalendarEventContentProps> = ({ event, timeText }) => {
    const { t } = useTranslation();
    const extendedProps = event.extendedProps || {};
    const eventType = extendedProps.type;
    const title = event.title;

    // Shift related props
    const isOverride = extendedProps.isOverride;
    const shiftName = extendedProps.shiftName;
    const clickToManageHint = t('doctorCalendar.clickToManageHint');
    const overrideBadgeLabel = t('doctorCalendar.overrideBadge');

    // Appointment related props
    const tokenNumber = extendedProps.tokenNumber || '#';
    const patientName = extendedProps.patientName || title;

    const renderBadge = (label: string, className?: string) => (
        <span className={cn("text-[10px] uppercase tracking-[0.16em] font-bold px-1 rounded-sm", className)}>
            {label}
        </span>
    );

    const renderContent = (
        mainContent: string,
        subtext?: string,
        badge?: string,
        icon?: React.ReactNode,
        variant: 'default' | 'appointment' | 'timeoff' | 'block' = 'default'
    ) => {
        return (
            <div className={cn(
                "h-full flex flex-col justify-between p-1.5 w-full overflow-hidden leading-tight",
                // Additional container classes if needed
            )}>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 justify-between">
                        {badge && (
                            <span className="text-[9px] uppercase tracking-wider font-bold bg-white/20 px-1 rounded-sm text-white/90">
                                {badge}
                            </span>
                        )}
                        {icon && <span className="opacity-80">{icon}</span>}
                    </div>

                    <div className="font-semibold text-xs truncate" title={mainContent}>
                        {mainContent}
                    </div>

                    {subtext && (
                        <div className="text-[10px] opacity-85 truncate" title={subtext}>
                            {subtext}
                        </div>
                    )}
                </div>

                {timeText && (
                    <div className="text-[10px] opacity-75 font-medium mt-auto flex items-center gap-1 pt-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeText}
                    </div>
                )}
            </div>
        );
    };

    if (eventType === 'shift') {
        return renderContent(
            title,
            isOverride ? clickToManageHint : undefined,
            isOverride ? overrideBadgeLabel : undefined,
            undefined, // No icon for shifts usually, or maybe a sun/moon based on shiftName
            'default'
        );
    }

    if (eventType === 'appointment') {
        return (
            <div className="h-full flex flex-col justify-between p-1.5 w-full overflow-hidden bg-primary/10 border-l-2 border-primary text-primary-foreground dark:text-primary">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-xs font-bold text-primary">
                        <span>Token: {tokenNumber}</span>
                        <User className="w-3 h-3" />
                    </div>
                    <div className="font-semibold text-xs truncate text-foreground/90" title={patientName}>
                        {patientName}
                    </div>
                </div>
                <div className="text-[10px] opacity-70 font-medium text-foreground/70 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {timeText}
                </div>
            </div>
        );
    }

    if (eventType === 'timeoff') {
        return renderContent(
            title,
            undefined,
            undefined,
            <Ban className="w-3 h-3" />,
            'timeoff'
        );
    }

    if (eventType === 'block') {
        const isTimeOff = extendedProps.isTimeOff;
        return renderContent(
            title,
            undefined,
            isTimeOff ? 'OFF' : 'BLOCK',
            isTimeOff ? <Ban className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />,
            'block'
        );
    }

    // Default fallback
    return renderContent(title);
};
