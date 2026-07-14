import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
    dischargeFieldLayoutApi,
    mergeFieldsWithDefaults,
    type DischargeFieldConfigItem,
} from '../services/dischargeFieldLayoutApi';

/**
 * Loads a doctor's personalized discharge-summary field layout, scoped to the current hospital
 * (resolved internally, same as dischargeSettingsApi's letterhead lookup) and merged over the
 * built-in defaults. Read-only consumers (the workspace form, print) use `fields`; the editor uses
 * `saveLayout`. Unlike usePrescriptionFieldLayout.ts (still doctor-global), a customization saved
 * at one hospital no longer applies at another.
 */
export const useDischargeFieldLayout = (overrideDoctorId?: string) => {
    const { getDoctorId, getHospitalId } = useAuthStore();
    const doctorId = overrideDoctorId || getDoctorId() || '';
    const hospitalId = getHospitalId() || '';
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['dischargeFieldLayout', doctorId, hospitalId],
        queryFn: () => dischargeFieldLayoutApi.getFieldLayout(doctorId, hospitalId),
        enabled: !!doctorId && !!hospitalId,
        staleTime: 5 * 60 * 1000,
    });

    // Always resolved against defaults so consumers get a complete, ordered list.
    const fields = useMemo(() => mergeFieldsWithDefaults(query.data?.fields), [query.data]);

    // True once the doctor has explicitly saved a layout. Consumers use this to avoid overriding
    // the "everything always shows" legacy behavior before the doctor has opted into a custom layout.
    const hasSavedLayout = (query.data?.fields?.length ?? 0) > 0;

    const saveMutation = useMutation({
        mutationFn: (next: DischargeFieldConfigItem[]) => dischargeFieldLayoutApi.updateFieldLayout(doctorId, hospitalId, next),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dischargeFieldLayout', doctorId, hospitalId] });
        },
    });

    return {
        fields,
        hasSavedLayout,
        doctorId,
        isLoading: query.isLoading,
        refetch: query.refetch,
        saveLayout: saveMutation.mutateAsync,
        isSaving: saveMutation.isPending,
    };
};
