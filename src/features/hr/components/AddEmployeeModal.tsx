import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, User, Building2, CreditCard, Stethoscope, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateEmployee } from '../hrApi';
import { useDepartments } from '@/features/appointment/hooks/useDepartments';
import type { EmploymentType, PayrollTrack } from '../types';

interface AddEmployeeModalProps {
  hospitalId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'personal' | 'employment' | 'statutory' | 'clinical';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'personal', label: 'Personal Info', icon: <User className="h-4 w-4" /> },
  { id: 'employment', label: 'Employment', icon: <Building2 className="h-4 w-4" /> },
  { id: 'statutory', label: 'Statutory & Bank', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'clinical', label: 'Clinical Credentials', icon: <Stethoscope className="h-4 w-4" /> },
];

// TRACK_A (salaried) vs TRACK_B (consultant) drives which payroll strategy runs for this
// employee -- see RunMonthlyPayrollHandler / SalariedPayrollStrategy / ConsultantPayrollStrategy.
const PAYROLL_TRACK_FOR: Record<EmploymentType, PayrollTrack> = {
  FULL_TIME_SALARIED: 'TRACK_A_SALARIED',
  VISITING_CONSULTANT: 'TRACK_B_CONSULTANT',
  CONTRACTUAL: 'TRACK_A_SALARIED',
  INTERN: 'TRACK_A_SALARIED',
};

const DESIGNATIONS: Record<EmploymentType, string[]> = {
  FULL_TIME_SALARIED: [
    'GDMO', 'Senior RMO', 'Night RMO', 'Staff Nurse', 'Staff Nurse — ICU',
    'Nursing Superintendent', 'Lab Technician', 'Radiographer', 'Pharmacist',
    'Billing Cashier', 'Front Desk Executive', 'Ward Boy', 'Ayah',
    'Housekeeping Staff', 'Security Guard', 'Ambulance Driver', 'Maintenance',
  ],
  VISITING_CONSULTANT: [
    'Visiting Consultant', 'Senior Surgeon', 'Laparoscopic Surgeon',
    'Visiting Anesthetist', 'Visiting Radiologist', 'Interventional Cardiologist',
    'Senior Gynecologist',
  ],
  CONTRACTUAL: ['Contract Nurse', 'Contract Lab Tech', 'Contract Security'],
  INTERN: ['Medical Intern', 'Nursing Intern', 'Pharmacy Intern'],
};

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ hospitalId, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [formData, setFormData] = useState<Record<string, string>>({
    gender: 'Male',
    employmentType: 'FULL_TIME_SALARIED',
  });
  const [success, setSuccess] = useState(false);
  const { mutateAsync: createEmployee, isPending } = useCreateEmployee();
  const { data: departmentsData } = useDepartments(hospitalId);
  const departments = departmentsData?.departments ?? [];

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  const update = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleNext = () => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].id);
  };

  const handleBack = () => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1].id);
  };

  const handleSubmit = async () => {
    const employmentType = (formData.employmentType as EmploymentType) || 'FULL_TIME_SALARIED';
    try {
      await createEmployee({
        hospitalId,
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        gender: formData.gender || 'Male',
        dateOfBirth: formData.dob || '',
        contactNumber: formData.contactNumber || '',
        email: formData.email || undefined,
        employmentType,
        departmentId: formData.departmentId || '',
        designation: formData.designation || '',
        dateOfJoining: formData.dateOfJoining || '',
        panNumber: formData.panNumber || '',
        payrollTrack: PAYROLL_TRACK_FOR[employmentType],
        bankName: formData.bankName || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankIfsc: formData.bankIfsc || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({ gender: 'Male', employmentType: 'FULL_TIME_SALARIED' });
        setCurrentStep('personal');
        onClose();
      }, 2000);
    } catch {
      // toast handled globally
    }
  };

  const isLastStep = stepIndex === STEPS.length - 1;
  const availableDesignations = DESIGNATIONS[(formData.employmentType as EmploymentType) || 'FULL_TIME_SALARIED'];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:max-w-xl z-50 bg-white dark:bg-gray-950 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col"
          >
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-brand-500 to-purple-600 p-5 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Add New Staff Member</h2>
                    <p className="text-white/70 text-xs mt-0.5">Step {stepIndex + 1} of {STEPS.length} — {STEPS[stepIndex].label}</p>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress */}
                <div className="flex gap-1.5 mt-4">
                  {STEPS.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                        idx <= stepIndex ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Step indicators */}
              <div className="flex border-b border-gray-100 dark:border-gray-800 px-4 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 overflow-x-auto">
                {STEPS.map((step, idx) => (
                  <button
                    key={step.id}
                    onClick={() => idx <= stepIndex && setCurrentStep(step.id)}
                    className={`flex items-center gap-1 text-xs px-2 py-2.5 border-b-2 transition-colors ${
                      step.id === currentStep
                        ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                        : idx < stepIndex
                        ? 'border-transparent text-emerald-600 dark:text-emerald-400 cursor-pointer'
                        : 'border-transparent text-gray-400 cursor-default'
                    }`}
                  >
                    {idx < stepIndex ? <Check className="h-3.5 w-3.5" /> : step.icon}
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                ))}
              </div>

              {/* Form content */}
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-64 gap-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <Check className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900 dark:text-white">Staff Member Added!</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Employee code generated successfully</p>
                    </div>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* STEP 1: Personal Info */}
                      {currentStep === 'personal' && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">First Name *</Label>
                              <Input placeholder="e.g. Priya" value={formData.firstName || ''} onChange={e => update('firstName', e.target.value)} className="rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Last Name *</Label>
                              <Input placeholder="e.g. Sen" value={formData.lastName || ''} onChange={e => update('lastName', e.target.value)} className="rounded-xl" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Gender *</Label>
                              <Select value={formData.gender} onValueChange={v => update('gender', v)}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Male">👨 Male</SelectItem>
                                  <SelectItem value="Female">👩 Female</SelectItem>
                                  <SelectItem value="Other">⚧ Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Date of Birth *</Label>
                              <Input type="date" value={formData.dob || ''} onChange={e => update('dob', e.target.value)} className="rounded-xl" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Mobile Number *</Label>
                              <Input placeholder="+91-98XXXXXXXX" value={formData.contactNumber || ''} onChange={e => update('contactNumber', e.target.value)} className="rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Blood Group</Label>
                              <Select value={formData.bloodGroup || ''} onValueChange={v => update('bloodGroup', v)}>
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                    <SelectItem key={bg} value={bg}>🩸 {bg}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Email Address</Label>
                            <Input type="email" placeholder="doctor@hospital.in" value={formData.email || ''} onChange={e => update('email', e.target.value)} className="rounded-xl" />
                          </div>
                        </>
                      )}

                      {/* STEP 2: Employment */}
                      {currentStep === 'employment' && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Employment Type *</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {([
                                { value: 'FULL_TIME_SALARIED', label: '💰 Salaried Staff', sub: 'TDS Sec 192 · PF · ESI' },
                                { value: 'VISITING_CONSULTANT', label: '🩺 Visiting Consultant', sub: 'TDS Sec 194J' },
                                { value: 'CONTRACTUAL', label: '📋 Contractual', sub: 'Fixed-term contract' },
                                { value: 'INTERN', label: '🎓 Intern', sub: 'Training / Probation' },
                              ] as const).map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => update('employmentType', opt.value)}
                                  className={`text-left p-3 rounded-xl border-2 transition-all text-xs ${
                                    formData.employmentType === opt.value
                                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="font-semibold text-gray-800 dark:text-gray-200">{opt.label}</div>
                                  <div className="text-gray-400 mt-0.5">{opt.sub}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Department *</Label>
                              <Select value={formData.departmentId || ''} onValueChange={v => update('departmentId', v)}>
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select dept." /></SelectTrigger>
                                <SelectContent>
                                  {departments.map(d => <SelectItem key={d.departmentId} value={d.departmentId}>{d.departmentName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Designation *</Label>
                              <Select value={formData.designation || ''} onValueChange={v => update('designation', v)}>
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select role" /></SelectTrigger>
                                <SelectContent>
                                  {availableDesignations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Date of Joining *</Label>
                            <Input type="date" value={formData.dateOfJoining || ''} onChange={e => update('dateOfJoining', e.target.value)} className="rounded-xl" />
                          </div>
                        </>
                      )}

                      {/* STEP 3: Statutory & Banking */}
                      {currentStep === 'statutory' && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">PAN Number *</Label>
                              <Input placeholder="ABCDE1234F" value={formData.panNumber || ''} onChange={e => update('panNumber', e.target.value.toUpperCase())} maxLength={10} className="rounded-xl font-mono" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Aadhaar (Last 4 digits)</Label>
                              <Input placeholder="XXXX" maxLength={4} value={formData.aadhaarLast4 || ''} onChange={e => update('aadhaarLast4', e.target.value)} className="rounded-xl font-mono" />
                            </div>
                          </div>
                          {formData.employmentType === 'FULL_TIME_SALARIED' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">UAN Number (PF)</Label>
                                <Input placeholder="10-digit UAN" value={formData.uanNumber || ''} onChange={e => update('uanNumber', e.target.value)} className="rounded-xl font-mono" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">ESI IP Number</Label>
                                <Input placeholder="ESI number" value={formData.esiNumber || ''} onChange={e => update('esiNumber', e.target.value)} className="rounded-xl font-mono" />
                              </div>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Bank Name *</Label>
                            <Select value={formData.bankName || ''} onValueChange={v => update('bankName', v)}>
                              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select bank" /></SelectTrigger>
                              <SelectContent>
                                {['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of India', 'Punjab National Bank', 'Union Bank of India', 'Bank of Baroda', 'Canara Bank'].map(b => (
                                  <SelectItem key={b} value={b}>🏦 {b}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Account Number *</Label>
                              <Input placeholder="Account number" value={formData.bankAccountNumber || ''} onChange={e => update('bankAccountNumber', e.target.value)} className="rounded-xl font-mono" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">IFSC Code *</Label>
                              <Input placeholder="e.g. HDFC0001234" value={formData.bankIfsc || ''} onChange={e => update('bankIfsc', e.target.value.toUpperCase())} maxLength={11} className="rounded-xl font-mono" />
                            </div>
                          </div>
                        </>
                      )}

                      {/* STEP 4: Clinical Credentials */}
                      {currentStep === 'clinical' && (
                        <>
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-300 mb-1">
                            Required for clinical staff (Doctors, Nurses, Lab Techs, Pharmacists). Skip if support/admin role.
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Council Name</Label>
                              <Select value={formData.councilName || ''} onValueChange={v => update('councilName', v)}>
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select council" /></SelectTrigger>
                                <SelectContent>
                                  {['NMC (National Medical Commission)', 'Bihar Medical Council', 'Maharashtra Medical Council', 'Delhi Medical Council', 'State Nursing Council', 'State Pharmacy Council', 'NABL / DMLT Council'].map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Registration Number</Label>
                              <Input placeholder="e.g. BMC-2016-09876" value={formData.registrationNumber || ''} onChange={e => update('registrationNumber', e.target.value)} className="rounded-xl font-mono" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Qualification</Label>
                              <Select value={formData.qualification || ''} onValueChange={v => update('qualification', v)}>
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  {['MBBS', 'MD', 'MS', 'DM', 'MCh', 'B.Sc Nursing', 'GNM', 'DMLT', 'B.Pharm', 'D.Pharm'].map(q => (
                                    <SelectItem key={q} value={q}>{q}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">License Expiry Date</Label>
                              <Input type="date" value={formData.licenseValidUntil || ''} onChange={e => update('licenseValidUntil', e.target.value)} className="rounded-xl" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">BLS Expiry Date</Label>
                            <Input type="date" value={formData.blsExpiryDate || ''} onChange={e => update('blsExpiryDate', e.target.value)} className="rounded-xl" />
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {/* Footer actions */}
              {!success && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 mt-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    disabled={stepIndex === 0}
                    className="gap-1.5 rounded-xl"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="text-xs text-gray-400">{stepIndex + 1} / {STEPS.length}</div>
                  {isLastStep ? (
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isPending}
                      className="gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg"
                    >
                      {isPending ? 'Saving...' : '✓ Save Staff Member'}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleNext} className="gap-1.5 rounded-xl">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
