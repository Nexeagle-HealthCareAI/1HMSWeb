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

export type BloodComponent = 'WHOLE' | 'PRBC' | 'FFP' | 'PLATELET' | 'CRYO';
export type BloodGroup = 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'O_POS' | 'O_NEG' | 'AB_POS' | 'AB_NEG';
export type BloodBagStatus = 'AVAILABLE' | 'RESERVED' | 'TRANSFUSED' | 'DISCARDED';
export type CrossmatchResult = 'COMPATIBLE' | 'INCOMPATIBLE' | 'NOT_DONE';
export type TransfusionReaction = 'NONE' | 'MILD' | 'SEVERE' | 'ANAPHYLAXIS';

export interface BloodBag {
    bloodBagId: string;
    bagNumber: string;
    component: BloodComponent;
    bloodGroup: BloodGroup;
    volumeMl: number;
    expiresAt: string;
    storageLocation?: string | null;
    status: BloodBagStatus;
    reservedForPatientId?: string | null;
    crossmatchResult?: CrossmatchResult | null;
}

export interface AdmissionBloodBag {
    bloodBagId: string;
    bagNumber: string;
    component: BloodComponent;
    bloodGroup: BloodGroup;
    status: BloodBagStatus;
    crossmatchResult?: CrossmatchResult | null;
    reservedAt?: string | null;
}

export interface TransfusionEventRecord {
    transfusionEventId: string;
    bloodBagId: string;
    bagNumber?: string | null;
    component?: string | null;
    startedAt: string;
    endedAt?: string | null;
    volumeGivenMl: number;
    reaction: TransfusionReaction;
    reactionNotes?: string | null;
    administeredBy: string;
    witnessName: string;
    chargeEventId?: string | null;
}

export interface ReceiveBloodBagInput {
    bagNumber: string;
    component: BloodComponent;
    bloodGroup: BloodGroup;
    volumeMl: number;
    donorRef?: string;
    collectedAt: string;
    expiresAt: string;
    storageLocation?: string;
    chargeId?: string;
    unitRate?: number;
}

export interface RecordTransfusionInput {
    bloodBagId: string;
    admissionId: string;
    startedAt: string;
    endedAt?: string;
    volumeGivenMl: number;
    vitalsBefore?: string;
    vitalsAfter?: string;
    reaction: TransfusionReaction;
    reactionNotes?: string;
    witnessName: string;
    notes?: string;
    chargeId?: string;
    rate?: number;
}

export const bloodBankApi = {
    getPool: (params: { component?: BloodComponent; bloodGroup?: BloodGroup }, hospitalId?: string): Promise<BloodBag[]> =>
        ipdApiClient
            .get<{ bags?: BloodBag[] }>('/blood-bank/pool', { params: { hospitalId: hospitalIdOrThrow(hospitalId), ...params } })
            .then(r => r.bags ?? []),

    getHistory: (admissionId: string, hospitalId?: string): Promise<{ reservedBags: AdmissionBloodBag[]; transfusions: TransfusionEventRecord[] }> =>
        ipdApiClient
            .get<{ reservedBags?: AdmissionBloodBag[]; transfusions?: TransfusionEventRecord[] }>(`/blood-bank/admission/${admissionId}/history`, {
                params: { hospitalId: hospitalIdOrThrow(hospitalId) },
            })
            .then(r => ({ reservedBags: r.reservedBags ?? [], transfusions: r.transfusions ?? [] })),

    receiveBag: async (input: ReceiveBloodBagInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/blood-bank/bag', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not receive the blood bag.'));
        }
    },

    reserveBag: async (bloodBagId: string, admissionId: string, crossmatchResult: CrossmatchResult, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/blood-bank/bag/reserve', {
                hospitalId: hospitalIdOrThrow(hospitalId), bloodBagId, admissionId, crossmatchResult,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not reserve the blood bag.'));
        }
    },

    discardBag: async (bloodBagId: string, discardReason: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/blood-bank/bag/discard', { hospitalId: hospitalIdOrThrow(hospitalId), bloodBagId, discardReason });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not discard the blood bag.'));
        }
    },

    transfuse: async (input: RecordTransfusionInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/blood-bank/transfuse', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the transfusion.'));
        }
    },
};
