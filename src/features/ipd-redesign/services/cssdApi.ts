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

export type InstrumentSetStatus =
    | 'AVAILABLE' | 'ISSUED' | 'IN_USE' | 'RETURNED_SOILED' | 'WASHING' | 'PACKED'
    | 'STERILIZING' | 'STERILE' | 'QUARANTINED' | 'RETIRED';

export type InstrumentSetMovementType =
    | 'ISSUE_TO_OT' | 'RETURN' | 'SEND_TO_WASH' | 'PACK' | 'QUARANTINE' | 'DISCARD' | 'RECEIVE_STERILE';

export interface InstrumentSet {
    instrumentSetId: string;
    setCode: string;
    setName: string;
    category?: string | null;
    currentStatus: InstrumentSetStatus;
    currentLocation?: string | null;
    isActive: boolean;
}

export interface SterilizationCycle {
    sterilizationCycleId: string;
    cycleNumber: string;
    autoclaveLabel?: string | null;
    cycleType: 'STEAM' | 'ETO' | 'PLASMA';
    startedAt: string;
    endedAt?: string | null;
    biologicalIndicatorResult: 'PASS' | 'FAIL' | 'PENDING';
    chemicalIndicatorResult?: string | null;
    operatorName: string;
    setCodes: string[];
}

export const cssdApi = {
    getSets: (status?: string, hospitalId?: string): Promise<InstrumentSet[]> =>
        ipdApiClient
            .get<{ sets?: InstrumentSet[] }>('/cssd/sets', { params: { hospitalId: hospitalIdOrThrow(hospitalId), status } })
            .then(r => r.sets ?? []),

    createSet: async (input: { setCode: string; setName: string; category?: string; itemComposition?: string; currentLocation?: string }, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/cssd/set', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not create the instrument set.'));
        }
    },

    recordMovement: async (
        instrumentSetId: string, movementType: InstrumentSetMovementType,
        opts: { surgeryCaseId?: string; location?: string; notes?: string } = {}, hospitalId?: string,
    ) => {
        try {
            return await ipdApiClient.post('/cssd/set/movement', { hospitalId: hospitalIdOrThrow(hospitalId), instrumentSetId, movementType, ...opts });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the movement.'));
        }
    },

    getCycleHistory: (take = 50, hospitalId?: string): Promise<SterilizationCycle[]> =>
        ipdApiClient
            .get<{ cycles?: SterilizationCycle[] }>('/cssd/sterilization-cycle/history', { params: { hospitalId: hospitalIdOrThrow(hospitalId), take } })
            .then(r => r.cycles ?? []),

    recordCycle: async (input: {
        cycleNumber: string; autoclaveLabel?: string; cycleType: 'STEAM' | 'ETO' | 'PLASMA';
        startedAt: string; endedAt?: string; biologicalIndicatorResult: 'PASS' | 'FAIL' | 'PENDING';
        chemicalIndicatorResult?: string; notes?: string; instrumentSetIds: string[];
    }, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/cssd/sterilization-cycle', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the sterilization cycle.'));
        }
    },
};
