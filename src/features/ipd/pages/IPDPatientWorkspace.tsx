import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, Stethoscope, Calendar, Clock, CheckCircle2,
    XCircle, ArrowRightLeft, FileText, Phone, Activity, ClipboardList,
    Printer, Loader2, Receipt, Award, Pill, Utensils, Dumbbell,
    ChevronRight, Hotel, BedDouble, AlertTriangle, History,
} from 'lucide-react';
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

import {
    Admission, AdmissionStatus, AdmissionPriority,
    IPDBill, DischargeCertificate, BillItemCategory,
} from '../types';
import { ipdService } from '../services/ipdService';
import { RoundNotesTab } from '../components/RoundNotesTab';
import { VitalsTab } from '../components/VitalsTab';
import { DischargeSummaryTab } from '../components/DischargeSummaryTab';
import { ConsentsTab } from '../components/ConsentsTab';
import { MonitoringTab } from '../components/MonitoringTab';
import { MarTab } from '../components/MarTab';
import { AuditTrailSheet } from '../components/AuditTrailSheet';
import { buildIPDBillA4, buildDischargeCertificateA4 } from '../utils/ipdPrintUtils';
import { openPrintHtml } from '@/utils/printUtils';

// ─── Configs ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AdmissionStatus, { label: string; className: string; icon: React.ReactNode }> = {
    ADMITTED: { label: 'Admitted', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    PENDING_ADMISSION: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="h-3.5 w-3.5" /> },
    DISCHARGED: { label: 'Discharged', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: <XCircle className="h-3.5 w-3.5" /> },
    TRANSFERRED: { label: 'Transferred', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
    CANCELLED: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700 border-rose-200', icon: <XCircle className="h-3.5 w-3.5" /> },
};

const PRIORITY_CONFIG: Record<AdmissionPriority, { label: string; dot: string }> = {
    ROUTINE: { label: 'Routine', dot: 'bg-slate-400' },
    URGENT: { label: 'Urgent', dot: 'bg-amber-400' },
    EMERGENCY: { label: 'Emergency', dot: 'bg-rose-500' },
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

// ─── Shared sub-components ─────────────────────────────────────────────────────

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

const LoadingBlock: React.FC<{ message?: string }> = ({ message = 'Loading…' }) => (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">{message}</p>
    </div>
);

const EmptyBlock: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="p-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3 mt-4">
        <div className="h-14 w-14 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center">
            {icon}
        </div>
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">{description}</p>
    </div>
);

// ─── Bill Tab ─────────────────────────────────────────────────────────────────

const BillTab: React.FC<{ admission: Admission; isActive: boolean }> = ({ admission, isActive }) => {
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

    if (loading) return <LoadingBlock message="Loading…" />;
    if (!bill) return (
        <div className="p-10 text-center space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 mt-4">
            <div className="h-14 w-14 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center">
                <Receipt className="h-7 w-7 text-blue-600" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">Open Billing Workspace</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add charges, generate the bill, record payments, and finalize — all in one dedicated view for this encounter.
                </p>
            </div>
            <Button
                onClick={openBillingWorkspace}
                disabled={!admission.encounterId}
                className="bg-blue-600 hover:bg-blue-700"
            >
                <Receipt className="h-4 w-4 mr-2" />
                Open Billing
                <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            {!admission.encounterId && (
                <p className="text-[11px] text-amber-600">No encounter linked to this admission yet.</p>
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
        <div className="space-y-6 pb-10">
            {/* Status + Print */}
            <div className={cn(
                'flex items-center justify-between p-4 rounded-2xl border',
                bill.status === 'FINAL' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
            )}>
                <div className="flex items-center gap-3">
                    <Receipt className={cn('h-5 w-5', bill.status === 'FINAL' ? 'text-emerald-600' : 'text-amber-600')} />
                    <div>
                        <p className="text-sm font-bold text-slate-700">{bill.billNo}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            LOS: <strong>{bill.los} day{bill.los !== 1 ? 's' : ''}</strong>
                            {' · '}
                            {bill.admissionDate ? format(new Date(bill.admissionDate), 'dd MMM yyyy') : '—'}
                            {bill.dischargeDate ? ` → ${format(new Date(bill.dischargeDate), 'dd MMM yyyy')}` : ' → Present'}
                        </p>
                    </div>
                    <span className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full',
                        bill.status === 'FINAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    )}>
                        {bill.status}
                    </span>
                </div>
                <Button
                    className="h-9 px-4 text-sm bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={() => openPrintHtml(buildIPDBillA4(bill))}
                >
                    <Printer className="h-4 w-4" />
                    Print Bill
                </Button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grand Total</p>
                    <p className="text-2xl font-black text-slate-900">
                        ₹{bill.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    {bill.discountTotal > 0 && (
                        <p className="text-xs text-rose-400 font-medium">
                            − ₹{bill.discountTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} disc.
                        </p>
                    )}
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Amount Paid</p>
                    <p className="text-2xl font-black text-emerald-700">
                        ₹{bill.totalPaid.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-emerald-500 font-medium">{paidPct}% cleared</p>
                </div>
                <div className={cn('p-5 rounded-2xl border text-center space-y-1', balance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100')}>
                    <p className={cn('text-[10px] font-bold uppercase tracking-widest', balance > 0 ? 'text-rose-400' : 'text-slate-400')}>Balance Due</p>
                    <p className={cn('text-2xl font-black', balance > 0 ? 'text-rose-700' : 'text-slate-600')}>
                        ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    <p className={cn('text-xs font-medium', balance > 0 ? 'text-rose-400' : 'text-slate-400')}>
                        {balance > 0 ? 'Pending' : 'Settled'}
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Payment Progress</span>
                    <span className="font-bold text-slate-700">{paidPct}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${paidPct}%` }}
                    />
                </div>
            </div>

            {/* Itemized table */}
            <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Charges Breakdown</h3>
                <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</th>
                                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Rate × Qty</th>
                                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(grouped).map(([category, items]) => (
                                <React.Fragment key={category}>
                                    <tr className="bg-slate-50/60">
                                        <td colSpan={3} className="px-4 py-2">
                                            <span className={cn(
                                                'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border',
                                                CATEGORY_COLORS[category as BillItemCategory] ?? 'bg-slate-50 text-slate-500 border-slate-100'
                                            )}>
                                                {category}
                                            </span>
                                        </td>
                                    </tr>
                                    {items.map(item => (
                                        <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                            <td className="px-4 py-2.5 text-slate-700">{item.description}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-500 whitespace-nowrap">
                                                ₹{item.rate.toLocaleString('en-IN')} × {item.qty}
                                                {item.discountPct > 0 && (
                                                    <span className="ml-2 text-rose-400 text-xs">({item.discountPct}% off)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                                                ₹{item.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                            {/* Totals */}
                            <tr className="bg-slate-50 border-t border-slate-200">
                                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-500">Sub Total</td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                    ₹{bill.subTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                            {bill.discountTotal > 0 && (
                                <tr className="bg-rose-50/40">
                                    <td colSpan={2} className="px-4 py-2.5 text-sm font-semibold text-rose-500">Discount</td>
                                    <td className="px-4 py-2.5 text-right font-semibold text-rose-600">
                                        − ₹{bill.discountTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            )}
                            <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                                <td colSpan={2} className="px-4 py-4 text-base font-black text-slate-900">Grand Total</td>
                                <td className="px-4 py-4 text-right text-base font-black text-indigo-700">
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
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Payment History</h3>
                    <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</th>
                                    <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Mode</th>
                                    <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Ref.</th>
                                    <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Received By</th>
                                    <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.payments.map(p => (
                                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                                        <td className="px-4 py-3 text-slate-600">{format(new Date(p.date), 'dd MMM yyyy')}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                                                {p.mode}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                            {p.transactionRef ? p.transactionRef.slice(-10) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{p.receivedBy}</td>
                                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
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

    if (loading) return <LoadingBlock message="Loading discharge certificate…" />;
    if (!cert) return (
        <EmptyBlock
            icon={<Award className="h-7 w-7 text-slate-400" />}
            title="Certificate Not Available"
            description="Discharge certificate is only available after the patient has been discharged."
        />
    );

    const condCfg = CONDITION_LABELS[cert.conditionAtDischarge] ?? { label: cert.conditionAtDischarge, className: 'bg-slate-100 text-slate-600' };
    const admDate = format(new Date(cert.admission.admissionDate), 'dd MMMM yyyy');
    const disDate = cert.admission.dischargeDate ? format(new Date(cert.admission.dischargeDate), 'dd MMMM yyyy') : '—';
    const los = cert.admission.dischargeDate
        ? differenceInDays(new Date(cert.admission.dischargeDate), new Date(cert.admission.admissionDate))
        : differenceInDays(new Date(), new Date(cert.admission.admissionDate));

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Award className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-700">{cert.certificateNo}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Issued: {format(new Date(cert.issuedAt), 'dd MMM yyyy')}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 ml-2">
                        Discharge Certificate
                    </span>
                </div>
                <Button
                    className="h-9 px-4 text-sm bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={() => openPrintHtml(buildDischargeCertificateA4(cert))}
                >
                    <Printer className="h-4 w-4" />
                    Print Certificate
                </Button>
            </div>

            {/* Stay summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admission</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{admDate}</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Discharge</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{disDate}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Length of Stay</p>
                    <p className="text-xl font-black text-indigo-700 mt-1">{los} day{los !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Condition */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Activity className="h-5 w-5 text-slate-400 shrink-0" />
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Condition at Discharge</p>
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full mt-1 inline-block', condCfg.className)}>
                        {condCfg.label}
                    </span>
                </div>
            </div>

            {/* Final Diagnosis */}
            <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">Final Diagnosis</p>
                <p className="text-base font-bold text-indigo-900">{cert.finalDiagnosis}</p>
            </div>

            {/* Treatment summary */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Treatment Summary</p>
                <p className="text-sm text-slate-600 leading-relaxed">{cert.treatmentSummary}</p>
            </div>

            {/* Procedures */}
            {cert.proceduresPerformed.length > 0 && (
                <div className="p-5 rounded-2xl bg-purple-50 border border-purple-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-3">Procedures Performed</p>
                    <ul className="space-y-2">
                        {cert.proceduresPerformed.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-purple-800">
                                <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-purple-400" />
                                {p}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Medications */}
            <div className="p-5 rounded-2xl bg-teal-50 border border-teal-100">
                <div className="flex items-center gap-2 mb-3">
                    <Pill className="h-4 w-4 text-teal-600" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-500">Medications at Discharge</p>
                </div>
                <ul className="space-y-2">
                    {cert.medications.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-teal-900">
                            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-teal-400" />
                            {m}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Diet + Activity */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 space-y-2">
                    <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-amber-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Diet</p>
                    </div>
                    <p className="text-sm text-amber-900 leading-relaxed">{cert.diet}</p>
                </div>
                <div className="p-5 rounded-2xl bg-orange-50 border border-orange-100 space-y-2">
                    <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-orange-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Activity</p>
                    </div>
                    <p className="text-sm text-orange-900 leading-relaxed">{cert.activityRestrictions}</p>
                </div>
            </div>

            {/* Follow-up */}
            {cert.followUpDate && (
                <div className="p-5 rounded-2xl bg-violet-50 border border-violet-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Follow-Up Appointment</p>
                    <p className="text-lg font-black text-violet-800">{format(new Date(cert.followUpDate), 'dd MMMM yyyy')}</p>
                    <p className="text-sm text-violet-600 mt-1">{cert.followUpInstructions}</p>
                </div>
            )}
        </div>
    );
};

// ─── Page ──────────────────────────────────────────────────────────────────────

const IPDPatientWorkspace: React.FC = () => {
    const { admissionId } = useParams<{ admissionId: string }>();
    const navigate = useNavigate();

    const [admission, setAdmission] = useState<Admission | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
    const [showAuditTrail, setShowAuditTrail] = useState(false);
    const [isDischarging, setIsDischarging] = useState(false);

    useEffect(() => {
        if (!admissionId) { setNotFound(true); setLoading(false); return; }
        ipdService.getAdmissionById(admissionId).then(a => {
            if (!a) setNotFound(true);
            else setAdmission(a);
            setLoading(false);
        });
    }, [admissionId]);

    const handleDischarge = async () => {
        if (!admission) return;
        setIsDischarging(true);
        try {
            await ipdService.dischargePatient(admission.id);
            // Refresh admission state
            const updated = await ipdService.getAdmissionById(admission.id);
            if (updated) setAdmission(updated);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDischarging(false);
            setShowDischargeConfirm(false);
        }
    };

    // ── Loading state ──
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50/40">
                <div className="text-center space-y-4">
                    <div className="h-14 w-14 mx-auto rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Hotel className="h-7 w-7 text-white" />
                    </div>
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mx-auto" />
                    <p className="text-sm text-slate-400 font-medium">Loading patient workspace…</p>
                </div>
            </div>
        );
    }

    // ── Not found ──
    if (notFound || !admission) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50/40">
                <div className="text-center space-y-4 max-w-sm">
                    <div className="h-14 w-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
                        <AlertTriangle className="h-7 w-7 text-slate-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-700">Admission Not Found</h2>
                    <p className="text-sm text-slate-400">No admission record found for ID: <code className="font-mono text-indigo-600">{admissionId}</code></p>
                    <Button variant="outline" onClick={() => navigate('/ipd')} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to IPD
                    </Button>
                </div>
            </div>
        );
    }

    const statusCfg = STATUS_CONFIG[admission.status];
    const priorityCfg = PRIORITY_CONFIG[admission.priority];
    const isActive = admission.status === 'ADMITTED' || admission.status === 'PENDING_ADMISSION';
    const isDischarged = admission.status === 'DISCHARGED';

    const admissionDate = new Date(admission.admissionDate);
    const losValue = isActive
        ? differenceInDays(new Date(), admissionDate)
        : admission.dischargeDate
            ? differenceInDays(new Date(admission.dischargeDate), admissionDate)
            : 0;

    // Seven tabs always: overview, vitals, monitoring, consents, billing, summary, notes.
    // Summary stays available pre-discharge for drafting; sign is gated server-side.
    const tabCount = 8;

    return (
        <>
            <div className="min-h-screen bg-slate-50/40">
                {/* ── Breadcrumb ── */}
                <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-3 shadow-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-slate-500 hover:text-slate-700 gap-1.5"
                        onClick={() => navigate('/ipd')}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        IPD Center
                    </Button>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <div className="flex items-center gap-2">
                        <Hotel className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-xs font-semibold text-slate-700">Patient Workspace</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-xs font-mono text-slate-400">{admission.id}</span>
                </div>

                {/* ── Hero / Patient Header ── */}
                <div className="bg-white border-b border-slate-100">
                    <div className="max-w-6xl mx-auto px-6 py-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            {/* Left: identity */}
                            <div className="flex items-center gap-5">
                                <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                                    <User className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h1 className="text-2xl font-black text-slate-900">{admission.patientName}</h1>
                                        <Badge variant="outline" className={cn('text-xs gap-1.5 px-2.5 py-1', statusCfg.className)}>
                                            {statusCfg.icon} {statusCfg.label}
                                        </Badge>
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                            <span className={cn('h-2 w-2 rounded-full', priorityCfg.dot)} />
                                            {priorityCfg.label}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                                        <span>{admission.age}y / {admission.sex === 'M' ? 'Male' : admission.sex === 'F' ? 'Female' : 'Other'}</span>
                                        {admission.patientId && (
                                            <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-xs font-semibold">{admission.patientId}</span>
                                        )}
                                        {admission.patientMobile && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3.5 w-3.5" />{admission.patientMobile}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: KPIs */}
                            <div className="flex flex-wrap gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[90px] text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ward</p>
                                    <p className="text-sm font-bold text-slate-700 mt-0.5">{admission.wardName}</p>
                                </div>
                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 min-w-[80px] text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Bed</p>
                                    <p className="text-sm font-black text-indigo-700 mt-0.5">{admission.bedNumber}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[80px] text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">LOS</p>
                                    <p className="text-sm font-black text-slate-800 mt-0.5">{losValue}d</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[110px] text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admitted</p>
                                    <p className="text-sm font-bold text-slate-700 mt-0.5">{format(admissionDate, 'dd MMM yyyy')}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-4 text-sm border-slate-200 text-slate-700"
                                        onClick={() => setShowAuditTrail(true)}
                                    >
                                        <History className="h-4 w-4 mr-2" />
                                        Audit
                                    </Button>
                                    {isActive && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 px-4 text-sm border-slate-200 text-slate-700"
                                                disabled
                                            >
                                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                                Transfer
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-9 px-4 text-sm bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                                                onClick={() => setShowDischargeConfirm(true)}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Discharge
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className={cn('h-10 bg-white border border-slate-200 shadow-sm rounded-xl mb-6', `grid grid-cols-${tabCount}`, 'max-w-xl')}>
                            <TabsTrigger value="overview" className="text-sm font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="vitals" className="text-sm font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                Vitals
                            </TabsTrigger>
                            <TabsTrigger value="monitoring" className="text-sm font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                Monitoring
                            </TabsTrigger>
                            <TabsTrigger value="mar" className="text-sm font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                MAR
                            </TabsTrigger>
                            <TabsTrigger value="consents" className="text-sm font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                Consents
                            </TabsTrigger>
                            <TabsTrigger value="billing" className="text-sm font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                Bill
                            </TabsTrigger>
                            <TabsTrigger value="summary" className="text-sm font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                Summary
                            </TabsTrigger>
                            <TabsTrigger value="notes" className="text-sm font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                Notes
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Overview ── */}
                        <TabsContent value="overview">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Clinical info card */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-1">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Clinical Information</h3>
                                    <DetailRow label="Admission ID" value={admission.id} icon={<ClipboardList className="h-4 w-4" />} highlight />
                                    <Separator className="my-1" />
                                    <DetailRow label="Attending Doctor" value={admission.attendingDoctor} icon={<Stethoscope className="h-4 w-4" />} />
                                    <DetailRow label="Chief Complaint" value={admission.chiefComplaint} icon={<Activity className="h-4 w-4" />} />
                                    <DetailRow label="Provisional Diagnosis" value={admission.diagnosis} icon={<FileText className="h-4 w-4" />} />
                                    {admission.referredBy && (
                                        <DetailRow label="Referred By" value={admission.referredBy} icon={<User className="h-4 w-4" />} />
                                    )}
                                </div>

                                {/* Admission timeline card */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-1">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Admission Timeline</h3>
                                    <DetailRow
                                        label="Admission Date"
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
                                    <Separator className="my-1" />
                                    <DetailRow
                                        label="Contact"
                                        value={admission.patientMobile}
                                        icon={<Phone className="h-4 w-4" />}
                                    />
                                    {admission.notes && (
                                        <>
                                            <Separator className="my-1" />
                                            <DetailRow label="Notes" value={admission.notes} />
                                        </>
                                    )}
                                </div>

                                {/* Bed assignment card */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Bed Assignment</h3>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <BedDouble className="h-5 w-5 text-indigo-600" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Bed Number</p>
                                                <p className="text-lg font-black text-indigo-700">{admission.bedNumber}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <Hotel className="h-5 w-5 text-slate-500" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ward</p>
                                                <p className="text-sm font-bold text-slate-700">{admission.wardName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <Activity className="h-5 w-5 text-slate-500" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={cn('h-2 w-2 rounded-full', priorityCfg.dot)} />
                                                    <p className="text-sm font-bold text-slate-700">{priorityCfg.label}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── Bill ── */}
                        <TabsContent value="billing">
                            <BillTab admission={admission} isActive={activeTab === 'billing'} />
                        </TabsContent>

                        {/* ── Discharge Summary ── */}
                        <TabsContent value="summary">
                            <DischargeSummaryTab admissionId={admission.id} isActive={activeTab === 'summary'} />
                        </TabsContent>

                        {/* ── Vitals ── */}
                        <TabsContent value="vitals">
                            <VitalsTab admissionId={admission.id} isActive={activeTab === 'vitals'} />
                        </TabsContent>

                        {/* ── Monitoring (Fluid I/O · Glucose) ── */}
                        <TabsContent value="monitoring">
                            <MonitoringTab admissionId={admission.id} isActive={activeTab === 'monitoring'} />
                        </TabsContent>

                        {/* ── Consents ── */}
                        <TabsContent value="mar">
                            <MarTab admissionId={admission.id} patientId={admission.patientId} isActive={activeTab === 'mar'} />
                        </TabsContent>

                        <TabsContent value="consents">
                            <ConsentsTab admissionId={admission.id} isActive={activeTab === 'consents'} />
                        </TabsContent>

                        {/* ── Notes ── */}
                        <TabsContent value="notes">
                            <RoundNotesTab admissionId={admission.id} isActive={activeTab === 'notes'} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* ── Audit Trail ── */}
            <AuditTrailSheet
                open={showAuditTrail}
                onOpenChange={setShowAuditTrail}
                admissionId={admission.id}
                patientId={admission.patientId}
                patientName={admission.patientName}
            />

            {/* ── Discharge Confirmation ── */}
            <AlertDialog open={showDischargeConfirm} onOpenChange={setShowDischargeConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Discharge</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to discharge <strong>{admission.patientName}</strong> from bed{' '}
                            <strong>{admission.bedNumber}</strong> ({admission.wardName}). This will free the bed for cleaning. Continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDischarging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-rose-500 hover:bg-rose-600"
                            onClick={handleDischarge}
                            disabled={isDischarging}
                        >
                            {isDischarging ? 'Discharging…' : 'Yes, Discharge'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default IPDPatientWorkspace;
