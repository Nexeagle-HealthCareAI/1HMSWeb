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
    const [localStep, setLocalStep] = useState(1);

    const [profileData, setProfileData] = useState({
        licenseNumber: initialData?.licenseNumber || '',
        qualification: initialData?.qualification || [] as string[],
        experienceYears: initialData?.experienceYears !== undefined ? initialData.experienceYears : ('' as unknown as number),
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
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleSpecializationsChange = (specializations: string[]) => {
        setProfileData(prev => ({ ...prev, specializations }));
        if (errors.specializations) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.specializations;
                return newErrors;
            });
        }
    };

    const handleQualificationsChange = (qualifications: string[]) => {
        setProfileData(prev => ({ ...prev, qualification: qualifications }));
        if (errors.qualifications) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.qualifications;
                return newErrors;
            });
        }
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
            department: profileData.department,
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

    const isStep1Valid = useMemo(() => {
        const hasDepartment = !!profileData.department && !['loading', 'error', 'no-data'].includes(profileData.department);
        const hasSpecializations = profileData.specializations && profileData.specializations.length > 0;
        const hasQualifications = profileData.qualification && profileData.qualification.length > 0;
        return hasDepartment && hasSpecializations && hasQualifications;
    }, [profileData]);

    const isStep2Valid = useMemo(() => {
        const hasLicense = !!profileData.licenseNumber?.trim();
        const hasMedicalCouncil = !!profileData.medicalCouncil?.trim();
        const hasExperience = typeof profileData.experienceYears === 'number' && !isNaN(profileData.experienceYears);
        const hasRegistrationYear = typeof profileData.registrationYear === 'number' && !isNaN(profileData.registrationYear);

        const result = DoctorSchema.safeParse({
            licenseNumber: profileData.licenseNumber,
            qualifications: profileData.qualification, // from step 1
            specializations: profileData.specializations, // from step 1
            experienceYears: profileData.experienceYears,
            medicalCouncil: profileData.medicalCouncil,
            registrationYear: profileData.registrationYear,
            bio: profileData.bio,
        });

        // if result isn't entirely successful, it's false overall
        return result.success && hasLicense && hasMedicalCouncil && hasExperience && hasRegistrationYear;
    }, [DoctorSchema, profileData]);

    const isFormValid = isStep1Valid && isStep2Valid;

    return (
        <div className="space-y-2.5">
            {/* Header with gamified progress dots */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60 mb-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-blue-500/20">
                        <div className="absolute inset-0 rounded-lg border border-white/20" />
                        <Stethoscope className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent uppercase tracking-wider">
                        {t('docProfile.sectionTitle')}
                    </h3>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="relative w-8 h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                <div className={cn(
                                    "absolute inset-y-0 left-0 transition-all duration-500 rounded-full",
                                    i < filledCount
                                        ? "w-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        : "w-0 bg-transparent"
                                )} />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-baseline gap-0.5 font-mono text-xs">
                        <span className={cn("font-bold", filledCount === 5 ? "text-green-500" : "text-blue-600 dark:text-blue-400")}>{filledCount}</span>
                        <span className="text-[10px] text-slate-400">/5</span>
                    </div>
                </div>
            </div>

            {/* Step Indicators inside the page */}
            <div className="flex gap-2 mb-4">
                <div className={cn("flex-1 h-1.5 rounded-full transition-all duration-300", localStep >= 1 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-slate-200 dark:bg-slate-700")} />
                <div className={cn("flex-1 h-1.5 rounded-full transition-all duration-300", localStep >= 2 ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "bg-slate-200 dark:bg-slate-700")} />
            </div>

            {/* Department & Specializations (Step 1) */}
            {localStep === 1 && (
                <div className="group relative rounded-xl border border-blue-100/80 bg-white/70 backdrop-blur-md dark:border-blue-900/40 dark:bg-slate-900/50 p-4 space-y-3 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-transparent dark:from-blue-900/10 pointer-events-none" />
                    <div className="relative flex items-center gap-2 text-xs font-bold tracking-wide text-blue-700 dark:text-blue-400 uppercase">
                        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
                            <Building2 className="h-3.5 w-3.5" />
                        </div>
                        Department & Expertise
                    </div>
                    <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mt-2">
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
            )}

            {/* Credentials (Step 2) */}
            {localStep === 2 && (
                <>
                    <div className="group relative rounded-xl border border-purple-100/80 bg-white/70 backdrop-blur-md dark:border-purple-900/40 dark:bg-slate-900/50 p-4 space-y-3 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 to-transparent dark:from-purple-900/10 pointer-events-none" />
                        <div className="relative flex items-center gap-2 text-xs font-bold tracking-wide text-purple-700 dark:text-purple-400 uppercase">
                            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
                                <BookOpen className="h-3.5 w-3.5" />
                            </div>
                            Credentials
                        </div>
                        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mt-2">
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
                                    value={profileData.experienceYears === ('' as unknown as number) ? '' : profileData.experienceYears}
                                    onChange={(e) => handleInputChange('experienceYears', e.target.value === '' ? ('' as unknown as number) : Number(e.target.value))}
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
                    <div className="group relative rounded-xl border border-amber-100/80 bg-white/70 backdrop-blur-md dark:border-amber-900/40 dark:bg-slate-900/50 p-4 space-y-3 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/20 to-transparent dark:from-amber-900/10 pointer-events-none" />
                        <div className="relative flex items-center gap-2 text-xs font-bold tracking-wide text-amber-700 dark:text-amber-400 uppercase">
                            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300">
                                <Award className="h-3.5 w-3.5" />
                            </div>
                            Registration & Bio
                        </div>
                        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mt-2">
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
                </>
            )}

            {/* Error summary */}
            {Object.keys(errors).length > 0 && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-2">
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Please fix the errors above before continuing.
                    </p>
                </div>
            )}

            <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                <Button
                    variant="outline"
                    onClick={() => localStep === 1 ? onBack() : setLocalStep(1)}
                    className="h-10 px-6 gap-2 text-sm font-bold tracking-wide text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-300"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                {localStep === 1 ? (
                    <Button
                        onClick={() => {
                            if (isStep1Valid) setLocalStep(2);
                            else validate(); // Trigger error messages for UI
                        }}
                        disabled={!isStep1Valid}
                        className={cn(
                            "relative h-10 px-8 gap-2 text-sm font-bold uppercase tracking-wider transition-all duration-300",
                            isStep1Valid
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] shadow-blue-500/25"
                                : "bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed"
                        )}
                    >
                        Continue
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                ) : (
                    <div className="relative group">
                        {/* Glowing background for enabled state */}
                        {isFormValid && (
                            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300" />
                        )}
                        <Button
                            onClick={handleNext}
                            disabled={!isFormValid}
                            className={cn(
                                "relative h-10 px-8 gap-2 text-sm font-bold uppercase tracking-wider transition-all duration-300",
                                isFormValid
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] shadow-blue-500/25"
                                    : "bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed"
                            )}
                        >
                            Complete Step
                            <ArrowRight className={cn("h-4 w-4 transition-transform", isFormValid && "group-hover:translate-x-1")} />
                        </Button>
                    </div>
                )}
            </div>
        </div >
    );
};
