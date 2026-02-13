import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Calendar, Clock, MapPin, DollarSign, CreditCard, Shield, Search, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegisterAppointmentRequest, generatePatientId } from '../services/appointmentApi';
import { useAppointmentBooking } from '../hooks/useAppointmentBooking';
import { usePatientSearch } from '../hooks/usePatientSearch';
import { PatientSearchItem } from '../services/appointmentApi';
import { useAuthStore } from '@/store/authStore';

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
  referenceName: string;
  referenceRelation: string;
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
  referenceName: '',
  referenceRelation: 'C/O',
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
  // searchField state removed
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { bookAppointment, isLoading: isBookingLoading, error: bookingError, clearError } = useAppointmentBooking();
  const { searchPatients, isLoading: isSearchLoading, error: searchError, clearError: clearSearchError } = usePatientSearch();
  const { getUserId } = useAuthStore();
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
    }
  };

  // Handle patient selection from search results
  const handlePatientSelect = (patient: PatientSearchItem) => {
    setFormData({
      patientId: patient.patientId,
      name: patient.fullName,
      referenceName: '', // Reset reference name on patient select
      referenceRelation: 'C/O',
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
  };

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

      // Prepare the appointment request
      const appointmentRequest: RegisterAppointmentRequest = {
        patient: {
          fullName: formData.referenceName ? `${formData.name}-${formData.referenceRelation} ${formData.referenceName}` : formData.name,
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
        userId: getUserId() || ''
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
                    <Label htmlFor="referenceName" className="text-sm md:text-base font-medium dark:text-gray-300">
                      Reference Name
                    </Label>
                    <div className="flex">
                      <Select
                        value={formData.referenceRelation}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, referenceRelation: value }))}
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
                      <Input
                        id="referenceName"
                        value={formData.referenceName}
                        onChange={(e) => setFormData(prev => ({ ...prev, referenceName: e.target.value }))}
                        placeholder="Enter Reference Name"
                        className="flex-1 h-10 text-sm md:text-base mt-1.5 rounded-l-none focus:z-10"
                      />
                    </div>
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


                {/* Insurance & Payment Combined */}
                <Card className="p-4 md:p-6 shadow-sm">
                  <h3 className="font-bold text-base md:text-lg text-foreground mb-3 md:mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                    {t('patientForm.insurance.title')}
                  </h3>
                  <div className="space-y-3 md:space-y-5">
                    {/* Insurance Section */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="hasInsurance"
                          checked={formData.hasInsurance}
                          onCheckedChange={(checked) => setFormData(prev => ({
                            ...prev,
                            hasInsurance: !!checked,
                            insuranceId: !!checked ? prev.insuranceId : '',
                            insuranceType: !!checked ? prev.insuranceType : ''
                          }))}
                          className="h-4 w-4 md:h-5 md:w-5"
                        />
                        <Label htmlFor="hasInsurance" className="text-sm md:text-base font-medium">
                          {t('patientForm.insurance.hasInsurance')}
                        </Label>
                      </div>

                      {formData.hasInsurance && (
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={formData.insuranceType} onValueChange={(value) => setFormData(prev => ({ ...prev, insuranceType: value }))}>
                            <SelectTrigger className="h-10 text-sm md:text-base">
                              <SelectValue placeholder={t('patientForm.insurance.typePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="insurance">{t('patientForm.insurance.types.insurance')}</SelectItem>
                              <SelectItem value="abha">{t('patientForm.insurance.types.abha')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={formData.insuranceId}
                            onChange={(e) => setFormData(prev => ({ ...prev, insuranceId: e.target.value }))}
                            placeholder={formData.insuranceType === 'abha' ? t('patientForm.insurance.types.abha') : t('patientForm.insurance.types.insurance')}
                            className="h-10 text-sm md:text-base"
                          />
                        </div>
                      )}
                    </div>

                    {/* Payment Section */}
                    <div className="border-t pt-3 md:pt-4 space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="isPaid"
                          checked={formData.isPaid}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: !!checked, paymentMode: !!checked ? prev.paymentMode : '' }))}
                          className="h-4 w-4 md:h-5 md:w-5"
                        />
                        <Label htmlFor="isPaid" className="text-sm md:text-base font-medium">
                          {t('patientForm.payment.completed')}
                        </Label>
                      </div>

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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              {t('patientForm.searchResults.title')}
            </DialogTitle>
            <DialogDescription>
              {t('patientForm.searchResults.description', { count: searchResults.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {searchResults.length > 0 ? (
              <div className="grid gap-3">
                {searchResults.map((patient, index) => (
                  <Card
                    key={patient.patientId}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-2 hover:border-blue-300"
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{patient.fullName}</h4>
                            <p className="text-sm text-muted-foreground">{t('patientForm.searchResults.id', { id: patient.patientId })}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('patientForm.searchResults.phone')}</span>
                            <p className="font-medium">{patient.mobile}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('patientForm.searchResults.gender')}</span>
                            <p className="font-medium">{patient.sex}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('patientForm.searchResults.age')}</span>
                            <p className="font-medium">{t('patientForm.searchResults.ageValue', { age: patient.age })}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('patientForm.searchResults.lastVisit')}</span>
                            <p className="font-medium">{patient.lastRegistrationAt ? dateFormatter.format(new Date(patient.lastRegistrationAt)) : t('patientForm.searchResults.notAvailable')}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-2">
                          <div>
                            <span className="text-muted-foreground">{t('patientForm.searchResults.address')}</span>
                            <p className="font-medium text-xs truncate">{patient.address || t('patientForm.searchResults.notAvailable')}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('patientForm.searchResults.city')}</span>
                            <p className="font-medium">{patient.city || t('patientForm.searchResults.notAvailable')}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('patientForm.searchResults.pincode')}</span>
                            <p className="font-medium">{patient.pincode || t('patientForm.searchResults.notAvailable')}</p>
                          </div>
                        </div>

                        <div className="mt-2">
                          <span className="text-muted-foreground text-sm">{t('patientForm.searchResults.matchedBy')}</span>
                          <p className="text-sm">{patient.matched.by}: {patient.matched.value}</p>
                        </div>

                        {patient.appointmentDate && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
                            <span className="text-muted-foreground text-sm">{t('patientForm.searchResults.upcoming')}</span>
                            <p className="text-sm font-medium">
                              {dateFormatter.format(new Date(patient.appointmentDate))}
                              {patient.tokenNumber && patient.tokenNumber !== '0' && ` (${t('patientForm.searchResults.token', { token: patient.tokenNumber })})`}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePatientSelect(patient);
                          }}
                        >
                          {t('patientForm.searchResults.selectPatient')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('patientForm.searchResults.emptyTitle')}</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('patientForm.searchResults.emptyDescription')}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowSearchResults(false)}
            >
              {t('patientForm.searchResults.close')}
            </Button>
            {searchResults.length === 0 && (
              <Button
                onClick={() => {
                  setShowSearchResults(false);
                  // Optionally clear search and focus on form
                  setSearchQuery('');
                }}
              >
                {t('patientForm.searchResults.createNew')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog >
    </Dialog >
  );
};