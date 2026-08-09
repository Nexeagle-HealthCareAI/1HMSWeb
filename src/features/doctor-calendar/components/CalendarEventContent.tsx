import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Clock, User, Ban, CalendarDays, AlertCircle } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

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

    // Google-Calendar-style hover preview: quick details before the user commits to clicking
    // into the full edit modal. Wrapping with HoverCard doesn't intercept clicks, so the
    // existing eventClick handling on the FullCalendar event itself is untouched.
    const withPreview = (node: React.ReactNode, previewTitle: string, previewIcon?: React.ReactNode) => (
        <HoverCard openDelay={250} closeDelay={50}>
            <HoverCardTrigger asChild>
                <div className="h-full w-full">{node}</div>
            </HoverCardTrigger>
            <HoverCardContent className="w-56 p-3 pointer-events-none" sideOffset={8}>
                <div className="flex items-center gap-2 mb-1.5">
                    {previewIcon}
                    <span className="font-bold text-sm truncate">{previewTitle}</span>
                </div>
                {timeText && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {timeText}
                    </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1.5">{clickToManageHint}</p>
            </HoverCardContent>
        </HoverCard>
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
                            <span className="text-[10px] font-medium bg-black/5 dark:bg-white/10 px-1 rounded-sm text-current">
                                {badge}
                            </span>
                        )}
                        {icon && <span className="opacity-70">{icon}</span>}
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
        return withPreview(
            renderContent(
                title,
                isOverride ? clickToManageHint : undefined,
                isOverride ? overrideBadgeLabel : undefined,
                undefined, // No icon for shifts usually, or maybe a sun/moon based on shiftName
                'default'
            ),
            title
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
        return withPreview(
            renderContent(
                title,
                undefined,
                undefined,
                <Ban className="w-3 h-3" />,
                'timeoff'
            ),
            title,
            <Ban className="w-3.5 h-3.5 text-red-500" />
        );
    }

    if (eventType === 'block') {
        const isTimeOff = extendedProps.isTimeOff;
        return withPreview(
            renderContent(
                title,
                undefined,
                isTimeOff ? 'OFF' : 'BLOCK',
                isTimeOff ? <Ban className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />,
                'block'
            ),
            title,
            isTimeOff ? <Ban className="w-3.5 h-3.5 text-red-500" /> : <AlertCircle className="w-3.5 h-3.5" />
        );
    }

    // Default fallback
    return renderContent(title);
};
