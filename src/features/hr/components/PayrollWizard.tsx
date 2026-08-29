import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IndianRupee, 
  Calendar, 
  DownloadCloud, 
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Building2,
  Users2,
  ArrowRight,
  ChevronLeft,
  Loader2,
  MessageCircle,
  Eye
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { useRunPayroll, downloadBankExport, useGetPayslipsByRun, useDispatchPayslips } from '../hrApi';
import { usePayslipPdf } from '../hooks/usePayslipPdf';
import { PayslipDocument } from './PayslipDocument';
import { HrPayslip } from '../types';

export const PayrollWizard: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedMonth, setSelectedMonth] = useState(subMonths(new Date(), 1));
  const [payrollRunId, setPayrollRunId] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ net: number, count: number } | null>(null);
  const [selectedPayslipPreview, setSelectedPayslipPreview] = useState<HrPayslip | null>(null);
  
  const { mutate: runPayroll, isPending: isRunning, error: runError } = useRunPayroll();
  const { mutate: dispatchWhatsApp, isPending: isDispatching } = useDispatchPayslips();
  const { data: payslipsData } = useGetPayslipsByRun(payrollRunId);
  const { payslipRef, generatePdf, isGenerating } = usePayslipPdf();
  
  const [exporting, setExporting] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 1) {
      runPayroll(
        { 
          hospitalId, 
          month: selectedMonth.getMonth() + 1, 
          year: selectedMonth.getFullYear() 
        },
        {
          onSuccess: (data) => {
            if (data.hrPayrollRunId) {
              setPayrollRunId(data.hrPayrollRunId);
              setTotals({
                net: data.totalNetDisbursement || 0,
                count: data.payslipsGenerated || 0
              });
              setStep(2);
            }
          }
        }
      );
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleDownload = async (format: string) => {
    if (!payrollRunId) return;
    try {
      setExporting(format);
      setLocalError(null);
      await downloadBankExport(payrollRunId, format);
    } catch (err: unknown) {
      const error = err as Error;
      setLocalError(error.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleWhatsAppDispatch = () => {
    if (!payrollRunId) return;
    dispatchWhatsApp(payrollRunId, {
      onSuccess: () => {
        setStep(4);
      }
    });
  };

  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), i);
    return {
      date: d,
      label: format(d, 'MMMM yyyy'),
      value: `${d.getFullYear()}-${d.getMonth() + 1}`
    };
  });

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[650px]">
      
      {/* Wizard Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-brand-500" />
            EasyPayroll Batch Engine
          </h2>
          <p className="text-sm text-gray-500">1-Click Salary Disbursement</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div 
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s 
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                    : step > s 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                }`}
              >
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s !== 3 && (
                <div className={`h-1 w-8 rounded-full transition-colors ${step > s ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Configuration */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 p-8 flex flex-col"
            >
              <div className="max-w-xl mx-auto w-full flex-1">
                <div className="text-center mb-8">
                  <div className="h-16 w-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100 dark:border-brand-800">
                    <Calendar className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select Payroll Month</h3>
                  <p className="text-gray-500">Choose the month you want to process salaries for. All attendance and exceptions up to this month will be calculated.</p>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Target Month</label>
                  <select 
                    className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-lg font-medium text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                    value={`${selectedMonth.getFullYear()}-${selectedMonth.getMonth() + 1}`}
                    onChange={(e) => {
                      const [y, m] = e.target.value.split('-');
                      setSelectedMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                    }}
                  >
                    {monthOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex gap-3 text-blue-800 dark:text-blue-300">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong>Pre-flight Check:</strong> Ensure all attendance exceptions and leave requests for this month are resolved before running the batch.
                  </div>
                </div>

                {runError && (
                  <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold flex gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {runError.message}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Review (Simulating calculation) */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 p-8 flex flex-col"
            >
              <div className="max-w-2xl mx-auto w-full flex-1">
                <div className="text-center mb-8">
                  <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-800">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payroll Calculated Successfully</h3>
                  <p className="text-gray-500">Review the generated totals before proceeding to bank disbursement.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm flex flex-col items-center justify-center text-center">
                    <Users2 className="h-8 w-8 text-brand-500 mb-3" />
                    <div className="text-sm font-semibold text-gray-500 mb-1">Total Payslips</div>
                    <div className="text-4xl font-black text-gray-900 dark:text-white">{totals?.count || 0}</div>
                  </div>
                  
                  <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg flex flex-col items-center justify-center text-center text-white">
                    <IndianRupee className="h-8 w-8 text-emerald-100 mb-3 opacity-80" />
                    <div className="text-sm font-semibold text-emerald-100 mb-1">Total Net Disbursement</div>
                    <div className="text-4xl font-black flex items-center gap-1">
                      <span className="text-2xl font-normal opacity-80">₹</span>
                      {totals?.net.toLocaleString('en-IN') || '0'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex gap-3 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong>Action Required:</strong> Once you proceed to the next step, this payroll batch will be locked and cannot be recalculated.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Disburse & Export */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 p-8 flex flex-col overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto w-full flex-1">
                <div className="text-center mb-8">
                  <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-800">
                    <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Disburse & Notify</h3>
                  <p className="text-gray-500">Download NEFT bulk upload files or dispatch payslips instantly via WhatsApp.</p>
                </div>

                {localError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-sm font-semibold">
                    {localError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-8">
                  {/* Bank Exports */}
                  <div className="col-span-2 space-y-3">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">1. Bank File Export</h4>
                    {(['HDFC', 'SBI', 'GENERIC'] as const).map(bank => (
                      <button
                        key={bank}
                        onClick={() => handleDownload(bank)}
                        disabled={exporting !== null}
                        className="group relative overflow-hidden w-full p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-brand-500 hover:shadow-md transition-all flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 transition-colors">
                            <FileSpreadsheet className="h-5 w-5 text-gray-500 group-hover:text-brand-500 transition-colors" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{bank === 'GENERIC' ? 'Standard CSV Layout' : `${bank} Format`}</div>
                          </div>
                        </div>
                        
                        <div className="relative z-10">
                          {exporting === bank ? (
                            <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
                          ) : (
                            <DownloadCloud className="h-5 w-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WhatsApp Dispatch Section */}
                <div className="p-6 rounded-2xl border-2 border-[#25D366]/20 bg-[#25D366]/5 dark:bg-[#25D366]/10 mb-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                        <MessageCircle className="h-5 w-5 text-[#25D366]" />
                        2. WhatsApp Dispatch Engine
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Send automated salary notifications directly to {totals?.count || 0} employees via WhatsApp.
                      </p>
                    </div>
                    <button
                      onClick={handleWhatsAppDispatch}
                      disabled={isDispatching}
                      className="px-6 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold shadow-md shadow-[#25D366]/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isDispatching ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
                      Dispatch Now
                    </button>
                  </div>
                </div>

                {/* Individual Payslips Review */}
                {payslipsData?.payslips && payslipsData.payslips.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Payslip Directory</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {payslipsData.payslips.map(ps => (
                        <div key={ps.hrPayslipId} className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white truncate">{ps.employeeName}</div>
                            <div className="text-xs text-gray-500">Net: ₹{ps.netSalary.toLocaleString('en-IN')}</div>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedPayslipPreview(ps);
                              generatePdf(ps, `${selectedMonth.getMonth() + 1}/${selectedMonth.getFullYear()}`);
                            }}
                            disabled={isGenerating && selectedPayslipPreview?.hrPayslipId === ps.hrPayslipId}
                            className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand-500 hover:bg-brand-50 transition-colors flex-shrink-0"
                          >
                            {isGenerating && selectedPayslipPreview?.hrPayslipId === ps.hrPayslipId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <DownloadCloud className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4: Success State */}
          {step === 4 && (
             <motion.div 
             key="step4"
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 20 }}
             className="absolute inset-0 p-8 flex flex-col items-center justify-center text-center"
           >
              <div className="h-24 w-24 bg-[#25D366]/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-12 w-12 text-[#25D366]" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Dispatched Successfully</h3>
              <p className="text-lg text-gray-500 max-w-md mx-auto">
                All {totals?.count} employees have received their salary notification via WhatsApp. The payroll batch is now fully closed.
              </p>
           </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden Payslip Document for PDF Generation */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        {selectedPayslipPreview && (
          <PayslipDocument 
            ref={payslipRef}
            payslip={selectedPayslipPreview} 
            hospitalName="1HMS Hospital Group" 
            monthYear={`${selectedMonth.getMonth() + 1}/${selectedMonth.getFullYear()}`} 
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center z-10">
        <div>
          {step > 1 && step < 4 && (
            <button 
              onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
              className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
          )}
        </div>
        
        {step < 3 && (
          <button
            onClick={handleNext}
            disabled={isRunning}
            className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {step === 1 ? 'Run Payroll Engine' : 'Lock & Proceed to Export'}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        )}
        
        {step === 3 && (
          <div className="flex items-center gap-2 text-emerald-600 font-bold px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-5 w-5" />
            Batch Disbursed
          </div>
        )}
      </div>
    </div>
  );
};
