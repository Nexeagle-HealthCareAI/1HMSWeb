import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS, API_BASE_URL } from '@/app/api';

export interface TimelineEvent {
    id: string;
    date: Date;
    type: 'appointment' | 'prescription' | 'lab-test' | 'vital-update' | 'consultation';
    title: string;
    description: string;
    doctor: string;
    status: string;
    details?: any;
}

interface ApiTimelineEvent extends Omit<TimelineEvent, 'date'> {
    date: string;
}

export const timelineApi = {
    getEvents: async (patientId: string): Promise<TimelineEvent[]> => {
        const url = `${API_BASE_URL}/${API_ENDPOINTS.TIMELINE.GET_EVENTS(patientId)}`;
        const response = await apiClient.get<ApiTimelineEvent[]>(url);

        // Transform API date strings to Date objects
        return response.map(event => ({
            ...event,
            date: new Date(event.date)
        }));
    }
};
