import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Stethoscope, Calendar, Clock,
    AlertTriangle, CheckCircle2, XCircle, ArrowRightLeft, FileText,
    Phone, Activity, ClipboardList, Printer, Loader2, Receipt,
    Award, Pill, Utensils, Dumbbell, ChevronRight,
} from 'lucide-react';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Admission, AdmissionStatus, AdmissionPriority, IPDBill, DischargeCertificate, BillItemCategory } from '../types';
import { ipdService } from '../services/ipdService';
import { buildIPDBillA4, buildDischargeCertificateA4 } from '../utils/ipdPrintUtils';
import { openPrintHtml } from '@/utils/printUtils';

// ─── Status & Priority Configs ────────────────────────────────────────────────

const STATUS_CONFIG: Record<AdmissionStatus, { label: string; className: string; icon: React.ReactNode }> = {
    ADMITTED: { label: 'Admitted', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
    PENDING_ADMISSION: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
    DISCHARGED: { label: 'Discharged', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: <XCircle className="h-3 w-3" /> },
    TRANSFERRED: { label: 'Transferred', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: <ArrowRightLeft className="h-3 w-3" /> },
    CANCELLED: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700 border-rose-200', icon: <XCircle className="h-3 w-3" /> },
};

const PRIORITY_CONFIG: Record<AdmissionPriority, { label: string; className: string }> = {
    ROUTINE: { label: 'Routine', className: 'bg-slate-100 text-slate-600' },
    URGENT: { label: 'Urgent', className: 'bg-amber-100 text-amber-700' },
    EMERGENCY: { label: 'Emergency', className: 'bg-rose-100 text-rose-700' },
};

const CATEGORY_COLORS: Record<BillItemCategory, string> = {
    'Bed Charges': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'ICU Charges': 'bg-rose-50 text-rose-700 border-rose-100',
    'Nursing': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Doctor Visits': 'bg-blue-50 text-blue-700 border-blue-100',
    'Procedures': 'bg-purple-50 text-purple-700 border-purple-100',
    'Investigations': 'bg-amber-50 text-amber-700 border-amber-100',
    'Medicines': 'bg-teal-50 text-teal-700 border-teal-100',
    'OT Charges': 'bg-orange-50 text-orange-700 border-orange-100',
    'Miscellaneous': 'bg-slate-50 text-slate-600 border-slate-200',
};

const CONDITION_LABELS: Record<string, { label: string; className: string }> = {
    STABLE: { label: 'Stable', className: 'bg-emerald-100 text-emerald-700' },
    IMPROVED: { label: 'Improved', className: 'bg-blue-100 text-blue-700' },
    RECOVERED: { label: 'Fully Recovered', className: 'bg-green-100 text-green-700' },
    REFERRED: { label: 'Referred', className: 'bg-amber-100 text-amber-700' },
    LAMA: { label: 'Left AMA', className: 'bg-orange-100 text-orange-700' },
    EXPIRED: { label: 'Expired', className: 'bg-red-100 text-red-700' },
};

// ─── Detail Row Component ─────────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value?: string | number | null; icon?: React.ReactNode; highlight?: boolean }> = ({
    label, value, icon, highlight,
}) => (
    <div className="flex items-start gap-3 py-2.5">
        {icon && <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={cn('text-sm font-medium text-slate-800 mt-0.5 break-words', highlight && 'text-indigo-700 font-semibold')}>
                {value ?? <span className="text-slate-400 italic font-normal">Not specified</span>}
            </p>
        </div>
    </div>
);

// ─── Billing Summary ──────────────────────────────────────────────────────────

const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading…' }) => (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">{message}</p>
    </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
        <div className="h-12 w-12 mx-auto bg-slate-100 rounded-xl flex items-center justify-center">
            {icon}
        </div>
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
    </div>
);

// ─── Bill Tab ─────────────────────────────────────────────────────────────────

const BillTab: React.FC<{ admission: Admission; isActive: boolean; onOpenChange: (open: boolean) => void }> = ({ admission, isActive, onOpenChange }) => {
    const navigate = useNavigate();
    const [bill, setBill] = useState<IPDBill | null>(null);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const openBillingWorkspace = () => {
        if (!admission.encounterId) return;
        const params = new URLSearchParams({
            patientId: admission.patientId,
            patientName: admission.patientName,
            ...(admission.admissionNo ? { admissionNo: admission.admissionNo } : {}),
            ...(admission.wardName && admission.bedNumber ? { wardBed: `${admission.wardName} · ${admission.bedNumber}` } : {}),
        });
        onOpenChange(false); // close the sheet before navigating
        navigate(`/billing/encounter/${admission.encounterId}?${params.toString()}`);
    };

    useEffect(() => {
        if (!isActive || loaded) return;
        setLoading(true);
        ipdService.getBillForAdmission(admission.id).then(b => {
            setBill(b);
            setLoaded(true);
            setLoading(false);
        });
    }, [isActive, admission.id, loaded]);

    if (loading) return <LoadingState message="Loading…" />;
    if (!bill) return (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
            <div className="h-12 w-12 mx-auto bg-blue-100 rounded-xl flex items-center justify-center">
                <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">Open Billing Workspace</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Add charges, generate the bill, record payments, and finalize for this encounter.
                </p>
            </div>
            <Button
                onClick={openBillingWorkspace}
                disabled={!admission.encounterId}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
            >
                <Receipt className="h-4 w-4 mr-2" />
                Open Billing
                <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            {!admission.encounterId && (
                <p className="text-[11px] text-amber-600">No encounter linked to this admission.</p>
            )}
        </div>
    );

    const balance = bill.balanceDue;
    const paidPct = bill.grandTotal > 0 ? Math.min(100, Math.round((bill.totalPaid / bill.grandTotal) * 100)) : 0;

    const grouped = bill.items.reduce<Record<string, typeof bill.items>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    return (
        <div className="space-y-5 pb-28">
            {/* Status banner */}
            <div className={cn(
                'flex items-center justify-between p-3 rounded-xl border',
                bill.status === 'FINAL' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
            )}>
                <div className="flex items-center gap-2">
                    <Receipt className={cn('h-4 w-4', bill.status === 'FINAL' ? 'text-emerald-600' : 'text-amber-600')} />
                    <span className="text-sm font-bold text-slate-700">{bill.billNo}</span>
                    <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        bill.status === 'FINAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    )}>
                        {bill.status === 'FINAL' ? 'FINAL' : 'INTERIM'}
                    </span>
                </div>
                <Button
                    size="sm"
                    className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                    onClick={() => openPrintHtml(buildIPDBillA4(bill))}
                >
                    <Printer className="h-3.5 w-3.5" />
                    Print Bill
                </Button>
            </div>

            {/* Totals summary */}
            <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                    <p className="text-base font-black text-slate-800 mt-0.5">
                        ₹{bill.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Paid</p>
                    <p className="text-base font-black text-emerald-700 mt-0.5">
                        ₹{bill.totalPaid.toLocaleString('en-IN')}
                    </p>
                </div>
                <div className={cn('p-3 rounded-xl border text-center', balance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100')}>
                    <p className={cn('text-[10px] font-bold uppercase tracking-widest', balance > 0 ? 'text-rose-400' : 'text-slate-400')}>Balance</p>
                    <p className={cn('text-base font-black mt-0.5', balance > 0 ? 'text-rose-700' : 'text-slate-800')}>
                        ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Payment Progress</span>
                    <span className="font-bold text-slate-700">{paidPct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${paidPct}%` }}
                    />
                </div>
            </div>

            {/* Items grouped by category */}
            <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Charges Breakdown</p>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</th>
                                <th className="text-right px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Rate × Qty</th>
                                <th className="text-right px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(grouped).map(([category, items]) => (
                                <React.Fragment key={category}>
                                    <tr className="bg-slate-50/50">
                                        <td colSpan={3} className="px-3 py-1.5">
                                            <span className={cn(
                                                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                                                CATEGORY_COLORS[category as BillItemCategory] ?? 'bg-slate-50 text-slate-500 border-slate-100'
                                            )}>
                                                {category}
                                            </span>
                                        </td>
                                    </tr>
                                    {items.map(item => (
                                        <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-3 py-2 text-slate-700 text-xs">{item.description}</td>
                                            <td className="px-3 py-2 text-right text-xs text-slate-500 whitespace-nowrap">
                                                ₹{item.rate.toLocaleString('en-IN')} × {item.qty}
                                                {item.discountPct > 0 && (
                                                    <span className="ml-1.5 text-rose-400">({item.discountPct}% off)</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-slate-800 text-xs whitespace-nowrap">
                                                ₹{item.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                            <tr className="bg-slate-50 border-t border-slate-100">
                                <td colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-slate-500">Sub Total</td>
                                <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                    ₹{bill.subTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                            {bill.discountTotal > 0 && (
                                <tr className="bg-rose-50/30">
                                    <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-rose-500">Discount</td>
                                    <td className="px-3 py-2 text-right text-xs font-semibold text-rose-600">
                                        − ₹{bill.discountTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            )}
                            <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                                <td colSpan={2} className="px-3 py-3 text-sm font-black text-slate-800">Grand Total</td>
                                <td className="px-3 py-3 text-right text-sm font-black text-indigo-700">
                                    ₹{bill.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment history */}
            {bill.payments.length > 0 && (
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Payment History</p>
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</th>
                                    <th className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Mode</th>
                                    <th className="text-right px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.payments.map(p => (
                                    <tr key={p.id} className="border-b border-slate-50 last:border-b-0">
                                        <td className="px-3 py-2 text-xs text-slate-600">
                                            {format(new Date(p.date), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                                {p.mode}
                                            </span>
                                            {p.transactionRef && (
                                                <span className="ml-1.5 text-[10px] text-slate-400 font-mono">{p.transactionRef.slice(-8)}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-bold text-emerald-700">
                                            ₹{p.amount.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Discharge Certificate Tab ────────────────────────────────────────────────

const CertificateTab: React.FC<{ admissionId: string; isActive: boolean }> = ({ admissionId, isActive }) => {
    const [cert, setCert] = useState<DischargeCertificate | null>(null);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!isActive || loaded) return;
        setLoading(true);
        ipdService.getDischargeCertificate(admissionId).then(c => {
            setCert(c);
            setLoaded(true);
            setLoading(false);
        });
    }, [isActive, admissionId, loaded]);

    if (loading) return <LoadingState message="Loading discharge certificate…" />;
    if (!cert) return (
        <EmptyState
            icon={<Award className="h-6 w-6 text-slate-400" />}
            title="Certificate Not Available"
            description="Discharge certificate is only available for discharged patients."
        />
    );

    const condCfg = CONDITION_LABELS[cert.conditionAtDischarge] ?? { label: cert.conditionAtDischarge, className: 'bg-slate-100 text-slate-600' };

    return (
        <div className="space-y-4 pb-28">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-bold text-slate-700">{cert.certificateNo}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        Discharge Certificate
                    </span>
                </div>
                <Button
                    size="sm"
                    className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                    onClick={() => openPrintHtml(buildDischargeCertificateA4(cert))}
                >
                    <Printer className="h-3.5 w-3.5" />
                    Print Certificate
                </Button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100">
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Condition at Discharge</p>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block', condCfg.className)}>
                        {condCfg.label}
                    </span>
                </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Final Diagnosis</p>
                <p className="text-sm font-bold text-indigo-900">{cert.finalDiagnosis}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Treatment Summary</p>
                <p className="text-xs text-slate-600 leading-relaxed">{cert.treatmentSummary}</p>
            </div>

            {cert.proceduresPerformed.length > 0 && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Procedures Performed</p>
                    <ul className="space-y-1">
                        {cert.proceduresPerformed.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-purple-800">
                                <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-purple-400" />
                                {p}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-100 space-y-2">
                <div className="flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-teal-600" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-500">Medications Prescribed</p>
                </div>
                <ul className="space-y-1">
                    {cert.medications.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-teal-900">
                            <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-teal-400" />
                            {m}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <Utensils className="h-3.5 w-3.5 text-amber-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Diet</p>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed">{cert.diet}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-3.5 w-3.5 text-orange-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Activity</p>
                    </div>
                    <p className="text-xs text-orange-900 leading-relaxed">{cert.activityRestrictions}</p>
                </div>
            </div>

            {cert.followUpDate && (
                <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Follow-Up Visit</p>
                    <p className="text-sm font-bold text-violet-800">
                        {format(new Date(cert.followUpDate), 'dd MMMM yyyy')}
                    </p>
                    <p className="text-xs text-violet-600 mt-0.5">{cert.followUpInstructions}</p>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────

interface AdmissionDetailSheetProps {
    admission: Admission | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdmissionUpdated: () => void;
}

export const AdmissionDetailSheet: React.FC<AdmissionDetailSheetProps> = ({
    admission, open, onOpenChange, onAdmissionUpdated,
}) => {
    const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
    const [isDischarging, setIsDischarging] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        if (open) setActiveTab('details');
    }, [open, admission?.id]);

    if (!admission) return null;

    const statusCfg = STATUS_CONFIG[admission.status];
    const priorityCfg = PRIORITY_CONFIG[admission.priority];
    const isActive = admission.status === 'ADMITTED' || admission.status === 'PENDING_ADMISSION';
    const isDischarged = admission.status === 'DISCHARGED';

    const admissionDate = new Date(admission.admissionDate);
    const losText = isActive
        ? `${differenceInDays(new Date(), admissionDate)} days`
        : admission.dischargeDate
            ? `${differenceInDays(new Date(admission.dischargeDate), admissionDate)} days`
            : '—';

    const handleDischarge = async () => {
        setIsDischarging(true);
        try {
            await ipdService.dischargePatient(admission.id);
            onAdmissionUpdated();
            onOpenChange(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDischarging(false);
            setShowDischargeConfirm(false);
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    {/* ── Header ── */}
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-slate-50 border-b border-slate-100">
                        <SheetHeader className="p-0">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                                    <User className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <SheetTitle className="text-lg font-black text-slate-900 truncate">
                                        {admission.patientName}
                                    </SheetTitle>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        <span className="text-xs text-slate-500">
                                            {admission.age}y / {admission.sex === 'M' ? 'Male' : admission.sex === 'F' ? 'Female' : 'Other'}
                                        </span>
                                        {admission.patientId && (
                                            <span className="text-xs font-mono bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                {admission.patientId}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <Badge variant="outline" className={cn('text-[11px] gap-1 px-2 py-0.5', statusCfg.className)}>
                                            {statusCfg.icon} {statusCfg.label}
                                        </Badge>
                                        <Badge variant="outline" className={cn('text-[11px] px-2 py-0.5', priorityCfg.className)}>
                                            {priorityCfg.label}
                                        </Badge>
                                        <span className="text-xs text-slate-500 font-medium">
                                            <span className="text-slate-400">LOS:</span> {losText}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </SheetHeader>

                        {/* Quick info strip */}
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Ward</p>
                                <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{admission.wardName}</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Bed</p>
                                <p className="text-xs font-bold text-indigo-600 mt-0.5">{admission.bedNumber}</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Admitted</p>
                                <p className="text-xs font-bold text-slate-700 mt-0.5">
                                    {format(admissionDate, 'dd MMM')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Tabs ── */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="px-5 pt-4">
                        <TabsList className={cn(
                            'w-full h-9 bg-slate-100/80 rounded-xl',
                            isDischarged ? 'grid grid-cols-4' : 'grid grid-cols-3'
                        )}>
                            <TabsTrigger value="details" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="billing" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Bill
                            </TabsTrigger>
                            {isDischarged && (
                                <TabsTrigger value="certificate" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Discharge Cert.
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="notes" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Notes
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Overview Tab ── */}
                        <TabsContent value="details" className="pt-2 pb-24 space-y-1">
                            <DetailRow label="Admission ID" value={admission.id} icon={<ClipboardList className="h-4 w-4" />} highlight />
                            <Separator className="my-1" />
                            <DetailRow label="Mobile" value={admission.patientMobile} icon={<Phone className="h-4 w-4" />} />
                            <DetailRow label="Attending Doctor" value={admission.attendingDoctor} icon={<Stethoscope className="h-4 w-4" />} />
                            <Separator className="my-1" />
                            <DetailRow label="Chief Complaint" value={admission.chiefComplaint} icon={<Activity className="h-4 w-4" />} />
                            <DetailRow label="Provisional Diagnosis" value={admission.diagnosis} icon={<FileText className="h-4 w-4" />} />
                            <Separator className="my-1" />
                            <DetailRow
                                label="Admission Date & Time"
                                value={format(admissionDate, 'dd MMM yyyy, hh:mm a')}
                                icon={<Calendar className="h-4 w-4" />}
                            />
                            <DetailRow
                                label="Expected Discharge"
                                value={admission.expectedDischargeDate ? format(new Date(admission.expectedDischargeDate), 'dd MMM yyyy') : null}
                                icon={<Clock className="h-4 w-4" />}
                            />
                            {admission.dischargeDate && (
                                <DetailRow
                                    label="Actual Discharge"
                                    value={format(new Date(admission.dischargeDate), 'dd MMM yyyy, hh:mm a')}
                                    icon={<CheckCircle2 className="h-4 w-4" />}
                                />
                            )}
                            {admission.referredBy && (
                                <DetailRow label="Referred By" value={admission.referredBy} icon={<User className="h-4 w-4" />} />
                            )}
                            {admission.notes && (
                                <>
                                    <Separator className="my-1" />
                                    <DetailRow label="Notes" value={admission.notes} />
                                </>
                            )}
                        </TabsContent>

                        {/* ── Bill Tab ── */}
                        <TabsContent value="billing" className="pt-4">
                            <BillTab admission={admission} isActive={activeTab === 'billing'} onOpenChange={onOpenChange} />
                        </TabsContent>

                        {/* ── Discharge Certificate Tab ── */}
                        {isDischarged && (
                            <TabsContent value="certificate" className="pt-4">
                                <CertificateTab admissionId={admission.id} isActive={activeTab === 'certificate'} />
                            </TabsContent>
                        )}

                        {/* ── Clinical Notes Tab ── */}
                        <TabsContent value="notes" className="pt-4 pb-24">
                            <EmptyState
                                icon={<FileText className="h-6 w-6 text-slate-400" />}
                                title="Clinical Notes Coming Soon"
                                description="Progress notes, vitals, orders, and clinical documentation will be available here."
                            />
                        </TabsContent>
                    </Tabs>

                    {/* ── Footer Actions ── */}
                    {isActive && (
                        <div className="fixed bottom-0 right-0 w-full sm:max-w-2xl p-4 bg-white border-t border-slate-100 flex gap-3 z-10">
                            <Button
                                variant="outline"
                                className="flex-1 h-10 text-sm border-slate-200 text-slate-700"
                                disabled
                            >
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Transfer
                            </Button>
                            <Button
                                className="flex-1 h-10 text-sm bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                                onClick={() => setShowDischargeConfirm(true)}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Discharge
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Discharge Confirmation ── */}
            <AlertDialog open={showDischargeConfirm} onOpenChange={setShowDischargeConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Discharge</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to discharge <strong>{admission.patientName}</strong> from bed{' '}
                            <strong>{admission.bedNumber}</strong> ({admission.wardName}). This action will free
                            the bed for cleaning. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDischarging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-rose-500 hover:bg-rose-600"
                            onClick={handleDischarge}
                            disabled={isDischarging}
                        >
                            {isDischarging ? 'Discharging...' : 'Yes, Discharge'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
