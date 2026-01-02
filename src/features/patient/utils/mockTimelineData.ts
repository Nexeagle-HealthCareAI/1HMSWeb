
import { TimelineEventData } from '../services/timelineApi';

// Helper to create a default empty event structure
const createDefaultEvent = (overrides: Partial<TimelineEventData>): TimelineEventData => ({
    apptID: 'default-apt',
    appDate: new Date().toISOString(),
    status: 'COMPLETED',
    statusJsonHistory: [],
    vitalsJson: {
        bp: { sys: 0, dia: 0 },
        pulse: 0,
        tempC: 0,
        spo2: 0,
        heightCm: 0,
        weightKg: 0,
        bmi: 0
    },
    chiefComplaint: '',
    history: '',
    comorbidity: '',
    examination: '',
    diagnosis: '',
    orders: { investigations: [], procedures: [] },
    medications: [],
    nonPharmacologicalAdvice: [],
    privateNotes: '',
    certificates: {
        type: '', content: '', issuedDate: '', fromDate: '', toDate: '', fitnessStatus: '', remarks: '', category: ''
    },
    followUp: {
        followUpOn: '', reason: '', patientInstructions: '', referralEnabled: false, referral: { referredTo: { specialty: '', doctorName: '' }, clinicalSummary: '' }
    },
    immunizations: [],
    attachments: [],
    ...overrides
});

export const mockTimelineEvents: TimelineEventData[] = [
    createDefaultEvent({
        apptID: 'evt-001',
        appDate: new Date(2023, 11, 25, 9, 30).toISOString(),
        status: 'COMPLETED',
        chiefComplaint: 'Mild fever and cough',
        history: 'No significant history',
        diagnosis: 'Viral Fever',
        medications: [
            { drugName: 'Paracetamol', dose: '500mg', route: 'Oral', frequency: '1-0-1', duration: '3 days', instructions: 'After food', saltName: 'Paracetamol' }
        ],
        nonPharmacologicalAdvice: [
            { advice: 'Rest and hydration', duration: '3 days', notes: 'Drink plenty of fluids' }
        ]
    }),
    createDefaultEvent({
        apptID: 'evt-002',
        appDate: new Date(2023, 11, 26, 14, 0).toISOString(),
        status: 'investigation_ready', // Mapping status to something relevant if needed, or keeping standard status
        orders: {
            investigations: ['CBC', 'Lipid Panel'],
            procedures: []
        },
        attachments: [
            {
                attachmentId: 'att-001',
                reportType: 'LAB_REPORT',
                fileName: 'Blood Test Results.pdf',
                storageUrl: '#',
                notes: 'CBC and Lipid Panel results',
                uploadedAt: new Date(2023, 11, 26, 15, 0).toISOString(),
                uploadedBy: 'Lab Technician'
            }
        ]
    }),
    createDefaultEvent({
        apptID: 'evt-004',
        appDate: new Date(2024, 0, 10, 11, 0).toISOString(),
        status: 'COMPLETED',
        vitalsJson: {
            bp: { sys: 120, dia: 80 },
            pulse: 72,
            tempC: 37, // ~98.6F
            spo2: 98,
            heightCm: 170,
            weightKg: 70,
            bmi: 24.2
        },
        chiefComplaint: 'Routine Checkup'
    })
];
