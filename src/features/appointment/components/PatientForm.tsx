import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Calendar, Clock, MapPin, DollarSign, CreditCard, Search, Loader2, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegisterAppointmentRequest, generatePatientId, appointmentApi, type ConsultTimelineResponse } from '../services/appointmentApi';
import { useAppointmentBooking } from '../hooks/useAppointmentBooking';
import { usePatientSearch } from '../hooks/usePatientSearch';
import { PatientSearchItem } from '../services/appointmentApi';
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
  referrerRelation: string;
  phone: string;
  age: string;
  gender: string;
  address: string;
  city: string;
  pincode: string;
  reason: string;
  isPaid: boolean;
  paymentMode: string;
  hasInsurance: boolean;
  insuranceId: string;
  insuranceType: string;
};

const PHONE_REGEX = /^\d{10}$/;
const RELATION_OPTIONS = ['C/O', 'S/O', 'D/O', 'W/O', 'H/O', 'G/O', 'F/O', 'M/O'];

const createInitialFormState = (): PatientFormState => ({
  patientId: '',
  name: '',
  referrerId: '',
  referrerRelation: 'C/O',
  phone: '',
  age: '',
  gender: '',
  address: '',
  city: '',
  pincode: '',
  reason: '',
  isPaid: false,
  paymentMode: '',
  hasInsurance: false,
  insuranceId: '',
  insuranceType: ''
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

  if (!data.address.trim()) {
    newErrors.address = 'patientForm.errors.addressRequired';
  }

  if (!data.city.trim()) {
    newErrors.city = 'patientForm.errors.cityRequired';
  }

  if (!data.pincode.trim()) {
    newErrors.pincode = 'patientForm.errors.pincodeRequired';
  } else if (!/^\d{6}$/.test(data.pincode)) {
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
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
  const [newReferrer, setNewReferrer] = useState({ name: '', phone: '', address: '', rate: '10' });
  const { data: referrersData } = useReferrers(hospitalId || '', referrerSearch.trim() || undefined);
  const createReferrer = useCreateReferrer(hospitalId || '');
  const referrers = referrersData?.referrers ?? [];
  const selectedReferrer = referrers.find(r => r.referrerId === formData.referrerId);
  const pendingValidationErrors = useMemo(() => collectValidationErrors(formData), [formData]);
  const isFormReady = Object.keys(pendingValidationErrors).length === 0;

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

  // Search function with auto-detection
  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    setIsSearching(true);
    clearSearchError();

    // Determine search field based on input pattern
    let searchBy: 'patientId' | 'name' | 'contact' = 'name';

    // Check for Patient ID (starts with PTID or UHID)
    if (/^(PTID|UHID)/i.test(query)) {
      searchBy = 'patientId';
    }
    // Check for Phone Number (mostly digits, allowing +, -, space)
    else if (/^\+?[\d\s-]{3,}$/.test(query) && /\d/.test(query)) {
      // Ensure it has at least some digits to be a phone number
      searchBy = 'contact';
    }

    console.log(`Smart Search detected type: ${searchBy} for query: ${query}`);

    try {
      const response = await searchPatients({
        by: searchBy,
        q: query,
        scope: 'local'
      });

      setSearchResults(response.items);
      setShowSearchResults(true);

      console.log('Search results:', response);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setIsSearching(false);
      setSelectedIndex(0); // Reset selection
    }
  };

  // Handle patient selection from search results
  const handlePatientSelect = (patient: PatientSearchItem) => {
    setFormData({
      patientId: patient.patientId,
      name: patient.fullName,
      referrerId: '', // Reset referral on patient select
      referrerRelation: 'C/O',
      phone: formatPhoneNumber(patient.mobile || ''),
      age: patient.age.toString(),
      gender: patient.sex,
      address: patient.address || '',
      city: patient.city || '',
      pincode: patient.pincode || '',
      reason: t('patientForm.reason.followUp'),
      isPaid: false,
      paymentMode: '',
      hasInsurance: false,
      insuranceId: '',
      insuranceType: ''
    });
    setShowSearchResults(false);
    setSearchQuery('');
    setSelectedIndex(0);
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

    setIsSubmitting(true);
    try {
      // Generate patient ID automatically before sending request
      const generatedPatientId = formData.patientId || generatePatientId();

      // Resolve the referrer: inline-create a new one if the user typed one, else use the picked id.
      let referredByReferrerId = formData.referrerId || undefined;
      if (creatingReferrer && newReferrer.name.trim()) {
        const created = await createReferrer.mutateAsync({
          referrerName: newReferrer.name.trim(),
          referrerType: 'REFERRER',
          phone: newReferrer.phone.trim() || undefined,
          address: newReferrer.address.trim() || undefined,
          defaultRatePercent: 0, // incentive rate set later by admin, not at booking
        });
        referredByReferrerId = created.referrerId;
      }

      // Prepare the appointment request
      const appointmentRequest: RegisterAppointmentRequest = {
        patient: {
          fullName: formData.name,
          mobile: formatPhoneNumber(formData.phone), // Use formatted phone number
          ageYears: parseInt(formData.age),
          sex: formData.gender,
          addressLine1: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          insuranceId: formData.hasInsurance ? formData.insuranceId : '',
          paymentMode: formData.paymentMode,
          patientId: generatedPatientId
        },
        doctorId: doctor.id,
        apptDate: new Date(selectedSlot.date + 'T' + selectedSlot.time).toISOString(),
        startAt: selectedSlot.date + 'T' + selectedSlot.time + ':00', // Keep as local time string, don't convert to UTC
        reason: formData.reason || t('patientForm.reason.general'),
        slotTimeInMinutes: selectedSlot.slotDurationInMinutes || 10, // Use slot duration from UI or default to 10
        userId: getUserId() || '',
        referredByReferrerId,
        referrerRelation: referredByReferrerId ? formData.referrerRelation : undefined,
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
      if (showConsult) {
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
        appointmentId: response.appointmentId,
        patientId: finalPatientId,
        tokenNumber: response.tokenNumber
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
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="w-[98vw] h-[98vh] md:w-[92vw] md:max-w-[92vw] md:h-[95vh] md:max-h-[95vh] p-3 md:p-6 overflow-y-auto dark:bg-gray-900 [&>button]:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="absolute right-5 top-5 z-50">
          <DialogClose className="rounded-full opacity-100 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground bg-red-100 hover:bg-red-200 text-red-600 border-2 border-red-200 h-8 w-8 md:h-10 md:w-10 flex items-center justify-center">
            <X className="h-5 w-5 md:h-6 md:w-6" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <DialogHeader className="border-b pb-1 mb-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mr-8 md:mr-16">
            <div>
              <DialogTitle className="text-2xl md:text-3xl font-extrabold text-blue-900 dark:text-blue-400 tracking-tight">
                {t('patientForm.title')}
              </DialogTitle>
              <DialogDescription className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-0">
                {t('patientForm.description')}
              </DialogDescription>
            </div>
            {/* Appointment Details Row in Header */}
            <div className="w-full md:w-auto overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0 md:overflow-visible no-scrollbar">
              <div className="flex flex-nowrap items-center gap-x-3 text-xs md:text-lg bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 md:px-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-sm whitespace-nowrap min-w-max">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <User className="h-3.5 w-3.5 md:h-5 md:w-5 text-blue-700 dark:text-blue-400" />
                  <span className="font-bold text-blue-900 dark:text-blue-100">{doctor.name}</span>
                </div>
                <div className="h-4 md:h-6 w-px bg-blue-300 dark:bg-blue-600" />
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Calendar className="h-3.5 w-3.5 md:h-5 md:w-5 text-blue-700 dark:text-blue-400" />
                  <span className="font-bold text-blue-900 dark:text-blue-100">{dateFormatter.format(new Date(selectedSlot.date))}</span>
                </div>
                <div className="h-4 md:h-6 w-px bg-blue-300 dark:bg-blue-600" />
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Clock className="h-3.5 w-3.5 md:h-5 md:w-5 text-blue-700 dark:text-blue-400" />
                  <span className="font-bold text-blue-900 dark:text-blue-100">{formatTime(selectedSlot.time)}</span>
                </div>
                <div className="h-4 md:h-6 w-px bg-blue-300 dark:bg-blue-600" />
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-sm md:text-lg">⏱️</span>
                  <span className="font-bold text-blue-900 dark:text-blue-100">{t('patientForm.appointmentDetails.duration', { minutes: selectedSlot.slotDurationInMinutes || 10 })}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 md:gap-4 pb-8">
          {/* Patient Search - Enhanced */}
          <div className="xl:col-span-1">
            <Card className="p-3 md:p-6 bg-gradient-subtle dark:bg-gray-800 border-healthcare-primary/20 dark:border-blue-400/20 h-fit mb-0">
              <h4 className="font-bold text-base md:text-lg text-foreground dark:text-white mb-2 md:mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                {t('patientForm.search.title')}
              </h4>
              <div className="space-y-3 md:space-y-4">
                {/* Search Input - Smart Search */}
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Search by Name, Phone, or Patient ID..."
                  className="text-sm md:text-base h-9 md:h-10 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
                />

                {/* Search Help Text */}
                <div className="text-xs md:text-sm text-muted-foreground dark:text-gray-400 space-y-1">
                  <p>💡 Auto-detects <strong>Phone, Patient ID, or Name</strong></p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="w-full h-9 md:h-10 text-sm md:text-base"
                  onClick={handleSearch}
                  disabled={isSearching || isSearchLoading || !searchQuery.trim()}
                >
                  <Search className="h-4 w-4 md:h-5 md:w-5 mr-1" />
                  {isSearching || isSearchLoading ? t('patientForm.search.searching') : t('patientForm.search.submit')}
                </Button>

                {/* Search Error Display */}
                {searchError && (
                  <div className="text-red-500 text-xs md:text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                    <p>{t('patientForm.search.error', { error: searchError })}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-1 h-7 md:h-8 text-xs md:text-sm"
                      onClick={clearSearchError}
                    >
                      {t('patientForm.search.clearError')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Main Form - 3 columns */}
          <div className="xl:col-span-3">
            <form id="patient-form" onSubmit={handleSubmit} className="space-y-2 md:space-y-4">
              {/* Personal & Contact Information - Single Row */}
              <Card className="p-4 md:p-6 dark:bg-gray-800 shadow-sm mt-0">
                <div className="mb-2 md:mb-4">
                  <h3 className="font-bold text-base md:text-lg text-foreground dark:text-white flex items-center gap-2">
                    <User className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
                    {t('patientForm.personal.title')}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 md:gap-5">
                  <div className="xl:col-span-3">
                    <Label htmlFor="name" className="text-sm md:text-base font-medium dark:text-gray-300">
                      {t('patientForm.personal.name')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('patientForm.personal.namePlaceholder')}
                      className={`h-10 text-sm md:text-base mt-1.5 ${errors.name ? "border-red-500" : ""} ${formData.patientId ? "bg-indigo-50" : ""}`}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.name)}</p>
                    )}
                  </div>

                  <div className="xl:col-span-4">
                    <Label className="text-sm md:text-base font-medium dark:text-gray-300">
                      Referred By
                    </Label>
                    <div className="flex">
                      <Select
                        value={formData.referrerRelation}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, referrerRelation: value }))}
                      >
                        <SelectTrigger className="w-[85px] h-10 text-sm md:text-base mt-1.5 rounded-r-none border-r-0 focus:ring-0 focus:ring-offset-0 focus:z-10 bg-muted/50">
                          <SelectValue placeholder="Rel" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATION_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedReferrer ? (
                        <div className="flex-1 h-10 mt-1.5 rounded-l-none rounded-r-md border border-l-0 border-input bg-indigo-50 dark:bg-indigo-900/20 px-3 flex items-center justify-between">
                          <span className="text-sm truncate">
                            {selectedReferrer.referrerName}
                            {selectedReferrer.defaultRatePercent > 0 && (
                              <span className="text-muted-foreground"> · {selectedReferrer.defaultRatePercent}%</span>
                            )}
                          </span>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, referrerId: '' }))} className="ml-2 text-gray-400 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : creatingReferrer ? (
                        <Input
                          value={newReferrer.name}
                          onChange={(e) => setNewReferrer(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="New referrer name"
                          autoFocus
                          className="flex-1 h-10 text-sm md:text-base mt-1.5 rounded-l-none focus:z-10"
                        />
                      ) : (
                        <div className="relative flex-1">
                          <Input
                            value={referrerSearch}
                            onChange={(e) => setReferrerSearch(e.target.value)}
                            onFocus={() => setReferrerFocused(true)}
                            onBlur={() => setTimeout(() => setReferrerFocused(false), 150)}
                            placeholder="Search or add referrer…"
                            className="h-10 text-sm md:text-base mt-1.5 rounded-l-none focus:z-10"
                          />
                          {(referrerFocused || referrerSearch.trim()) && (
                            <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-lg">
                              {referrers.length === 0 && (
                                <div className="px-3 py-2 text-xs text-muted-foreground">No referrers yet — add one below.</div>
                              )}
                              {referrers.map(r => (
                                <button
                                  key={r.referrerId}
                                  type="button"
                                  onClick={() => { setFormData(prev => ({ ...prev, referrerId: r.referrerId })); setReferrerSearch(''); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0"
                                >
                                  <span className="font-medium">{r.referrerName}</span>
                                  <span className="text-muted-foreground text-xs"> · {r.referrerType}{r.defaultRatePercent > 0 ? ` · ${r.defaultRatePercent}%` : ''}{r.phone ? ` · ${r.phone}` : ''}</span>
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => { setCreatingReferrer(true); setNewReferrer(prev => ({ ...prev, name: referrerSearch.trim() })); setReferrerSearch(''); }}
                                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-accent font-medium"
                              >
                                + Add new referrer{referrerSearch.trim() ? ` "${referrerSearch.trim()}"` : ''}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {creatingReferrer && (
                      <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-900/10 p-2">
                        <Input
                          value={newReferrer.phone}
                          onChange={(e) => setNewReferrer(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Phone"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={newReferrer.address}
                          onChange={(e) => setNewReferrer(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Address"
                          className="h-8 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => { setCreatingReferrer(false); setNewReferrer({ name: '', phone: '', address: '', rate: '10' }); }}
                          className="col-span-2 text-left text-xs text-gray-500 hover:text-red-500"
                        >
                          Cancel new referrer
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-2">
                    <Label htmlFor="phone" className="text-sm md:text-base font-medium">
                      {t('patientForm.personal.phone')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder={t('patientForm.personal.phonePlaceholder')}
                      className={`h-10 text-sm md:text-base mt-1.5 ${errors.phone ? "border-red-500" : ""} ${formData.patientId ? "bg-indigo-50" : ""}`}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.phone)}</p>
                    )}
                  </div>

                  <div className="xl:col-span-3 flex gap-3 md:gap-4">
                    <div className="flex-1">
                      <Label htmlFor="age" className="text-sm md:text-base font-medium">
                        {t('patientForm.personal.age')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                        placeholder={t('patientForm.personal.agePlaceholder')}
                        min="1"
                        max="120"
                        className={`h-10 text-sm md:text-base mt-1.5 ${errors.age ? "border-red-500" : ""} ${formData.patientId ? "bg-indigo-50" : ""}`}
                      />
                      {errors.age && (
                        <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.age)}</p>
                      )}
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="gender" className="text-sm md:text-base font-medium">
                        {t('patientForm.personal.gender')} <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger className={`h-10 text-sm md:text-base mt-1.5 ${errors.gender ? "border-red-500" : ""} ${formData.patientId ? "bg-indigo-50" : ""}`}>
                          <SelectValue placeholder={t('patientForm.personal.genderPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">{t('patientForm.personal.genderOptions.male')}</SelectItem>
                          <SelectItem value="Female">{t('patientForm.personal.genderOptions.female')}</SelectItem>
                          <SelectItem value="Other">{t('patientForm.personal.genderOptions.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.gender)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Address, Insurance & Payment - Combined */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5">
                {/* Address Information */}
                <Card className="p-4 md:p-6 shadow-sm">
                  <h3 className="font-bold text-base md:text-lg text-foreground mb-3 md:mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 md:h-5 md:w-5 text-healthcare-primary" />
                    {t('patientForm.address.title')}
                  </h3>
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <Label htmlFor="address" className="text-sm md:text-base font-medium">
                        {t('patientForm.address.address')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder={t('patientForm.address.addressPlaceholder')}
                        className={`h-10 text-sm md:text-base mt-1.5 ${errors.address ? "border-red-500" : ""} ${formData.patientId ? "bg-indigo-50" : ""}`}
                      />
                      {errors.address && (
                        <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.address)}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <Label htmlFor="city" className="text-sm md:text-base font-medium">
                          {t('patientForm.address.city')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder={t('patientForm.address.cityPlaceholder')}
                          className={`h-10 text-sm md:text-base mt-1.5 ${errors.city ? "border-red-500" : ""} ${formData.patientId ? "bg-indigo-50" : ""}`}
                        />
                        {errors.city && (
                          <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.city)}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="pincode" className="text-sm md:text-base font-medium">
                          {t('patientForm.address.pincode')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                          placeholder={t('patientForm.address.pincodePlaceholder')}
                          maxLength={6}
                          className={`h-10 text-sm md:text-base mt-1.5 ${errors.pincode ? "border-red-500" : ""} ${formData.patientId ? "bg-indigo-50" : ""}`}
                        />
                        {errors.pincode && (
                          <p className="text-red-500 text-xs md:text-sm mt-1">{t(errors.pincode)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>


                {/* Consultation & Payment — shown when there is consult history or a fee to collect */}
                {(timeline || showConsult) && (
                <Card className="p-4 md:p-6 shadow-sm">
                  <h3 className="font-bold text-base md:text-lg text-foreground mb-3 md:mb-4 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                    {t('patientForm.payment.title', { defaultValue: 'Consultation & Payment' })}
                  </h3>
                  <div className="space-y-3 md:space-y-5">
                    {/* Consultation timeline (existing patient) */}
                    {timeline && (
                      <div className="border-t pt-3 md:pt-4">
                        <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-2">
                          <div className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300 text-sm">
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
                                  <span className="block text-[11px] font-normal text-blue-600 dark:text-blue-400">{daysLeftText(timeline.validUptoDate)}</span>
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
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: !!checked, paymentMode: !!checked ? prev.paymentMode : '' }))}
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

            <div className="flex justify-end gap-3 md:gap-4 mt-6 pb-8">
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
                className="flex-1 md:flex-none md:min-w-[320px] h-10 md:h-11 md:text-base bg-healthcare-primary hover:bg-healthcare-primary/90 gap-2 shadow-lg shadow-blue-500/20"
              >
                {(isSubmitting || isBookingLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting || isBookingLoading ? t('patientForm.actions.submitting') : t('patientForm.actions.submit')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent >

      {/* Search Results Popup */}
      < Dialog open={showSearchResults} onOpenChange={setShowSearchResults} >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span>{t('patientForm.searchResults.title')}</span>
                {searchResults.length > 0 && (
                  <span className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                    {searchResults.length}
                  </span>
                )}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base mt-2">
              {searchResults.length > 0
                ? `${t('patientForm.searchResults.description', { count: searchResults.length })} Click on a card to auto-fill the form.`
                : 'No patients found matching your search criteria.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {searchResults.length > 0 ? (
              searchResults.map((patient, index) => (
                <Card
                  key={patient.patientId}
                  className={`p-5 cursor-pointer transition-all duration-200 border-2 relative ${index === selectedIndex
                    ? 'border-blue-500 shadow-xl scale-[1.02] ring-4 ring-blue-200 dark:ring-blue-800'
                    : 'hover:border-blue-400 hover:shadow-lg hover:scale-[1.01]'
                    }`}
                  onClick={() => handlePatientSelect(patient)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Patient Number Badge */}
                  <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${index === selectedIndex
                    ? 'bg-blue-600 text-white scale-110'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                    {index + 1}
                  </div>

                  {/* Patient Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-foreground">{patient.fullName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                          {patient.patientId}
                        </span>
                        <span className="text-xs px-2 py-1 rounded font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Existing Patient
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Patient Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Phone className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs text-muted-foreground font-medium">Phone</span>
                      </div>
                      <p className="font-semibold text-sm">{patient.mobile}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs text-muted-foreground font-medium">Gender</span>
                      </div>
                      <p className="font-semibold text-sm">{patient.sex}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs text-muted-foreground font-medium">Age</span>
                      </div>
                      <p className="font-semibold text-sm">{patient.age} years</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs text-muted-foreground font-medium">Last Visit</span>
                      </div>
                      <p className="font-semibold text-sm truncate">
                        {patient.lastRegistrationAt ? dateFormatter.format(new Date(patient.lastRegistrationAt)) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Address Info */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {patient.address || 'N/A'}
                          {patient.city && `, ${patient.city}`}
                          {patient.pincode && ` - ${patient.pincode}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Appointment Badge */}
                  {patient.appointmentDate && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                          Upcoming Appointment: {dateFormatter.format(new Date(patient.appointmentDate))}
                          {patient.tokenNumber && patient.tokenNumber !== '0' && ` • Token #${patient.tokenNumber}`}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('patientForm.searchResults.emptyTitle')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {t('patientForm.searchResults.emptyDescription')}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center gap-3 pt-4 border-t bg-gray-50 dark:bg-gray-900/50 -mx-6 px-6 -mb-6 pb-6">
            <div>
              <p className="text-sm text-muted-foreground">
                {searchResults.length > 0 ? 'Click any card above to select' : 'Try adjusting your search criteria'}
              </p>
              {searchResults.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">↑</span>
                  <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">↓</span>
                  <span>Navigate</span>
                  <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Enter</span>
                  <span>Select</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSearchResults(false)}
              >
                {searchResults.length > 0 ? 'Cancel' : 'Close'}
              </Button>
              {searchResults.length === 0 && (
                <Button
                  onClick={() => {
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create New Patient
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};