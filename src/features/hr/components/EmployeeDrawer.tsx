import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  CreditCard,
  Shield,
  Syringe,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Banknote,
  IndianRupee,
  Edit,
  FileText,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EmploymentTypeBadge, TrackBadge, SeverityBadge } from './ShiftBadge';
import type { HrEmployee } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';

interface EmployeeDrawerProps {
  employee: HrEmployee | null;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'credentials' | 'payroll' | 'health';

const AVATAR_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-indigo-400 to-violet-500',
];

function getAvatarColor(id: string) {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
    <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-900 dark:text-white break-all">{value || '—'}</div>
    </div>
  </div>
);

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({ employee, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  if (!employee) return null;
  const avatarGradient = getAvatarColor(employee.id);
  const initials = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="h-3.5 w-3.5" /> },
    { id: 'credentials', label: 'Credentials', icon: <Shield className="h-3.5 w-3.5" /> },
    { id: 'payroll', label: 'Payroll', icon: <IndianRupee className="h-3.5 w-3.5" /> },
    { id: 'health', label: 'Health', icon: <Activity className="h-3.5 w-3.5" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[480px] z-50 flex flex-col bg-white dark:bg-gray-950 shadow-2xl"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${avatarGradient} p-5 relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl shadow-lg border border-white/30">
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{employee.firstName} {employee.lastName}</h2>
                  <p className="text-white/80 text-sm mt-0.5">{employee.designation}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-mono bg-white/20 text-white px-2 py-0.5 rounded-lg">{employee.employeeCode}</span>
                    <EmploymentTypeBadge type={employee.employmentType} />
                    <TrackBadge track={employee.payrollTrack} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 px-4 bg-gray-50 dark:bg-gray-900/50">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 space-y-4"
                >
                  {/* ── PROFILE TAB ── */}
                  {activeTab === 'profile' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Personal Info</h3>
                        <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Date of Birth" value={format(parseISO(employee.dob), 'dd MMM yyyy')} />
                        <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Gender" value={employee.gender} />
                        <InfoRow icon={<Activity className="h-3.5 w-3.5" />} label="Blood Group" value={employee.bloodGroup} />
                        <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Contact" value={employee.contactNumber} />
                        <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={employee.email} />
                      </div>

                      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Employment Details</h3>
                        <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Department" value={employee.departmentName} />
                        <InfoRow icon={<Award className="h-3.5 w-3.5" />} label="Designation" value={employee.designation} />
                        <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Date of Joining" value={format(parseISO(employee.dateOfJoining), 'dd MMM yyyy')} />
                        {employee.reportingManagerName && (
                          <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Reporting Manager" value={employee.reportingManagerName} />
                        )}
                      </div>

                      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Statutory & Banking</h3>
                        <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="PAN Number" value={employee.panNumber} />
                        <InfoRow icon={<Shield className="h-3.5 w-3.5" />} label="UAN (PF)" value={employee.uanNumber} />
                        <InfoRow icon={<Shield className="h-3.5 w-3.5" />} label="ESI IP Number" value={employee.esiNumber} />
                        <InfoRow icon={<Banknote className="h-3.5 w-3.5" />} label="Bank" value={employee.bankName} />
                        <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="Account Number" value={employee.bankAccountNumber ? `••••${employee.bankAccountNumber.slice(-4)}` : '—'} />
                        <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="IFSC Code" value={employee.bankIfsc} />
                      </div>
                    </div>
                  )}

                  {/* ── CREDENTIALS TAB ── */}
                  {activeTab === 'credentials' && (
                    <div className="space-y-3">
                      {(!employee.credentials || employee.credentials.length === 0) ? (
                        <div className="text-center py-10 text-gray-400">
                          <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No credentials on file</p>
                        </div>
                      ) : employee.credentials.map(cred => {
                        const daysLeft = differenceInDays(parseISO(cred.licenseValidUntil), new Date());
                        const isExpired = daysLeft < 0;
                        const isCritical = daysLeft >= 0 && daysLeft <= 30;

                        return (
                          <div key={cred.id} className={`rounded-2xl border p-4 ${
                            isExpired ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20'
                            : isCritical ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20'
                            : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-semibold text-sm text-gray-900 dark:text-white">{cred.councilName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cred.qualificationDegree} — {cred.degreeCompletionYear}</div>
                              </div>
                              {cred.isVerified ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                              )}
                            </div>
                            <div className="text-xs font-mono text-gray-400 dark:text-gray-600 mb-2">{cred.registrationNumber}</div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Expires: <span className="font-medium text-gray-700 dark:text-gray-300">{format(parseISO(cred.licenseValidUntil), 'dd MMM yyyy')}</span>
                              </div>
                              <SeverityBadge severity={isExpired ? 'CRITICAL' : isCritical ? 'CRITICAL' : 'MEDIUM'} daysLeft={daysLeft} />
                            </div>

                            {/* Life Support Certs */}
                            {(cred.blsExpiryDate || cred.aclsExpiryDate || cred.palsExpiryDate) && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Life Support Certifications</div>
                                {cred.blsExpiryDate && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">BLS</span>
                                    <span className={`font-medium ${differenceInDays(parseISO(cred.blsExpiryDate), new Date()) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {format(parseISO(cred.blsExpiryDate), 'MMM yyyy')}
                                      {differenceInDays(parseISO(cred.blsExpiryDate), new Date()) < 0 && ' ⚠️ EXPIRED'}
                                    </span>
                                  </div>
                                )}
                                {cred.aclsExpiryDate && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">ACLS</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{format(parseISO(cred.aclsExpiryDate), 'MMM yyyy')}</span>
                                  </div>
                                )}
                                {cred.palsExpiryDate && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">PALS</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{format(parseISO(cred.palsExpiryDate), 'MMM yyyy')}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── PAYROLL TAB ── */}
                  {activeTab === 'payroll' && (
                    <div className="space-y-3">
                      {employee.payrollTrack === 'TRACK_A_SALARIED' && employee.salaryStructure ? (
                        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                              <IndianRupee className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Track A — Salaried (Section 192)</span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Monthly Gross CTC</span>
                              <span className="font-bold text-gray-900 dark:text-white">{formatINR(employee.salaryStructure.monthlyGrossCtc)}</span>
                            </div>
                            <Separator className="my-1" />
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Earnings Breakdown</div>
                            {[
                              ['Basic Salary', employee.salaryStructure.basicSalary],
                              ['HRA', employee.salaryStructure.hra],
                              ['DA', employee.salaryStructure.dearnessAllowance],
                              ['Special Allowance', employee.salaryStructure.specialAllowance],
                              ['Medical Allowance', employee.salaryStructure.medicalAllowance],
                            ].map(([label, val]) => (
                              <div key={label as string} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                <span>{label}</span>
                                <span className="font-mono font-medium">{formatINR(val as number)}</span>
                              </div>
                            ))}
                            <Separator className="my-1" />
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Deductions</div>
                            {employee.salaryStructure.isPfEligible && (
                              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                <span>PF Employee (12% of Basic)</span>
                                <span className="font-mono font-medium text-rose-500">- {formatINR(employee.salaryStructure.basicSalary * 0.12)}</span>
                              </div>
                            )}
                            {employee.salaryStructure.isEsiEligible && (
                              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                <span>ESIC Employee (0.75%)</span>
                                <span className="font-mono font-medium text-rose-500">- {formatINR(employee.salaryStructure.monthlyGrossCtc * 0.0075)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                              <span>Professional Tax</span>
                              <span className="font-mono font-medium text-rose-500">- {formatINR(employee.salaryStructure.professionalTax)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>Night Allowance Rate</span>
                              <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatINR(employee.salaryStructure.nightShiftAllowanceRate)}/night</span>
                            </div>
                          </div>
                        </div>
                      ) : employee.payrollTrack === 'TRACK_B_CONSULTANT' && employee.consultantFeeConfig ? (
                        <div className="rounded-2xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                              <IndianRupee className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Track B — Consultant (Section 194J)</span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Monthly Retainer</span>
                              <span className="font-bold text-gray-900 dark:text-white">{formatINR(employee.consultantFeeConfig.monthlyRetainer)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                              <span>OPD Revenue Share</span>
                              <span className="font-medium">{employee.consultantFeeConfig.opdSharePercent}%</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                              <span>IPD Round Visit Fee</span>
                              <span className="font-mono font-medium">{formatINR(employee.consultantFeeConfig.ipdVisitFee)}/visit</span>
                            </div>

                            {employee.consultantFeeConfig.surgeryShareConfig.length > 0 && (
                              <>
                                <Separator className="my-1" />
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Surgery Package Cuts</div>
                                {employee.consultantFeeConfig.surgeryShareConfig.map(s => (
                                  <div key={s.packageName} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                    <span>{s.packageName}</span>
                                    <span className="font-mono font-medium">{formatINR(s.consultantShare)}/case</span>
                                  </div>
                                ))}
                              </>
                            )}
                            <Separator className="my-1" />
                            <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400">
                              <span>TDS (Section 194J)</span>
                              <span className="font-semibold">10% of Gross</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10 text-gray-400 text-sm">No payroll structure configured</div>
                      )}
                    </div>
                  )}

                  {/* ── HEALTH TAB ── */}
                  {activeTab === 'health' && (
                    <div className="space-y-3">
                      {employee.vaccinationRecords && employee.vaccinationRecords.length > 0 ? (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4">
                          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Syringe className="h-3.5 w-3.5" />
                            Vaccination Record
                          </h3>
                          <div className="space-y-2">
                            {employee.vaccinationRecords.map(vac => (
                              <div key={vac.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                                <div>
                                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{vac.vaccineName}</div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500">Dose {vac.doseNumber} · {format(parseISO(vac.administeredOn), 'dd MMM yyyy')}</div>
                                </div>
                                {vac.nextDueDate && (
                                  <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                    Due: {format(parseISO(vac.nextDueDate), 'MMM yyyy')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4">
                          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Vaccination Record</h3>
                          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No vaccination records on file</p>
                        </div>
                      )}

                      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Needle-Stick / Exposure Log
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No incident records on file</p>
                        <Button variant="outline" size="sm" className="w-full rounded-xl text-xs mt-1">
                          + Log New Incident
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex gap-2 bg-gray-50 dark:bg-gray-900/50">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl text-xs">
                <Edit className="h-3.5 w-3.5" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl text-xs">
                <FileText className="h-3.5 w-3.5" />
                View Payslips
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
