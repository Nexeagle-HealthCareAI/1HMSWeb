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

export const shiftApi = {
    getShifts: async (hospitalId?: string): Promise<ShiftItem[]> => {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 200));
        
        const hid = hospitalIdOrThrow(hospitalId);
        const stored = localStorage.getItem(getStorageKey(hid));
        if (stored) {
            try {
                return JSON.parse(stored) as ShiftItem[];
            } catch (e) {
                console.error('Failed to parse stored shifts', e);
            }
        }
        
        // Return default if nothing stored
        return DEFAULT_SHIFTS;
    },

    saveShifts: async (shifts: ShiftItem[], hospitalId?: string): Promise<void> => {
        await new Promise(r => setTimeout(r, 300));
        const hid = hospitalIdOrThrow(hospitalId);
        localStorage.setItem(getStorageKey(hid), JSON.stringify(shifts));
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
