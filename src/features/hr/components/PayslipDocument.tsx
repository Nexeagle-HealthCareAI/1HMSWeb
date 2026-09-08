import React from 'react';
import { HrPayslipDto } from '../types';

interface PayslipDocumentProps {
  payslip: HrPayslipDto;
  hospitalName: string;
  monthYear: string;
}

export const PayslipDocument = React.forwardRef<HTMLDivElement, PayslipDocumentProps>(
  ({ payslip, hospitalName, monthYear }, ref) => {
    
    return (
      <div 
        ref={ref} 
        style={{
          width: '800px', // Fixed width for A4 aspect ratio rendering
          padding: '40px',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'sans-serif',
          margin: '0 auto',
          position: 'relative' // Important for html2canvas
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>{hospitalName}</h1>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0', color: '#374151' }}>Payslip for the month of {monthYear}</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Payslip No: {payslip.payslipNumber}</p>
        </div>

        {/* Employee Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '14px' }}>
          <div>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <span style={{ width: '120px', color: '#6b7280' }}>Employee Name:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{payslip.employeeName}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <span style={{ width: '120px', color: '#6b7280' }}>Employee ID:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{payslip.employeeCode}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <span style={{ width: '120px', color: '#6b7280' }}>Designation:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{payslip.designation}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <span style={{ width: '120px', color: '#6b7280' }}>Department:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{payslip.departmentName}</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <span style={{ width: '120px', color: '#6b7280' }}>PAN Number:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{payslip.panNumber || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <span style={{ width: '120px', color: '#6b7280' }}>UAN Number:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{payslip.uanNumber || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <span style={{ width: '120px', color: '#6b7280' }}>Bank Name:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{payslip.bankName || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <span style={{ width: '120px', color: '#6b7280' }}>Account No:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>{payslip.bankAccountNumber || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', border: '1px solid #e5e7eb' }}>
          <div><span style={{ color: '#6b7280' }}>Total Days:</span> <strong style={{ color: '#111827' }}>{payslip.totalDaysInMonth}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Payable Days:</span> <strong style={{ color: '#111827' }}>{payslip.payableDays}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Overtime Days:</span> <strong style={{ color: '#111827' }}>{payslip.overtimeDays}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Night Shifts:</span> <strong style={{ color: '#111827' }}>{payslip.nightShiftCount}</strong></div>
        </div>

        {/* Salary Details Table */}
        <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
          
          {/* Earnings Column */}
          <div style={{ flex: 1, borderRight: '1px solid #e5e7eb' }}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '12px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', color: '#111827' }}>Earnings</div>
            <div style={{ padding: '16px', fontSize: '14px' }}>
              {payslip.basicEarned > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Basic Salary</span><span>₹{payslip.basicEarned.toLocaleString('en-IN')}</span></div>}
              {payslip.hraEarned > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>HRA</span><span>₹{payslip.hraEarned.toLocaleString('en-IN')}</span></div>}
              {payslip.allowancesEarned > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Other Allowances</span><span>₹{payslip.allowancesEarned.toLocaleString('en-IN')}</span></div>}
              {payslip.overtimeAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Overtime Pay</span><span>₹{payslip.overtimeAmount.toLocaleString('en-IN')}</span></div>}
              {payslip.nightAllowanceAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Night Shift Allowance</span><span>₹{payslip.nightAllowanceAmount.toLocaleString('en-IN')}</span></div>}
              {payslip.incentivesAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Incentives</span><span>₹{payslip.incentivesAmount.toLocaleString('en-IN')}</span></div>}
              
              {/* Consultant specific */}
              {payslip.retainerAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Retainer Fee</span><span>₹{payslip.retainerAmount.toLocaleString('en-IN')}</span></div>}
              {payslip.opdShareAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>OPD Share</span><span>₹{payslip.opdShareAmount.toLocaleString('en-IN')}</span></div>}
              {payslip.ipdVisitAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>IPD Visit Share</span><span>₹{payslip.ipdVisitAmount.toLocaleString('en-IN')}</span></div>}
              {payslip.surgeryShareAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Surgery Share</span><span>₹{payslip.surgeryShareAmount.toLocaleString('en-IN')}</span></div>}
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', color: '#111827' }}>
              <span>Gross Earnings</span>
              <span>₹{payslip.grossEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Deductions Column */}
          <div style={{ flex: 1 }}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '12px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', color: '#111827' }}>Deductions</div>
            <div style={{ padding: '16px', fontSize: '14px' }}>
              {payslip.pfEmployee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>EPF (Employee)</span><span>₹{payslip.pfEmployee.toLocaleString('en-IN')}</span></div>}
              {payslip.esiEmployee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>ESIC (Employee)</span><span>₹{payslip.esiEmployee.toLocaleString('en-IN')}</span></div>}
              {payslip.profTax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Professional Tax</span><span>₹{payslip.profTax.toLocaleString('en-IN')}</span></div>}
              {payslip.tdsDeducted > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>TDS</span><span>₹{payslip.tdsDeducted.toLocaleString('en-IN')}</span></div>}
              {payslip.loanInstallment > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Loan Installment</span><span>₹{payslip.loanInstallment.toLocaleString('en-IN')}</span></div>}
              
              {payslip.totalDeductions === 0 && <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No deductions for this period</div>}
            </div>
            
            {/* We use margin-top auto conceptually by matching heights, but easiest is just putting it at the bottom */}
            <div style={{ marginTop: 'auto', backgroundColor: '#f9fafb', padding: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', color: '#111827' }}>
              <span>Total Deductions</span>
              <span>₹{payslip.totalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </div>

        </div>

        {/* Net Salary Highlight */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '16px 24px', width: '300px' }}>
            <div style={{ fontSize: '14px', color: '#047857', marginBottom: '4px', fontWeight: '600' }}>Net Salary Payable</div>
            <div style={{ fontSize: '28px', color: '#065f46', fontWeight: '900' }}>₹{payslip.netSalary.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px 0' }}>This is a computer-generated document. No signature is required.</p>
          <p style={{ margin: 0 }}>Generated on {new Date().toLocaleDateString('en-IN')} via EasyPayroll Engine</p>
        </div>

      </div>
    );
  }
);
PayslipDocument.displayName = 'PayslipDocument';
