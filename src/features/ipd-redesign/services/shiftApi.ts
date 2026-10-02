import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

export interface ShiftItem {
    shiftCode: string; // e.g. 'MORNING', '12H-DAY'
    label: string;     // e.g. 'Morning', '12 Hr Day'
    startTime?: string;
    endTime?: string;
    isActive: boolean;
    sortOrder: number;
}

const DEFAULT_SHIFTS: ShiftItem[] = [
    { shiftCode: 'MORNING', label: 'Morning', isActive: true, sortOrder: 10 },
    { shiftCode: 'EVENING', label: 'Evening', isActive: true, sortOrder: 20 },
    { shiftCode: 'NIGHT', label: 'Night', isActive: true, sortOrder: 30 }
];

const getStorageKey = (hospitalId: string) => `easyhms_shifts_${hospitalId}`;

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

// Shifts now live on the server (GET/PUT /nursing-station/shifts) so every device sees the same
// definitions. Older builds kept them in this browser's localStorage; the first admin load after the
// upgrade migrates that list to the server once, then drops the local copy.
interface ShiftsResponse { success?: boolean; shifts?: ShiftItem[]; message?: string }

const readLegacy = (hid: string): ShiftItem[] | null => {
    try {
        const stored = localStorage.getItem(getStorageKey(hid));
        if (!stored) return null;
        const parsed = JSON.parse(stored) as ShiftItem[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
        return null;
    }
};

const clearLegacy = (hid: string) => {
    try { localStorage.removeItem(getStorageKey(hid)); } catch { /* storage unavailable */ }
};

export const shiftApi = {
    getShifts: async (hospitalId?: string): Promise<ShiftItem[]> => {
        const hid = hospitalIdOrThrow(hospitalId);
        let server: ShiftItem[] = [];
        try {
            const res = await ipdApiClient.get<ShiftsResponse>('/nursing-station/shifts', { params: { hospitalId: hid } });
            server = res?.shifts ?? [];
        } catch {
            // Offline / API error: fall back to a legacy local copy, else the defaults.
            return readLegacy(hid) ?? DEFAULT_SHIFTS;
        }
        if (server.length > 0) {
            clearLegacy(hid);
            return server;
        }

        const legacy = readLegacy(hid);
        if (legacy) {
            try {
                await ipdApiClient.put<ShiftsResponse>('/nursing-station/shifts', legacy, { params: { hospitalId: hid } });
                clearLegacy(hid);
            } catch {
                // Not an admin (PUT is admin-only) or offline: keep using the local copy for now.
            }
            return legacy;
        }
        return DEFAULT_SHIFTS;
    },

    saveShifts: async (shifts: ShiftItem[], hospitalId?: string): Promise<void> => {
        const hid = hospitalIdOrThrow(hospitalId);
        await ipdApiClient.put<ShiftsResponse>('/nursing-station/shifts', shifts, { params: { hospitalId: hid } });
        clearLegacy(hid);
    },

    addShift: async (shift: Omit<ShiftItem, 'sortOrder'>, hospitalId?: string): Promise<ShiftItem[]> => {
        const shifts = await shiftApi.getShifts(hospitalId);
        
        // Validate unique code
        if (shifts.some(s => s.shiftCode.toUpperCase() === shift.shiftCode.toUpperCase())) {
            throw new Error(`Shift with code ${shift.shiftCode} already exists`);
        }

        const maxSort = shifts.reduce((max, s) => Math.max(max, s.sortOrder), 0);
        const newShift: ShiftItem = { ...shift, shiftCode: shift.shiftCode.toUpperCase(), sortOrder: maxSort + 10 };
        const updated = [...shifts, newShift];
        
        await shiftApi.saveShifts(updated, hospitalId);
        return updated;
    },

    deleteShift: async (shiftCode: string, hospitalId?: string): Promise<ShiftItem[]> => {
        const shifts = await shiftApi.getShifts(hospitalId);
        const updated = shifts.filter(s => s.shiftCode !== shiftCode);
        await shiftApi.saveShifts(updated, hospitalId);
        return updated;
    }
};
