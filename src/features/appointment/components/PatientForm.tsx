import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Calendar, Clock, MapPin, DollarSign, CreditCard, Search, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RegisterAppointmentRequest, generatePatientId, appointmentApi, type ConsultTimelineResponse } from '../services/appointmentApi';
import { useAppointmentBooking } from '../hooks/useAppointmentBooking';
import { usePatientSearch } from '../hooks/usePatientSearch';
import { PatientSearchItem } from '../services/appointmentApi';
import { patientApi, type DuplicateMatch, type DuplicateConfidence } from '@/features/patient/services/patientApi';
import { isReachable } from '@/offline';
import { useReferrers, useCreateReferrer } from '../hooks/useReferrers';
import { useAuthStore } from '@/store/authStore';
import { getOpdConsultContext, postOpdConsult } from '@/features/billing/services/consultCharge';
import { toast } from '@/hooks/use-toast';

// Define types locally to avoid import issues
interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  is_available?: boolean;
}

interface TimeSlot {
  id: string;
  time: string;
  isBooked: boolean;
  patientInfo?: {
    name: string;
    phone: string;
    age: number;
    gender: string;
  };
  doctorId: string;
  date: string;
  slotDurationInMinutes?: number;
  shiftName?: string;
}

type PatientFormState = {
  patientId: string;
  name: string;
  referrerId: string;
  phone: string;
  age: string;
  ageUnit: string;
  gender: string;
  address: string;
  block: string;
  city: string;
  pincode: string;
  country: string;
  bloodGroup: string;
  alternateMobile: string;
  email: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  reason: string;
  isPaid: boolean;
  paymentMode: string;
  hasInsurance: boolean;
  insuranceId: string;
  insuranceType: string;
  // Guardian / relative (permanent patient-level, separate from medical referrer)
  guardianName: string;
  guardianRelation: string;
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const EMERGENCY_RELATIONS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Guardian', 'Other'];

const PHONE_REGEX = /^\d{10}$/;
const RELATION_OPTIONS = ['C/O', 'S/O', 'D/O', 'W/O', 'H/O', 'G/O', 'F/O', 'M/O'];

const DUP_TONE: Record<DuplicateConfidence, { chip: string; label: string }> = {
  NEAR_CERTAIN: { chip: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Near-certain' },
  PROBABLE: { chip: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Probable' },
  POSSIBLE: { chip: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Possible' },
};

const createInitialFormState = (): PatientFormState => ({
  patientId: '',
  name: '',
  referrerId: '',
  phone: '',
  age: '',
  ageUnit: 'Y',
  gender: 'Male',
  address: '',
  block: '',
  city: '',
  pincode: '',
  country: 'India',
  bloodGroup: '',
  alternateMobile: '',
  email: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
  reason: '',
  isPaid: false,
  paymentMode: '',
  hasInsurance: false,
  insuranceId: '',
  insuranceType: '',
  guardianName: '',
  guardianRelation: 'C/O',
});

const formatPhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 10);

const collectValidationErrors = (data: PatientFormState) => {
  const newErrors: Record<string, string> = {};

  if (!data.name.trim()) {
    newErrors.name = 'patientForm.errors.nameRequired';
  }

  const cleanPhone = formatPhoneNumber(data.phone);
  if (!cleanPhone) {
    newErrors.phone = 'patientForm.errors.phoneRequired';
  } else if (!PHONE_REGEX.test(cleanPhone)) {
    newErrors.phone = 'patientForm.errors.phoneInvalid';
  }

  if (!data.age.trim()) {
    newErrors.age = 'patientForm.errors.ageRequired';
  } else {
    const ageValue = parseInt(data.age, 10);
    if (Number.isNaN(ageValue) || ageValue < 1 || ageValue > 120) {
      newErrors.age = 'patientForm.errors.ageInvalid';
    }
  }

  if (!data.gender) {
    newErrors.gender = 'patientForm.errors.genderRequired';
  }

  // Address fields are optional. Only validate the pincode FORMAT when one is actually entered.
  if (data.pincode.trim() && !/^\d{6}$/.test(data.pincode)) {
    newErrors.pincode = 'patientForm.errors.pincodeInvalid';
  }

  if (data.isPaid && !data.paymentMode) {
    newErrors.paymentMode = 'patientForm.errors.paymentModeRequired';
  }

  return newErrors;
};
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface PatientFormProps {
  selectedSlot: TimeSlot;
  doctor: Doctor;
  hospitalId?: string;
  onSubmit: (patientInfo: any) => void;
  onCancel: () => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  selectedSlot,
  doctor,
  hospitalId,
  onSubmit,
  onCancel
}) => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState<PatientFormState>(createInitialFormState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // searchField state removed
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Fuzzy duplicate detection (only while entering a brand-new patient).
  const [dupMatches, setDupMatches] = useState<DuplicateMatch[]>([]);
  const [dupDismissed, setDupDismissed] = useState(false);
  const { bookAppointment, isLoading: isBookingLoading, error: bookingError, clearError } = useAppointmentBooking();
  const { searchPatients, isLoading: isSearchLoading, error: searchError, clearError: clearSearchError } = usePatientSearch();
  const { getUserId } = useAuthStore();

  // OPD consult fee: shown + collectable only for SAME-DAY bookings when Billing Policy
  // OPD trigger = AUTO and the doctor has a consult fee. Future bookings are handled later
  // from the dashboard.
  const [consultCtx, setConsultCtx] = useState<{ autoConsult: boolean; fee: number }>({ autoConsult: false, fee: 0 });
  const [timeline, setTimeline] = useState<ConsultTimelineResponse | null>(null);
  const isSameDay = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return selectedSlot?.date === todayStr;
  }, [selectedSlot?.date]);
  // For an existing patient the server tells us whether the next visit is chargeable; a new
  // patient (no id, no timeline) is always a fee visit.
  const nextFeeApplies = timeline ? timeline.nextVisit.feeApplies : true;
  const consultFee = (timeline && timeline.nextVisit.fee > 0) ? timeline.nextVisit.fee : consultCtx.fee;
  const showConsult = consultCtx.autoConsult && consultFee > 0 && isSameDay && nextFeeApplies;

  // Same-day duplicate guard: the timeline history is this patient's visits to THIS doctor
  // (cancelled already excluded by the server). If one falls on the selected appointment date,
  // it's a duplicate booking — we warn but still allow staff to proceed.
  const [showDupConfirm, setShowDupConfirm] = useState(false);
  const localDayKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const sameDayDuplicate = useMemo(() => {
    if (!timeline?.history?.length || !selectedSlot?.date) return null;
    return timeline.history.find(
      h => h.apptDate
        && localDayKey(h.apptDate) === selectedSlot.date
        && (h.statusCode ?? '').toUpperCase() !== 'CANCELLED'
    ) ?? null;
  }, [timeline, selectedSlot?.date]);

  useEffect(() => {
    if (!doctor?.id || !isSameDay) { setConsultCtx({ autoConsult: false, fee: 0 }); return; }
    let active = true;
    getOpdConsultContext(doctor.id, hospitalId).then(ctx => { if (active) setConsultCtx(ctx); });
    return () => { active = false; };
  }, [doctor?.id, hospitalId, isSameDay]);

  // Consult timeline (last paid, free follow-ups, next-visit preview) for an existing patient.
  useEffect(() => {
    if (!doctor?.id || !hospitalId || !formData.patientId) { setTimeline(null); return; }
    let active = true;
    appointmentApi.getConsultTimeline(hospitalId, formData.patientId, doctor.id, selectedSlot?.date)
      .then(t => { if (active) setTimeline(t); })
      .catch(() => { if (active) setTimeline(null); });
    return () => { active = false; };
  }, [doctor?.id, hospitalId, formData.patientId, selectedSlot?.date]);

  const fmtTimelineDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  // Days until the free follow-up window closes (after which the next consult is chargeable again).
  const daysLeftText = (iso: string): string => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upto = new Date(iso); upto.setHours(0, 0, 0, 0);
    const days = Math.round((upto.getTime() - today.getTime()) / 86400000);
    if (days < 0) return t('patientForm.timeline.expired', { defaultValue: 'Window closed' });
    if (days === 0) return t('patientForm.timeline.lastDay', { defaultValue: 'Last free day' });
    return t('patientForm.timeline.daysLeft', { count: days, defaultValue: '{{count}} days left' });
  };
  const nextVisitLabel = (type: string) =>
    type === 'New'
      ? t('patientForm.timeline.typeNew', { defaultValue: 'New' })
      : t('patientForm.timeline.typeOldFee', { defaultValue: 'Follow-up (fee due)' });

  // ── Referral ("Referred By") ──────────────────────────────────────────────
  const [referrerSearch, setReferrerSearch] = useState('');
  const [referrerFocused, setReferrerFocused] = useState(false);
  const [creatingReferrer, setCreatingReferrer] = useState(false);
  const [newReferrer, setNewReferrer] = useState({ name: '', phone: '', address: '', rate: '10', type: 'REFERRER' });
  const { data: referrersData } = useReferrers(hospitalId || '', referrerSearch.trim() || undefined);
  const createReferrer = useCreateReferrer(hospitalId || '');
  const referrers = referrersData?.referrers ?? [];
  const selectedReferrer = referrers.find(r => r.referrerId === formData.referrerId);
  const pendingValidationErrors = useMemo(() => collectValidationErrors(formData), [formData]);
  const isFormReady = Object.keys(pendingValidationErrors).length === 0;

  // Mandatory-field highlight: amber while still empty (shows what's left to fill),
  // red when invalid after a submit attempt, else the normal/auto-filled style.
  const reqClass = (val: string, hasError: boolean) =>
    hasError ? 'border-red-500'
      : !val.trim() ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10'
        : (formData.patientId ? 'bg-brand-50' : '');

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }), [i18n.language]);

  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    hour: 'numeric',
    minute: '2-digit'
  }), [i18n.language]);

  const formatTime = (time: string) => {
    const date = new Date(`1970-01-01T${time}:00`);
    return timeFormatter.format(date);
  };

  // Debounced search on name typing
  useEffect(() => {
    if (formData.patientId) return; // Stop searching if already selected
    const query = formData.name.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await searchPatients({
          by: 'name',
          q: query,
          scope: 'local'
        });
        setSearchResults(response.items);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.name, formData.patientId, searchPatients]);

  // Handle patient selection from search results
  const handlePatientSelect = (patient: PatientSearchItem) => {
    setFormData({
      patientId: patient.patientId,
      name: patient.fullName,
      referrerId: '',
      phone: formatPhoneNumber(patient.mobile || ''),
      age: patient.age.toString(),
      ageUnit: (patient as any).ageUnit || 'Y',
      gender: patient.sex,
      address: patient.address || '',
      block: '',
      city: patient.city || '',
      pincode: patient.pincode || '',
      country: 'India',
      bloodGroup: '',
      alternateMobile: '',
      email: '',
      emergencyContactName: '',
      emergencyContactRelation: '',
      emergencyContactPhone: '',
      reason: t('patientForm.reason.followUp'),
      isPaid: false,
      paymentMode: '',
      hasInsurance: false,
      insuranceId: '',
      insuranceType: '',
      guardianName: (patient as any).guardianName || '',
      guardianRelation: (patient as any).guardianRelation || 'C/O',
    });
    setShowSearchResults(false);
    setSearchQuery('');
    setSelectedIndex(0);
  };

  // Debounced fuzzy duplicate probe for a brand-new patient (skip once one is selected).
  useEffect(() => {
    if (formData.patientId) { setDupMatches([]); return; }
    const name = formData.name.trim();
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (name.length < 3) { setDupMatches([]); return; }
    let active = true;
    const tid = setTimeout(async () => {
      const matches = await patientApi.checkDuplicates({
        fullName: name,
        mobile: phoneDigits.length >= 10 ? phoneDigits : undefined,
      }, hospitalId);
      if (active) { setDupMatches(matches); setDupDismissed(false); }
    }, 450);
    return () => { active = false; clearTimeout(tid); };
  }, [formData.patientId, formData.name, formData.phone, hospitalId]);

  const useExistingDuplicate = (m: DuplicateMatch) => {
    handlePatientSelect({
      patientId: m.patientId,
      fullName: m.fullName ?? '',
      mobile: m.mobile ?? '',
      age: m.age ?? (m as any).ageYears ?? 0,
      ageUnit: m.ageUnit ?? 'Y',
      sex: m.sex ?? '',
      address: '',
      city: m.city ?? '',
      pincode: '',
    } as unknown as PatientSearchItem);
    setDupMatches([]);
  };

  // Keyboard navigation for search results
  React.useEffect(() => {
    if (!showSearchResults || searchResults.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handlePatientSelect(searchResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchResults, searchResults, selectedIndex]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let formatted = formatPhoneNumber(e.target.value);

    // Prevent first digit from being 0
    if (formatted.startsWith('0')) {
      formatted = formatted.replace(/^0+/, '');
    }

    setFormData(prev => ({ ...prev, phone: formatted }));
    setErrors(prev => {
      const nextErrors = { ...prev };
      const phoneError = collectValidationErrors({ ...formData, phone: formatted }).phone;
      if (phoneError) {
        nextErrors.phone = phoneError;
      } else {
        delete nextErrors.phone;
      }
      return nextErrors;
    });
  };

  const validateForm = () => {
    const validationErrors = collectValidationErrors(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    // Warn (but don't block) when this patient already has a non-cancelled appointment
    // with this doctor on the same day.
    if (sameDayDuplicate) {
      setShowDupConfirm(true);
      return;
    }
    await performBooking();
  };

  const performBooking = async () => {
    setIsSubmitting(true);
    try {
      // Generate patient ID automatically before sending request
      const generatedPatientId = formData.patientId || generatePatientId();

      // Resolve the referrer: inline-create a new one if the user typed one, else use the picked id.
      let referredByReferrerId = formData.referrerId || undefined;
      let finalReferrerName = selectedReferrer?.referrerName || 'Self';
      let finalReferrerType = selectedReferrer?.referrerType || 'REFERRER';
      if (creatingReferrer && newReferrer.name.trim()) {
        const created = await createReferrer.mutateAsync({
          referrerName: newReferrer.name.trim(),
          referrerType: newReferrer.type || 'REFERRER',
          phone: newReferrer.phone.trim() || undefined,
          address: newReferrer.address.trim() || undefined,
          defaultRatePercent: parseInt(newReferrer.rate) || 10,
        });
        referredByReferrerId = created.referrerId;
        finalReferrerName = created.referrerName;
        finalReferrerType = newReferrer.type || 'REFERRER';
      } else if (!formData.referrerId && referrerSearch.trim()) {
        // The user typed a referrer name in the search box but never clicked a dropdown
        // result. Don't silently drop it: reuse an exact (case-insensitive) match if one
        // exists, otherwise create the referrer on the fly.
        const typed = referrerSearch.trim();
        const match = referrers.find(r => r.referrerName.trim().toLowerCase() === typed.toLowerCase());
        if (match) {
          referredByReferrerId = match.referrerId;
          finalReferrerName = match.referrerName;
          finalReferrerType = match.referrerType || 'REFERRER';
        } else {
          const created = await createReferrer.mutateAsync({
            referrerName: typed,
            referrerType: 'REFERRER',
            defaultRatePercent: 0,
          });
          referredByReferrerId = created.referrerId;
          finalReferrerName = typed;
          finalReferrerType = 'REFERRER';
        }
      }
      console.log('Resolved referrer →', { referredByReferrerId, guardianName: formData.guardianName, referrerSearch, creatingReferrer, formReferrerId: formData.referrerId });

      // Prepare the appointment request
      const appointmentRequest: RegisterAppointmentRequest = {
        patient: {
          fullName: formData.name,
          mobile: formatPhoneNumber(formData.phone), // Use formatted phone number
          age: parseInt(formData.age),
          ageUnit: formData.ageUnit,
          sex: formData.gender,
          addressLine1: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          country: formData.country || 'India',
          insuranceId: formData.hasInsurance ? formData.insuranceId : '',
          paymentMode: formData.paymentMode,
          patientId: generatedPatientId,
          bloodGroup: formData.bloodGroup || undefined,
          block: formData.block || undefined,
          alternateMobile: formData.alternateMobile || undefined,
          email: formData.email || undefined,
          emergencyContactName: formData.emergencyContactName || undefined,
          emergencyContactRelation: formData.emergencyContactRelation || undefined,
          emergencyContactPhone: formData.emergencyContactPhone || undefined,
          guardianName: formData.guardianName || undefined,
          guardianRelation: formData.guardianName ? formData.guardianRelation : undefined,
        },
        doctorId: doctor.id,
        apptDate: new Date(selectedSlot.date + 'T' + selectedSlot.time).toISOString(),
        startAt: selectedSlot.date + 'T' + selectedSlot.time + ':00',
        reason: formData.reason || t('patientForm.reason.general'),
        slotTimeInMinutes: selectedSlot.slotDurationInMinutes || 10,
        userId: getUserId() || '',
        referredByReferrerId,
      };

      // Call the API using the hook
      console.log('Selected slot details:', {
        date: selectedSlot.date,
        time: selectedSlot.time,
        startAt: selectedSlot.date + 'T' + selectedSlot.time + ':00'
      });
      console.log('Sending appointment request:', appointmentRequest);
      if (!hospitalId) {
        throw new Error('Hospital ID is required to book appointment');
      }
      const response = await bookAppointment(appointmentRequest, hospitalId);
      console.log('Appointment booking response:', response);
      console.log('Using patientId from API response:', response.patientId);
      console.log('Fallback generated patientId:', generatedPatientId);

      // Pass the response data to the parent component
      const finalPatientId = response.patientId || generatedPatientId;
      console.log('Final patientId being passed:', finalPatientId);

      // Same-day OPD with policy AUTO: auto-create the encounter + consult charge, and
      // record the payment if marked paid. Non-blocking — the appointment is already booked.
      // Offline: skip — the backend auto-creates the consult charge when the queued booking
      // replays; the payment must be collected once back online (never queue money offline).
      if (showConsult && !isReachable()) {
        toast({
          title: 'Saved offline',
          description: "The consultation fee will be added automatically once you're back online. You can collect payment then.",
        });
      } else if (showConsult) {
        try {
          const r = await postOpdConsult(finalPatientId, {
            markPaid: formData.isPaid,
            paymentMode: formData.paymentMode,
            hospitalId,
            appointmentId: response.appointmentId,
          });
          if (r.posted || r.alreadyCharged) {
            const amount = r.consultFee.toLocaleString('en-IN', { minimumFractionDigits: 2 });
            toast({
              title: r.paymentRecorded ? t('patientForm.consultToast.collectedTitle') : t('patientForm.consultToast.addedTitle'),
              description: r.paymentRecorded
                ? t('patientForm.consultToast.paidDesc', { amount }) + (r.receiptNo ? ` · ${r.receiptNo}` : '')
                : t('patientForm.consultToast.unpaidDesc', { amount }),
            });
          }
        } catch (consultErr) {
          console.error('Failed to post OPD consult charge:', consultErr);
          toast({
            title: t('patientForm.consultToast.failTitle'),
            description: t('patientForm.consultToast.failDesc'),
            variant: 'destructive',
          });
        }
      }

      onSubmit({
        ...formData,
        age: parseInt(formData.age),
        ageUnit: formData.ageUnit,
        appointmentId: response.appointmentId,
        patientId: finalPatientId,
        tokenNumber: response.tokenNumber,
        referrerName: finalReferrerName,
        referrerType: finalReferrerType,
      });
    } catch (error) {
      console.error('Failed to register appointment:', error);
      // The error is already handled by the hook, but we can show it here if needed
      if (bookingError) {
        alert(`Failed to book appointment: ${bookingError}. Please try again.`);
        clearError();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={true} onOpenChange={onCancel}>
      <SheetContent side="right" className="w-[100vw] sm:max-w-[540px] md:max-w-[700px] p-0 flex flex-col gap-0 border-l dark:bg-gray-900 shadow-2xl overflow-hidden">
        {/* Sticky Header */}
        <SheetHeader className="p-4 md:p-6 border-b bg-background z-10 shrink-0 text-left">
          <div className="pr-8 space-y-1.5">
            <div className="flex items-center justify-between pr-4">
              <SheetTitle className="text-2xl md:text-3xl font-extrabold text-brand-900 dark:text-brand-400 tracking-tight">
                {t('patientForm.title')}
              </SheetTitle>
              {showConsult && (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50 shadow-sm shrink-0">
                  <span className="text-sm">⚡</span>
                  <span className="font-bold text-[10px] md:text-xs uppercase tracking-widest">Auto Bill Enabled</span>
                </div>
              )}
            </div>
            <SheetDescription className="text-sm text-gray-600 dark:text-gray-300">
              {t('patientForm.description')}
            </SheetDescription>
          </div>
          
          {/* Appointment Details Row in Header */}
          <div className="mt-3 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
            <div className="inline-flex items-center gap-x-3 md:gap-x-4 text-xs md:text-sm bg-brand-50/80 dark:bg-brand-900/30 px-3 py-2 md:px-4 md:py-2.5 rounded-lg border border-brand-200/60 dark:border-brand-700 shadow-sm whitespace-nowrap text-brand-800 dark:text-brand-200">
              <div className="flex items-center gap-1.5 md:gap-2">
                <User className="h-4 w-4 md:h-4 md:w-4 text-brand-600 dark:text-brand-400" />
                <span className="font-semibold">{doctor.name}</span>
              </div>
              <div className="h-4 md:h-5 w-px bg-brand-300 dark:bg-brand-600" />
              <div className="flex items-center gap-1.5 md:gap-2">
                <Calendar className="h-4 w-4 md:h-4 md:w-4 text-brand-600 dark:text-brand-400" />
                <span className="font-semibold">{dateFormatter.format(new Date(selectedSlot.date))}</span>
              </div>
              <div className="h-4 md:h-5 w-px bg-brand-300 dark:bg-brand-600" />
              <div className="flex items-center gap-1.5 md:gap-2">
                <Clock className="h-4 w-4 md:h-4 md:w-4 text-brand-600 dark:text-brand-400" />
                <span className="font-semibold">{formatTime(selectedSlot.time)}</span>
              </div>
              <div className="h-4 md:h-5 w-px bg-brand-300 dark:bg-brand-600" />
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="text-sm">⏱️</span>
                <span className="font-semibold">{t('patientForm.appointmentDetails.duration', { minutes: selectedSlot.slotDurationInMinutes || 10 })}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Form Content */}
        <ScrollArea className="flex-1 px-4 md:px-6 py-4">
          <div className="grid grid-cols-1 gap-4 md:gap-5 pb-6">
          {/* Main Form */}
          <div className="w-full">
            <form id="patient-form" onSubmit={handleSubmit} className="space-y-2 md:space-y-4">
              {/* Duplicate-patient warning (new patient only) */}
              {!formData.patientId && dupMatches.length > 0 && !dupDismissed && (
                <div className={`rounded-xl border shadow-sm overflow-hidden ${dupMatches.some(m => m.confidence === 'NEAR_CERTAIN') ? 'border-rose-300 bg-rose-50/70' : 'border-amber-300 bg-amber-50/60'}`}>
                  <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-black/5">
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${dupMatches.some(m => m.confidence === 'NEAR_CERTAIN') ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">Possible existing patient</p>
                      <p className="text-[11px] text-muted-foreground">{dupMatches.length} match{dupMatches.length > 1 ? 'es' : ''} — select to avoid a duplicate UHID.</p>
                    </div>
                    <button type="button" onClick={() => setDupDismissed(true)} className="text-[11px] text-muted-foreground hover:text-foreground shrink-0">Dismiss</button>
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    {dupMatches.map(m => (
                      <div key={m.patientId} className="rounded-lg border border-input bg-background p-2 flex items-center gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{m.fullName || '—'}</p>
                            <Badge variant="outline" className={`text-[11px] font-bold border ${DUP_TONE[m.confidence].chip}`}>{DUP_TONE[m.confidence].label}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            {m.patientId}{(m.age ?? (m as any).ageYears) != null ? ` · ${m.age ?? (m as any).ageYears}${m.ageUnit || 'Y'} ${m.sex ?? ''}` : m.sex ? ` · ${m.sex}` : ''}{m.mobile ? ` · ${m.mobile}` : ''} · {Math.round(m.similarity * 100)}% name
                          </p>
                        </div>
                        <Button type="button" size="sm" onClick={() => useExistingDuplicate(m)} className="h-8 text-xs shrink-0">Use this</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Personal & Contact Information - Single Row */}
              <Card className="p-3 md:p-4 dark:bg-gray-800 shadow-sm mt-0">
                <div className="mb-2 md:mb-4 flex items-center justify-between gap-2">
                  <h3 className="font-bold text-base md:text-lg text-foreground dark:text-white flex items-center gap-2">
                    <User className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
                    {t('patientForm.personal.title')}
                  </h3>
                  <span className="flex items-center gap-1.5 text-[10px] md:text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">
                    <span className="h-3 w-4 rounded-sm bg-amber-50 border border-amber-300" />
                    Required fields
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                  <div className="md:col-span-2">
                    <Label htmlFor="name" className="text-sm md:text-base font-medium dark:text-gray-300">
                      {t('patientForm.personal.name')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, name: e.target.value, patientId: '' }));
                        }}
                        onFocus={() => { if (searchResults.length > 0 && !formData.patientId) setShowSearchResults(true); }}
                        onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                        placeholder={t('patientForm.personal.namePlaceholder')}
                        autoComplete="off"
                        className={`h-10 text-sm md:text-base mt-1.5 ${reqClass(formData.name, !!errors.name)}`}
                      />
                      {showSearchResults && searchResults.length > 0 && !formData.patientId && (
                        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
                          <div className="sticky top-0 px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 border-b backdrop-blur-sm z-10 flex justify-between items-center">
                            <span>Suggested patients</span>
                            {isSearching && <Loader2 className="h-3 w-3 animate-spin" />}
                          </div>
                          {searchResults.map((patient, index) => (
                             <button 
                               key={patient.patientId} 
                               type="button"
                               className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent border-b last:border-b-0 transition-colors"
                               onClick={() => handlePatientSelect(patient)}
                             >
                               <div className="font-semibold text-foreground flex items-center gap-2">
                                 {patient.fullName} 
                                 <Badge variant="secondary" className="text-[10px] font-mono">{patient.patientId}</Badge>
                               </div>
                               <div className="text-muted-foreground text-xs mt-0.5 flex gap-2">
                                 <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.mobile}</span>
                                 {patient.age ? <span>· {patient.age}{patient.sex ? patient.sex[0] : ''}</span> : null}
                               </div>
                             </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.name && (
                      <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.name)}</p>
                    )}
                  </div>

                  {/* GUARDIAN / RELATIVE */}
                  <div className="md:col-span-2">
                    <Label className="text-sm md:text-base font-medium dark:text-gray-300">
                      Guardian / Relative
                    </Label>
                    <div className="flex mt-1.5 h-10 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors">
                      {/* Relation selector */}
                      <select
                        value={formData.guardianRelation}
                        onChange={(e) => setFormData(prev => ({ ...prev, guardianRelation: e.target.value }))}
                        className="h-full w-[80px] border-0 border-r border-input rounded-l-md px-2 text-sm bg-muted/40 focus:outline-none shrink-0"
                      >
                        {RELATION_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {/* Guardian name input */}
                      <Input
                        id="guardianName"
                        value={formData.guardianName}
                        onChange={(e) => setFormData(prev => ({ ...prev, guardianName: e.target.value }))}
                        placeholder="Guardian / relative name (optional)"
                        className="flex-1 min-w-0 h-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none rounded-r-md bg-transparent px-3 text-sm"
                      />
                    </div>
                  </div>

                  {/* MEDICAL REFERRAL (Doctor / Agent) */}
                  <div className="md:col-span-2">
                    <Label className="text-sm md:text-base font-medium dark:text-gray-300">
                      Referred By <span className="text-xs text-muted-foreground font-normal">(Doctor / Agent)</span>
                    </Label>
                    <div className="flex">
                      {selectedReferrer ? (
                        <div className="flex-1 mt-1.5 rounded-xl border border-input overflow-hidden"
                             style={{
                               background: selectedReferrer.referrerType === 'DOCTOR'
                                 ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                                 : selectedReferrer.referrerType === 'AGENT'
                                 ? 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)'
                                 : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                             }}
                        >
                          <div className="h-10 px-3 flex items-center justify-between">
                            <span className="flex items-center gap-2 min-w-0">
                              {/* Avatar circle */}
                              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                                ${
                                  selectedReferrer.referrerType === 'DOCTOR' ? 'bg-blue-600 text-white'
                                  : selectedReferrer.referrerType === 'AGENT' ? 'bg-purple-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                }`}>
                                {selectedReferrer.referrerName.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                                {selectedReferrer.referrerName}
                              </span>
                              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border
                                ${
                                  selectedReferrer.referrerType === 'DOCTOR' ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : selectedReferrer.referrerType === 'AGENT' ? 'bg-purple-100 text-purple-700 border-purple-200'
                                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}>
                                {selectedReferrer.referrerType}
                              </span>
                              {selectedReferrer.defaultRatePercent > 0 && (
                                <span className="shrink-0 text-[10px] text-slate-500">{selectedReferrer.defaultRatePercent}%</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, referrerId: '' }))}
                              className="ml-2 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : creatingReferrer ? (
                        <Input
                          value={newReferrer.name}
                          onChange={(e) => setNewReferrer(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="New referrer name"
                          autoFocus
                          className="flex-1 h-10 text-sm md:text-base mt-1.5 focus:z-10"
                        />
                      ) : (
                        <div className="relative flex-1">
                          <Input
                            value={referrerSearch}
                            onChange={(e) => setReferrerSearch(e.target.value)}
                            onFocus={() => setReferrerFocused(true)}
                            onBlur={() => setTimeout(() => setReferrerFocused(false), 150)}
                            placeholder="Search doctor / agent referrer…"
                            className="h-10 text-sm md:text-base mt-1.5 focus:z-10"
                          />
                          {(referrerFocused || referrerSearch.trim()) && (
                            <div className="absolute z-20 left-0 right-0 mt-1.5 max-h-52 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/60 dark:shadow-black/40 divide-y divide-slate-100 dark:divide-slate-800">
                              {referrers.length === 0 && (
                                <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                                  <Search className="h-3.5 w-3.5" />
                                  No referrers yet — add one below.
                                </div>
                              )}
                              {referrers.map(r => {
                                const accentCls = r.referrerType === 'DOCTOR'
                                  ? 'border-l-blue-500'
                                  : r.referrerType === 'AGENT'
                                  ? 'border-l-purple-500'
                                  : 'border-l-emerald-500';
                                const avatarCls = r.referrerType === 'DOCTOR'
                                  ? 'bg-blue-600'
                                  : r.referrerType === 'AGENT'
                                  ? 'bg-purple-600'
                                  : 'bg-emerald-600';
                                const badgeCls = r.referrerType === 'DOCTOR'
                                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                                  : r.referrerType === 'AGENT'
                                  ? 'bg-purple-50 text-purple-600 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200';
                                return (
                                  <button
                                    key={r.referrerId}
                                    type="button"
                                    onClick={() => { setFormData(prev => ({ ...prev, referrerId: r.referrerId })); setReferrerSearch(''); }}
                                    className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 transition-colors border-l-4 ${accentCls}`}
                                  >
                                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${avatarCls}`}>
                                      {r.referrerName.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                      <span className="block font-medium text-sm text-slate-800 dark:text-slate-100 truncate">{r.referrerName}</span>
                                      {r.phone && <span className="block text-[11px] text-slate-400">{r.phone}</span>}
                                    </span>
                                    <span className="flex items-center gap-1.5 shrink-0">
                                      {r.defaultRatePercent > 0 && (
                                        <span className="text-[10px] font-semibold text-slate-500">{r.defaultRatePercent}%</span>
                                      )}
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badgeCls}`}>
                                        {r.referrerType}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => { setCreatingReferrer(true); setNewReferrer(prev => ({ ...prev, name: referrerSearch.trim() })); setReferrerSearch(''); }}
                                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center gap-2 transition-colors"
                              >
                                <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 font-bold text-sm">+</span>
                                Add new referrer{referrerSearch.trim() ? ` "${referrerSearch.trim()}"` : ''}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {creatingReferrer && (
                      <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100/60 dark:from-slate-800 dark:to-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-white">+</span>
                            </span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">New Referrer</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setCreatingReferrer(false); setNewReferrer({ name: '', phone: '', address: '', rate: '10', type: 'REFERRER' }); }}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="p-3 space-y-3">
                          {/* Type selector pills */}
                          <div className="flex gap-2">
                            {(['DOCTOR', 'AGENT', 'REFERRER'] as const).map(opt => {
                              const active = newReferrer.type === opt;
                              const inactive = opt === 'DOCTOR'
                                ? 'border-blue-200 text-blue-600 hover:bg-blue-50/60 dark:border-blue-800 dark:text-blue-400'
                                : opt === 'AGENT'
                                ? 'border-purple-200 text-purple-600 hover:bg-purple-50/60 dark:border-purple-800 dark:text-purple-400'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50/60 dark:border-emerald-800 dark:text-emerald-400';
                              const activeStyle = opt === 'DOCTOR'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : opt === 'AGENT'
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-emerald-600 text-white border-emerald-600';
                              const icon = opt === 'DOCTOR' ? '🩺' : opt === 'AGENT' ? '🤝' : '👤';
                              const label = opt === 'DOCTOR' ? 'Doctor' : opt === 'AGENT' ? 'Agent' : 'Other';
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setNewReferrer(prev => ({ ...prev, type: opt }))}
                                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold h-8 rounded-lg border-2 transition-all duration-150 ${
                                    active ? activeStyle : `bg-transparent ${inactive}`
                                  }`}
                                >
                                  <span className="text-base leading-none">{icon}</span>
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Contact fields */}
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={newReferrer.phone}
                              onChange={(e) => setNewReferrer(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="Phone (optional)"
                              className="h-8 text-xs rounded-lg border-slate-200 dark:border-slate-700"
                            />
                            <Input
                              value={newReferrer.address}
                              onChange={(e) => setNewReferrer(prev => ({ ...prev, address: e.target.value }))}
                              placeholder="Address (optional)"
                              className="h-8 text-xs rounded-lg border-slate-200 dark:border-slate-700"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 flex flex-col md:flex-row gap-3 md:gap-4">
                    <div className="flex-[0.8]">
                      <Label htmlFor="phone" className="text-sm md:text-base font-medium">
                        {t('patientForm.personal.phone')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder={t('patientForm.personal.phonePlaceholder')}
                        className={`h-10 text-sm md:text-base mt-1.5 ${reqClass(formData.phone, !!errors.phone)}`}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.phone)}</p>
                      )}
                    </div>

                    <div className="flex-[1.2]">
                      <Label htmlFor="age" className="text-sm md:text-base font-medium">
                        {t('patientForm.personal.age')} <span className="text-red-500">*</span>
                      </Label>
                      <div className={`flex items-center mt-1.5 h-10 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-colors ${reqClass(formData.age, !!errors.age)}`}>
                        <Input
                          id="age"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={formData.age}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setFormData(prev => ({ ...prev, age: val }));
                          }}
                          placeholder={t('patientForm.personal.agePlaceholder')}
                          className="flex-1 min-w-0 h-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none rounded-l-md bg-transparent px-3 text-sm md:text-base"
                        />
                        <div className="flex bg-muted/40 p-0.5 h-full shrink-0 border-l border-input">
                          {[{ val: 'Y', label: 'Year' }, { val: 'M', label: 'Month' }, { val: 'D', label: 'Day' }].map(({ val, label }) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, ageUnit: val }))}
                              className={`px-2.5 text-[11px] font-bold rounded-sm transition-all duration-200 ${formData.ageUnit === val ? 'bg-brand-600 text-white shadow-md ring-1 ring-brand-700' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {errors.age && (
                        <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.age)}</p>
                      )}
                    </div>

                    <div className="flex-1">
                      <Label className="text-sm md:text-base font-medium">
                        {t('patientForm.personal.gender')} <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex bg-muted/40 p-0.5 mt-1.5 h-10 rounded-md border border-input w-full">
                        {['Male', 'Female', 'Other'].map(gender => (
                          <button
                            key={gender}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, gender }))}
                            className={`flex-1 text-[11px] md:text-xs font-bold rounded-sm transition-all duration-200 ${formData.gender === gender ? 'bg-brand-600 text-white shadow-md ring-1 ring-brand-700' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                          >
                            {gender}
                          </button>
                        ))}
                      </div>
                      {errors.gender && (
                        <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.gender)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional details (optional) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3">
                  <div>
                    <Label className="text-sm md:text-base font-medium">Blood Group</Label>
                    <Select value={formData.bloodGroup} onValueChange={(v) => setFormData(prev => ({ ...prev, bloodGroup: v }))}>
                      <SelectTrigger className="h-10 text-sm md:text-base mt-1.5"><SelectValue placeholder="Select blood group" /></SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="altMobile" className="text-sm md:text-base font-medium">Alternate Mobile</Label>
                    <Input id="altMobile" value={formData.alternateMobile} onChange={(e) => setFormData(prev => ({ ...prev, alternateMobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="Optional" className="h-10 text-sm md:text-base mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm md:text-base font-medium">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="Optional" className="h-10 text-sm md:text-base mt-1.5" />
                  </div>
                </div>
              </Card>

              {/* Address, Insurance & Payment - Combined */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                {/* Address Information */}
                <Card className="p-3 md:p-4 shadow-sm">
                  <h3 className="font-bold text-base md:text-lg text-foreground mb-3 md:mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
                    {t('patientForm.address.title')}
                  </h3>
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <Label htmlFor="address" className="text-sm md:text-base font-medium">
                        {t('patientForm.address.address')}
                      </Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder={t('patientForm.address.addressPlaceholder')}
                        className={`h-10 text-sm md:text-base mt-1.5 ${errors.address ? "border-red-500" : ""} ${formData.patientId ? "bg-brand-50" : ""}`}
                      />
                      {errors.address && (
                        <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.address)}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="block" className="text-sm md:text-base font-medium">
                        Block / Locality <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="block"
                        value={formData.block}
                        onChange={(e) => setFormData(prev => ({ ...prev, block: e.target.value }))}
                        placeholder="Block, street or landmark"
                        className="h-10 text-sm md:text-base mt-1.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <Label htmlFor="city" className="text-sm md:text-base font-medium">
                          {t('patientForm.address.city')}
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder={t('patientForm.address.cityPlaceholder')}
                          className={`h-10 text-sm md:text-base mt-1.5 ${errors.city ? "border-red-500" : ""} ${formData.patientId ? "bg-brand-50" : ""}`}
                        />
                        {errors.city && (
                          <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.city)}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="pincode" className="text-sm md:text-base font-medium">
                          {t('patientForm.address.pincode')}
                        </Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                          placeholder={t('patientForm.address.pincodePlaceholder')}
                          maxLength={6}
                          className={`h-10 text-sm md:text-base mt-1.5 ${errors.pincode ? "border-red-500" : ""} ${formData.patientId ? "bg-brand-50" : ""}`}
                        />
                        {errors.pincode && (
                          <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.pincode)}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="country" className="text-sm md:text-base font-medium">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="India"
                        className="h-10 text-sm md:text-base mt-1.5"
                      />
                    </div>
                  </div>
                </Card>


                {/* Emergency Contact (optional) */}
                <Card className="p-3 md:p-4 shadow-sm">
                  <h3 className="font-bold text-base md:text-lg text-foreground mb-3 md:mb-4 flex items-center gap-2">
                    <Phone className="h-4 w-4 md:h-5 md:w-5 text-rose-500" />
                    Emergency Contact <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </h3>
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <Label htmlFor="ecName" className="text-sm md:text-base font-medium">Contact Name</Label>
                      <Input id="ecName" value={formData.emergencyContactName} onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))} placeholder="e.g. spouse / parent name" className="h-10 text-sm md:text-base mt-1.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <Label className="text-sm md:text-base font-medium">Relation</Label>
                        <Select value={formData.emergencyContactRelation} onValueChange={(v) => setFormData(prev => ({ ...prev, emergencyContactRelation: v }))}>
                          <SelectTrigger className="h-10 text-sm md:text-base mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {EMERGENCY_RELATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="ecPhone" className="text-sm md:text-base font-medium">Phone</Label>
                        <Input id="ecPhone" value={formData.emergencyContactPhone} onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="Optional" className="h-10 text-sm md:text-base mt-1.5" />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Consultation & Payment — shown when there is consult history or a fee to collect */}
                {(timeline || showConsult) && (
                <Card className="p-3 md:p-4 shadow-sm">
                  <h3 className="font-bold text-base md:text-lg text-foreground mb-3 md:mb-4 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                    {t('patientForm.payment.title', { defaultValue: 'Consultation & Payment' })}
                  </h3>
                  <div className="space-y-3 md:space-y-5">
                    {/* Consultation timeline (existing patient) */}
                    {timeline && (
                      <div className="border-t pt-3 md:pt-4">
                        <div className="rounded-lg border border-brand-100 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-900/10 p-3 space-y-2">
                          <div className="flex items-center gap-2 font-semibold text-brand-800 dark:text-brand-300 text-sm">
                            <Clock className="h-4 w-4" /> {t('patientForm.timeline.title', { defaultValue: 'Consultation history' })}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:text-sm">
                            <span className="text-muted-foreground">{t('patientForm.timeline.lastPaid', { defaultValue: 'Last paid' })}</span>
                            <span className="text-right font-medium">
                              {timeline.lastPaidDate ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> {fmtTimelineDate(timeline.lastPaidDate)}
                                </span>
                              ) : t('patientForm.timeline.never', { defaultValue: 'Never' })}
                            </span>
                            <span className="text-muted-foreground">{t('patientForm.timeline.freeSince', { defaultValue: 'Free follow-ups since' })}</span>
                            <span className="text-right font-medium">{timeline.freeFollowUpCount}</span>
                            {!timeline.neverExpires && timeline.validUptoDate && (
                              <>
                                <span className="text-muted-foreground">{t('patientForm.timeline.validUpto', { defaultValue: 'Free until' })}</span>
                                <span className="text-right font-medium">
                                  {fmtTimelineDate(timeline.validUptoDate)}
                                  <span className="block text-[11px] font-normal text-brand-600 dark:text-brand-400">{daysLeftText(timeline.validUptoDate)}</span>
                                </span>
                              </>
                            )}
                            <span className="text-muted-foreground">{t('patientForm.timeline.thisVisit', { defaultValue: 'This visit' })}</span>
                            <span className={`text-right font-semibold ${timeline.nextVisit.feeApplies ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-400'}`}>
                              {timeline.nextVisit.feeApplies
                                ? `${nextVisitLabel(timeline.nextVisit.appointmentType)} · ₹${timeline.nextVisit.fee.toLocaleString('en-IN')}`
                                : t('patientForm.timeline.noFee', { defaultValue: 'Follow-up — No fee' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Section */}
                    <div className="border-t pt-3 md:pt-4 space-y-3">
                      {showConsult && (
                        <div className="flex items-center justify-between rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10 px-3 py-2">
                          <span className="text-sm md:text-base font-medium text-emerald-800 dark:text-emerald-300">
                            {t('patientForm.payment.consultationFee', { defaultValue: 'Consultation Fee' })}
                          </span>
                          <span className="text-base md:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                            ₹{consultFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {showConsult && (
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="isPaid"
                            checked={formData.isPaid}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: !!checked, paymentMode: !!checked ? (prev.paymentMode || 'cash') : '' }))}
                            className="h-4 w-4 md:h-5 md:w-5"
                          />
                          <Label htmlFor="isPaid" className="text-sm md:text-base font-medium">
                            {t('patientForm.payment.markConsultPaid', { defaultValue: 'Mark consultation fee as paid' })}
                          </Label>
                        </div>
                      )}

                      {formData.isPaid && (
                        <Select value={formData.paymentMode} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMode: value }))}>
                          <SelectTrigger className={`h-10 text-sm md:text-base ${errors.paymentMode ? "border-red-500" : ""}`}>
                            <SelectValue placeholder={t('patientForm.payment.modePlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{t('patientForm.payment.modes.cash')}</SelectItem>
                            <SelectItem value="upi">{t('patientForm.payment.modes.upi')}</SelectItem>
                            <SelectItem value="card">{t('patientForm.payment.modes.card')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {errors.paymentMode && (
                        <p className="text-red-500 text-xs mt-1">{t(errors.paymentMode)}</p>
                      )}
                    </div>
                  </div>
                </Card>
                )}
              </div>

            </form>
          </div>
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
        <div className="p-4 md:p-6 border-t bg-background shrink-0 flex justify-end gap-3 md:gap-4 mt-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 md:flex-none md:min-w-[200px] h-10 md:h-11 md:text-base"
          >
            {t('patientForm.actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="patient-form"
            disabled={isSubmitting || isBookingLoading || !isFormReady}
            className="flex-1 md:flex-none md:min-w-[320px] h-10 md:h-11 md:text-base bg-healthcare-primary hover:bg-healthcare-primary/90 gap-2 shadow-lg shadow-brand-500/20"
          >
            {(isSubmitting || isBookingLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting || isBookingLoading ? t('patientForm.actions.submitting') : t('patientForm.actions.submit')}
          </Button>
        </div>
      </SheetContent>

      {/* Same-day duplicate appointment warning (warn, but allow) */}
      {/* We use a separate Dialog here so it overlays above the Sheet safely */}
      <Dialog open={showDupConfirm} onOpenChange={setShowDupConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
              </div>
              {t('patientForm.duplicate.title', { defaultValue: 'Duplicate appointment?' })}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {t('patientForm.duplicate.message', {
                name: formData.name,
                doctor: doctor.name,
                defaultValue: '{{name}} already has an appointment with {{doctor}} on this day.',
              })}
            </DialogDescription>
          </DialogHeader>

          {sameDayDuplicate && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10 px-3 py-2.5 text-sm flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="font-medium text-amber-900 dark:text-amber-200">
                {dateFormatter.format(new Date(sameDayDuplicate.apptDate))}
                {' · '}
                {new Date(sameDayDuplicate.apptDate).toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' })}
              </span>
              {sameDayDuplicate.statusCode && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold uppercase">
                  {sameDayDuplicate.statusCode}
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowDupConfirm(false)}>
              {t('patientForm.duplicate.cancel', { defaultValue: 'Go back' })}
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => { setShowDupConfirm(false); performBooking(); }}
            >
              {t('patientForm.duplicate.proceed', { defaultValue: 'Book anyway' })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};