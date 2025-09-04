import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TokenSlip } from './TokenSlip';
import { AppointmentDetail } from '../services/appointmentApi';

interface TokenPrintModalProps {
  appointment: AppointmentDetail;
  isOpen: boolean;
  onClose: () => void;
}

export const TokenPrintModal: React.FC<TokenPrintModalProps> = ({
  appointment,
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState({
    widthMm: 58 as 58 | 80,
    showQR: false,
    showVisitId: false,
    hospitalName: 'NEXEAGLE HOSPITAL',
    counterName: 'COUNTER 1',
    departmentName: 'GENERAL',
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Print Token</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Configuration Options */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Print Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Paper Width */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Paper Width
              </label>
              <select
                value={config.widthMm}
                onChange={(e) => setConfig(prev => ({ ...prev, widthMm: Number(e.target.value) as 58 | 80 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={58}>58mm (Standard)</option>
                <option value={80}>80mm (Wide)</option>
              </select>
            </div>

            {/* Hospital Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Hospital Name
              </label>
              <input
                type="text"
                value={config.hospitalName}
                onChange={(e) => setConfig(prev => ({ ...prev, hospitalName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Hospital Name"
              />
            </div>

            {/* Counter Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Counter Name
              </label>
              <input
                type="text"
                value={config.counterName}
                onChange={(e) => setConfig(prev => ({ ...prev, counterName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Counter Name"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Department
              </label>
              <input
                type="text"
                value={config.departmentName}
                onChange={(e) => setConfig(prev => ({ ...prev, departmentName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Department"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex gap-4 mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.showQR}
                onChange={(e) => setConfig(prev => ({ ...prev, showQR: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Include QR Code</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.showVisitId}
                onChange={(e) => setConfig(prev => ({ ...prev, showVisitId: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show Visit ID</span>
            </label>
          </div>
        </div>

        {/* Token Slip Preview */}
        <div className="p-4">
          <TokenSlip
            appointment={appointment}
            hospitalName={config.hospitalName}
            counterName={config.counterName}
            departmentName={config.departmentName}
            widthMm={config.widthMm}
            showQR={config.showQR}
            showVisitId={config.showVisitId}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
