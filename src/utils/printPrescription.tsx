import React from 'react';
import { createRoot } from 'react-dom/client';

// Mock data for patient and prescription
const mockPatientData = {
  id: 'P001',
  name: 'John Smith',
  age: 45,
  gender: 'Male',
  phone: '+1 (555) 123-4567',
  email: 'john.smith@email.com',
  address: '123 Main Street, City, State 12345',
  dateOfBirth: '1978-03-15',
  emergencyContact: 'Jane Smith - +1 (555) 987-6543'
};

const mockVitalsData = {
  bloodPressure: '120/80',
  temperature: '98.6°F',
  heartRate: '72 bpm',
  weight: '75 kg',
  height: '175 cm',
  bmi: '24.5',
  oxygenSaturation: '98%'
};

const mockPrescriptionData = {
  chiefComplaint: 'Chest pain, Shortness of breath, Fatigue',
  history: 'Family history of heart disease, Previous smoking history, Sedentary lifestyle',
  comorbidity: 'Hypertension, Diabetes Type 2, High cholesterol',
  examination: 'Blood pressure elevated, Heart rate regular, Lungs clear, No edema',
  diagnosis: 'Hypertension, Diabetes mellitus type 2, Hyperlipidemia',
  orders: {
    investigations: ['Complete Blood Count', 'Lipid Profile', 'ECG', 'Chest X-Ray'],
    procedures: ['Blood Pressure Monitoring', 'Blood Sugar Testing']
  },
  medications: [
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '30 days' },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '30 days' },
    { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', duration: '30 days' }
  ],
  privateNotes: 'Patient advised to follow up in 2 weeks. Lifestyle modifications recommended.',
  certificates: 'Medical certificate issued for 3 days rest.',
  immunizations: 'Annual flu vaccine recommended.',
  followUp: 'Follow up in 2 weeks for blood pressure monitoring.',
  nonPharmacologicalAdvice: 'Regular exercise, low sodium diet, smoking cessation counseling.',
  attachments: 'ECG report attached.'
};

const mockDoctorData = {
  name: 'Dr. Sarah Johnson',
  degree: 'MBBS, MD (Cardiology)',
  specialization: 'Cardiologist',
  license: 'MD12345',
  phone: '+1 (555) 234-5678',
  email: 'dr.johnson@hospital.com',
  address: 'Medical Center, 456 Health Street, City, State 12345',
  signature: 'Dr. Sarah Johnson'
};

// Print Prescription Component
const PrintPrescription: React.FC<{
  patientData: typeof mockPatientData;
  vitalsData: typeof mockVitalsData;
  prescriptionData: typeof mockPrescriptionData;
  doctorData: typeof mockDoctorData;
  onClose: () => void;
}> = ({ patientData, vitalsData, prescriptionData, doctorData, onClose }) => {
  const handlePrint = () => {
    console.log('Print button clicked');
    
    // Add a small delay to ensure the DOM is ready
    setTimeout(() => {
      // Make sure the print-prescription element is visible
      const printElement = document.querySelector('.print-prescription');
      if (printElement) {
        console.log('Print element found, triggering print');
        
        // Try to trigger print
        try {
          window.print();
        } catch (error) {
          console.error('Print failed:', error);
          
          // Fallback: open in new window
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>Prescription</title>
                  <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    .print-prescription { width: 100%; }
                    ${document.querySelector('style')?.textContent || ''}
                  </style>
                </head>
                <body>
                  ${printElement.outerHTML}
                </body>
              </html>
            `);
            printWindow.document.close();
            printWindow.print();
          }
        }
      } else {
        console.error('Print element not found');
        alert('Print element not found. Please try again.');
      }
    }, 100);
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-prescription, 
          .print-prescription * {
            visibility: visible !important;
          }
          
          .print-prescription {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            z-index: 9999 !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
            color: black !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          @page {
            margin: 0 !important;
            size: A4;
            width: 210mm;
            height: 297mm;
          }
        }
        
        .print-prescription {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          font-family: 'Arial', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          position: relative;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          border: 1px solid #ddd;
        }
        
        .prescription-header {
          height: 60mm;
          border-bottom: 2px solid #000;
          padding: 10mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .prescription-content {
          min-height: 200mm;
          padding: 8mm;
          flex: 1;
          font-size: 11px;
          line-height: 1.3;
        }
        
        .prescription-footer {
          height: 40mm;
          border-top: 2px solid #000;
          padding: 10mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        
        .doctor-info {
          text-align: left;
        }
        
        .prescription-title {
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 13px;
          margin: 6px 0 3px 0;
          text-decoration: underline;
          color: #000;
          background: #f5f5f5;
          padding: 2px 4px;
          border-left: 3px solid #000;
        }
        
        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin: 6px 0;
        }
        
        .vital-item {
          border: 1px solid #000;
          padding: 3px;
          text-align: center;
          font-size: 10px;
          background: #f9f9f9;
        }
        
        .medication-table {
          width: 100%;
          border-collapse: collapse;
          margin: 6px 0;
          font-size: 10px;
        }
        
        .medication-table th,
        .medication-table td {
          border: 1px solid #000;
          padding: 3px;
          text-align: left;
          vertical-align: top;
        }
        
        .medication-table th {
          background-color: #e0e0e0;
          font-weight: bold;
          font-size: 11px;
        }
        
        .orders-list {
          margin: 4px 0;
          font-size: 11px;
        }
        
        .orders-list ul {
          margin: 0;
          padding-left: 15px;
        }
        
        .orders-list li {
          margin: 2px 0;
        }
        
        .signature-section {
          margin-top: 15px;
          text-align: right;
          font-size: 11px;
        }
        
        .watermark {
          position: absolute;
          bottom: 3mm;
          right: 3mm;
          font-size: 9px;
          color: #999;
          opacity: 0.7;
          font-style: italic;
        }
        
        .patient-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 4px 0;
          padding: 6px;
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .patient-info-grid p {
          margin: 2px 0;
          font-size: 11px;
        }
      `}</style>

      {/* Popup Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          {/* Popup Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Prescription Preview</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
              >
                Print
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Prescription Content */}
          <div className="overflow-auto max-h-[calc(90vh-80px)]">
            <div className="print-prescription">
              {/* Header */}
              <div className="prescription-header">
                <div className="doctor-info">
                  <h1 className="text-2xl font-bold mb-2">{doctorData.name}</h1>
                  <p className="text-sm mb-1">{doctorData.degree}</p>
                  <p className="text-sm mb-1">{doctorData.specialization}</p>
                  <p className="text-sm mb-1">License: {doctorData.license}</p>
                  <p className="text-sm mb-1">Phone: {doctorData.phone}</p>
                  <p className="text-sm mb-1">Email: {doctorData.email}</p>
                  <p className="text-sm">{doctorData.address}</p>
                </div>
                <div className="prescription-title">
                  <h2 className="text-2xl font-bold text-center">PRESCRIPTION</h2>
                  <p className="text-sm text-center mt-2">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Content */}
              <div className="prescription-content">
                {/* Patient Information */}
                <div className="section-title">PATIENT INFORMATION</div>
                <div className="patient-info-grid">
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Patient ID:</strong> {patientData.id}</p>
                    <p className="text-sm"><strong>Name:</strong> {patientData.name}</p>
                    <p className="text-sm"><strong>Age:</strong> {patientData.age} years</p>
                    <p className="text-sm"><strong>Gender:</strong> {patientData.gender}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Phone:</strong> {patientData.phone}</p>
                    <p className="text-sm"><strong>Email:</strong> {patientData.email}</p>
                    <p className="text-sm"><strong>Address:</strong> {patientData.address}</p>
                    <p className="text-sm"><strong>Emergency Contact:</strong> {patientData.emergencyContact}</p>
                  </div>
                </div>

                {/* Vitals */}
                <div className="section-title">VITAL SIGNS</div>
                <div className="vitals-grid">
                  <div className="vital-item">
                    <div><strong>BP:</strong> {vitalsData.bloodPressure}</div>
                  </div>
                  <div className="vital-item">
                    <div><strong>Temp:</strong> {vitalsData.temperature}</div>
                  </div>
                  <div className="vital-item">
                    <div><strong>HR:</strong> {vitalsData.heartRate}</div>
                  </div>
                  <div className="vital-item">
                    <div><strong>Weight:</strong> {vitalsData.weight}</div>
                  </div>
                  <div className="vital-item">
                    <div><strong>Height:</strong> {vitalsData.height}</div>
                  </div>
                  <div className="vital-item">
                    <div><strong>BMI:</strong> {vitalsData.bmi}</div>
                  </div>
                  <div className="vital-item">
                    <div><strong>SpO2:</strong> {vitalsData.oxygenSaturation}</div>
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="section-title">CHIEF COMPLAINT</div>
                <p className="mb-4">{prescriptionData.chiefComplaint}</p>

                {/* History */}
                <div className="section-title">HISTORY</div>
                <p className="mb-4">{prescriptionData.history}</p>

                {/* Comorbidity */}
                <div className="section-title">COMORBIDITY</div>
                <p className="mb-4">{prescriptionData.comorbidity}</p>

                {/* Examination */}
                <div className="section-title">EXAMINATION</div>
                <p className="mb-4">{prescriptionData.examination}</p>

                {/* Diagnosis */}
                <div className="section-title">DIAGNOSIS</div>
                <p className="mb-4">{prescriptionData.diagnosis}</p>

                {/* Orders */}
                <div className="section-title">ORDERS</div>
                <div className="orders-list">
                  <p><strong>Investigations:</strong></p>
                  <ul>
                    {prescriptionData.orders.investigations.map((investigation, index) => (
                      <li key={index}>{investigation}</li>
                    ))}
                  </ul>
                  <p><strong>Procedures:</strong></p>
                  <ul>
                    {prescriptionData.orders.procedures.map((procedure, index) => (
                      <li key={index}>{procedure}</li>
                    ))}
                  </ul>
                </div>

                {/* Medications */}
                <div className="section-title">MEDICATIONS</div>
                <table className="medication-table">
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptionData.medications.map((med, index) => (
                      <tr key={index}>
                        <td>{med.name}</td>
                        <td>{med.dosage}</td>
                        <td>{med.frequency}</td>
                        <td>{med.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Additional Information */}
                {prescriptionData.privateNotes && (
                  <>
                    <div className="section-title">PRIVATE NOTES</div>
                    <p className="mb-4">{prescriptionData.privateNotes}</p>
                  </>
                )}

                {prescriptionData.certificates && (
                  <>
                    <div className="section-title">CERTIFICATES & NOTES</div>
                    <p className="mb-4">{prescriptionData.certificates}</p>
                  </>
                )}

                {prescriptionData.immunizations && (
                  <>
                    <div className="section-title">IMMUNIZATIONS</div>
                    <p className="mb-4">{prescriptionData.immunizations}</p>
                  </>
                )}

                {prescriptionData.followUp && (
                  <>
                    <div className="section-title">FOLLOW-UP & REFERRAL</div>
                    <p className="mb-4">{prescriptionData.followUp}</p>
                  </>
                )}

                {prescriptionData.nonPharmacologicalAdvice && (
                  <>
                    <div className="section-title">NON-PHARMACOLOGICAL ADVICE</div>
                    <p className="mb-4">{prescriptionData.nonPharmacologicalAdvice}</p>
                  </>
                )}

                {prescriptionData.attachments && (
                  <>
                    <div className="section-title">ATTACHMENTS</div>
                    <p className="mb-4">{prescriptionData.attachments}</p>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="prescription-footer">
                <div className="signature-section">
                  <p className="mb-2">Doctor's Signature:</p>
                  <div className="border-b border-black w-48 mb-2"></div>
                  <p className="text-sm">{doctorData.signature}</p>
                  <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="watermark">
                  Powered by NexEagle
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Generic Print Method
export const printPrescription = (
  patientData?: Partial<typeof mockPatientData>,
  vitalsData?: Partial<typeof mockVitalsData>,
  prescriptionData?: Partial<typeof mockPrescriptionData>,
  doctorData?: Partial<typeof mockDoctorData>
) => {
  // Merge with mock data
  const finalPatientData = { ...mockPatientData, ...patientData };
  const finalVitalsData = { ...mockVitalsData, ...vitalsData };
  const finalPrescriptionData = { ...mockPrescriptionData, ...prescriptionData };
  const finalDoctorData = { ...mockDoctorData, ...doctorData };

  // Create container for the popup
  const container = document.createElement('div');
  container.id = 'prescription-print-container';
  document.body.appendChild(container);

  const root = createRoot(container);

  const handleClose = () => {
    root.unmount();
    document.body.removeChild(container);
  };

  // Render the print component
  root.render(
    <PrintPrescription
      patientData={finalPatientData}
      vitalsData={finalVitalsData}
      prescriptionData={finalPrescriptionData}
      doctorData={finalDoctorData}
      onClose={handleClose}
    />
  );
};

// Export types for use in other components
export type PatientData = typeof mockPatientData;
export type VitalsData = typeof mockVitalsData;
export type PrescriptionData = typeof mockPrescriptionData;
export type DoctorData = typeof mockDoctorData;
