import React, { useState } from 'react';
import { User, Phone, Calendar, Clock, MapPin, DollarSign, CreditCard } from 'lucide-react';
import { TimeSlot, Doctor } from '../AppointmentBooking';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { format } from 'date-fns';

interface PatientFormProps {
  selectedSlot: TimeSlot;
  doctor: Doctor;
  onSubmit: (patientInfo: any) => void;
  onCancel: () => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  selectedSlot,
  doctor,
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
    isPaid: false,
    paymentMode: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
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
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }

    if (formData.isPaid && !formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required when paid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        age: parseInt(formData.age)
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-healthcare-primary">
            Book Appointment
          </DialogTitle>
          <DialogDescription>
            Please fill in the patient information to schedule your appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appointment Details */}
          <div className="lg:col-span-1">
            <Card className="p-4 bg-gradient-subtle border-healthcare-primary/20">
              <h3 className="font-semibold text-foreground mb-3">Appointment Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-healthcare-primary" />
                  <span className="font-medium">{doctor.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-healthcare-primary" />
                  <span>{format(new Date(selectedSlot.date), 'EEEE, MMMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-healthcare-primary" />
                  <span>{formatTime(selectedSlot.time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-healthcare-primary" />
                  <span className="font-medium">Consultation Fee: ₹500</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Patient Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-healthcare-primary" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      Patient Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter patient name"
                      className={errors.name ? "border-red-500" : ""}
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
                      placeholder="+91 8074906808 (International format)"
                      className={errors.phone ? "border-red-500" : ""}
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
                      placeholder="Enter age"
                      min="1"
                      max="120"
                      className={errors.age ? "border-red-500" : ""}
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
                      <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
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

              {/* Address Information */}
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-healthcare-primary" />
                  Address Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium">
                      Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter full address"
                      className={errors.address ? "border-red-500" : ""}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-sm font-medium">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter city"
                        className={errors.city ? "border-red-500" : ""}
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
                        placeholder="Enter 6-digit pincode"
                        maxLength={6}
                        className={errors.pincode ? "border-red-500" : ""}
                      />
                      {errors.pincode && (
                        <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Information */}
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-healthcare-primary" />
                  Payment Information
                </h3>
                <div className="space-y-4">
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
                    <div>
                      <Label htmlFor="paymentMode" className="text-sm font-medium">
                        Payment Mode <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.paymentMode} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMode: value }))}>
                        <SelectTrigger className={errors.paymentMode ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.paymentMode && (
                        <p className="text-red-500 text-xs mt-1">{errors.paymentMode}</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-healthcare-primary hover:bg-healthcare-primary/90"
                >
                  Book Appointment
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};