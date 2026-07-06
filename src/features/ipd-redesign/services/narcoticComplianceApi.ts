import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export interface NarcoticRegisterEntry {
    registerEntryId: string;
    itemName: string;
    batchNumber?: string | null;
    storeName?: string | null;
    formType: '3D' | '3E' | '3H';
    direction: 'IN' | 'OUT';
    qty: number;
    balanceAfter: number;
    patientId?: string | null;
    prescriberRef?: string | null;
    issuedBy?: string | null;
    witnessBy: string;
    recordedAt: string;
}

export interface ColdChainReading {
    logId: string;
    storeId: string;
    storeName?: string | null;
    recordedAt: string;
    tempCelsius: number;
    recordedBy?: string | null;
    breachFlag: boolean;
}

export const narcoticComplianceApi = {
    dispenseNarcotic: (input: {
        inventoryItemId: string; storeId: string; batchId?: string; qty: number; prescriberRef: string;
        patientId?: string; encounterId?: string; witnessBy: string;
    }, hospitalId?: string) =>
        ipdApiClient.post('/inventory/narcotics/dispense', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    getNarcoticRegister: (hospitalId?: string): Promise<NarcoticRegisterEntry[]> =>
        ipdApiClient
            .get<{ entries?: NarcoticRegisterEntry[] }>('/inventory/narcotics/register', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.entries ?? []),

    recordColdChainReading: (storeId: string, tempCelsius: number, hospitalId?: string) =>
        ipdApiClient.post('/inventory/cold-chain/readings', { hospitalId: hospitalIdOrThrow(hospitalId), storeId, tempCelsius }),

    getColdChainReadings: (storeId?: string, hospitalId?: string): Promise<ColdChainReading[]> =>
        ipdApiClient
            .get<{ readings?: ColdChainReading[] }>('/inventory/cold-chain/readings', { params: { hospitalId: hospitalIdOrThrow(hospitalId), storeId } })
            .then(r => r.readings ?? []),
};
