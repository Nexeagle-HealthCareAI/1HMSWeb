import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Megaphone, Search, MessageCircle, UserRound, Building2,
    ChevronLeft, ChevronRight, RotateCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { useAuthStore } from '@/store/authStore';
import { leadsApi, type HospitalLead, type LeadSource, type LeadType, type GetHospitalLeadsResponse } from '../services/leadsApi';

const PAGE_SIZE = 20;

const LEAD_TYPE_LABEL: Record<LeadType, string> = {
    DoctorNameSearch: 'Doctor name search',
    HospitalNameSearch: 'Hospital name search',
    DoctorProfileView: 'Doctor profile view',
    HospitalPageView: 'Hospital page view',
};

const SOURCE_ICON: Record<LeadSource, React.ReactNode> = {
    DoctorDekho: <Search className="h-3.5 w-3.5" />,
    WhatsApp: <MessageCircle className="h-3.5 w-3.5" />,
};

function formatDateTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

export const LeadGenerationPage: React.FC = () => {
    const { t } = useTranslation();
    const { hospitalId } = useAuthStore();

    const [page, setPage] = useState(1);
    const [source, setSource] = useState<LeadSource | 'all'>('all');
    const [leadType, setLeadType] = useState<LeadType | 'all'>('all');
    const [data, setData] = useState<GetHospitalLeadsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeads = useCallback(async () => {
        if (!hospitalId) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const response = await leadsApi.getHospitalLeads(hospitalId, {
                page,
                pageSize: PAGE_SIZE,
                source: source === 'all' ? undefined : source,
                leadType: leadType === 'all' ? undefined : leadType,
            });
            setData(response);
        } catch (err) {
            console.error('Failed to fetch leads:', err);
            setError(t('leads.loadError') || 'Could not load leads. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [hospitalId, page, source, leadType, t]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Filter changes reset to page 1 -- otherwise a narrower filter can land on an empty page.
    useEffect(() => {
        setPage(1);
    }, [source, leadType]);

    const totalPages = useMemo(() => {
        if (!data || data.pageSize <= 0) return 1;
        return Math.max(1, Math.ceil(data.totalCount / data.pageSize));
    }, [data]);

    const totalLeads = data ? Object.values(data.countBySource).reduce((a, b) => a + b, 0) : 0;
    const whatsappLeads = data?.countBySource?.WhatsApp ?? 0;
    const doctorDekhoLeads = data?.countBySource?.DoctorDekho ?? 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-4 min-h-screen bg-gray-50/50 dark:bg-slate-950/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-4 md:p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 md:gap-3">
                        <Megaphone className="h-6 w-6 md:h-8 md:w-8 text-brand-600" />
                        {t('leads.title') || 'HCRM'}
                        <span className="text-xs md:text-sm font-semibold text-gray-400 dark:text-gray-500 tracking-wide">
                            Hospital Customer Relationship Management
                        </span>
                    </h2>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
                        {t('leads.description') || 'Turn every doctor search, WhatsApp enquiry, and social visit into a followed-up patient. HCRM tracks leads from Doctor Dekho and WhatsApp today, with Meta & Instagram campaign connections and AI-based lead scoring and follow-up tracking on the roadmap — so your team always knows who to call next, and what actually drives bookings.'}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLeads} disabled={isLoading} className="h-10 rounded-xl font-semibold self-start md:self-auto">
                    <RotateCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('leads.refresh') || 'Refresh'}
                </Button>
            </div>

            {/* KPI summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-gray-100 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Megaphone className="h-4 w-4" /> {t('leads.totalLeads') || 'Total Leads'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalLeads}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-gray-100 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" /> {t('leads.whatsappLeads') || 'WhatsApp'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{whatsappLeads}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-gray-100 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Search className="h-4 w-4" /> {t('leads.doctorDekhoLeads') || 'Doctor Dekho'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{doctorDekhoLeads}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Select value={source} onValueChange={(v) => setSource(v as LeadSource | 'all')}>
                    <SelectTrigger className="w-full sm:w-56 h-11 rounded-xl">
                        <SelectValue placeholder={t('leads.filterSource') || 'Source'} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('leads.allSources') || 'All sources'}</SelectItem>
                        <SelectItem value="DoctorDekho">Doctor Dekho</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={leadType} onValueChange={(v) => setLeadType(v as LeadType | 'all')}>
                    <SelectTrigger className="w-full sm:w-64 h-11 rounded-xl">
                        <SelectValue placeholder={t('leads.filterType') || 'Lead type'} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('leads.allTypes') || 'All types'}</SelectItem>
                        {(Object.keys(LEAD_TYPE_LABEL) as LeadType[]).map((lt) => (
                            <SelectItem key={lt} value={lt}>{LEAD_TYPE_LABEL[lt]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="rounded-3xl border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <p className="text-gray-500 dark:text-gray-400">{error}</p>
                        </div>
                    ) : !data || data.leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-full mb-4">
                                <Megaphone className="h-10 w-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {t('leads.emptyTitle') || 'No leads yet'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                {t('leads.emptyDescription') || 'Searches and views from Doctor Dekho and WhatsApp will show up here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('leads.columnWhen') || 'When'}</TableHead>
                                        <TableHead>{t('leads.columnSource') || 'Source'}</TableHead>
                                        <TableHead>{t('leads.columnType') || 'Type'}</TableHead>
                                        <TableHead>{t('leads.columnMatched') || 'Doctor / Query'}</TableHead>
                                        <TableHead>{t('leads.columnContact') || 'Contact'}</TableHead>
                                        <TableHead>{t('leads.columnLocation') || 'Location'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.leads.map((lead: HospitalLead) => (
                                        <TableRow key={lead.leadId}>
                                            <TableCell className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatDateTime(lead.occurredAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="gap-1.5 font-semibold">
                                                    {SOURCE_ICON[lead.source]} {lead.source}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{LEAD_TYPE_LABEL[lead.leadType] || lead.leadType}</TableCell>
                                            <TableCell className="text-sm">
                                                {lead.doctorName ? (
                                                    <span className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                                                        <UserRound className="h-3.5 w-3.5 text-gray-400" /> {lead.doctorName}
                                                    </span>
                                                ) : lead.searchQuery ? (
                                                    <span className="text-gray-700 dark:text-gray-300">&ldquo;{lead.searchQuery}&rdquo;</span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                                        <Building2 className="h-3.5 w-3.5" /> {t('leads.hospitalPage') || 'Hospital page'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                                {lead.mobile || lead.patientName || (
                                                    <span className="text-gray-400 dark:text-gray-600">{t('leads.anonymous') || 'Anonymous'}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                                                {[lead.city, lead.region].filter(Boolean).join(', ') || '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {data && data.totalCount > 0 && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('leads.pageOf', { page, totalPages }) || `Page ${page} of ${totalPages}`}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-9 rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
