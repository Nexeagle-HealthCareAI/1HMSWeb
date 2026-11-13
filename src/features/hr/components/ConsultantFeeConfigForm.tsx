import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useConsultantFeeConfig, useUpsertConsultantFeeConfig } from '../hrApi';

interface ConsultantFeeConfigFormProps {
  hrEmployeeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ConsultantFeeConfigForm: React.FC<ConsultantFeeConfigFormProps> = ({ hrEmployeeId, isOpen, onClose }) => {
  const { data: existing } = useConsultantFeeConfig(hrEmployeeId);
  const upsert = useUpsertConsultantFeeConfig();

  const [form, setForm] = useState(() => ({
    effectiveFrom: existing?.effectiveFrom ?? format(new Date(), 'yyyy-MM-dd'),
    monthlyRetainer: existing?.monthlyRetainer ?? 0,
    opdSharePercent: existing?.opdSharePercent ?? 0,
    ipdVisitFee: existing?.ipdVisitFee ?? 0,
    adminSurcharge: existing?.adminSurcharge ?? 0,
  }));

  // Re-sync the form once the existing config loads (first open fetches async).
  React.useEffect(() => {
    if (existing) {
      setForm({
        effectiveFrom: existing.effectiveFrom,
        monthlyRetainer: existing.monthlyRetainer,
        opdSharePercent: existing.opdSharePercent,
        ipdVisitFee: existing.ipdVisitFee,
        adminSurcharge: existing.adminSurcharge,
      });
    }
  }, [existing]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await upsert.mutateAsync({
      hrEmployeeId,
      effectiveFrom: form.effectiveFrom,
      monthlyRetainer: form.monthlyRetainer,
      opdSharePercent: form.opdSharePercent,
      ipdVisitFee: form.ipdVisitFee,
      adminSurcharge: form.adminSurcharge,
      surgeryShareConfigJson: existing?.surgeryShareConfigJson ?? null,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <IndianRupee className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Consultant Fee Config</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Effective From</label>
              <input
                type="date"
                value={form.effectiveFrom}
                onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Monthly Retainer (₹)</label>
              <input
                type="number"
                min={0}
                value={form.monthlyRetainer}
                onChange={e => setForm(f => ({ ...f, monthlyRetainer: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">OPD Share (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.opdSharePercent}
                  onChange={e => setForm(f => ({ ...f, opdSharePercent: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">IPD Visit Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.ipdVisitFee}
                  onChange={e => setForm(f => ({ ...f, ipdVisitFee: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Admin Surcharge (₹/month)</label>
              <input
                type="number"
                min={0}
                value={form.adminSurcharge}
                onChange={e => setForm(f => ({ ...f, adminSurcharge: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>

            {upsert.isError && (
              <div className="text-xs text-rose-600 dark:text-rose-400">{upsert.error?.message || 'Failed to save fee config.'}</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : 'Save Fee Config'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
