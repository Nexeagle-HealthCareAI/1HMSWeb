import React, { useState } from 'react';
import { ShieldAlert, Search } from 'lucide-react';
import { useLicenseAlerts } from '../hrApi';
import { SeverityBadge } from './ShiftBadge';
import type { LicenseAlertDto } from '../types';

export const LicenseAlertsPanel: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const { data: alerts, isLoading } = useLicenseAlerts(hospitalId);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | LicenseAlertDto['severity']>('ALL');
  const [search, setSearch] = useState('');

  const filtered = alerts?.filter(a => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.employeeName.toLowerCase().includes(q) || a.documentName.toLowerCase().includes(q);
    }
    return true;
  });

  const criticalCount = alerts?.filter(a => a.severity === 'CRITICAL').length || 0;
  const highCount = alerts?.filter(a => a.severity === 'HIGH').length || 0;
  const mediumCount = alerts?.filter(a => a.severity === 'MEDIUM').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 p-6 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex flex-col justify-between shadow-xl shadow-red-500/20">
          <div>
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl w-fit mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold mb-1">License Alerts</h2>
            <p className="text-red-100 text-sm">Compliance Watchdog</p>
          </div>
          <div className="mt-8">
            <div className="text-4xl font-black">{alerts?.length || 0}</div>
            <div className="text-sm font-medium text-red-100 uppercase tracking-wider">Documents Expiring</div>
          </div>
        </div>

        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Critical</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{criticalCount}</div>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">High</div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{highCount}</div>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Medium</div>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{mediumCount}</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl w-fit overflow-x-auto">
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  severityFilter === sev
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee or document..."
              className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="p-8 text-center text-sm text-gray-400">Loading license alerts…</div>
          )}
          {!isLoading && (!filtered || filtered.length === 0) && (
            <div className="p-8 text-center text-sm text-gray-400">No expiring licenses in this filter.</div>
          )}
          {!isLoading && filtered && filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Employee</th>
                  <th className="text-left font-semibold px-4 py-3">Designation</th>
                  <th className="text-left font-semibold px-4 py-3">Document</th>
                  <th className="text-left font-semibold px-4 py-3">Expiry</th>
                  <th className="text-right font-semibold px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr
                    key={`${a.hrEmployeeId}-${a.documentName}-${i}`}
                    className="border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{a.employeeName}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.designation}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.documentName}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.expiryDate}</td>
                    <td className="px-4 py-3 text-right">
                      <SeverityBadge severity={a.severity} daysLeft={a.daysLeft} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
