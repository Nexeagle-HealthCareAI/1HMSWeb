import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Search,
  Heart,
  UserCheck,
  FlaskConical,
  Clock,
  Eye,
  User,
  CalendarDays,
  Phone,
  X,
  FileText,
  Printer,
  RefreshCw,
  Wifi,
  ArrowLeft,
  Activity,
  CalendarClock,
  Ban,
  Loader2,
  Upload,
  UserX,
  Tag,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Minimize2,
  Maximize2,
  HelpCircle,
  WifiOff,
  IndianRupee,
  Download,
  CheckCircle2,
  ArrowRight,
  Pencil,
  MoreVertical,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { AppointmentBooking } from './AppointmentBooking';
import { TokenPrintModal } from './TokenPrintModal';
import { DashboardQuickGuide } from './DashboardQuickGuide';
import { VitalsForm } from './VitalsForm';
import { RescheduleDialog } from './RescheduleDialog';
import { ConfirmPreAppointmentDialog } from './ConfirmPreAppointmentDialog';
import { PatientForm } from './PatientForm';
import { format as dateFnsFormat } from 'date-fns';

// Helper to force IST timezone for date-fns formatting
const format = (date: Date, formatStr: string) => {
  try {
    const istString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    return dateFnsFormat(istDate, formatStr);
  } catch (e) {
    return dateFnsFormat(date, formatStr);
  }
};
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import { useCancelAppointment } from '../hooks/useCancelAppointment';
import { useAuthStore, useAppStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { isReachable } from '@/offline';
import { RowSkeletonList } from '@/components/ui/skeletons';
import { AppointmentDetail, appointmentApi, ConsultTimelineResponse } from '../services/appointmentApi';
import { PrescriptionPreviewModal, type GeneratePrescriptionDetailsRequest } from '@/components/shared/prescription-preview';
import AttachmentsSection from '@/features/patient/components/AttachmentsSection';
import { PatientProfileModal } from '@/features/patient/components/PatientProfileModal';
import { getOpdConsultContext, postOpdConsult } from '@/features/billing/services/consultCharge';
import { doctorFeeService } from '@/features/hospital/services/doctorFeeService';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import { openPrintHtml, downloadHtmlAsPdf } from '@/utils/printUtils';
import { getOpdDocHtml, buildPrintSettingsFromHospital, type OpdDocKind } from '@/features/billing/utils/opdDocuments';
import { useHospitalApi } from '@/hooks/useApi';

export const AppointmentDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hospitalId } = useAuthStore();
  const { isLowBandwidthMode } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutateAsync: cancelAppointmentMutation, isPending: isCancellingMutation } = useCancelAppointment();
  // Hospital profile drives the print header (name/address/GSTIN) for OPD documents.
  const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'future'>('current');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showBooking, setShowBooking] = useState(false);
  const [bookingRefreshToken, setBookingRefreshToken] = useState(0);

  // Sorting state
  type SortColumn = 'patientId' | 'patientName' | 'doctorName' | 'tokenNo' | 'appointmentDate' | 'status' | 'printToken' | 'labReports' | 'case' | 'actions' | 'printPrescription' | 'isCompleted';
  const [sortColumn, setSortColumn] = useState<SortColumn>('tokenNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const fabConstraintsRef = useRef(null);

  const [selectedPatient, setSelectedPatient] = useState<AppointmentDetail | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [compactMode, setCompactMode] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentDetail | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<GeneratePrescriptionDetailsRequest | null>(null);
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [appointmentForBilling, setAppointmentForBilling] = useState<AppointmentDetail | null>(null);
  // OPD consult fee for the Add Bill panel (mark paid/unpaid when patient arrives).
  const [billConsultCtx, setBillConsultCtx] = useState<{ autoConsult: boolean; fee: number }>({ autoConsult: false, fee: 0 });
  const [billPaymentMode, setBillPaymentMode] = useState<string>('cash');
  const [billBusy, setBillBusy] = useState(false);
  // Current consult status for the selected appointment (so we can show Paid/Unpaid and avoid double-pay).
  const [billStatus, setBillStatus] = useState<{ consultCharged: boolean; consultPaid: boolean; amount: number; receiptNo: string | null; encounterId: string | null } | null>(null);
  // Full consult timeline for the selected appointment — drives the next-visit fee preview
  // (free follow-up window, last paid date, whether this visit is chargeable).
  const [billTimeline, setBillTimeline] = useState<ConsultTimelineResponse | null>(null);
  // Success popup shown after a consult fee is collected, with the invoice/receipt to retrieve.
  const [paidSuccess, setPaidSuccess] = useState<{ amount: number; invoiceNo: string | null; receiptNo: string | null; encounterId: string | null; patient: AppointmentDetail } | null>(null);
  // Busy guard while a document (invoice/receipt) is being generated.
  const [docBusy, setDocBusy] = useState(false);
  // Per-doctor OPD consult fee, shown in the Case column. Loaded once per hospital.
  const [doctorFeeMap, setDoctorFeeMap] = useState<Record<string, number>>({});
  const [labAttachmentModal, setLabAttachmentModal] = useState<{ open: boolean; patientId?: string; patientName?: string; appointmentId?: string; doctorId?: string }>({ open: false });
  const [labAttachments, setLabAttachments] = useState<Record<string, string[]>>({});
  const [showPatientProfileModal, setShowPatientProfileModal] = useState(false);
  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);
  const [patientProfileName, setPatientProfileName] = useState<string | undefined>(undefined);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<AppointmentDetail | null>(null);
  const [showConfirmPreAppointmentDialog, setShowConfirmPreAppointmentDialog] = useState(false);
  const [appointmentToConfirm, setAppointmentToConfirm] = useState<AppointmentDetail | null>(null);
  const [showEditAppointment, setShowEditAppointment] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<AppointmentDetail | null>(null);
  const [showQuickGuide, setShowQuickGuide] = useState(false);

  // Token Print State
  const [tokenPrintOpen, setTokenPrintOpen] = useState(false);
  const [tokenPrintData, setTokenPrintData] = useState<{
    tokenNumber: string;
    patientName: string;
    patientId: string;
    doctorName: string;
    appointmentDate: string;
    department?: string;
    age?: string | number;
    ageUnit?: string;
    gender?: string;
    referrerName?: string;
    referrerType?: string;
    guardianName?: string;
    guardianRelation?: string;
  } | null>(null);

  // Auto-collapse sidebar on mount for maximizing screen real estate
  const setGlobalSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);

  useEffect(() => {
    setGlobalSidebarCollapsed(true);
  }, [setGlobalSidebarCollapsed]);

  const handlePrintToken = (appointment: AppointmentDetail) => {
    setTokenPrintData({
      tokenNumber: String(appointment.token?.tokenNumber || 'N/A'),
      patientName: appointment.patientFullName,
      patientId: appointment.patientId,
      doctorName: appointment.doctorName || 'N/A',
      appointmentDate: appointment.startAt,
      department: appointment.departments?.[0] || undefined,
      age: appointment.patientAge ?? (appointment as any).patientAgeYears,
      ageUnit: appointment.patientAgeUnit,
      gender: appointment.patientSex,
      referrerName: appointment.referrerName || undefined,
      referrerType: appointment.referrerType || undefined,
      guardianName: appointment.guardianName || undefined,
      guardianRelation: appointment.guardianRelation || undefined
    });
    setTokenPrintOpen(true);
  };

  const handleOpenLabAttachments = (appointment: AppointmentDetail) => {
    setLabAttachmentModal({
      open: true,
      patientId: appointment.patientId,
      patientName: appointment.patientFullName,
      appointmentId: appointment.appointmentId,
      doctorId: appointment.doctorId,
    });
  };

  const handlePatientClick = (appointment: AppointmentDetail) => {
    setPatientProfileId(appointment.patientId);
    setPatientProfileName(appointment.patientFullName);
    setShowPatientProfileModal(true);
  };

  const handleLabAttachmentsChange = (next: string[]) => {
    if (!labAttachmentModal.patientId) return;
    setLabAttachments((prev) => ({ ...prev, [labAttachmentModal.patientId]: next }));
  };

  const handleRescheduleClick = (appointment: AppointmentDetail) => {
    setAppointmentToReschedule(appointment);
    setShowRescheduleDialog(true);
  };

  const handleRescheduleSuccess = () => {
    // Refresh list after successful reschedule
    if (refetch) refetch();
  };

  const handleConfirmPreAppointmentClick = (appointment: AppointmentDetail) => {
    setAppointmentToConfirm(appointment);
    setShowConfirmPreAppointmentDialog(true);
  };

  const handleConfirmPreAppointmentSuccess = () => {
    // Refresh list after successfully confirming a pre-appointment
    if (refetch) refetch();
  };

  const handleEditClick = (appointment: AppointmentDetail) => {
    setAppointmentToEdit(appointment);
    setShowEditAppointment(true);
  };

  const handleEditSuccess = () => {
    setShowEditAppointment(false);
    setAppointmentToEdit(null);
    if (refetch) refetch();
  };

  const getStatusBadge = (status: AppointmentDetail['finalStatusCode'], appointment?: AppointmentDetail) => {
    const statusLabels = {
      VITALS_REQUIRED: t('appointmentDashboard.statusLabels.vitalsRequired'),
      READY: t('appointmentDashboard.statusLabels.ready'),
      UNDER_CONSULT: t('appointmentDashboard.statusLabels.underConsult'),
      LAB_REQUIRED: t('appointmentDashboard.statusLabels.labRequired'),
      AWAITING_RECONSULT: t('appointmentDashboard.statusLabels.awaitingReconsult'),
      COMPLETED: t('appointmentDashboard.statusLabels.completed'),
      SCHEDULED: t('appointmentDashboard.statusLabels.scheduled'),
      CANCELLED: t('appointmentDashboard.statusLabels.cancelled'),
      PRE_APPOINTMENT: t('appointmentDashboard.statusLabels.preAppointment', { defaultValue: 'Pre-Appointment' }),
    } as Record<string, string>;

    switch (status) {
      case 'PRE_APPOINTMENT':
        return (
          <Badge
            className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors text-xs px-1.5 py-0.5 font-medium"
            onClick={() => appointment && handleConfirmPreAppointmentClick(appointment)}
          >
            {statusLabels.PRE_APPOINTMENT}
          </Badge>
        );
      case 'VITALS_REQUIRED':
        return (
          <Badge
            className="bg-red-50 text-red-700 border-red-200 cursor-pointer hover:bg-red-100 transition-colors text-xs px-1.5 py-0.5 font-medium"
            onClick={() => appointment && handleVitalsClick(appointment)}
          >
            {statusLabels.VITALS_REQUIRED}
          </Badge>
        );
      case 'READY':
        return (
          <Badge
            className="bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100 transition-colors text-xs px-1.5 py-0.5 font-medium"
            onClick={() => appointment && handleVitalsClick(appointment)}
          >
            {statusLabels.READY}
          </Badge>
        );
      case 'UNDER_CONSULT':
        return <Badge className="bg-brand-50 text-brand-700 border-brand-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.UNDER_CONSULT}</Badge>;
      case 'LAB_REQUIRED':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.LAB_REQUIRED}</Badge>;
      case 'AWAITING_RECONSULT':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.AWAITING_RECONSULT}</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.COMPLETED}</Badge>;
      case 'SCHEDULED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels.SCHEDULED}</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-50 text-gray-600 border-gray-300 text-xs px-1.5 py-0.5 font-medium">{statusLabels.CANCELLED}</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-1.5 py-0.5 font-medium">{statusLabels[status || ''] || status}</Badge>;
    }
  };

  const handleVitalsClick = (appointment: AppointmentDetail) => {
    setSelectedPatient(appointment);
    setShowVitalsForm(true);
  };

  const handleVitalsSubmit = (vitalsData: any) => {
    console.log('Vitals submitted for patient:', selectedPatient?.patientFullName, vitalsData);

    // Invalidate appointment details queries to refresh dashboard data
    queryClient.invalidateQueries({
      queryKey: ['appointmentDetails']
    });

    setShowVitalsForm(false);
    setSelectedPatient(null);
  };

  const handleVitalsCancel = () => {
    setShowVitalsForm(false);
    setSelectedPatient(null);
  };







  const loadBillStatus = (appointment: AppointmentDetail) => {
    if (!hospitalId || !appointment.patientId || !appointment.doctorId) { setBillStatus(null); setBillTimeline(null); return; }
    appointmentApi.getConsultTimeline(hospitalId, appointment.patientId, String(appointment.doctorId), appointment.appointmentDate)
      .then(tl => {
        setBillTimeline(tl);
        const entry = tl.history?.find(h => h.appointmentId === appointment.appointmentId);
        setBillStatus(entry
          ? { consultCharged: entry.consultCharged, consultPaid: entry.consultPaid, amount: entry.amount, receiptNo: entry.receiptNo, encounterId: entry.encounterId ?? null }
          : { consultCharged: false, consultPaid: false, amount: 0, receiptNo: null, encounterId: null });
      })
      .catch(() => { setBillStatus(null); setBillTimeline(null); });
  };

  const fmtBillTimelineDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

  // Days until the free follow-up window closes (after which the next consult is chargeable again).
  const daysLeftText = (iso: string): string => {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); 
    today.setHours(0, 0, 0, 0);
    const upto = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); 
    upto.setHours(0, 0, 0, 0);
    const days = Math.round((upto.getTime() - today.getTime()) / 86400000);
    if (days < 0) return t('patientForm.timeline.expired', { defaultValue: 'Window closed' });
    if (days === 0) return t('patientForm.timeline.lastDay', { defaultValue: 'Last free day' });
    return t('patientForm.timeline.daysLeft', { count: days, defaultValue: '{{count}} days left' });
  };

  // Load per-doctor OPD consult fees once so the Case column can show the amount.
  useEffect(() => {
    if (!hospitalId) return;
    doctorFeeService.list(hospitalId)
      .then(r => {
        const map: Record<string, number> = {};
        (r.items ?? []).forEach(f => { map[String(f.doctorId)] = Number(f.opdConsultFee ?? 0); });
        setDoctorFeeMap(map);
      })
      .catch(() => { /* non-fatal — column just omits the amount */ });
  }, [hospitalId]);

  // OPD consult fee that applies to an appointment (0 for a no-fee follow-up).
  const opdFeeFor = (appt: AppointmentDetail): number => {
    const type = (appt.appointmentType ?? '').toLowerCase();
    if (type.includes('no-fee') || type.includes('no fee')) return 0;
    return doctorFeeMap[String(appt.doctorId)] ?? 0;
  };

  // Human label for the visit's case type (New / fee follow-up / free follow-up).
  const caseTypeLabel = (type?: string | null): string => {
    const v = (type ?? '').toLowerCase();
    if (v === 'new') return t('patientForm.timeline.typeNew', { defaultValue: 'New' });
    if (v.includes('no-fee') || v.includes('no fee')) return t('patientForm.timeline.noFee', { defaultValue: 'Follow-up — No fee' });
    if (v.includes('old') || v.includes('follow')) return t('patientForm.timeline.typeOldFee', { defaultValue: 'Follow-up (fee due)' });
    return type ?? '—';
  };

  const handleAddBillClick = (appointment: AppointmentDetail) => {
    // Already-paid OPD consult → go straight to the premium payment-success popup (req 6),
    // seeded from the row's billing status (no extra fetch needed to display it).
    if (appointment.consultPaid) {
      setPaidSuccess({
        amount: appointment.consultAmount ?? 0,
        invoiceNo: null,
        receiptNo: appointment.consultReceiptNo ?? null,
        encounterId: appointment.encounterId ?? null,
        patient: appointment,
      });
      return;
    }

    setAppointmentForBilling(appointment);
    setBillConsultCtx({ autoConsult: false, fee: 0 });
    setBillPaymentMode('cash');
    // Seed status from the row so it shows instantly; the timeline fetch refines it + adds history.
    setBillStatus({
      consultCharged: !!appointment.consultCharged,
      consultPaid: !!appointment.consultPaid,
      amount: appointment.consultAmount ?? 0,
      receiptNo: appointment.consultReceiptNo ?? null,
      encounterId: appointment.encounterId ?? null,
    });
    setBillTimeline(null);
    setShowAddBillModal(true);
    if (appointment.doctorId) {
      getOpdConsultContext(String(appointment.doctorId)).then(setBillConsultCtx).catch(() => { });
    }
    loadBillStatus(appointment);
  };

  const handleAddBillModalChange = (open: boolean) => {
    setShowAddBillModal(open);
    if (!open) {
      setAppointmentForBilling(null);
      setBillConsultCtx({ autoConsult: false, fee: 0 });
      setBillStatus(null);
      setBillTimeline(null);
    }
  };

  // Post the consult charge (and record payment when marked paid) for an appointment whose
  // patient has arrived. Backend is idempotent, so this won't double-charge.
  const handleCollectConsult = async (markPaid: boolean) => {
    if (!appointmentForBilling?.patientId || billBusy) return;
    if (!isReachable()) { toast({ title: 'Needs connection', description: 'Billing the consult requires an internet connection.', variant: 'destructive' }); return; }
    setBillBusy(true);
    try {
      const r = await postOpdConsult(appointmentForBilling.patientId, { markPaid, paymentMode: billPaymentMode, appointmentId: appointmentForBilling.appointmentId });
      if (r.posted || r.alreadyCharged) {
        const amount = r.consultFee.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const receiptSuffix = r.receiptNo ? ` · ${r.receiptNo}` : '';
        toast({
          title: r.paymentRecorded
            ? t('appointmentDashboard.addBill.toast.collectedTitle')
            : (r.alreadyCharged ? t('appointmentDashboard.addBill.toast.alreadyTitle') : t('appointmentDashboard.addBill.toast.addedTitle')),
          description: r.paymentRecorded
            ? t('appointmentDashboard.addBill.toast.paidDesc', { amount }) + receiptSuffix
            : (r.alreadyCharged ? t('appointmentDashboard.addBill.toast.alreadyDesc', { amount }) : t('appointmentDashboard.addBill.toast.unpaidDesc', { amount })),
        });
      } else {
        toast({ title: t('appointmentDashboard.addBill.toast.nothingTitle'), description: t('appointmentDashboard.addBill.toast.nothingDesc') });
      }
      // On a fresh collection — or when the backend reports it was already paid — surface the
      // premium success popup with the invoice/receipt (never recording a second payment).
      const appt = appointmentForBilling;
      if (markPaid && (r.paymentRecorded || r.alreadyPaid) && appt) {
        setPaidSuccess({
          amount: r.consultFee,
          invoiceNo: r.invoiceNo ?? null,
          receiptNo: r.receiptNo ?? null,
          encounterId: r.encounterId ?? null,
          patient: appt,
        });
      }
      handleAddBillModalChange(false);
      // Refresh the appointment list so the row's paid status / Bill button update instantly.
      if (refetch) refetch();
    } catch (e: any) {
      toast({ title: t('appointmentDashboard.addBill.toast.failTitle'), description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setBillBusy(false);
    }
  };

  // Fetch the encounter's billing events and render the requested OPD document (invoice /
  // receipt / bill-cum-receipt), either to a print window or as a downloaded PDF.
  const openOpdDoc = async (kind: OpdDocKind, mode: 'print' | 'download', appt: AppointmentDetail | null, encounterId: string | null) => {
    if (!appt?.patientId || !encounterId || docBusy) return;
    setDocBusy(true);
    try {
      const events = await ipdBillingService.getEncounterEvents(encounterId, appt.patientId, hospitalId ?? undefined);
      if (!events?.success || !events.data) throw new Error(events?.message ?? t('appointmentDashboard.addBill.docFailDesc', { defaultValue: 'Could not load the bill.' }));
      const settings = buildPrintSettingsFromHospital(hospitalData);
      const ctx = {
        patientName: appt.patientFullName,
        patientId: appt.patientId,
        ageGender: [(appt.patientAge ?? (appt as any).patientAgeYears) != null ? `${appt.patientAge ?? (appt as any).patientAgeYears} ${appt.patientAgeUnit || ''}`.trim() : null, appt.patientSex].filter(Boolean).join(' / '),
        mobile: appt.patientMobile,
        doctorName: appt.doctorName ?? undefined,
        department: appt.departmentName,
      };
      const html = getOpdDocHtml(kind, events.data, settings, ctx);
      if (mode === 'print') openPrintHtml(html);
      else await downloadHtmlAsPdf(html, `${kind}-${appt.patientId}.pdf`);
    } catch (e: any) {
      toast({ title: t('appointmentDashboard.addBill.docFailTitle', { defaultValue: 'Could not generate document' }), description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setDocBusy(false);
    }
  };

  // Opens the full billing ledger for this patient/visit so staff can add charges and bill.
  // Uses the visit's encounter when known, otherwise the ledger resolves the patient by id.
  const goToBilling = (appt: AppointmentDetail | null) => {
    if (!appt?.patientId) return;
    const enc = billStatus?.encounterId;
    const base = enc ? `/billing/${enc}` : '/billing/ledger';
    handleAddBillModalChange(false);
    navigate(`${base}?patientId=${encodeURIComponent(appt.patientId)}`);
  };

  // Invoice / Receipt / Bill-cum-Receipt buttons, each with Print + PDF download.
  // Receipt and bill-cum-receipt need a recorded payment, so they are gated by `allowReceipt`.
  const renderDocButtons = (appt: AppointmentDetail | null, encounterId: string | null, allowReceipt: boolean) => {
    const docs: { kind: OpdDocKind; label: string; show: boolean }[] = [
      { kind: 'invoice', label: t('appointmentDashboard.addBill.docInvoice', { defaultValue: 'Invoice' }), show: true },
      { kind: 'receipt', label: t('appointmentDashboard.addBill.docReceipt', { defaultValue: 'Receipt' }), show: allowReceipt },
      { kind: 'billcum', label: t('appointmentDashboard.addBill.docBillCum', { defaultValue: 'Bill + Receipt' }), show: allowReceipt },
    ];
    return (
      <div className="space-y-2">
        {docs.filter(d => d.show).map(d => (
          <div key={d.kind} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-gray-600 dark:text-gray-300">{d.label}</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={docBusy || !encounterId} onClick={() => openOpdDoc(d.kind, 'print', appt, encounterId)}>
                <Printer className="h-3 w-3 mr-1" /> {t('appointmentDashboard.addBill.print', { defaultValue: 'Print' })}
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={docBusy || !encounterId} onClick={() => openOpdDoc(d.kind, 'download', appt, encounterId)}>
                <Download className="h-3 w-3 mr-1" /> {t('appointmentDashboard.addBill.download', { defaultValue: 'PDF' })}
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleBookingClick = () => {
    setBookingRefreshToken((prev) => prev + 1);
    setShowBooking(true);
  };

  const handlePreviewModalChange = (open: boolean) => {
    setPreviewModalOpen(open);
    if (!open) {
      setPreviewRequest(null);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!refetch) return;

    try {
      await refetch();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    }
  };

  // Use existing hook for appointment details
  const { data: appointmentData, isLoading, error, refetch } = useAppointmentDetails(
    'All',
    startDate || new Date().toISOString().split('T')[0],
    endDate || new Date().toISOString().split('T')[0],
    hospitalId || '',
    !!hospitalId
  );

  const appointments = appointmentData?.items || [];

  const getDoctorFilterValue = (doctorId?: string, doctorName?: string | null) => {
    if (doctorId) {
      return doctorId;
    }
    if (doctorName) {
      return doctorName.trim().toLowerCase();
    }
    return '';
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toDayDate = (dateKey?: string | null) => {
    if (!dateKey) {
      return null;
    }
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  };

  const getAppointmentDateKey = (appointment: AppointmentDetail) => {
    if (appointment.startAt) {
      const startDate = new Date(appointment.startAt);
      if (!Number.isNaN(startDate.getTime())) {
        return formatDateKey(startDate);
      }
    }
    if (appointment.appointmentDate) {
      return appointment.appointmentDate.slice(0, 10);
    }
    return '';
  };

  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach((appointment) => {
      const key = getDoctorFilterValue(appointment.doctorId, appointment.doctorName);
      if (!key) {
        return;
      }
      if (!map.has(key)) {
        map.set(key, appointment.doctorName || 'Unknown Doctor');
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [appointments]);

  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach((appointment) => {
      const deptName = appointment.departmentName;
      if (!deptName) return;
      if (!map.has(deptName)) {
        map.set(deptName, deptName);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [appointments]);

  const isDefaultFilterState =
    !searchTerm.trim() &&
    selectedDoctor === 'all' &&
    selectedStatus === 'all' &&
    !startDate &&
    !endDate;

  const filteredAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    const today = new Date(); // Use actual current date
    const todayKey = formatDateKey(today);
    const todayDay = toDayDate(todayKey);

    // If no appointments, return empty array
    if (appointments.length === 0) {
      return [];
    }

    console.log('Current selectedStatus in filter:', selectedStatus, 'Type:', typeof selectedStatus);

    const filtered = appointments.filter(appointment => {
      const searchLower = searchTerm.toLowerCase();
      const nameLower = appointment.patientFullName?.toLowerCase() || '';
      const tokenNumber = String(appointment.token?.tokenNumber ?? '').toLowerCase();
      const matchesSearch = (
        nameLower.includes(searchLower) ||
        appointment.patientId?.toLowerCase().includes(searchLower) ||
        appointment.patientMobile?.toLowerCase().includes(searchLower) ||
        (appointment.appointmentDate && appointment.appointmentDate.toLowerCase().includes(searchLower)) ||
        (tokenNumber && tokenNumber.includes(searchLower))
      );

      const doctorValue = getDoctorFilterValue(appointment.doctorId, appointment.doctorName);
      const matchesDoctor = selectedDoctor === 'all' || (!!doctorValue && doctorValue === selectedDoctor);

      const matchesDepartment = selectedDepartment === 'all' || appointment.departmentName === selectedDepartment;

      // Filter by status if on current tab
      let matchesStatus = true;
      if (activeTab === 'current' && selectedStatus !== 'all') {
        // Convert both to strings and compare case-insensitively for better matching
        const appointmentStatus = String(appointment.finalStatusCode || '').toUpperCase();
        const selectedStatusUpper = String(selectedStatus || '').toUpperCase();
        matchesStatus = appointmentStatus === selectedStatusUpper;

        // Debug log for status matching
        console.log('Status comparison:', {
          appointmentStatus,
          selectedStatusUpper,
          matchesStatus,
          appointmentId: appointment.appointmentId,
          patientName: appointment.patientFullName
        });

        // Special debug for VITALS_REQUIRED
        if (selectedStatusUpper === 'VITALS_REQUIRED') {
          console.log('🔍 VITALS_REQUIRED filter debug:', {
            appointmentStatus,
            selectedStatusUpper,
            matchesStatus,
            appointmentId: appointment.appointmentId,
            patientName: appointment.patientFullName
          });
        }
      }

      const appointmentDateKey = getAppointmentDateKey(appointment);
      const appointmentDay = toDayDate(appointmentDateKey);

      // Filter by date range if on past or future tab
      let matchesDateRange = true;
      if ((activeTab === 'past' || activeTab === 'future') && appointmentDay) {
        if (startDate) {
          const startDay = toDayDate(startDate);
          if (startDay && startDay > appointmentDay) {
            matchesDateRange = false;
          }
        }
        if (endDate) {
          const endDay = toDayDate(endDate);
          if (endDay && endDay < appointmentDay) {
            matchesDateRange = false;
          }
        }
      }

      // Filter by appointment type based on active tab
      let matchesType = true;

      if (isDefaultFilterState) {
        switch (activeTab) {
          case 'current':
            matchesType = appointmentDateKey === todayKey;
            break;
          case 'past':
            matchesType = !!appointmentDay && !!todayDay && appointmentDay < todayDay;
            break;
          case 'future':
            matchesType = !!appointmentDay && !!todayDay && appointmentDay > todayDay;
            break;
          default:
            matchesType = true;
        }
      }

      const result = matchesSearch && matchesDoctor && matchesDepartment && matchesStatus && matchesDateRange && matchesType;

      // Debug status filtering specifically
      if (activeTab === 'current' && selectedStatus !== 'all') {
        console.log('Status filtering debug:', {
          patientName: appointment.patientFullName,
          appointmentStatus: appointment.finalStatusCode,
          selectedStatus,
          matchesStatus,
          result,
          allFilters: {
            matchesSearch,
            matchesDoctor,
            matchesStatus,
            matchesDateRange,
            matchesType
          }
        });

        // Special debug for VITALS_REQUIRED
        if (selectedStatus === 'VITALS_REQUIRED') {
          console.log('VITALS_REQUIRED filter debug:', {
            patientName: appointment.patientFullName,
            appointmentStatus: appointment.finalStatusCode,
            appointmentStatusUpper: String(appointment.finalStatusCode || '').toUpperCase(),
            selectedStatusUpper: String(selectedStatus || '').toUpperCase(),
            matchesStatus,
            willBeIncluded: result
          });
        }
      }

      if (!result) {
        console.log('Appointment filtered out:', {
          patientName: appointment.patientFullName,
          appointmentDate: appointment.appointmentDate,
          finalStatusCode: appointment.finalStatusCode,
          matchesSearch,
          matchesDoctor,
          matchesStatus,
          matchesDateRange,
          matchesType
        });
      }

      return result;
    });

    console.log('Filtered results:', {
      filteredCount: filtered.length,
      selectedStatus,
      activeTab,
      totalAppointments: appointments.length,
      filteredAppointments: filtered.map(a => ({
        patientName: a.patientFullName,
        appointmentDate: a.appointmentDate,
        finalStatusCode: a.finalStatusCode
      })),
      statusBreakdown: appointments.reduce((acc, apt) => {
        const status = apt.finalStatusCode;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    // Additional debug: Show what appointments exist for the current tab and status
    if (activeTab === 'current') {
      const currentTabAppointments = appointments.filter(a => {
        const appointmentStartDate = new Date(a.startAt);
        const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
        const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        return appointmentDay.getTime() === todayStart.getTime();
      });

      console.log('Current tab appointments breakdown:', {
        totalCurrent: currentTabAppointments.length,
        byStatus: currentTabAppointments.reduce((acc, apt) => {
          const status = String(apt.finalStatusCode || '').toUpperCase();
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        selectedStatus,
        filteredCount: filtered.length
      });
    }

    // Final debug summary
    console.log('🎯 FINAL FILTER RESULT:', {
      selectedStatus,
      activeTab,
      totalAppointments: appointments.length,
      filteredCount: filtered.length,
      filteredAppointmentIds: filtered.map(a => a.appointmentId),
      isEmpty: filtered.length === 0
    });

    // Log the current status filter for debugging
    if (activeTab === 'current') {
      console.log('Current tab status filter:', {
        selectedStatus,
        totalAppointments: appointments.length,
        filteredCount: filtered.length,
        statusBreakdown: {
          all: appointments.filter(a => {
            const appointmentStartDate = new Date(a.startAt);
            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            return appointmentDay.getTime() === todayStart.getTime();
          }).length,
          vitalsRequired: appointments.filter(a => {
            const appointmentStartDate = new Date(a.startAt);
            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            return appointmentDay.getTime() === todayStart.getTime() && String(a.finalStatusCode || '').toUpperCase() === 'VITALS_REQUIRED';
          }).length,
          ready: appointments.filter(a => {
            const appointmentStartDate = new Date(a.startAt);
            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            return appointmentDay.getTime() === todayStart.getTime() && String(a.finalStatusCode || '').toUpperCase() === 'READY';
          }).length
        }
      });

      // Additional debug info for status filtering
      if (selectedStatus !== 'all') {
        console.log('Status filter details:', {
          selectedStatus,
          appointmentsWithStatus: appointments.filter(a => {
            const appointmentStartDate = new Date(a.startAt);
            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            return appointmentDay.getTime() === todayStart.getTime() && String(a.finalStatusCode || '').toUpperCase() === String(selectedStatus || '').toUpperCase();
          }).length,
          filteredAppointmentsWithStatus: filtered.filter(a => String(a.finalStatusCode || '').toUpperCase() === String(selectedStatus || '').toUpperCase()).length
        });
      }
    }

    // If filtering is too restrictive and no results, show all appointments for debugging
    // Sort by selected column and direction
    const sortedFiltered = [...filtered].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortColumn) {
        case 'patientId':
          valA = a.patientId?.toLowerCase() || '';
          valB = b.patientId?.toLowerCase() || '';
          break;
        case 'patientName':
          valA = a.patientFullName?.toLowerCase() || '';
          valB = b.patientFullName?.toLowerCase() || '';
          break;
        case 'doctorName':
          valA = a.doctorName?.toLowerCase() || '';
          valB = b.doctorName?.toLowerCase() || '';
          break;
        case 'tokenNo':
          valA = a.token?.tokenNumber || 0;
          valB = b.token?.tokenNumber || 0;
          break;
        case 'status':
          valA = a.finalStatusCode?.toLowerCase() || '';
          valB = b.finalStatusCode?.toLowerCase() || '';
          break;
        case 'printToken':
        case 'labReports':
        case 'case':
        case 'actions':
        case 'printPrescription':
        case 'isCompleted':
          valA = '';
          valB = '';
          break;
        case 'appointmentDate':
        default:
          valA = new Date(a.startAt).getTime();
          valB = new Date(b.startAt).getTime();
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    if (
      sortedFiltered.length === 0 &&
      appointments.length > 0 &&
      activeTab === 'current' &&
      isDefaultFilterState
    ) {
      // Default fallback if filtered yields nothing but we are in default state
      return [...appointments].sort((a, b) => {
        let valA: any = a.token?.tokenNumber || 0;
        let valB: any = b.token?.tokenNumber || 0;
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortedFiltered;
  }, [searchTerm, selectedDoctor, selectedDepartment, selectedStatus, startDate, endDate, activeTab, appointments, isDefaultFilterState, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Reset to first page when search term, doctor selection, status selection, date range, or active tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDoctor, selectedStatus, startDate, endDate, activeTab]);

  // Reset status filter when switching tabs
  useEffect(() => {
    setSelectedStatus('all');
  }, [activeTab]);

  // Reset date range when switching tabs
  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(today.getMonth() + 1);

    if (activeTab === 'past') {
      setStartDate(oneMonthAgo.toISOString().split('T')[0]);
      setEndDate(yesterday.toISOString().split('T')[0]);
    } else if (activeTab === 'future') {
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setEndDate(oneMonthFromNow.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [activeTab]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    if (!appointments) return {
      total: 0,
      vitalsRequired: 0,
      completed: 0,
      preAppointment: 0,
      doctorStats: [] as { name: string; count: number; noShowCount: number }[]
    };

    // Use all currently loaded appointments for stats (logic matches active tab/date range)
    const currentViewAppointments = appointments;

    const doctorMap = new Map<string, { total: number; noShow: number }>();

    currentViewAppointments.forEach(apt => {
      const docName = apt.doctorName || 'Unknown Doctor';
      const currentStats = doctorMap.get(docName) || { total: 0, noShow: 0 };

      currentStats.total += 1;

      // Calculate No Show (VITALS_REQUIRED is considered No Show for Past appointments)
      if (apt.finalStatusCode === 'VITALS_REQUIRED') {
        currentStats.noShow += 1;
      }

      doctorMap.set(docName, currentStats);
    });

    const doctorStats = Array.from(doctorMap.entries()).map(([name, stats]) => ({
      name,
      count: stats.total,
      noShowCount: stats.noShow
    }));

    return {
      total: currentViewAppointments.length,
      vitalsRequired: currentViewAppointments.filter(apt => apt.finalStatusCode === 'VITALS_REQUIRED').length,
      completed: currentViewAppointments.filter(apt => apt.finalStatusCode === 'COMPLETED').length,
      preAppointment: currentViewAppointments.filter(apt => apt.finalStatusCode === 'PRE_APPOINTMENT').length,
      doctorStats
    };
  }, [appointments]);

  // Initial load when component mounts
  useEffect(() => {
    if (refetch && hospitalId) {
      console.log('AppointmentDashboard mounted - triggering initial API load');
      refetch();
    }
  }, [refetch, hospitalId]);

  // Refetch when returning from appointment booking page
  useEffect(() => {
    if (!showBooking && refetch && hospitalId) {
      console.log('Returned from appointment booking - refetching appointments');
      refetch();
    }
  }, [showBooking, refetch, hospitalId]);

  // Refetch appointments when date range changes
  useEffect(() => {
    if (refetch && (startDate || endDate)) {
      refetch();
    }
  }, [startDate, endDate, refetch]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table for better UX
    const tableElement = document.querySelector('.overflow-x-auto');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Date validation functions
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    // If end date is set and is before the new start date, update end date to match start date
    if (value && endDate && new Date(value) > new Date(endDate)) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    // If start date is set and the new end date is before start date, don't allow it
    if (startDate && value && new Date(value) < new Date(startDate)) {
      // Optionally show a toast or alert here
      console.warn('Start date cannot be after end date');
      return;
    }
    setEndDate(value);
  };

  const handleCancelClick = (appointment: AppointmentDetail) => {
    setAppointmentToCancel(appointment);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!appointmentToCancel || !hospitalId) return;

    setIsCancelling(true);
    try {
      await cancelAppointmentMutation({
        appointmentId: appointmentToCancel.appointmentId,
        patientId: appointmentToCancel.patientId,
        hospitalId,
        reason: cancelReason.trim() || undefined,
      });

      // Close dialog and reset state (UI already optimistically updated)
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
      setCancelReason('');

      toast({
        title: 'Appointment cancelled',
        description: 'The appointment was successfully cancelled.',
      });

    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: 'Could not cancel appointment',
        description: error?.response?.data?.message || error?.message || 'Action saved offline and will sync when reconnected.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelDialogClose = () => {
    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
    setCancelReason('');
  };

  const handlePrintPrescription = (appointment: AppointmentDetail) => {
    if (!hospitalId) {
      toast({
        title: t('appointmentDashboard.toast.missingHospitalTitle'),
        description: t('appointmentDashboard.toast.missingHospitalDescription'),
        variant: 'destructive',
      });
      return;
    }

    if (!appointment.appointmentId || !appointment.patientId || !appointment.doctorId) {
      toast({
        title: t('appointmentDashboard.toast.missingAppointmentDataTitle'),
        description: t('appointmentDashboard.toast.missingAppointmentDataDescription'),
        variant: 'destructive',
      });
      return;
    }

    setPreviewRequest({
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      hospitalId,
      doctorId: appointment.doctorId,
    });
    setPreviewModalOpen(true);
  };

  const renderSortableHeader = (label: React.ReactNode, column: SortColumn, className = "") => {
    return (
      <TableHead 
        className={`font-bold text-slate-600 dark:text-slate-300 text-[11px] py-3.5 px-3 tracking-widest uppercase whitespace-nowrap cursor-pointer hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition-colors ${className}`}
        onClick={() => {
          if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
          } else {
            setSortColumn(column);
            setSortDirection(column === 'tokenNo' ? 'desc' : 'asc'); // Default tokenNo to desc, others to asc
          }
        }}
      >
        <div className="flex items-center gap-1.5 justify-between">
          <span>{label}</span>
          {sortColumn === column ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-brand-600 flex-shrink-0" /> : <ArrowDown className="h-3 w-3 text-brand-600 flex-shrink-0" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <>
      {/* Dashboard View - Hidden on desktop when booking is active */}
      <div className={`flex flex-col min-h-full bg-slate-50 dark:bg-zinc-950 px-3 sm:px-4 lg:px-6 pt-1 gap-4 relative pb-24 md:pb-4 ${showBooking ? 'md:hidden' : ''}`}>
      {!isLowBandwidthMode && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-100/40 via-slate-50 to-slate-50 dark:from-brand-900/20 dark:via-zinc-950 dark:to-zinc-950 pointer-events-none" />
      )}

      {/* Header Container */}
      <div className="flex-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl shadow-xl shadow-brand-900/5 border border-white/60 dark:border-zinc-800/60 overflow-hidden relative z-10 w-full mb-2">

        {/* Header Section */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-500/20">

          {/* Left: Title and Actions */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-md">
                <CalendarDays className="h-6 w-6 text-brand-200" />
                {t('appointmentDashboard.title')}
              </h1>

              <Button
                onClick={handleBookingClick}
                className="hidden sm:flex bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-lg shadow-black/10 rounded-full px-5 sm:px-6 h-9 sm:h-10 gap-2 ml-2 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/20 backdrop-blur-sm"
              >
                <div className="bg-white/20 rounded-full p-1">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <span className="font-semibold tracking-wide">{t('appointmentDashboard.bookAppointment')}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickGuide(true)}
                className="hidden md:flex bg-white/5 hover:bg-white/10 text-brand-100 border border-white/10 rounded-full h-8 sm:h-10 px-3 sm:px-4 ml-2 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span className="font-medium">{t('appointmentDashboard.quickGuide', 'Dashboard Help')}</span>
                </div>
              </Button>
            </div>

          </div>

          {/* Right: Navigation Tabs */}
          <nav className="flex w-full sm:w-auto bg-black/20 dark:bg-black/40 backdrop-blur-md rounded-2xl p-1 sm:p-1.5 shadow-inner mt-3 sm:mt-0 relative overflow-hidden">
            {[
              { key: 'current', label: t('appointmentDashboard.tabs.current'), Icon: Clock, desc: 'Active Queue' },
              { key: 'past', label: t('appointmentDashboard.tabs.past'), Icon: Calendar, desc: 'History' },
              { key: 'future', label: t('appointmentDashboard.tabs.future'), Icon: CalendarDays, desc: 'Upcoming' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`group flex-1 sm:flex-none min-w-[90px] flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 rounded-xl px-2 py-2.5 sm:py-2 border transition-all duration-300 relative overflow-hidden ${isActive
                    ? 'bg-white text-brand-600 border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.1)] z-10 scale-[1.02]'
                    : 'bg-transparent border-transparent text-brand-50 hover:bg-white/10'
                    }`}
                >
                  <Icon className={`h-4 w-4 sm:h-4 sm:w-4 ${isActive ? 'text-brand-500' : 'opacity-80'}`} />
                  <span className={`text-[12px] sm:text-[13px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full relative z-10 flex flex-col gap-6">
        {/* KPI Section */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
          {/* Total Appointments */}
          <div className="relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg hover:shadow-brand-500/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
              <Calendar className="h-20 w-20 text-brand-500 -rotate-12" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-4 mb-3 relative z-10">
              <div className="p-2.5 bg-brand-100 dark:bg-brand-500/20 rounded-xl shadow-inner ring-1 ring-brand-500/30 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300 text-brand-600 dark:text-brand-400">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-900/70 dark:text-brand-300/80">Total</span>
            </div>
            <div className="text-4xl font-mono font-black text-brand-900 dark:text-white relative z-10 tracking-tighter drop-shadow-sm ml-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-brand-600 group-hover:to-violet-500 dark:group-hover:from-brand-400 dark:group-hover:to-violet-400 transition-all">{kpiStats.total}</div>
          </div>

          {/* Pre-Appointment (booked publicly via Nexeagle, awaiting front-desk confirmation) */}
          {kpiStats.preAppointment > 0 && (
            <div className="relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1 transition-all duration-300 group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <CalendarClock className="h-20 w-20 text-amber-500 -rotate-12" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-4 mb-3 relative z-10">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 rounded-xl shadow-inner ring-1 ring-amber-500/30 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 text-amber-600 dark:text-amber-400">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-900/70 dark:text-amber-300/80">{t('appointmentDashboard.statusFilters.preAppointment', { defaultValue: 'Pre-Appointment' })}</span>
              </div>
              <div className="text-4xl font-mono font-black text-amber-900 dark:text-white relative z-10 tracking-tighter drop-shadow-sm ml-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-amber-600 group-hover:to-orange-500 dark:group-hover:from-amber-400 dark:group-hover:to-orange-400 transition-all">{kpiStats.preAppointment}</div>
            </div>
          )}

          {activeTab !== 'future' && (
            <>
              {/* Vitals Required (No Show for Past) */}
              <div className={`relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg ${activeTab === 'past' ? 'hover:shadow-gray-500/20' : 'hover:shadow-rose-500/20'} hover:-translate-y-1 transition-all duration-300 group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                  {activeTab === 'past' ? <UserX className="h-20 w-20 text-gray-500 -rotate-12" /> : <Heart className="h-20 w-20 text-rose-500 -rotate-12" />}
                </div>
                <div className={`absolute inset-0 bg-gradient-to-br ${activeTab === 'past' ? 'from-gray-500/5' : 'from-rose-500/5'} to-transparent pointer-events-none`} />
                <div className="flex items-center gap-4 mb-3 relative z-10">
                  <div className={`p-2.5 rounded-xl shadow-inner ring-1 group-hover:scale-110 transition-all duration-300 ${activeTab === 'past' ? 'bg-gray-100 dark:bg-gray-500/20 ring-gray-500/30 text-gray-600 dark:text-gray-400 group-hover:bg-gray-500 group-hover:text-white' : 'bg-rose-100 dark:bg-rose-500/20 ring-rose-500/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white'}`}>
                    {activeTab === 'past' ? <UserX className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'past' ? 'text-gray-700/80 dark:text-gray-400' : 'text-rose-900/70 dark:text-rose-300/80'}`}>
                    {activeTab === 'past' ? 'No Show' : 'Vitals Req'}
                  </span>
                </div>
                <div className={`text-4xl font-mono font-black ${activeTab === 'past' ? 'text-gray-800 dark:text-white group-hover:from-gray-600 group-hover:to-slate-500 dark:group-hover:from-gray-400 dark:group-hover:to-slate-400' : 'text-rose-900 dark:text-white group-hover:from-rose-600 group-hover:to-pink-500 dark:group-hover:from-rose-400 dark:group-hover:to-pink-400'} relative z-10 tracking-tighter drop-shadow-sm ml-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r transition-all`}>{kpiStats.vitalsRequired}</div>
              </div>

              {/* Completed */}
              <div className="relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                  <UserCheck className="h-20 w-20 text-emerald-500 -rotate-12" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-4 mb-3 relative z-10">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl shadow-inner ring-1 ring-emerald-500/30 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-900/70 dark:text-emerald-300/80">Completed</span>
                </div>
                <div className="text-4xl font-mono font-black text-emerald-900 dark:text-white relative z-10 tracking-tighter drop-shadow-sm ml-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-500 dark:group-hover:from-emerald-400 dark:group-hover:to-teal-400 transition-all">{kpiStats.completed}</div>
              </div>
            </>
          )}

          {/* Doctor Stats - Dynamically rendered */}
          {kpiStats.doctorStats.map((doc, idx) => (
            <div key={idx} className="relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300 group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <User className="h-20 w-20 text-cyan-500 -rotate-12" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-4 mb-3 relative z-10">
                <div className="p-2.5 bg-cyan-100 dark:bg-cyan-500/20 rounded-xl shadow-inner ring-1 ring-cyan-500/30 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300 text-cyan-600 dark:text-cyan-400">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-900/70 dark:text-cyan-300/80 truncate max-w-[100px]" title={doc.name}>{doc.name}</span>
              </div>
              <div className="relative z-10 ml-1">
                <div className="text-4xl font-mono font-black text-cyan-900 dark:text-white tracking-tighter drop-shadow-sm group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-brand-500 dark:group-hover:from-cyan-400 dark:group-hover:to-brand-400 transition-all">{doc.count}</div>
                {activeTab === 'past' && doc.noShowCount > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-red-100 bg-red-500 dark:bg-red-600 px-2 pl-1 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.5)] w-fit uppercase tracking-wider backdrop-blur-sm bg-opacity-90">
                    <UserX className="h-3 w-3" />
                    <span>No Show: {doc.noShowCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current Appointments Section */}
        <div className="space-y-4">


          {/* Desktop Search Bar and Filters */}
          <div className="hidden md:block mb-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-xl shadow-brand-900/5 relative z-10 w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50/30 to-transparent dark:from-brand-900/10 pointer-events-none" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap relative z-10">
              {/* Search Input */}
              <div className="relative w-full sm:w-80 lg:w-96 flex-none">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-500/70 dark:text-brand-400" />
                <Input
                  placeholder={t('appointmentDashboard.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-white/80 dark:bg-zinc-950/50 border-brand-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 rounded-xl transition-all duration-300 shadow-inner font-medium"
                />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 w-full sm:w-auto flex-1">
                {/* Doctor Filter Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-900/60 dark:text-brand-200/60 whitespace-nowrap">{t('appointmentDashboard.doctorLabel')}</label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger className="w-full sm:w-48 h-10 bg-white/80 dark:bg-zinc-950/50 border-brand-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 rounded-xl transition-all duration-300 shadow-inner font-medium">
                      <SelectValue placeholder={t('appointmentDashboard.allDoctors')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-brand-100/50 dark:border-zinc-800 backdrop-blur-xl bg-white/95 dark:bg-zinc-900/95 shadow-xl">
                      <SelectItem value="all" className="font-medium cursor-pointer rounded-lg focus:bg-brand-50 dark:focus:bg-brand-900/30">{t('appointmentDashboard.allDoctors')}</SelectItem>
                      {doctorOptions.map((doctor) => (
                        <SelectItem key={doctor.value} value={doctor.value} className="font-medium cursor-pointer rounded-lg focus:bg-brand-50 dark:focus:bg-brand-900/30">
                          {doctor.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-900/60 dark:text-brand-200/60 whitespace-nowrap">{t('appointmentDashboard.departmentLabel', { defaultValue: 'Department' })}</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-full sm:w-48 h-10 bg-white/80 dark:bg-zinc-950/50 border-brand-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 rounded-xl transition-all duration-300 shadow-inner font-medium">
                      <SelectValue placeholder={t('appointmentDashboard.allDepartments', { defaultValue: 'All Departments' })} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-brand-100/50 dark:border-zinc-800 backdrop-blur-xl bg-white/95 dark:bg-zinc-900/95 shadow-xl">
                      <SelectItem value="all" className="font-medium cursor-pointer rounded-lg focus:bg-brand-50 dark:focus:bg-brand-900/30">{t('appointmentDashboard.allDepartments', { defaultValue: 'All Departments' })}</SelectItem>
                      {departmentOptions.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value} className="font-medium cursor-pointer rounded-lg focus:bg-brand-50 dark:focus:bg-brand-900/30">
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter - Only show for Past and Future tabs */}
                {(activeTab === 'past' || activeTab === 'future') && (() => {
                  const today = new Date();

                  // Calculate Max Date for Past Tab (Yesterday)
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  const maxPastDate = yesterday.toISOString().split('T')[0];

                  // Calculate Min Date for Future Tab (Tomorrow)
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const minFutureDate = tomorrow.toISOString().split('T')[0];

                  return (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto relative px-4 sm:border-l border-brand-100/50 dark:border-zinc-800/50">
                      <label className="text-xs font-bold uppercase tracking-widest text-brand-900/60 dark:text-brand-200/60 whitespace-nowrap hidden sm:block">{t('appointmentDashboard.dateRange.label')}</label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => handleStartDateChange(e.target.value)}
                            className="w-full sm:w-36 h-10 bg-white/80 dark:bg-zinc-950/50 border-brand-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 rounded-xl transition-all duration-300 shadow-inner text-xs font-mono font-bold"
                            max={activeTab === 'past' ? maxPastDate : undefined}
                            min={activeTab === 'future' ? minFutureDate : undefined}
                          />
                        </div>
                        <span className="text-gray-400 font-medium px-1">-</span>
                        <div className="relative w-full">
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => handleEndDateChange(e.target.value)}
                            className="w-full sm:w-36 h-10 bg-white/80 dark:bg-zinc-950/50 border-brand-100/50 dark:border-zinc-800/80 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 rounded-xl transition-all duration-300 shadow-inner text-xs font-mono font-bold"
                            min={startDate || (activeTab === 'future' ? minFutureDate : undefined)}
                            max={activeTab === 'past' ? maxPastDate : undefined}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Mobile Filter Bar & Drawer */}
          <div className="md:hidden mb-4 relative z-10 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-500/70 dark:text-brand-400" />
              <Input
                placeholder={t('appointmentDashboard.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-white/90 dark:bg-zinc-900/90 border-brand-100/50 dark:border-zinc-800 focus:ring-2 focus:ring-brand-500/30 rounded-xl shadow-sm font-medium w-full"
              />
            </div>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" className="h-11 w-11 p-0 shrink-0 rounded-xl bg-white/90 dark:bg-zinc-900/90 border-brand-100/50 dark:border-zinc-800 shadow-sm relative">
                  <Filter className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  {((selectedDoctor !== 'all') || (selectedDepartment !== 'all') || (startDate !== '') || (endDate !== '')) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="px-4 pb-8 pt-2">
                <DrawerHeader className="px-0">
                  <DrawerTitle className="text-left text-brand-900 dark:text-white font-bold">{t('appointmentDashboard.filters', { defaultValue: 'Filters' })}</DrawerTitle>
                </DrawerHeader>
                <div className="space-y-6 mt-2">
                  {/* Doctor Filter Dropdown */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-900/60 dark:text-brand-200/60">{t('appointmentDashboard.doctorLabel')}</label>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                      <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-zinc-900/50 border-brand-100/50 rounded-xl">
                        <SelectValue placeholder={t('appointmentDashboard.allDoctors')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('appointmentDashboard.allDoctors')}</SelectItem>
                        {doctorOptions.map((doctor) => (
                          <SelectItem key={doctor.value} value={doctor.value}>
                            {doctor.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department Filter Dropdown */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-900/60 dark:text-brand-200/60">{t('appointmentDashboard.departmentLabel', { defaultValue: 'Department' })}</label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-zinc-900/50 border-brand-100/50 rounded-xl">
                        <SelectValue placeholder={t('appointmentDashboard.allDepartments', { defaultValue: 'All Departments' })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('appointmentDashboard.allDepartments', { defaultValue: 'All Departments' })}</SelectItem>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Filter */}
                  {(activeTab === 'past' || activeTab === 'future') && (() => {
                    const today = new Date();
                    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                    const maxPastDate = yesterday.toISOString().split('T')[0];
                    const minFutureDate = tomorrow.toISOString().split('T')[0];
                    return (
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-brand-900/60 dark:text-brand-200/60">{t('appointmentDashboard.dateRange.label')}</label>
                         <div className="flex gap-2">
                            <Input
                              type="date"
                              value={startDate}
                              onChange={(e) => handleStartDateChange(e.target.value)}
                              className="w-full h-11 bg-slate-50 dark:bg-zinc-900/50 border-brand-100/50 rounded-xl text-xs font-mono"
                              max={activeTab === 'past' ? maxPastDate : undefined}
                              min={activeTab === 'future' ? minFutureDate : undefined}
                            />
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => handleEndDateChange(e.target.value)}
                              className="w-full h-11 bg-slate-50 dark:bg-zinc-900/50 border-brand-100/50 rounded-xl text-xs font-mono"
                              min={startDate || (activeTab === 'future' ? minFutureDate : undefined)}
                              max={activeTab === 'past' ? maxPastDate : undefined}
                            />
                         </div>
                      </div>
                    );
                  })()}
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Status Navigation - Only show for Current tab */}
          {activeTab === 'current' && (
            <div className="mb-4 hidden md:block bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-2 rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-md">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-2">
                <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap gap-2 pb-1 sm:pb-0">
                  {[
                    { key: 'all', label: t('appointmentDashboard.statusFilters.all'), color: 'bg-slate-100 text-slate-700 border-slate-200/50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50 hover:bg-slate-200' },
                    { key: 'VITALS_REQUIRED', label: t('appointmentDashboard.statusFilters.vitalsRequired'), color: 'bg-rose-100 text-rose-700 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50 hover:bg-rose-200' },
                    { key: 'READY', label: t('appointmentDashboard.statusFilters.ready'), color: 'bg-green-100 text-green-700 border-green-200/50 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50 hover:bg-green-200' },
                    { key: 'UNDER_CONSULT', label: t('appointmentDashboard.statusFilters.underConsult'), color: 'bg-brand-100 text-brand-700 border-brand-200/50 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800/50 hover:bg-brand-200' },
                    { key: 'LAB_REQUIRED', label: t('appointmentDashboard.statusFilters.labRequired'), color: 'bg-orange-100 text-orange-700 border-orange-200/50 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50 hover:bg-orange-200' },
                    { key: 'AWAITING_RECONSULT', label: t('appointmentDashboard.statusFilters.awaitingReconsult'), color: 'bg-yellow-100 text-yellow-700 border-yellow-200/50 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50 hover:bg-yellow-200' },
                    { key: 'COMPLETED', label: t('appointmentDashboard.statusFilters.completed'), color: 'bg-emerald-100 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50 hover:bg-emerald-200' },
                    { key: 'CANCELLED', label: t('appointmentDashboard.statusFilters.cancelled'), color: 'bg-gray-100 text-gray-600 border-gray-300/50 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50 hover:bg-gray-200' },
                    { key: 'PRE_APPOINTMENT', label: t('appointmentDashboard.statusFilters.preAppointment', { defaultValue: 'Pre-Appointment' }), color: 'bg-amber-100 text-amber-700 border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50 hover:bg-amber-200' }
                  ].map((status) => {
                    const count = appointments.filter(a => {
                      const appointmentStartDate = new Date(a.startAt);
                      const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
                      const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

                      // For "all" status, count all current appointments
                      if (status.key === 'all') {
                        return appointmentDay.getTime() === todayStart.getTime();
                      }

                      // For specific status, count appointments with that status (case-insensitive)
                      return appointmentDay.getTime() === todayStart.getTime() &&
                        String(a.finalStatusCode || '').toUpperCase() === String(status.key || '').toUpperCase();
                    }).length;

                    return (
                      <button
                        key={status.key}
                        onClick={() => {
                          console.log('Status button clicked:', status.key);
                          console.log('Current selectedStatus before update:', selectedStatus);
                          setSelectedStatus(status.key);
                          setCurrentPage(1);
                          console.log('Status filter should now be:', status.key);

                          // Debug: Check what appointments exist with this status
                          const appointmentsWithThisStatus = appointments.filter(a => {
                            const appointmentStartDate = new Date(a.startAt);
                            const appointmentDay = new Date(appointmentStartDate.getFullYear(), appointmentStartDate.getMonth(), appointmentStartDate.getDate());
                            const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

                            return appointmentDay.getTime() === todayStart.getTime() &&
                              String(a.finalStatusCode || '').toUpperCase() === String(status.key || '').toUpperCase();
                          });

                          console.log(`Appointments with status ${status.key}:`, appointmentsWithThisStatus.map(a => ({
                            patientName: a.patientFullName,
                            finalStatusCode: a.finalStatusCode
                          })));
                        }}
                        className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-300 ${selectedStatus === status.key
                          ? `${status.color.replace('hover:bg-', '')} shadow-[0_4px_12px_rgba(0,0,0,0.1)] ring-2 ring-offset-2 ring-offset-white/50 dark:ring-offset-zinc-900/50 ring-current scale-[1.02]`
                          : `${status.color} opacity-80 hover:opacity-100 hover:scale-105 hover:shadow-md`
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{status.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-inner backdrop-blur-sm ${selectedStatus === status.key ? 'bg-white/60 dark:bg-black/30' : 'bg-white/40 dark:bg-black/20'}`}>
                            {count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Loading State — skeleton board (no blocking spinner) */}
          {isLoading && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <RowSkeletonList rows={6} />
            </div>
          )}



          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
              <div className="text-red-600 dark:text-red-400 mb-2">
                <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">{t('appointmentDashboard.errorTitle')}</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error.message || t('appointmentDashboard.errorDescription')}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                {t('appointmentDashboard.tryAgain')}
              </Button>
            </div>
          )}

          {/* Current Appointments Table */}
          {!isLoading && !error && (
            <div className="space-y-4">
              <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 rounded-2xl overflow-x-auto shadow-xl shadow-brand-900/5 relative z-10">
                <div className="px-2 sm:px-4 py-2.5 border-b border-brand-100/50 dark:border-zinc-800/50 bg-gradient-to-r from-brand-50/30 to-transparent dark:from-brand-900/10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <div>
                      <p className="text-xs font-bold text-brand-900/60 dark:text-brand-200/60 uppercase tracking-widest">
                        {totalPages > 1 && `Page ${currentPage} of ${totalPages}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalPages > 1 && (
                        <Badge variant="outline" className="bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800/50 text-xs px-2 py-1 shadow-sm">
                          {currentPage}/{totalPages}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <Table className="border-collapse min-w-[700px] md:min-w-full text-xs md:text-sm">
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 border-y border-slate-200 dark:border-zinc-700/50">
                        {renderSortableHeader(t('appointmentDashboard.table.patientId'), 'patientId')}
                        {renderSortableHeader(t('appointmentDashboard.table.patientName'), 'patientName')}
                        {renderSortableHeader(t('appointmentDashboard.table.doctorName'), 'doctorName')}
                        {renderSortableHeader(t('appointmentDashboard.table.tokenNo'), 'tokenNo')}
                        {activeTab === 'current' && renderSortableHeader(t('appointmentDashboard.table.printToken', { defaultValue: 'Print Token' }), 'printToken')}
                        {renderSortableHeader(
                          activeTab === 'past'
                            ? t('appointmentDashboard.table.lastAppointmentDate')
                            : activeTab === 'future'
                              ? t('appointmentDashboard.table.appointmentDate')
                              : t('appointmentDashboard.table.appointmentTime'),
                          'appointmentDate'
                        )}
                        {renderSortableHeader(
                          activeTab === 'past'
                            ? t('appointmentDashboard.table.lastCompletedStatus')
                            : t('appointmentDashboard.table.currentStatus'),
                          'status'
                        )}
                        {renderSortableHeader(t('appointmentDashboard.table.labReports', { defaultValue: 'Lab reports' }), 'labReports')}
                        {renderSortableHeader(t('appointmentDashboard.table.case', { defaultValue: 'Case' }), 'case')}
                        {activeTab !== 'past' && renderSortableHeader(t('appointmentDashboard.table.actions'), 'actions')}
                        {renderSortableHeader(t('appointmentDashboard.table.printPrescription'), 'printPrescription')}
                        {activeTab === 'past' && renderSortableHeader(t('appointmentDashboard.table.isCompleted'), 'isCompleted')}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={activeTab === 'past' ? 9 : activeTab === 'current' ? 10 : 9} className="text-center py-12">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center shadow-inner">
                                <CalendarDays className="h-6 w-6 text-brand-400 dark:text-brand-500" />
                              </div>
                              <div>
                                <p className="text-brand-900 dark:text-white font-bold text-sm tracking-wide">
                                  {activeTab === 'current' && t('appointmentDashboard.emptyStates.current')}
                                  {activeTab === 'past' && t('appointmentDashboard.emptyStates.past')}
                                  {activeTab === 'future' && t('appointmentDashboard.emptyStates.future')}
                                </p>
                                <p className="text-brand-600/70 dark:text-brand-400/70 text-xs font-medium mt-1">{t('appointmentDashboard.emptyStates.adjustFilters')}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentAppointments.map((appointment) => (
                          <TableRow key={appointment.appointmentId} className={`group hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition-all border-b border-brand-50 dark:border-zinc-800/50 ${compactMode ? 'h-10' : 'h-12'} text-xs md:text-sm relative hover:shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]`}>
                            {/* Patient ID */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <div
                                onClick={() => handlePatientClick(appointment)}
                                className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-brand-100 dark:border-zinc-700 px-2 py-1 rounded shadow-sm text-[10px] sm:text-xs font-mono font-bold text-brand-700 dark:text-brand-300 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/50 hover:border-brand-300 dark:hover:border-brand-600 transition-all hover:scale-105"
                              >
                                <User className="h-3 w-3" />
                                <span>{appointment.patientId}</span>
                              </div>
                            </TableCell>

                            {/* Patient Name */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <div className="min-w-0 cursor-pointer" onClick={() => handlePatientClick(appointment)}>
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors drop-shadow-sm">
                                  {appointment.patientFullName?.split('-')[0].trim()}
                                </div>
                                {appointment.patientFullName?.includes('-') && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight font-medium">
                                    {appointment.patientFullName.split('-').slice(1).join('-').trim()}
                                  </div>
                                )}
                                {(appointment.patientAge || appointment.patientSex) && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight font-medium">
                                    {[appointment.patientAge ? `${appointment.patientAge} ${appointment.patientAgeUnit || 'yrs'}` : null, appointment.patientSex].filter(Boolean).join(' · ')}
                                  </div>
                                )}
                                {appointment.guardianName && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight font-medium">
                                    {(appointment.guardianRelation || 'C/O')} {appointment.guardianName}
                                  </div>
                                )}
                                {appointment.referrerName && (
                                  <div className="text-[10px] text-brand-500 dark:text-brand-300 truncate leading-tight font-medium">
                                    <span className="font-semibold text-brand-600 dark:text-brand-400">Ref:</span>{' '}
                                    {appointment.referrerType === 'DOCTOR' ? `Dr. ${appointment.referrerName}` : appointment.referrerName}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                  <Phone className="h-2.5 w-2.5 text-brand-400" />
                                  <span className="truncate">{appointment.patientMobile}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Doctor Name */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-gradient-to-br from-cyan-100 to-brand-100 dark:from-cyan-900/50 dark:to-brand-900/50 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner border border-white/50 dark:border-transparent">
                                  <User className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-300" />
                                </div>
                                <span className="text-slate-700 dark:text-slate-300 text-xs truncate font-semibold">
                                  {appointment.doctorName || t('appointmentDashboard.actionButtons.notApplicable')}
                                </span>
                              </div>
                            </TableCell>

                            {/* Token No */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <span className="font-mono bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded text-xs font-bold border border-brand-200 dark:border-brand-800 shadow-sm">
                                {appointment.token?.tokenNumber || t('appointmentDashboard.actionButtons.notApplicable')}
                              </span>
                            </TableCell>

                            {/* Print Token Action */}
                            {activeTab === 'current' && (
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePrintToken(appointment)}
                                  className="h-8 w-8 p-0 text-orange-600 hover:bg-gradient-to-br hover:from-orange-500 hover:to-red-500 hover:text-white dark:hover:from-orange-600 dark:hover:text-white rounded-full transition-all shadow-sm hover:shadow-orange-500/30"
                                  title={t('appointmentDashboard.actionButtons.printToken', { defaultValue: 'Print Token' })}
                                >
                                  <Tag className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}

                            {/* Appointment Time / Last Appointment Date / Appointment Date */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              {activeTab === 'past' ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                                    {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                  </span>
                                </div>
                              ) : activeTab === 'future' ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                                    {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded w-fit">
                                    {format(new Date(appointment.startAt), 'HH:mm')}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium px-1">
                                    {format(new Date(appointment.endAt), 'HH:mm')}
                                  </span>
                                </div>
                              )}
                            </TableCell>

                            {/* Current Status */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <span className="scale-[0.85] origin-left inline-block">{getStatusBadge(appointment.finalStatusCode, appointment)}</span>
                            </TableCell>

                            {/* Lab reports — available for every appointment, regardless of status. */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenLabAttachments(appointment)}
                                className="h-8 w-8 p-0 text-brand-600 hover:bg-gradient-to-br hover:from-brand-500 hover:to-brand-500 hover:text-white dark:hover:from-brand-600 dark:hover:text-white rounded-full transition-all shadow-sm hover:shadow-brand-500/30"
                                title={t('appointmentDashboard.actionButtons.addLabReport', { defaultValue: 'Add lab report' })}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </TableCell>

                            {/* Case */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <div className="flex flex-col items-start gap-0.5">
                                <Badge className="bg-gradient-to-r from-brand-50 to-brand-50 dark:from-brand-900/30 dark:to-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50 text-[10px] px-2 py-0.5 font-bold shadow-sm">
                                  {appointment.appointmentType || 'New / Fee'}
                                </Badge>
                                {opdFeeFor(appointment) > 0 && (
                                  <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                                    ₹{opdFeeFor(appointment).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </TableCell>



                            {/* Actions - Only show for current and future tabs */}
                            {activeTab !== 'past' && (
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                <div className="flex items-center gap-1.5">
                                  {/* Bill stays outside the dropdown — the one action front desk needs at a glance. */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={appointment.finalStatusCode === 'CANCELLED'}
                                    title={appointment.consultPaid ? t('appointmentDashboard.addBill.statusPaid') : undefined}
                                    className={`h-7 px-2.5 text-xs font-bold transition-all duration-300 ${appointment.finalStatusCode === 'CANCELLED'
                                      ? 'text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50 bg-slate-50 dark:bg-slate-900/20'
                                      : appointment.consultPaid
                                        ? 'text-emerald-700 border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm hover:shadow-md'
                                        : 'text-amber-600 border-amber-200 dark:border-amber-800/50 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20 shadow-sm hover:shadow-md hover:scale-105 hover:border-amber-300 dark:hover:border-amber-700'
                                      }`}
                                    onClick={() => handleAddBillClick(appointment)}
                                  >
                                    {appointment.consultPaid ? (
                                      <><CheckCircle2 className="h-3 w-3 mr-1.5" /> {t('appointmentDashboard.addBill.statusPaid')}</>
                                    ) : (
                                      <><IndianRupee className="h-3 w-3 mr-1.5 opacity-80" /> {t('appointmentDashboard.actionButtons.addBill', { defaultValue: 'Bill' })}</>
                                    )}
                                  </Button>

                                  {/* Everything else lives in one premium dropdown. */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 rounded-full border-slate-200 dark:border-slate-800 text-slate-500 hover:text-brand-600 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-gradient-to-br hover:from-brand-50 hover:to-brand-100 dark:hover:from-brand-900/30 dark:hover:to-brand-900/20 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300"
                                        title={t('appointmentDashboard.actionButtons.moreActions', { defaultValue: 'More actions' })}
                                      >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-52 rounded-xl border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-1.5 backdrop-blur-sm"
                                    >
                                      {(appointment.finalStatusCode === 'VITALS_REQUIRED' || appointment.finalStatusCode === 'READY') && (
                                        <DropdownMenuItem
                                          onClick={() => handleVitalsClick(appointment)}
                                          className="rounded-lg gap-2.5 py-2 px-2.5 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 focus:text-fuchsia-700 focus:bg-fuchsia-50 dark:focus:bg-fuchsia-900/20 cursor-pointer transition-colors"
                                        >
                                          <Activity className="h-3.5 w-3.5 opacity-80" />
                                          {t('appointmentDashboard.actionButtons.vitals')}
                                        </DropdownMenuItem>
                                      )}
                                      {appointment.finalStatusCode === 'PRE_APPOINTMENT' && (
                                        <DropdownMenuItem
                                          onClick={() => handleConfirmPreAppointmentClick(appointment)}
                                          className="rounded-lg gap-2.5 py-2 px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-900/20 cursor-pointer transition-colors"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5 opacity-80" />
                                          {t('appointmentDashboard.actionButtons.confirmPreAppointment', { defaultValue: 'Confirm' })}
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        disabled={['COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                        onClick={() => handleRescheduleClick(appointment)}
                                        className="rounded-lg gap-2.5 py-2 px-2.5 text-xs font-bold text-brand-600 dark:text-brand-400 focus:text-brand-700 focus:bg-brand-50 dark:focus:bg-brand-900/20 cursor-pointer transition-colors"
                                      >
                                        <CalendarClock className="h-3.5 w-3.5 opacity-80" />
                                        Reschedule
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={['COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                        onClick={() => handleEditClick(appointment)}
                                        className="rounded-lg gap-2.5 py-2 px-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 focus:text-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer transition-colors"
                                      >
                                        <Pencil className="h-3.5 w-3.5 opacity-80" />
                                        {t('common.edit', { defaultValue: 'Edit' })}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />
                                      <DropdownMenuItem
                                        disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                        onClick={() => handleCancelClick(appointment)}
                                        className="rounded-lg gap-2.5 py-2 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-900/20 cursor-pointer transition-colors"
                                      >
                                        <Ban className="h-3.5 w-3.5 opacity-80" />
                                        {t('common.cancel')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            )}

                            {/* Print Prescription */}
                            <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={previewModalOpen && previewRequest?.appointmentId === appointment.appointmentId}
                                onClick={() => handlePrintPrescription(appointment)}
                                className="h-7 px-2.5 text-xs font-bold text-emerald-600 border-emerald-200 dark:border-emerald-800/50 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-900/20 dark:hover:to-green-900/20 shadow-sm hover:shadow-md hover:scale-105 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300"
                              >
                                {previewModalOpen && previewRequest?.appointmentId === appointment.appointmentId ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                    {t('appointmentDashboard.actionButtons.preparing')}
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-3 w-3 mr-1.5 opacity-80" />
                                    {t('common.print')}
                                  </>
                                )}
                              </Button>
                            </TableCell>

                            {/* Past Completed Status - Only show for past tab */}
                            {activeTab === 'past' && (
                              <TableCell className={`${compactMode ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-center`}>
                                <div className="flex justify-center items-center">
                                  {appointment.finalStatusCode === 'COMPLETED' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2.5 text-xs font-bold text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 shadow-inner"
                                    >
                                      <UserCheck className="h-3 w-3 mr-1.5" />
                                      {t('appointmentDashboard.actionButtons.completed')}
                                    </Button>
                                  ) : (
                                    <div className="flex items-center justify-center w-8 h-8 bg-rose-100 dark:bg-rose-900/30 border-2 border-rose-300 dark:border-rose-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] rounded-full">
                                      <X className="h-4 w-4 text-rose-700 dark:text-rose-300 font-black" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View (Android List Item Style) */}
                <div className="md:hidden">
                  {filteredAppointments.length === 0 ? (
                    <div className="text-center py-12 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/50 dark:border-zinc-800/50 shadow-inner mx-4">
                      <CalendarDays className="h-10 w-10 text-brand-300 dark:text-brand-700 mx-auto mb-3 opacity-50" />
                      <p className="text-brand-900/70 dark:text-brand-200/70 text-sm font-bold tracking-wide">No appointments found</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 px-2 pt-2 pb-24">
                      {currentAppointments.map((appointment) => (
                        <div key={appointment.appointmentId} className="bg-white dark:bg-zinc-900/80 p-3.5 sm:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800/80 overflow-hidden active:scale-[0.98] transition-all relative group">
                          {/* Main Row */}
                          <div className="flex gap-3 relative z-10">
                            {/* Avatar */}
                            <div 
                              onClick={() => handlePatientClick(appointment)}
                              className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-brand-800 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-lg shadow-sm shrink-0 mt-0.5 border border-white dark:border-zinc-700"
                            >
                              {appointment.patientFullName.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0 flex flex-col">
                              {/* Top Row: Name and Time */}
                              <div className="flex justify-between items-start gap-2" onClick={() => handlePatientClick(appointment)}>
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-[15px] truncate leading-tight">
                                  {appointment.patientFullName}
                                </div>
                                <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap shrink-0">{format(new Date(appointment.startAt), 'HH:mm')}</span>
                              </div>
                              
                              {/* Middle Row: Token & Mobile */}
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500" onClick={() => handlePatientClick(appointment)}>
                                <span className="font-mono font-medium text-brand-600 dark:text-brand-400">#{appointment.token?.tokenNumber || 'NA'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="truncate">{appointment.patientMobile}</span>
                              </div>

                              {/* Status Badge */}
                              <div className="mt-1.5 scale-[0.8] origin-left pointer-events-none" onClick={() => handlePatientClick(appointment)}>
                                {getStatusBadge(appointment.finalStatusCode, appointment)}
                              </div>

                              {/* Actions Row */}
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50/50 dark:border-zinc-800/30">
                                {/* Primary Action */}
                                <div className="flex-1 mr-2">
                                  {(appointment.finalStatusCode === 'VITALS_REQUIRED' || appointment.finalStatusCode === 'READY') && (
                                    <Button size="sm" onClick={() => handleVitalsClick(appointment)} className="h-8 w-full text-xs font-bold rounded-lg bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 shadow-sm transition-all">
                                      <Heart className="h-3 w-3 mr-1.5" /> Vitals
                                    </Button>
                                  )}
                                  {appointment.finalStatusCode === 'PRE_APPOINTMENT' && (
                                    <Button size="sm" onClick={() => handleConfirmPreAppointmentClick(appointment)} className="h-8 w-full text-xs font-bold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 shadow-sm transition-all">
                                      <CheckCircle2 className="h-3 w-3 mr-1.5" /> Confirm
                                    </Button>
                                  )}
                                </div>
                                
                                {/* Secondary Actions */}
                                <div className="flex gap-1.5 shrink-0">
                                  {/* Bill Button */}
                                  {appointment.finalStatusCode !== 'CANCELLED' && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      title={appointment.consultPaid ? t('appointmentDashboard.addBill.statusPaid') : undefined}
                                      onClick={() => handleAddBillClick(appointment)}
                                      className={`h-8 w-8 rounded-lg shadow-sm transition-all ${appointment.consultPaid ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30' : 'border-amber-200 text-amber-700 bg-white dark:bg-zinc-800 dark:border-zinc-700'}`}
                                    >
                                      {appointment.consultPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <IndianRupee className="h-3.5 w-3.5" />}
                                    </Button>
                                  )}

                                  {/* 3-Dot Overflow Menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg shadow-sm bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 transition-all">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl bg-white/95 backdrop-blur-xl dark:bg-zinc-900/95 dark:border-zinc-800">
                                      {activeTab === 'current' && (
                                        <DropdownMenuItem onClick={() => handlePrintToken(appointment)} className="py-2.5 font-medium cursor-pointer rounded-lg focus:bg-slate-50 dark:focus:bg-zinc-800">
                                          <Tag className="h-4 w-4 mr-2 text-orange-500" /> Print Token
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handlePrintPrescription(appointment)} className="py-2.5 font-medium cursor-pointer rounded-lg focus:bg-slate-50 dark:focus:bg-zinc-800">
                                        <FileText className="h-4 w-4 mr-2 text-emerald-500" /> Print Rx
                                      </DropdownMenuItem>
                                      {activeTab !== 'past' && (
                                        <>
                                          <DropdownMenuSeparator className="dark:bg-zinc-800 my-1" />
                                          <DropdownMenuItem 
                                            disabled={['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode)}
                                            onClick={() => handleCancelClick(appointment)}
                                            className="py-2.5 font-medium text-rose-600 dark:text-rose-400 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-900/20 cursor-pointer rounded-lg"
                                          >
                                            <X className="h-4 w-4 mr-2" /> Cancel Appointment
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Guide */}
                <div className="mt-4 px-4 py-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{t('appointmentDashboard.quickTip.title')}</span>
                    </div>
                    <span>
                      {t('appointmentDashboard.quickTip.description', {
                        defaultValue: 'Click on any Patient ID to view the patient\'s complete profile and medical history',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-brand-100/50 dark:border-zinc-800/50 bg-brand-50/30 dark:bg-brand-900/10 backdrop-blur-md rounded-b-2xl">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-brand-900/60 dark:text-brand-200/60 uppercase tracking-widest">
                  {t('appointmentDashboard.pagination.showing', {
                    from: startIndex + 1,
                    to: Math.min(endIndex, filteredAppointments.length),
                    total: filteredAppointments.length,
                  })}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>

                    {/* Page numbers - show more pages for better navigation */}
                    {Array.from({ length: totalPages }, (_, i) => {
                      const page = i + 1;
                      // Show first 3 pages, last 3 pages, and pages around current
                      const shouldShow =
                        page <= 3 ||
                        page >= totalPages - 2 ||
                        Math.abs(page - currentPage) <= 1;

                      if (!shouldShow) {
                        // Show ellipsis between gaps
                        if (page === 4 || page === totalPages - 3) {
                          return (
                            <PaginationItem key={`ellipsis-${page}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      }

                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={page === currentPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vitals Form Modal */}
      {showVitalsForm && selectedPatient && (
        <VitalsForm
          patientName={selectedPatient.patientFullName}
          appointmentId={selectedPatient.appointmentId}
          patientId={selectedPatient.patientId}
          onSubmit={handleVitalsSubmit}
          onCancel={handleVitalsCancel}
          hideSkipButton={true}
        />
      )
      }

      {/* Token Print Modal */}


      <PrescriptionPreviewModal
        open={previewModalOpen}
        onOpenChange={handlePreviewModalChange}
        request={previewRequest}
      />

      <AttachmentsSection
        open={labAttachmentModal.open}
        onOpenChange={(open) => setLabAttachmentModal((prev) => ({ ...prev, open }))}
        trigger={null}
        attachments={labAttachments[labAttachmentModal.patientId || ''] || []}
        onChange={handleLabAttachmentsChange}
        patientId={labAttachmentModal.patientId}
        patientName={labAttachmentModal.patientName}
        appointmentId={labAttachmentModal.appointmentId}
        doctorId={labAttachmentModal.doctorId}
      />

      {/* Add Bill Modal Side Panel */}
      <AnimatePresence>
        {showAddBillModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleAddBillModalChange(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800"
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-brand-50/50 dark:bg-brand-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {t('appointmentDashboard.addBill.title', { defaultValue: 'Add Bill' })}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('appointmentDashboard.addBill.description', {
                        defaultValue: 'Review the appointment details and proceed to add billing information.',
                      })}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleAddBillModalChange(false)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 self-start shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {appointmentForBilling && (
                  <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
                    {/* Premium Paid banner — shown whenever this visit's consult is already paid */}
                    {billStatus?.consultPaid && (
                      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 p-4 shadow-sm">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="relative flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">{t('appointmentDashboard.addBill.statusPaid')}</div>
                            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 leading-tight">₹{billStatus.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                              {billStatus.receiptNo && <span className="font-mono">{t('appointmentDashboard.addBill.docReceipt')}: {billStatus.receiptNo}</span>}
                              {billTimeline?.lastPaidDate && <span>{fmtBillTimelineDate(billTimeline.lastPaidDate)}</span>}
                            </div>
                          </div>
                        </div>
                        {billStatus.encounterId && (
                          <div className="relative mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40">
                            {renderDocButtons(appointmentForBilling, billStatus.encounterId, true)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                        <span className="font-medium text-gray-500">{t('appointmentDashboard.dialog.patient', { defaultValue: 'Patient' })}</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">{appointmentForBilling.patientFullName}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                        <span className="font-medium text-gray-500">{t('appointmentDashboard.table.patientId')}</span>
                        <span className="font-mono text-brand-600 dark:text-brand-400 text-right">{appointmentForBilling.patientId}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                        <span className="font-medium text-gray-500">{t('appointmentDashboard.table.doctorName')}</span>
                        <span className="text-right text-gray-900 dark:text-gray-100 font-medium">{appointmentForBilling.doctorName || t('appointmentDashboard.actionButtons.notApplicable')}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                        <span className="font-medium text-gray-500">{t('appointmentDashboard.table.appointmentTime')}</span>
                        <span className="text-right text-gray-900 dark:text-gray-100">{format(new Date(appointmentForBilling.startAt), 'PPpp')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-500">{t('appointmentDashboard.table.tokenNo')}</span>
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-sm font-semibold">{appointmentForBilling.token?.tokenNumber || t('appointmentDashboard.actionButtons.notApplicable')}</span>
                      </div>
                    </div>

                    {/* Consultation timeline — last paid, free follow-up window, next-visit fee preview */}
                    {billTimeline && (
                      <div className="rounded-xl border border-brand-100 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-900/10 p-4 space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-brand-800 dark:text-brand-300 text-sm">
                          <Clock className="h-4 w-4" /> {t('patientForm.timeline.title', { defaultValue: 'Consultation history' })}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:text-sm">
                          <span className="text-muted-foreground">{t('patientForm.timeline.lastPaid', { defaultValue: 'Last paid' })}</span>
                          <span className="text-right font-medium">
                            {billTimeline.lastPaidDate ? fmtBillTimelineDate(billTimeline.lastPaidDate) : t('patientForm.timeline.never', { defaultValue: 'Never' })}
                          </span>
                          <span className="text-muted-foreground">{t('patientForm.timeline.freeSince', { defaultValue: 'Free follow-ups since' })}</span>
                          <span className="text-right font-medium">{billTimeline.freeFollowUpCount}</span>
                          {!billTimeline.neverExpires && billTimeline.validUptoDate && (
                            <>
                              <span className="text-muted-foreground">{t('patientForm.timeline.validUpto', { defaultValue: 'Free until' })}</span>
                              <span className="text-right font-medium">
                                {fmtBillTimelineDate(billTimeline.validUptoDate)}
                                <span className="block text-[11px] font-normal text-brand-600 dark:text-brand-400">{daysLeftText(billTimeline.validUptoDate)}</span>
                              </span>
                            </>
                          )}
                          <span className="text-muted-foreground">{t('patientForm.timeline.thisVisit', { defaultValue: 'This visit' })}</span>
                          <span className={`text-right font-semibold ${billTimeline.nextVisit.feeApplies ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-400'}`}>
                            {billTimeline.nextVisit.feeApplies
                              ? `${billTimeline.nextVisit.appointmentType === 'New' ? t('patientForm.timeline.typeNew', { defaultValue: 'New' }) : t('patientForm.timeline.typeOldFee', { defaultValue: 'Follow-up (fee due)' })} · ₹${billTimeline.nextVisit.fee.toLocaleString('en-IN')}`
                              : t('patientForm.timeline.noFee', { defaultValue: 'Follow-up — No fee' })}
                          </span>
                        </div>

                        {/* Per-visit payment timeline: date · case type · amount · status · receipt */}
                        {(billTimeline.history?.length ?? 0) > 0 && (
                          <div className="pt-2 mt-1 border-t border-brand-100 dark:border-brand-900/40 space-y-1.5">
                            <div className="text-xs font-semibold text-brand-800 dark:text-brand-300">{t('appointmentDashboard.addBill.paymentTimeline', { defaultValue: 'Payment timeline' })}</div>
                            {[...billTimeline.history].sort((a, b) => b.apptDate.localeCompare(a.apptDate)).map((v) => (
                              <div key={v.appointmentId} className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground whitespace-nowrap">{fmtBillTimelineDate(v.apptDate)}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-medium whitespace-nowrap">{caseTypeLabel(v.appointmentType)}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {v.amount > 0 && <span className="font-mono text-gray-700 dark:text-gray-300">₹{v.amount.toLocaleString('en-IN')}</span>}
                                  {v.consultPaid ? (
                                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{t('appointmentDashboard.addBill.statusPaid')}{v.receiptNo ? ` · ${v.receiptNo}` : ''}</span>
                                  ) : v.consultCharged ? (
                                    <span className="text-amber-700 dark:text-amber-300 font-semibold">{t('appointmentDashboard.addBill.statusUnpaid')}</span>
                                  ) : (
                                    <span className="text-gray-400">{t('appointmentDashboard.addBill.statusNotCharged')}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* OPD consultation fee — present only when policy = AUTO and a fee is set */}
                    {billConsultCtx.autoConsult && billConsultCtx.fee > 0 && appointmentForBilling.appointmentType !== 'Old/No-Fee' && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-emerald-800 dark:text-emerald-300">{t('appointmentDashboard.addBill.consultTitle')}</span>
                          <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">₹{billConsultCtx.fee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-xs font-medium text-gray-500">{t('appointmentDashboard.addBill.status')}</span>
                          {billStatus?.consultPaid ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              {t('appointmentDashboard.addBill.statusPaid')}{billStatus.receiptNo ? ` · ${billStatus.receiptNo}` : ''}
                            </span>
                          ) : billStatus?.consultCharged ? (
                            <span className="font-semibold text-amber-700 dark:text-amber-300">{t('appointmentDashboard.addBill.statusUnpaid')}</span>
                          ) : (
                            <span className="font-medium text-gray-500">{t('appointmentDashboard.addBill.statusNotCharged')}</span>
                          )}
                        </div>
                        {!billStatus?.consultPaid && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-gray-500">{t('appointmentDashboard.addBill.paymentMode')}</span>
                            <Select value={billPaymentMode} onValueChange={setBillPaymentMode}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Documents — for a charged-but-unpaid visit (invoice only). When paid,
                        the premium Paid banner above already carries the document buttons. */}
                    {billStatus?.consultCharged && !billStatus.consultPaid && billStatus.encounterId && (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          <FileText className="h-4 w-4" /> {t('appointmentDashboard.addBill.documents', { defaultValue: 'Documents' })}
                        </div>
                        {renderDocButtons(appointmentForBilling, billStatus.encounterId, false)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 pb-[120px] sm:pb-6 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => handleAddBillModalChange(false)} disabled={billBusy}>
                  {t('common.close', { defaultValue: 'Close' })}
                </Button>
                {billConsultCtx.autoConsult && billConsultCtx.fee > 0 && appointmentForBilling?.appointmentType !== 'Old/No-Fee' ? (
                  billStatus?.consultPaid ? null : (
                    <>
                      {!billStatus?.consultCharged && (
                        <Button variant="outline" onClick={() => handleCollectConsult(false)} disabled={billBusy} className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300">
                          {t('appointmentDashboard.addBill.markUnpaid')}
                        </Button>
                      )}
                      <Button onClick={() => handleCollectConsult(true)} disabled={billBusy} className="bg-emerald-600 text-white hover:bg-emerald-700">
                        {billBusy ? t('appointmentDashboard.addBill.saving') : t('appointmentDashboard.addBill.markPaid')}
                      </Button>
                    </>
                  )
                ) : (
                  <Button onClick={() => goToBilling(appointmentForBilling)} className="bg-brand-600 text-white hover:bg-brand-700">
                    {t('appointmentDashboard.addBill.goToBilling', { defaultValue: 'Go to Billing' })}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Consult fee collected — success popup with invoice/receipt retrieval */}
      <Dialog open={!!paidSuccess} onOpenChange={(open) => { if (!open) setPaidSuccess(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" /> {t('appointmentDashboard.addBill.successTitle', { defaultValue: 'Payment collected' })}
            </DialogTitle>
            <DialogDescription>
              {t('appointmentDashboard.addBill.successDesc', { defaultValue: 'The consultation fee has been recorded.' })}
            </DialogDescription>
          </DialogHeader>
          {paidSuccess && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">{t('appointmentDashboard.addBill.consultTitle')}</span><span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">₹{paidSuccess.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                {paidSuccess.invoiceNo && <div className="flex justify-between"><span className="text-gray-500">{t('appointmentDashboard.addBill.docInvoice', { defaultValue: 'Invoice' })}</span><span className="font-mono">{paidSuccess.invoiceNo}</span></div>}
                {paidSuccess.receiptNo && <div className="flex justify-between"><span className="text-gray-500">{t('appointmentDashboard.addBill.docReceipt', { defaultValue: 'Receipt' })}</span><span className="font-mono">{paidSuccess.receiptNo}</span></div>}
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                {renderDocButtons(paidSuccess.patient, paidSuccess.encounterId, true)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPaidSuccess(null)} className="bg-brand-600 text-white hover:bg-brand-700">
              {t('common.done', { defaultValue: 'Done' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Side Panel */}
      <AnimatePresence>
        {cancelDialogOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isCancelling) handleCancelDialogClose();
              }}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] md:w-[500px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-800"
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-red-50/50 dark:bg-red-900/10 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                      <Ban className="h-5 w-5" />
                      {t('appointmentDashboard.dialog.cancelTitle')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('appointmentDashboard.dialog.cancelDescription')}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (!isCancelling) handleCancelDialogClose();
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 self-start shrink-0"
                    disabled={isCancelling}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {appointmentToCancel && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm text-sm text-gray-700 dark:text-gray-200">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                      <span className="font-medium text-gray-500">{t('appointmentDashboard.dialog.patient')}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">{appointmentToCancel.patientFullName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                      <span className="font-medium text-gray-500">{t('appointmentDashboard.dialog.patientId')}</span>
                      <span className="font-mono text-brand-600 dark:text-brand-400 text-right">{appointmentToCancel.patientId}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                      <span className="font-medium text-gray-500">{t('appointmentDashboard.dialog.doctor')}</span>
                      <span className="text-right text-gray-900 dark:text-gray-100 font-medium">{appointmentToCancel.doctorName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                      <span className="font-medium text-gray-500">{t('appointmentDashboard.table.appointmentTime')}</span>
                      <span className="text-right text-gray-900 dark:text-gray-100">{format(new Date(appointmentToCancel.startAt), 'PPpp')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-500">{t('appointmentDashboard.dialog.appointmentId')}</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-sm font-semibold">{appointmentToCancel.appointmentId}</span>
                    </div>
                  </div>
                )}

                {appointmentToCancel && ['VITALS_REQUIRED', 'READY'].includes(appointmentToCancel.finalStatusCode) && (
                  <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                    This patient has already checked in today.
                  </div>
                )}

                <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3 text-xs text-gray-500 dark:text-gray-400">
                  If a payment was already collected for this appointment, it will be automatically refunded. If this visit has a pending admission referral, it won't be cancelled automatically — check the Referred Admissions board.
                </div>

                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason (optional)</label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Why is this appointment being cancelled?"
                    rows={2}
                    className="mt-1 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="p-4 pb-[120px] sm:pb-6 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 shrink-0">
                <Button
                  variant="outline"
                  onClick={handleCancelDialogClose}
                  disabled={isCancelling}
                >
                  {t('appointmentDashboard.dialog.keepAppointment')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('appointmentDashboard.dialog.cancelling')}
                    </>
                  ) : (
                    t('appointmentDashboard.dialog.confirmCancel')
                  )}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AttachmentsSection
        open={labAttachmentModal.open}
        onOpenChange={(open) => setLabAttachmentModal((prev) => ({ ...prev, open }))}
        trigger={null}
        attachments={labAttachments[labAttachmentModal.patientId || ''] || []}
        onChange={handleLabAttachmentsChange}
        patientId={labAttachmentModal.patientId}
        patientName={labAttachmentModal.patientName}
        appointmentId={labAttachmentModal.appointmentId}
        doctorId={labAttachmentModal.doctorId}
      />

      <PatientProfileModal
        isOpen={showPatientProfileModal}
        onClose={() => setShowPatientProfileModal(false)}
        hospitalId={hospitalId || ''}
        patientId={patientProfileId || ''}
        patientName={patientProfileName}
      />

      <TokenPrintModal
        open={tokenPrintOpen}
        onOpenChange={setTokenPrintOpen}
        tokenData={tokenPrintData}
      />

      {
        appointmentToReschedule && (
          <RescheduleDialog
            open={showRescheduleDialog}
            onOpenChange={setShowRescheduleDialog}
            appointment={appointmentToReschedule}
            onSuccess={handleRescheduleSuccess}
            enableDoctorSelection={true}
          />
        )
      }
      {
        appointmentToConfirm && (
          <ConfirmPreAppointmentDialog
            open={showConfirmPreAppointmentDialog}
            onOpenChange={setShowConfirmPreAppointmentDialog}
            appointment={appointmentToConfirm}
            onSuccess={handleConfirmPreAppointmentSuccess}
          />
        )
      }
      {
        showEditAppointment && appointmentToEdit && (
          <PatientForm
            editAppointment={appointmentToEdit}
            selectedSlot={{
              id: appointmentToEdit.appointmentId,
              time: format(new Date(appointmentToEdit.startAt), 'HH:mm'),
              isBooked: true,
              doctorId: String(appointmentToEdit.doctorId),
              date: getAppointmentDateKey(appointmentToEdit),
              slotDurationInMinutes: Math.max(1, Math.round((new Date(appointmentToEdit.endAt).getTime() - new Date(appointmentToEdit.startAt).getTime()) / 60000)),
            }}
            doctor={{
              id: String(appointmentToEdit.doctorId),
              name: appointmentToEdit.doctorName || '',
              department: appointmentToEdit.departmentName || '',
              specialization: '',
              is_available: true,
            }}
            hospitalId={hospitalId || ''}
            onSubmit={handleEditSuccess}
            onCancel={() => { setShowEditAppointment(false); setAppointmentToEdit(null); }}
          />
        )
      }
      <DashboardQuickGuide
        open={showQuickGuide}
        onOpenChange={setShowQuickGuide}
      />

      {/* Floating Action Button Constraints Area (Mobile Only) */}
      <div className="md:hidden fixed inset-0 pointer-events-none z-40" ref={fabConstraintsRef} />

      {/* Floating Action Button (Mobile Only) */}
      <motion.div 
        drag
        dragConstraints={fabConstraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        whileTap={{ scale: 0.95 }}
        onTap={handleBookingClick}
        className="md:hidden fixed bottom-[120px] right-4 z-50 pointer-events-auto flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <Button
          className="h-14 px-5 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-xl shadow-brand-600/30 flex items-center gap-2 transition-colors pointer-events-none"
        >
          <Plus className="h-6 w-6" />
          <span className="font-bold text-sm tracking-wide">{t('appointmentDashboard.bookAppointment', 'Book Appointment')}</span>
        </Button>
      </motion.div>
    </div >

      {/* Booking Flow Overlay (Mobile Slide-up, Desktop Inline) */}
      <AnimatePresence>
        {showBooking && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-950 flex flex-col md:relative md:z-auto md:bg-transparent md:animate-none md:!transform-none md:!opacity-100"
          >
            {/* Header: Native Top App Bar on Mobile, Standard Header on Desktop */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm relative z-10 shrink-0">
              <div className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-3 md:py-3">
                <button
                  onClick={() => setShowBooking(false)}
                  className="group flex items-center justify-center h-10 w-10 md:h-auto md:w-auto md:gap-1.5 md:px-3 md:py-1.5 rounded-full md:rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm font-semibold md:border md:border-gray-200 dark:md:border-gray-700"
                >
                  <ArrowLeft className="h-6 w-6 md:h-4 md:w-4 transition-transform group-hover:-translate-x-1" />
                  <span className="hidden md:inline">{t('common.back')}</span>
                </button>
                <div className="hidden md:block h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-base font-bold md:font-black text-gray-900 dark:text-white tracking-tight">{t('appointmentDashboard.bookNewAppointment')}</h1>
                </div>
              </div>
            </div>
            {/* Form Content */}
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
              <AppointmentBooking refreshToken={bookingRefreshToken} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppointmentDashboard; 
