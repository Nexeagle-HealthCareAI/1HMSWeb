export interface StatusTransitionStep {
    status: 'VITALS_REQUIRED' | 'READY' | 'UNDER_CONSULT' | 'LAB_REQUIRED' | 'AWAITING_RECONSULT' | 'COMPLETED' | 'CANCELLED';
    label: string;
    timestamp?: string;
    isCompleted: boolean;
    isCurrent: boolean;
}

export interface MockAppointment {
    appointmentId: string;
    patientId: string;
    patientName: string;
    contact: string;
    doctorName: string;
    currentStatus: StatusTransitionStep['status'];
    statusTransition: StatusTransitionStep[];
}

export const mockCurrentAppointments: MockAppointment[] = [
    {
        appointmentId: 'APT-001',
        patientId: 'PT-1001',
        patientName: 'John Doe',
        contact: '9876543210',
        doctorName: 'Dr. Sarah Wilson',
        currentStatus: 'VITALS_REQUIRED',
        statusTransition: [
            {
                status: 'VITALS_REQUIRED',
                label: 'Vitals Required',
                timestamp: '2024-01-01T09:00:00Z',
                isCompleted: false,
                isCurrent: true
            },
            {
                status: 'READY',
                label: 'Ready for Consult',
                isCompleted: false,
                isCurrent: false
            },
            {
                status: 'UNDER_CONSULT',
                label: 'Under Consultation',
                isCompleted: false,
                isCurrent: false
            }
        ]
    },
    {
        appointmentId: 'APT-002',
        patientId: 'PT-1002',
        patientName: 'Jane Smith',
        contact: '8765432109',
        doctorName: 'Dr. Michael Chen',
        currentStatus: 'READY',
        statusTransition: [
            {
                status: 'VITALS_REQUIRED',
                label: 'Vitals Required',
                timestamp: '2024-01-01T09:15:00Z',
                isCompleted: true,
                isCurrent: false
            },
            {
                status: 'READY',
                label: 'Ready for Consult',
                timestamp: '2024-01-01T09:20:00Z',
                isCompleted: false,
                isCurrent: true
            },
            {
                status: 'UNDER_CONSULT',
                label: 'Under Consultation',
                isCompleted: false,
                isCurrent: false
            }
        ]
    },
    {
        appointmentId: 'APT-003',
        patientId: 'PT-1003',
        patientName: 'Alice Johnson',
        contact: '7654321098',
        doctorName: 'Dr. Emily Brooks',
        currentStatus: 'UNDER_CONSULT',
        statusTransition: [
            {
                status: 'VITALS_REQUIRED',
                label: 'Vitals Required',
                timestamp: '2024-01-01T09:30:00Z',
                isCompleted: true,
                isCurrent: false
            },
            {
                status: 'READY',
                label: 'Ready for Consult',
                timestamp: '2024-01-01T09:35:00Z',
                isCompleted: true,
                isCurrent: false
            },
            {
                status: 'UNDER_CONSULT',
                label: 'Under Consultation',
                timestamp: '2024-01-01T09:40:00Z',
                isCompleted: false,
                isCurrent: true
            }
        ]
    },
    {
        appointmentId: 'APT-004',
        patientId: 'PT-1004',
        patientName: 'Bob Williams',
        contact: '6543210987',
        doctorName: 'Dr. Sarah Wilson',
        currentStatus: 'LAB_REQUIRED',
        statusTransition: [
            {
                status: 'VITALS_REQUIRED',
                label: 'Vitals Required',
                timestamp: '2024-01-01T10:00:00Z',
                isCompleted: true,
                isCurrent: false
            },
            {
                status: 'READY',
                label: 'Ready for Consult',
                timestamp: '2024-01-01T10:05:00Z',
                isCompleted: true,
                isCurrent: false
            },
            {
                status: 'UNDER_CONSULT',
                label: 'Under Consultation',
                timestamp: '2024-01-01T10:15:00Z',
                isCompleted: true,
                isCurrent: false
            },
            {
                status: 'LAB_REQUIRED',
                label: 'Lab Required',
                timestamp: '2024-01-01T10:30:00Z',
                isCompleted: false,
                isCurrent: true
            }
        ]
    }
];
