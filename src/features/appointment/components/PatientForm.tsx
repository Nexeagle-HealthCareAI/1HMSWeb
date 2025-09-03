import React, { useState } from 'react';
import { User, Phone, Calendar, Clock, MapPin, DollarSign, CreditCard, Shield, Search } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

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
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    address: '',
    city: '',
    pincode: '',
    reason: 'General consultation',
    isPaid: false,
    paymentMode: '',
    hasInsurance: false,
    insuranceId: '',
    insuranceType: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchItem[]>([]);
  const [searchField, setSearchField] = useState<'patientId' | 'name' | 'appointmentId' | 'contact'>('patientId'); // Default search field
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { bookAppointment, isLoading: isBookingLoading, error: bookingError, clearError } = useAppointmentBooking();
  const { searchPatients, isLoading: isSearchLoading, error: searchError, clearError: clearSearchError } = usePatientSearch();
  const { getUserId } = useAuthStore();

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  // Helper functions for search functionality
  const getSearchPlaceholder = (field: string) => {
    switch (field) {
      case 'patientId':
        return 'Enter Patient ID (e.g., P001, PAT123)';
      case 'name':
        return 'Enter Patient Name (e.g., John Doe, Sarah)';
      case 'appointmentId':
        return 'Enter Appointment ID (e.g., APT001, APT123)';
      case 'contact':
        return 'Enter Contact Number (e.g., +91 9876543210)';
      default:
        return 'Enter search term';
    }
  };

  const getSearchFieldLabel = (field: string) => {
    switch (field) {
      case 'patientId':
        return 'Patient ID';
      case 'name':
        return 'Patient Name';
      case 'appointmentId':
        return 'Appointment ID';
      case 'contact':
        return 'Contact Number';
      default:
        return 'Search Field';
    }
  };

  const getSearchHelpText = (field: string) => {
    switch (field) {
      case 'patientId':
        return (
          <>
            <p>• Patient ID: P001, PAT123, P2024001</p>
            <p>• Unique identifier for each patient</p>
          </>
        );
      case 'name':
        return (
          <>
            <p>• Full name: John Doe, Sarah Smith</p>
            <p>• Partial name: John, Sarah</p>
          </>
        );
      case 'appointmentId':
        return (
          <>
            <p>• Appointment ID: APT000001, APT0000123</p>
            <p>• PatientId: PT0000012, PT0000011</p>
          </>
        );
      case 'contact':
        return (
          <>
            <p>• Phone: +91 9876XXXXXX</p>
            <p>• Mobile: +91 8074XXXXXX</p>
          </>
        );
      default:
        return <p>• Enter the search term</p>;
    }
  };

  // Search function
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    clearSearchError();
    
    try {
      const response = await searchPatients({
        by: searchField,
        q: searchQuery.trim(),
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
      name: patient.fullName,
      phone: patient.mobile,
      age: patient.age.toString(),
      gender: patient.sex,
      address: patient.address || '',
      city: patient.city || '',
      pincode: patient.pincode || '',
      reason: 'Follow-up consultation',
      isPaid: false,
      paymentMode: '',
      hasInsurance: false,
      insuranceId: '',
      insuranceType: ''
    });
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters except '+'
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // If it doesn't start with '+', add it
    if (cleaned && !cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Patient name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      // International phone number validation
      const phoneRegex = /^\+\d{1,4}\d{4,14}$/;
      const cleanPhone = formData.phone.replace(/[^\d+]/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid international phone number (e.g., +91 8074906808)';
      } else if (cleanPhone.length < 8 || cleanPhone.length > 17) {
        newErrors.phone = 'Phone number should be between 8-17 digits including country code';
      }
    }

    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else if (parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      newErrors.age = 'Please enter a valid age';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }



    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (formData.isPaid && !formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required when paid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate patient ID automatically before sending request
      const generatedPatientId = generatePatientId();
      
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
        reason: formData.reason || 'General consultation',
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-healthcare-primary dark:text-blue-400">
            Book Appointment
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            Please fill in the patient information to schedule your appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Appointment Details - Compact */}
          <div className="xl:col-span-1">
            <Card className="p-3 bg-gradient-subtle dark:bg-gray-800 border-healthcare-primary/20 dark:border-blue-400/20 h-fit">
              <h3 className="font-semibold text-foreground dark:text-white mb-2 text-sm">Appointment Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-healthcare-primary" />
                  <span className="font-medium">{doctor.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-healthcare-primary" />
                  <span>{format(new Date(selectedSlot.date), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-healthcare-primary" />
                  <span>{formatTime(selectedSlot.time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">⏱️</span>
                  <span className="text-xs">Duration: {selectedSlot.slotDurationInMinutes || 10} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-healthcare-primary" />
                  <span className="font-medium">Fee: ₹500</span>
                </div>
              </div>
              
              {/* Patient Search - Enhanced */}
              <div className="mt-4 pt-3 border-t border-healthcare-primary/20 dark:border-blue-400/20">
                <h4 className="font-medium text-foreground dark:text-white mb-2 text-sm flex items-center gap-1">
                  <Search className="h-3 w-3 text-blue-600" />
                  Search Existing Patient
                </h4>
                <div className="space-y-2">
                  {/* Search Field Dropdown */}
                  <div className="flex gap-2">
                    <Select value={searchField} onValueChange={(value: string) => setSearchField(value as 'patientId' | 'name' | 'appointmentId' | 'contact')}>
                      <SelectTrigger className="text-xs h-8 flex-1">
                        <SelectValue placeholder="Select search field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patientId">Patient ID</SelectItem>
                        <SelectItem value="name">Patient Name</SelectItem>
                        <SelectItem value="appointmentId">Appointment ID</SelectItem>
                        <SelectItem value="contact">Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Search Input */}
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={getSearchPlaceholder(searchField)}
                    className="text-xs h-8"
                  />
                  
                  {/* Search Help Text */}
                  <div className="text-xs text-muted-foreground dark:text-gray-400 space-y-1">
                    <p>💡 <strong>Search by {getSearchFieldLabel(searchField)}:</strong></p>
                    {getSearchHelpText(searchField)}
                  </div>
                  
                  <Button 
                    type="button" 
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={handleSearch}
                    disabled={isSearching || isSearchLoading || !searchQuery.trim()}
                  >
                    <Search className="h-3 w-3 mr-1" />
                    {isSearching || isSearchLoading ? 'Searching...' : 'Search Patient'}
                  </Button>
                  
                  {/* Search Error Display */}
                  {searchError && (
                    <div className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                      <p>Search error: {searchError}</p>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        className="mt-1 h-6 text-xs"
                        onClick={clearSearchError}
                      >
                        Clear Error
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Main Form - 3 columns */}
          <div className="xl:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal & Contact Information - Single Row */}
              <Card className="p-4 dark:bg-gray-800">
                <div className="mb-3">
                  <h3 className="font-semibold text-foreground dark:text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-healthcare-primary" />
                    Personal Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium dark:text-gray-300">
                      Patient Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter patient name"
                      className={`h-9 ${errors.name ? "border-red-500" : ""}`}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="+91 8074906808"
                      className={`h-9 ${errors.phone ? "border-red-500" : ""}`}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="age" className="text-sm font-medium">
                      Age <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="Age"
                      min="1"
                      max="120"
                      className={`h-9 ${errors.age ? "border-red-500" : ""}`}
                    />
                    {errors.age && (
                      <p className="text-red-500 text-xs mt-1">{errors.age}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="gender" className="text-sm font-medium">
                      Gender <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                      <SelectTrigger className={`h-9 ${errors.gender ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-500 text-xs mt-1">{errors.gender}</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Address, Insurance & Payment - Combined */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Address Information */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-healthcare-primary" />
                    Address Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="address" className="text-sm font-medium">
                        Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter full address"
                        className={`h-9 ${errors.address ? "border-red-500" : ""}`}
                      />
                      {errors.address && (
                        <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="city" className="text-sm font-medium">
                          City <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Enter city"
                          className={`h-9 ${errors.city ? "border-red-500" : ""}`}
                        />
                        {errors.city && (
                          <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="pincode" className="text-sm font-medium">
                          Pincode <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                          placeholder="6-digit pincode"
                          maxLength={6}
                          className={`h-9 ${errors.pincode ? "border-red-500" : ""}`}
                        />
                        {errors.pincode && (
                          <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>



                {/* Insurance & Payment Combined */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    Insurance & Payment
                  </h3>
                  <div className="space-y-3">
                    {/* Insurance Section */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasInsurance"
                          checked={formData.hasInsurance}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            hasInsurance: !!checked, 
                            insuranceId: !!checked ? prev.insuranceId : '',
                            insuranceType: !!checked ? prev.insuranceType : ''
                          }))}
                        />
                        <Label htmlFor="hasInsurance" className="text-sm font-medium">
                          Has Insurance
                        </Label>
                      </div>

                      {formData.hasInsurance && (
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={formData.insuranceType} onValueChange={(value) => setFormData(prev => ({ ...prev, insuranceType: value }))}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="insurance">Insurance ID</SelectItem>
                              <SelectItem value="abha">ABHA ID</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={formData.insuranceId}
                            onChange={(e) => setFormData(prev => ({ ...prev, insuranceId: e.target.value }))}
                            placeholder={formData.insuranceType === 'abha' ? 'ABHA ID' : 'Insurance ID'}
                            className="h-9"
                          />
                        </div>
                      )}
                    </div>

                    {/* Payment Section */}
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isPaid"
                          checked={formData.isPaid}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: !!checked, paymentMode: !!checked ? prev.paymentMode : '' }))}
                        />
                        <Label htmlFor="isPaid" className="text-sm font-medium">
                          Payment Completed
                        </Label>
                      </div>

                      {formData.isPaid && (
                        <Select value={formData.paymentMode} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMode: value }))}>
                          <SelectTrigger className={`h-9 ${errors.paymentMode ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Payment mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {errors.paymentMode && (
                        <p className="text-red-500 text-xs mt-1">{errors.paymentMode}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isBookingLoading}
                  className="flex-1 bg-healthcare-primary hover:bg-healthcare-primary/90 h-10"
                >
                  {isSubmitting || isBookingLoading ? 'Booking Appointment...' : 'Book Appointment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>

      {/* Search Results Popup */}
      <Dialog open={showSearchResults} onOpenChange={setShowSearchResults}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Search Results
            </DialogTitle>
            <DialogDescription>
              Found {searchResults.length} patient(s) matching your search criteria. Select the correct patient to fill the form.
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
                            <p className="text-sm text-muted-foreground">ID: {patient.patientId}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Phone:</span>
                            <p className="font-medium">{patient.mobile}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Gender:</span>
                            <p className="font-medium">{patient.sex}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Age:</span>
                            <p className="font-medium">{patient.age} years</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Visit:</span>
                            <p className="font-medium">{patient.lastRegistrationAt ? new Date(patient.lastRegistrationAt).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-2">
                          <div>
                            <span className="text-muted-foreground">Address:</span>
                            <p className="font-medium text-xs truncate">{patient.address || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">City:</span>
                            <p className="font-medium">{patient.city || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pincode:</span>
                            <p className="font-medium">{patient.pincode || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <span className="text-muted-foreground text-sm">Matched by:</span>
                          <p className="text-sm">{patient.matched.by}: {patient.matched.value}</p>
                        </div>
                        
                        {patient.appointmentDate && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
                            <span className="text-muted-foreground text-sm">Upcoming Appointment:</span>
                            <p className="text-sm font-medium">
                              {new Date(patient.appointmentDate).toLocaleDateString()} 
                              {patient.tokenNumber && patient.tokenNumber !== '0' && ` (Token: ${patient.tokenNumber})`}
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
                          Select Patient
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No patients found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No patients match your search criteria. Try a different search term or create a new patient.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowSearchResults(false)}
            >
              Close
            </Button>
            {searchResults.length === 0 && (
              <Button 
                onClick={() => {
                  setShowSearchResults(false);
                  // Optionally clear search and focus on form
                  setSearchQuery('');
                }}
              >
                Create New Patient
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};