import React from 'react';
import { Bed as BedIcon, Wrench, Sparkles, ShieldAlert, CircleDot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Ward, Bed, BedStatus, WardType } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const WARD_TYPE_LABELS: Record<WardType, string> = {
    GENERAL: 'General',
    SEMI_PRIVATE: 'Semi-Private',
    PRIVATE: 'Private',
    ICU: 'ICU',
    HDU: 'HDU',
    NICU: 'NICU',
    PICU: 'PICU',
    EMERGENCY: 'Emergency',
};

const WARD_TYPE_COLORS: Record<WardType, string> = {
    GENERAL: 'bg-slate-100 text-slate-700',
    SEMI_PRIVATE: 'bg-violet-100 text-violet-700',
    PRIVATE: 'bg-indigo-100 text-indigo-700',
    ICU: 'bg-rose-100 text-rose-700',
    HDU: 'bg-orange-100 text-orange-700',
    NICU: 'bg-pink-100 text-pink-700',
    PICU: 'bg-amber-100 text-amber-700',
    EMERGENCY: 'bg-red-100 text-red-700',
};

interface BedCellProps {
    bed: Bed;
}

const STATUS_CONFIG: Record<BedStatus, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
    AVAILABLE: {
        bg: 'bg-emerald-50 hover:bg-emerald-100',
        border: 'border-emerald-300',
        icon: <BedIcon className="h-4 w-4 text-emerald-500" />,
        label: 'Available',
    },
    OCCUPIED: {
        bg: 'bg-rose-50 hover:bg-rose-100',
        border: 'border-rose-300',
        icon: <CircleDot className="h-4 w-4 text-rose-500" />,
        label: 'Occupied',
    },
    CLEANING: {
        bg: 'bg-amber-50 hover:bg-amber-100',
        border: 'border-amber-300',
        icon: <Sparkles className="h-4 w-4 text-amber-500" />,
        label: 'Cleaning',
    },
    MAINTENANCE: {
        bg: 'bg-slate-100 hover:bg-slate-200',
        border: 'border-slate-300',
        icon: <Wrench className="h-4 w-4 text-slate-400" />,
        label: 'Maintenance',
    },
    RESERVED: {
        bg: 'bg-blue-50 hover:bg-blue-100',
        border: 'border-blue-300',
        icon: <ShieldAlert className="h-4 w-4 text-blue-500" />,
        label: 'Reserved',
    },
};

const BedCell: React.FC<BedCellProps> = ({ bed }) => {
    const config = STATUS_CONFIG[bed.status];
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            'relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 cursor-default transition-all duration-200 select-none',
                            config.bg,
                            config.border,
                            bed.status === 'OCCUPIED' && 'shadow-sm'
                        )}
                        style={{ minWidth: '68px', minHeight: '68px' }}
                    >
                        {config.icon}
                        <span className="text-[10px] font-bold text-slate-600 leading-none">{bed.bedNumber}</span>
                        {bed.status === 'OCCUPIED' && bed.patientName && (
                            <span className="text-[8px] font-medium text-rose-600 text-center leading-tight line-clamp-2 px-0.5">
                                {bed.patientName.split(' ')[0]}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    <div className="space-y-0.5">
                        <p className="font-semibold">{bed.bedNumber} — {config.label}</p>
                        {bed.patientName && <p className="text-muted-foreground">Patient: {bed.patientName}</p>}
                        <p className="text-muted-foreground">₹{bed.pricePerDay.toLocaleString('en-IN')}/day</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

// ─── Legend ───────────────────────────────────────────────────────────────────

const BedLegend: React.FC = () => (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {(Object.entries(STATUS_CONFIG) as [BedStatus, typeof STATUS_CONFIG[BedStatus]][]).map(([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
                <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center', config.bg, config.border)}>
                    {config.icon}
                </div>
                <span className="text-slate-600 font-medium">{config.label}</span>
            </div>
        ))}
    </div>
);

// ─── Ward Card ────────────────────────────────────────────────────────────────

interface WardCardProps {
    ward: Ward;
}

const WardCard: React.FC<WardCardProps> = ({ ward }) => {
    const occupancyPct = Math.round(((ward.totalBeds - ward.availableBeds) / ward.totalBeds) * 100);
    const occupancyColor = occupancyPct >= 90 ? 'text-rose-600' : occupancyPct >= 70 ? 'text-amber-600' : 'text-emerald-600';

    return (
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-semibold text-slate-800">{ward.name}</CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-semibold', WARD_TYPE_COLORS[ward.type])}>
                                {WARD_TYPE_LABELS[ward.type]}
                            </Badge>
                            <span className="text-xs text-slate-400">{ward.floor}</span>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className={cn('text-lg font-black leading-none', occupancyColor)}>{occupancyPct}%</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">occupied</p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all duration-500',
                            occupancyPct >= 90 ? 'bg-rose-400' : occupancyPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                        )}
                        style={{ width: `${occupancyPct}%` }}
                    />
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-400">{ward.totalBeds - ward.availableBeds} occupied</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{ward.availableBeds} available</span>
                </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
                <div className="flex flex-wrap gap-2">
                    {ward.beds.map(bed => (
                        <BedCell key={bed.id} bed={bed} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────

interface BedMapViewProps {
    wards: Ward[];
}

export const BedMapView: React.FC<BedMapViewProps> = ({ wards }) => {
    const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0);
    const availableBeds = wards.reduce((s, w) => s + w.availableBeds, 0);
    const occupiedBeds = totalBeds - availableBeds;

    return (
        <div className="space-y-5">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-sm text-slate-600 font-medium">Total Beds: <span className="font-bold text-slate-800">{totalBeds}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="text-sm text-slate-600 font-medium">Occupied: <span className="font-bold text-rose-700">{occupiedBeds}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-sm text-slate-600 font-medium">Available: <span className="font-bold text-emerald-700">{availableBeds}</span></span>
                </div>
                <div className="ml-auto">
                    <BedLegend />
                </div>
            </div>

            {/* Ward grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {wards.map(ward => (
                    <WardCard key={ward.id} ward={ward} />
                ))}
            </div>
        </div>
    );
};
