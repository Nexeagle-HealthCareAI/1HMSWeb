import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, ArrowLeft, Send, MapPin, AlertTriangle, Contact, AlertCircle, Heart } from 'lucide-react';
import { z } from 'zod';
import { ValidationUtils } from '@/utils/validation';
import { cn } from '@/lib/utils';

export interface PersonalInfoFormData {
    fullName: string;
    phone: string;
    gender: string;
    dateOfBirth: string;
    bloodGroup: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    emergencyContactName: string;
    emergencyContactNumber: string;
    employeeId: string;
}

interface PersonalInfoInviteFormProps {
    prefillName: string;
    prefillPhone: string;
    prefillEmail: string;
    onSubmit: (data: PersonalInfoFormData) => void;
    onBack: () => void;
    isSubmitting?: boolean;
    initialData?: PersonalInfoFormData | null;
}

const genderOptions = [
    { value: 'male', label: 'Male', emoji: '👨' },
    { value: 'female', label: 'Female', emoji: '👩' },
    { value: 'other', label: 'Other', emoji: '🧑' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say', emoji: '🤐' },
];

const bloodGroupOptions = [
    { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
];

const genderValues = genderOptions.map((o) => o.value);
const bloodGroupValues = bloodGroupOptions.map((o) => o.value);

type FieldErrors = Record<string, string | undefined>;

export const PersonalInfoInviteForm: React.FC<PersonalInfoInviteFormProps> = ({
    prefillName,
    prefillPhone,
    prefillEmail,
    onSubmit,
    onBack,
    isSubmitting = false,
    initialData,
}) => {
    const { t } = useTranslation();
    const [errors, setErrors] = useState<FieldErrors>({});

    const [formData, setFormData] = useState<PersonalInfoFormData>({
        fullName: initialData?.fullName || prefillName,
        phone: prefillPhone,
        gender: initialData?.gender || '',
        dateOfBirth: initialData?.dateOfBirth || '',
        bloodGroup: initialData?.bloodGroup || '',
        addressLine1: initialData?.addressLine1 || '',
        addressLine2: initialData?.addressLine2 || '',
        city: initialData?.city || '',
        state: initialData?.state || '',
        country: initialData?.country || '',
        pincode: initialData?.pincode || '',
        emergencyContactName: initialData?.emergencyContactName || '',
        emergencyContactNumber: initialData?.emergencyContactNumber || '',
        employeeId: initialData?.employeeId || '',
    });

    const BasicInfoSchema = z.object({
        fullName: z.string().trim().min(2, 'Full name required (min 2 chars)').max(80, 'Max 80 characters')
            .regex(/^[a-zA-Z\s.'-]+$/, 'Letters, spaces, dots, hyphens, apostrophes only'),
        phone: z.string().trim().min(1, 'Phone required').superRefine((value, ctx) => {
            const error = ValidationUtils.validateMobileWithError(value);
            if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
        }),
        gender: z.string().optional().refine((v) => !v || genderValues.includes(v), { message: 'Invalid gender' }),
        dateOfBirth: z.string().optional().refine((v) => !v || new Date(v).getTime() <= Date.now(), { message: 'Cannot be in the future' }),
        bloodGroup: z.string().optional().refine((v) => !v || bloodGroupValues.includes(v), { message: 'Invalid blood group' }),
    });

    const AddressSchema = z.object({
        addressLine1: z.string().trim().max(120).optional(),
        city: z.string().trim().max(60).optional(),
        state: z.string().trim().max(60).optional(),
        pincode: z.string().trim().optional().refine((v) => !v || /^\d{6}$/.test(v), { message: '6-digit pincode' }),
        emergencyContactNumber: z.string().trim().optional().refine((v) => !v || /^\d{10}$/.test(v), { message: '10-digit number' }),
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const basicResult = BasicInfoSchema.safeParse({
            fullName: formData.fullName, phone: formData.phone,
            gender: formData.gender || undefined, dateOfBirth: formData.dateOfBirth || undefined,
            bloodGroup: formData.bloodGroup || undefined,
        });
        const addressResult = AddressSchema.safeParse({
            addressLine1: formData.addressLine1 || undefined, city: formData.city || undefined,
            state: formData.state || undefined, pincode: formData.pincode || undefined,
            emergencyContactNumber: formData.emergencyContactNumber || undefined,
        });
        const errs: FieldErrors = {};
        if (!basicResult.success) basicResult.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
        if (!addressResult.success) addressResult.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
        setErrors(errs);
        return basicResult.success && addressResult.success;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        onSubmit(formData);
    };

    return (
        <div className="space-y-2.5">
            {/* Header */}
            <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
                <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">Most fields optional</span>
            </div>

            {/* Identity */}
            <div className="rounded-lg border border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-gray-900/50 p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    <Contact className="h-3.5 w-3.5" />
                    Identity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-1">
                    <div className="space-y-1.5">
                        <Label htmlFor="invite-fullName" className="text-[11px] font-medium text-indigo-900 dark:text-indigo-300">Full Name <span className="text-red-500">*</span></Label>
                        <Input id="invite-fullName" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)}
                            className={cn("h-9 text-sm transition-all focus:ring-indigo-500/20", errors.fullName && 'border-red-400 ring-2 ring-red-100')} />
                        {errors.fullName && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{errors.fullName}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="invite-phone" className="text-[11px] font-medium text-indigo-900 dark:text-indigo-300">Phone <span className="text-red-500">*</span></Label>
                        <Input id="invite-phone" value={formData.phone} disabled className="h-9 text-sm bg-muted/50 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="invite-employeeId" className="text-[11px] font-medium text-indigo-900 dark:text-indigo-300">Employee ID</Label>
                        <Input id="invite-employeeId" value={formData.employeeId} onChange={(e) => handleInputChange('employeeId', e.target.value)}
                            className="h-9 text-sm transition-all focus:ring-indigo-500/20" placeholder="EMP001" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-1">
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-indigo-900 dark:text-indigo-300">Gender</Label>
                        <Select value={formData.gender} onValueChange={(v) => handleInputChange('gender', v)}>
                            <SelectTrigger className="h-9 text-sm transition-all focus:ring-indigo-500/20"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                {genderOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-indigo-900 dark:text-indigo-300">Date of Birth</Label>
                        <Input type="date" value={formData.dateOfBirth} onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                            className={cn("h-9 text-sm transition-all focus:ring-indigo-500/20", errors.dateOfBirth && 'border-red-400 ring-2 ring-red-100')}
                            max={new Date().toISOString().split('T')[0]} />
                        {errors.dateOfBirth && <p className="text-[10px] text-red-500 mt-1 font-medium"><AlertCircle className="h-3 w-3 inline mr-0.5" />{errors.dateOfBirth}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                            <Heart className="h-2.5 w-2.5 text-red-400" /> Blood Group
                        </Label>
                        <Select value={formData.bloodGroup} onValueChange={(v) => handleInputChange('bloodGroup', v)}>
                            <SelectTrigger className="h-9 text-sm transition-all focus:ring-indigo-500/20"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                {bloodGroupOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>🩸 {opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Address + Emergency — combined */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Address */}
                <div className="rounded-lg border border-green-200/60 dark:border-green-900/40 bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/20 dark:to-gray-900/50 p-3 space-y-3 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-300">
                        <MapPin className="h-3.5 w-3.5" />
                        Address <span className="text-[9px] font-normal text-muted-foreground ml-auto">(Optional)</span>
                    </div>
                    <Input value={formData.addressLine1} onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                        className="h-9 text-sm transition-all focus:ring-green-500/20" placeholder="Street address" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-medium text-green-900/70 dark:text-green-300/70">City</Label>
                            <Input value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} className="h-9 text-sm" placeholder="City" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-medium text-green-900/70 dark:text-green-300/70">State</Label>
                            <Input value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} className="h-9 text-sm" placeholder="State" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-medium text-green-900/70 dark:text-green-300/70">Country</Label>
                            <Input value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} className="h-9 text-sm" placeholder="Country" />
                        </div>
                    </div>
                    <div className="space-y-1.5 max-w-[150px]">
                        <Label className="text-[11px] font-medium text-green-900/70 dark:text-green-300/70">Pincode</Label>
                        <Input value={formData.pincode} onChange={(e) => handleInputChange('pincode', e.target.value)}
                            className={cn("h-9 text-sm", errors.pincode && 'border-red-400 ring-2 ring-red-100')} placeholder="Pincode" maxLength={6} />
                        {errors.pincode && <p className="text-[10px] text-red-500 font-medium mt-1">{errors.pincode}</p>}
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="rounded-lg border border-orange-200/60 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-gray-900/50 p-3 space-y-3 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Emergency Contact <span className="text-[9px] font-normal text-muted-foreground ml-auto">(Optional)</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-medium text-amber-900/70 dark:text-amber-300/70">Contact Name</Label>
                            <Input value={formData.emergencyContactName} onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                                className="h-9 text-sm border-orange-100 dark:border-orange-900/30 transition-all focus:ring-orange-500/20" placeholder="Emergency contact name" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-medium text-amber-900/70 dark:text-amber-300/70">Contact Number</Label>
                            <Input value={formData.emergencyContactNumber} onChange={(e) => handleInputChange('emergencyContactNumber', e.target.value)}
                                className={cn("h-9 text-sm border-orange-100 dark:border-orange-900/30 transition-all focus:ring-orange-500/20", errors.emergencyContactNumber && 'border-red-400 ring-2 ring-red-100')} placeholder="10-digit mobile" />
                            {errors.emergencyContactNumber && <p className="text-[10px] text-red-500 font-medium mt-1">{errors.emergencyContactNumber}</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error summary */}
            {Object.keys(errors).length > 0 && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-2">
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Please fix the errors above before submitting.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button variant="outline" onClick={onBack} disabled={isSubmitting} className="h-9 px-6 gap-2 text-sm font-medium">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn(
                        "h-9 px-8 gap-2 text-sm font-bold transition-all duration-300",
                        !isSubmitting && "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4" />
                            Submit & Send Invite
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};
