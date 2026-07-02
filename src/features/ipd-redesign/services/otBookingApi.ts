import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

export interface OperationTheatre {
    theatreId: string;
    theatreCode: string;
    theatreName: string;
    status: 'AVAILABLE' | 'IN_USE' | 'CLEANING' | 'UNAVAILABLE';
    isActive: boolean;
}

export interface OTBookingItem {
    otBookingId: string;
    surgeryCaseId: string;
    theatreId: string;
    theatreCode?: string | null;
    theatreName?: string | null;
    procedureName?: string | null;
    patientName?: string | null;
    scheduledStart: string;
    scheduledEnd: string;
    statusCode: string;
}

export const otBookingApi = {
    getTheatres: (hospitalId?: string): Promise<OperationTheatre[]> =>
        ipdApiClient
            .get<{ theatres?: OperationTheatre[] }>('/ot-booking/theatres', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.theatres ?? []),

    createTheatre: async (theatreCode: string, theatreName: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/ot-booking/theatre', { hospitalId: hospitalIdOrThrow(hospitalId), theatreCode, theatreName });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not create the theatre.'));
        }
    },

    getSchedule: (fromDate: string, toDate: string, hospitalId?: string): Promise<OTBookingItem[]> =>
        ipdApiClient
            .get<{ bookings?: OTBookingItem[] }>('/ot-booking/schedule', { params: { hospitalId: hospitalIdOrThrow(hospitalId), fromDate, toDate } })
            .then(r => r.bookings ?? []),

    book: async (surgeryCaseId: string, theatreId: string, scheduledStart: string, scheduledEnd: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/ot-booking/book', { hospitalId: hospitalIdOrThrow(hospitalId), surgeryCaseId, theatreId, scheduledStart, scheduledEnd });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not create the booking.'));
        }
    },

    reschedule: async (otBookingId: string, theatreId: string, scheduledStart: string, scheduledEnd: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/ot-booking/reschedule', { hospitalId: hospitalIdOrThrow(hospitalId), otBookingId, theatreId, scheduledStart, scheduledEnd });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not reschedule the booking.'));
        }
    },

    cancel: async (otBookingId: string, reason?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/ot-booking/cancel', { hospitalId: hospitalIdOrThrow(hospitalId), otBookingId, reason });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not cancel the booking.'));
        }
    },
};
