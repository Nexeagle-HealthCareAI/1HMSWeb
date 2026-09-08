import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
  const id = override ?? useAuthStore.getState().getHospitalId();
  if (!id) throw new Error('Hospital ID is not available on the current user session.');
  return id;
};

export interface Molecule {
  moleculeId: string;
  name: string;
}

export interface SaltCompositionComponent {
  moleculeId: string;
  moleculeName: string;
  strengthValue: number;
  strengthUnit: string;
}

export interface SaltComposition {
  saltCompositionId: string;
  displayName: string;
  dosageForm?: string | null;
  components: SaltCompositionComponent[];
}

export interface SubstituteItem {
  inventoryItemId: string;
  itemName: string;
  manufacturer?: string | null;
  defaultRate?: number | null;
  stockAtStore: number;
}

export interface SubstitutesResult {
  hasComposition: boolean;
  alternates: SubstituteItem[];
}

export const pharmacyCatalogApi = {
  getMolecules: (search?: string): Promise<Molecule[]> =>
    ipdApiClient.get<{ molecules?: Molecule[] }>('/pharmacy-catalog/molecules', { params: { search } })
      .then(r => r.molecules ?? []),

  createMolecule: (name: string): Promise<{ success: boolean; message?: string; moleculeId?: string }> =>
    ipdApiClient.post('/pharmacy-catalog/molecules', { name }),

  getSaltCompositions: (search?: string): Promise<SaltComposition[]> =>
    ipdApiClient.get<{ compositions?: SaltComposition[] }>('/pharmacy-catalog/salt-compositions', { params: { search } })
      .then(r => r.compositions ?? []),

  createSaltComposition: (input: { displayName: string; dosageForm?: string; components: { moleculeId: string; strengthValue: number; strengthUnit: string }[] }):
    Promise<{ success: boolean; message?: string; saltCompositionId?: string }> =>
    ipdApiClient.post('/pharmacy-catalog/salt-compositions', input),

  getSubstitutes: (inventoryItemId: string, storeId?: string, hospitalId?: string): Promise<SubstitutesResult> =>
    ipdApiClient.get<SubstitutesResult>('/pharmacy-catalog/substitutes', {
      params: { hospitalId: hospitalIdOrThrow(hospitalId), inventoryItemId, storeId },
    }),
};
