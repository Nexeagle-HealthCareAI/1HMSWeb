import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, Edit3, Save, X, Phone, MapPin, Calendar, CreditCard } from 'lucide-react';
import { usePatientProfile } from '../hooks/usePatientProfile';
import { PatientProfileData, UpdatePatientProfileData } from '../services/patientProfileApi';

interface PatientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalId: string;
  patientId: string;
  patientName?: string;
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({
  isOpen,
  onClose,
  hospitalId,
  patientId,
  patientName
}) => {
  const { t } = useTranslation();
  const {
    patientProfile,
    isLoading,
    error,
    isEditing,
    isUpdating,
    handleEdit,
    handleCancel,
    handleSave,
  } = usePatientProfile(hospitalId, patientId);

  const [formData, setFormData] = useState<UpdatePatientProfileData>({
    hospitalId: hospitalId,
    patientId: patientId,
    fullName: '',
    mobile: '',
    ageYears: 0,
    sex: '',
    addressLine1: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    insuranceId: '',
    paymentMode: '',
  });

  // Update form data when patient profile is loaded
  useEffect(() => {
    if (patientProfile) {
      setFormData({
        hospitalId: patientProfile.hospitalId,
        patientId: patientProfile.patientId,
        fullName: patientProfile.fullName,
        mobile: patientProfile.mobile,
        ageYears: patientProfile.ageYears,
        sex: patientProfile.sex,
        addressLine1: patientProfile.addressLine1,
        city: patientProfile.city,
        state: patientProfile.state || '',
        country: patientProfile.country,
        pincode: patientProfile.pincode,
        insuranceId: patientProfile.insuranceId || '',
        paymentMode: patientProfile.paymentMode || '',
      });
    }
  }, [patientProfile]);

  const handleInputChange = (field: keyof UpdatePatientProfileData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Standard input styling - more compact
  const inputClassName = "h-8 text-xs border border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed";
  const labelClassName = "text-xs font-medium text-gray-600 dark:text-gray-400";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(formData);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '0001-01-01T00:00:00') {
      return 'N/A';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border-2 border-red-200 dark:border-red-700 shadow-2xl">
          <DialogHeader className="bg-red-50 dark:bg-red-900 p-6 border-b border-red-200 dark:border-red-700">
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xl font-bold">
              <X className="h-6 w-6" />
              Error Loading Patient Profile
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center bg-red-50 dark:bg-red-900">
            <p className="text-red-600 dark:text-red-400 mb-6 text-lg">
              Failed to load patient profile. Please try again.
            </p>
            <Button onClick={onClose} variant="outline" className="px-6 py-2 border-red-300 text-red-600 hover:bg-red-50">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[98vh] overflow-hidden bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col w-[95vw] sm:w-full">
        <DialogHeader className="bg-gray-50 dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            <span className="truncate">Patient Profile - {patientName || patientProfile?.fullName || patientId}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 sm:py-8 flex-1">
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">Loading patient profile...</span>
          </div>
        ) : (
          <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 bg-gray-50 dark:bg-gray-800 flex-1 overflow-y-auto">
            {/* Patient ID Badge - Mobile Responsive */}
            <div className="flex justify-center mb-1">
              <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 font-medium">
                Patient ID: {patientId}
              </Badge>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3">
                {/* Personal Information Card - Mobile Responsive */}
                <Card className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-200 dark:border-blue-700 px-2 py-1">
                    <CardTitle className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-200">
                      <User className="h-3 w-3" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-2 sm:p-3">
                    <div className="space-y-1">
                      <Label htmlFor="fullName" className={labelClassName}>Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        disabled={!isEditing}
                        required
                        className={inputClassName}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="ageYears" className={labelClassName}>Age *</Label>
                        <Input
                          id="ageYears"
                          type="number"
                          value={formData.ageYears}
                          onChange={(e) => handleInputChange('ageYears', parseInt(e.target.value) || 0)}
                          disabled={!isEditing}
                          min="0"
                          max="150"
                          required
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sex" className={labelClassName}>Gender *</Label>
                        <Select
                          value={formData.sex}
                          onValueChange={(value) => handleInputChange('sex', value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className={inputClassName}>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="mobile" className={labelClassName}>Mobile Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                        <Input
                          id="mobile"
                          value={formData.mobile}
                          onChange={(e) => handleInputChange('mobile', e.target.value)}
                          disabled={!isEditing}
                          className={`pl-8 ${inputClassName}`}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information Card */}
                <Card className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader className="bg-green-50 dark:bg-green-900 border-b border-green-200 dark:border-green-700 px-2 py-1">
                    <CardTitle className="flex items-center gap-1 text-sm font-semibold text-green-800 dark:text-green-200">
                      <MapPin className="h-3 w-3" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3">
                    <div className="space-y-1">
                      <Label htmlFor="addressLine1" className={labelClassName}>Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        value={formData.addressLine1}
                        onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                        disabled={!isEditing}
                        required
                        className={inputClassName}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="city" className={labelClassName}>City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          disabled={!isEditing}
                          required
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="state" className={labelClassName}>State</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          disabled={!isEditing}
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="country" className={labelClassName}>Country</Label>
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          disabled={!isEditing}
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pincode" className={labelClassName}>Pincode</Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                          disabled={!isEditing}
                          className={inputClassName}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Insurance, Payment & Registration Information Card */}
                <Card className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader className="bg-purple-50 dark:bg-purple-900 border-b border-purple-200 dark:border-purple-700 px-2 py-1">
                    <CardTitle className="flex items-center gap-1 text-sm font-semibold text-purple-800 dark:text-purple-200">
                      <CreditCard className="h-3 w-3" />
                      Insurance, Payment & Registration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-3">
                    {/* Insurance & Payment Section */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Insurance & Payment Information</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="insuranceId" className={labelClassName}>Insurance ID</Label>
                          <Input
                            id="insuranceId"
                            value={formData.insuranceId}
                            onChange={(e) => handleInputChange('insuranceId', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Enter insurance ID if applicable"
                            className={inputClassName}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="paymentMode" className={labelClassName}>Payment Mode</Label>
                          <Select
                            value={formData.paymentMode}
                            onValueChange={(value) => handleInputChange('paymentMode', value)}
                            disabled={!isEditing}
                          >
                            <SelectTrigger className={inputClassName}>
                              <SelectValue placeholder="Select payment mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Card">Card</SelectItem>
                              <SelectItem value="Insurance">Insurance</SelectItem>
                              <SelectItem value="UPI">UPI</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Registration Information Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Registration Information
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Registered At:</span>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(patientProfile?.registeredAt || '')}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Registered By:</span>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{patientProfile?.registeredBy || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </form>
          </div>
        )}

        <DialogFooter className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={onClose} className="px-3 py-1 text-xs">
              Close
            </Button>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isUpdating}
                    className="px-3 py-1 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isUpdating}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1 h-3 w-3" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs">
                  <Edit3 className="mr-1 h-3 w-3" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
