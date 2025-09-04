import React, { useRef } from 'react';
import { format } from 'date-fns';
import { printElement, receiptCss } from '@/utils/printUtils';

interface TokenSlipProps {
  appointment: {
    appointmentId: string;
    patientFullName: string;
    patientId: string;
    doctorName?: string;
    token?: {
      tokenNumber: number;
    };
    startAt: string;
    endAt: string;
  };
  hospitalName?: string;
  counterName?: string;
  departmentName?: string;
  widthMm?: 58 | 80;
  showQR?: boolean;
  showVisitId?: boolean;
}

export const TokenSlip: React.FC<TokenSlipProps> = ({
  appointment,
  hospitalName = 'HOSPITAL NAME',
  counterName = 'COUNTER 1',
  departmentName = 'GENERAL',
  widthMm = 58,
  showQR = false,
  showVisitId = false,
}) => {
  const slipRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    console.log('Print button clicked');
    if (slipRef.current) {
      console.log('Slip element found, attempting to print');
      try {
        printElement(slipRef.current, receiptCss(widthMm));
        console.log('Print function called successfully');
      } catch (error) {
        console.error('Print failed:', error);
        // Fallback to basic print
        window.print();
      }
    } else {
      console.error('Slip ref not found');
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return format(new Date(timeString), 'HH:mm');
    } catch {
      return 'N/A';
    }
  };

  const getCurrentTimeIST = () => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // UTC + 5:30
    return format(istTime, 'dd/MM/yyyy HH:mm:ss');
  };

  return (
    <div className="max-w-sm mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Preview */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Token Slip Preview</h3>
        <p className="text-sm text-gray-600 mb-4">
          This is how your token will look when printed. Click "Print Token" to print.
        </p>
        <button
          onClick={handlePrint}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Print Token
        </button>
      </div>

      {/* Token Slip Content */}
      <div className="p-4">
        <div
          ref={slipRef}
          className="receipt bg-white border border-gray-300 rounded overflow-hidden"
          style={{
            width: `${Math.round((widthMm * 203) / 25.4)}px`,
            maxWidth: '100%',
            margin: '0 auto',
          }}
        >
          {/* Hospital Name */}
          <div className="hospital-name">
            {hospitalName}
          </div>

          {/* Counter Info */}
          <div className="counter-info">
            {counterName} • {departmentName}
          </div>

          {/* Token Number */}
          <div className="token-number">
            TOKEN #{appointment.token?.tokenNumber || 'N/A'}
          </div>

          {/* Department */}
          <div className="section">
            <div className="section-label">Department</div>
            <div className="section-value">{departmentName}</div>
          </div>

          {/* Doctor */}
          <div className="section">
            <div className="section-label">Doctor</div>
            <div className="section-value">{appointment.doctorName || 'Not Assigned'}</div>
          </div>

          {/* Patient Info */}
          <div className="section">
            <div className="section-label">Patient</div>
            <div className="section-value">{appointment.patientFullName}</div>
          </div>

          {/* Patient ID */}
          <div className="section">
            <div className="section-label">Patient ID</div>
            <div className="section-value">{appointment.patientId}</div>
          </div>

          {/* Appointment Time */}
          <div className="section">
            <div className="section-label">Appointment Time</div>
            <div className="section-value">
              {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
            </div>
          </div>

          {/* Divider */}
          <div className="divider"></div>

          {/* QR Code placeholder (if enabled) */}
          {showQR && (
            <div className="qr-code">
              <div className="text-xs text-gray-500">[QR Code - Install qrcode package to enable]</div>
            </div>
          )}

          {/* Visit ID (if enabled) */}
          {showVisitId && (
            <div className="visit-id">
              Visit ID: {appointment.appointmentId}
            </div>
          )}

          {/* Timestamp */}
          <div className="timestamp">
            Issued at: {getCurrentTimeIST()} IST
          </div>
        </div>
      </div>
    </div>
  );
};
