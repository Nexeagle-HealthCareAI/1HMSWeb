import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stethoscope, ArrowLeft, ArrowRight, Award, BookOpen, Building2, ClipboardList, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useDepartmentApi } from '@/hooks/useApi';
import { SpecializationSelector } from '@/features/doctor/components/SpecializationSelector';
import { QualificationSelector } from '@/features/doctor/components/QualificationSelector';
import { cn } from '@/lib/utils';

// Data shape passed to parent on successful validation
export interface DoctorProfessionalFormData {
    licenseNumber: string;
    qualification: string[];
    experienceYears: number;
    medicalCouncil: string;
    registrationYear: number;
    bio: string;
    primaryDepartment: string;
    department: string;
    specializations: string[];
    hospitalDepartmentMappingId: string;
}

interface DoctorInviteFormProps {
    hospitalId: string;
    onNext: (data: DoctorProfessionalFormData) => void;
    onBack: () => void;
    initialData?: DoctorProfessionalFormData | null;
}

type FieldErrors = Record<string, string | undefined>;

export const DoctorInviteForm: React.FC<DoctorInviteFormProps> = ({
    hospitalId,
    onNext,
    onBack,
    initialData,
}) => {
    const { t } = useTranslation();
    const [errors, setErrors] = useState<FieldErrors>({});

    const [profileData, setProfileData] = useState({
        licenseNumber: initialData?.licenseNumber || '',
        qualification: initialData?.qualification || [] as string[],
        experienceYears: initialData?.experienceYears ?? 0,
        medicalCouncil: initialData?.medicalCouncil || '',
        registrationYear: initialData?.registrationYear || new Date().getFullYear(),
        bio: initialData?.bio || '',
        primaryDepartment: initialData?.primaryDepartment || '',
        department: initialData?.department || '',
        specializations: initialData?.specializations || [] as string[],
        hospitalDepartmentMappingId: initialData?.hospitalDepartmentMappingId || '',
    });

    const { data: departmentsResponse, isLoading: departmentsLoading, error: departmentsError } = useDepartmentApi.getGlobalDepartments();

    const departmentOptions = useMemo(() => {
        if (!departmentsResponse?.departments) return [];
        return departmentsResponse.departments
            .filter((dept: any) => dept.isActive && dept.departmentID && dept.name?.trim())
            .map((dept: any) => ({ id: String(dept.departmentID), name: dept.name }));
    }, [departmentsResponse]);

    const selectedDepartment = departmentOptions.find((dept: any) => dept.id === profileData.department) || null;

    const DoctorSchema = useMemo(() => (
        z.object({
            licenseNumber: z.string().min(1, t('docProfile.errors.licenseRequired')),
            qualifications: z.array(z.string()).min(1, t('docProfile.errors.qualificationsRequired')),
            specializations: z.array(z.string()).min(1, t('docProfile.errors.specializationsRequired')),
            experienceYears: z
                .union([z.string(), z.number()])
                .transform((v) => (typeof v === 'string' ? Number(v) : v))
                .refine((v) => Number.isInteger(v) && v >= 0, { message: t('docProfile.errors.experienceInvalid') }),
            medicalCouncil: z.string().min(1, t('docProfile.errors.medicalCouncilRequired')).max(100, t('docProfile.errors.medicalCouncilTooLong')),
            registrationYear: z
                .union([z.string(), z.number()])
                .transform((v) => (typeof v === 'string' ? Number(v) : v))
                .refine(
                    (v) => Number.isInteger(v) && v >= 1900 && v <= new Date().getFullYear(),
                    { message: t('docProfile.errors.registrationYearInvalid') }
                ),
            bio: z.string().optional(),
        })
    ), [t]);

    const handleInputChange = (field: string, value: string | number) => {
        setProfileData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const handleSpecializationsChange = (specializations: string[]) => {
        setProfileData(prev => ({ ...prev, specializations }));
        if (errors.specializations) setErrors(prev => ({ ...prev, specializations: undefined }));
    };

    const handleQualificationsChange = (qualifications: string[]) => {
        setProfileData(prev => ({ ...prev, qualification: qualifications }));
        if (errors.qualifications) setErrors(prev => ({ ...prev, qualifications: undefined }));
    };

    const handleDepartmentChange = (departmentId: string) => {
        const department = departmentOptions.find((dept: any) => dept.id === departmentId);
        setProfileData(prev => ({
            ...prev,
            department: departmentId,
            primaryDepartment: department?.name || prev.primaryDepartment,
        }));
    };

    const validate = (): boolean => {
        const result = DoctorSchema.safeParse({
            licenseNumber: profileData.licenseNumber,
            qualifications: profileData.qualification,
            specializations: profileData.specializations,
            experienceYears: profileData.experienceYears,
            medicalCouncil: profileData.medicalCouncil,
            registrationYear: profileData.registrationYear,
            bio: profileData.bio,
        });
        const errs: FieldErrors = {};
        if (!result.success) result.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
        if (!profileData.department) errs.department = t('docProfile.toast.missingDepartment');
        setErrors(errs);
        return result.success && !!profileData.department;
    };

    const handleNext = () => {
        if (!validate()) return;
        const departmentName = selectedDepartment?.name || profileData.primaryDepartment || '';
        onNext({
            licenseNumber: profileData.licenseNumber,
            qualification: profileData.qualification,
            experienceYears: profileData.experienceYears,
            medicalCouncil: profileData.medicalCouncil,
            registrationYear: profileData.registrationYear,
            bio: profileData.bio,
            primaryDepartment: departmentName,
            department: departmentName,
            specializations: profileData.specializations,
            hospitalDepartmentMappingId: profileData.hospitalDepartmentMappingId,
        });
    };

    const filledCount = [
        profileData.department,
        profileData.specializations.length > 0,
        profileData.qualification.length > 0,
        profileData.licenseNumber,
        profileData.medicalCouncil,
    ].filter(Boolean).length;

    return (
        <div className="space-y-2.5">
            {/* Header with progress dots */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-foreground">{t('docProfile.sectionTitle')}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                i < filledCount ? 'bg-blue-500 scale-110' : 'bg-gray-200 dark:bg-gray-700'
                            )} />
                        ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{filledCount}/5</span>
                </div>
            </div>

            {/* Department & Specializations */}
            <div className="rounded-lg border border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-900/50 p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    <Building2 className="h-3.5 w-3.5" />
                    Department & Expertise
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-1">
                    <div className="space-y-1.5">
                        <Label htmlFor="invite-department" className="text-[11px] font-medium text-blue-900 dark:text-blue-300">
                            {t('docProfile.fields.department.label')} <span className="text-red-500">*</span>
                        </Label>
                        <Select value={profileData.department || ''} onValueChange={handleDepartmentChange} disabled={departmentsLoading}>
                            <SelectTrigger id="invite-department" className={cn("h-9 text-sm transition-all focus:ring-blue-500/20", errors.department && 'border-red-400 ring-2 ring-red-100')}>
                                <SelectValue placeholder={departmentsLoading ? t('docProfile.fields.department.loading') : t('docProfile.fields.department.placeholder')} />
                            </SelectTrigger>
                            <SelectContent className="max-h-56 overflow-y-auto">
                                {departmentsLoading ? (
                                    <SelectItem value="loading" disabled>{t('docProfile.fields.department.loading')}</SelectItem>
                                ) : departmentsError ? (
                                    <SelectItem value="error" disabled>{t('docProfile.fields.department.loadError')}</SelectItem>
                                ) : departmentOptions.length === 0 ? (
                                    <SelectItem value="no-data" disabled>{t('docProfile.fields.department.empty')}</SelectItem>
                                ) : (
                                    departmentOptions.map(({ id, name }: any) => (
                                        <SelectItem key={id} value={id}>{name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {errors.department && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{errors.department}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-blue-900 dark:text-blue-300">
                            {t('docProfile.fields.specializations.label')} <span className="text-red-500">*</span>
                        </Label>
                        <SpecializationSelector
                            departmentId={profileData.department}
                            departmentName={selectedDepartment?.name || ''}
                            selectedSpecializations={profileData.specializations}
                            onSpecializationsChange={handleSpecializationsChange}
                            disabled={false}
                        />
                        {errors.specializations && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{errors.specializations}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-blue-900 dark:text-blue-300">
                            {t('docProfile.fields.qualifications.label')} <span className="text-red-500">*</span>
                        </Label>
                        <QualificationSelector
                            selectedQualifications={profileData.qualification}
                            onQualificationsChange={handleQualificationsChange}
                            disabled={false}
                        />
                        {errors.qualifications && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{errors.qualifications}</p>}
                    </div>
                </div>
            </div>

            {/* Credentials */}
            <div className="rounded-lg border border-purple-200/60 dark:border-purple-900/40 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-gray-900/50 p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                    <BookOpen className="h-3.5 w-3.5" />
                    Credentials
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-1">
                    <div className="space-y-1.5">
                        <Label htmlFor="invite-licenseNumber" className="text-[11px] font-medium text-purple-900 dark:text-purple-300">
                            {t('docProfile.fields.licenseNumber.label')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="invite-licenseNumber"
                            value={profileData.licenseNumber}
                            onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                            className={cn("h-9 text-sm transition-all focus:ring-purple-500/20", errors.licenseNumber && 'border-red-400 ring-2 ring-red-100')}
                        />
                        {errors.licenseNumber && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{errors.licenseNumber}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="invite-experienceYears" className="text-[11px] font-medium text-purple-900 dark:text-purple-300">
                            {t('docProfile.fields.experienceYears.label')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="invite-experienceYears"
                            type="number"
                            value={profileData.experienceYears || ''}
                            onChange={(e) => handleInputChange('experienceYears', Number(e.target.value))}
                            className={cn("h-9 text-sm transition-all focus:ring-purple-500/20", errors.experienceYears && 'border-red-400 ring-2 ring-red-100')}
                            placeholder="0"
                        />
                        {errors.experienceYears && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{errors.experienceYears}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="invite-registrationYear" className="text-[11px] font-medium text-purple-900 dark:text-purple-300">
                            {t('docProfile.fields.registrationYear.label')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="invite-registrationYear"
                            type="number"
                            value={profileData.registrationYear || ''}
                            onChange={(e) => handleInputChange('registrationYear', Number(e.target.value))}
                            className={cn("h-9 text-sm transition-all focus:ring-purple-500/20", errors.registrationYear && 'border-red-400 ring-2 ring-red-100')}
                        />
                        {errors.registrationYear && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{errors.registrationYear}</p>}
                    </div>
                </div>
            </div>

            {/* Registration & Bio (combined) */}
            <div className="rounded-lg border border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-gray-900/50 p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <Award className="h-3.5 w-3.5" />
                    Registration & Bio
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-1">
                    <div className="space-y-1.5">
                        <Label htmlFor="invite-medicalCouncil" className="text-[11px] font-medium text-amber-900 dark:text-amber-300">
                            {t('docProfile.fields.medicalCouncil.label')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="invite-medicalCouncil"
                            value={profileData.medicalCouncil || ''}
                            onChange={(e) => handleInputChange('medicalCouncil', e.target.value)}
                            className={cn("h-9 text-sm transition-all focus:ring-amber-500/20", errors.medicalCouncil && 'border-red-400 ring-2 ring-red-100')}
                        />
                        {errors.medicalCouncil && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{errors.medicalCouncil}</p>}
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-medium flex items-center gap-1">
                            <ClipboardList className="h-3 w-3 text-gray-400" />
                            {t('docProfile.fields.bio.label')} <span className="text-[9px] font-normal text-muted-foreground ml-auto">(Optional)</span>
                        </Label>
                        <Textarea
                            value={profileData.bio || ''}
                            onChange={(e) => handleInputChange('bio', e.target.value)}
                            placeholder={t('docProfile.fields.bio.placeholder')}
                            className="text-sm resize-none h-20 sm:h-8 transition-all focus:h-20"
                        />
                    </div>
                </div>
            </div>

            {/* Error summary */}
            {Object.keys(errors).length > 0 && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-2">
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Please fix the errors above before continuing.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button variant="outline" onClick={onBack} className="h-9 px-6 gap-2 text-sm font-medium">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                    className="h-8 px-5 gap-1.5 text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                >
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div >
    );
};
