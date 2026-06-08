import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  prescriptionFieldLayoutApi,
  mergeFieldsWithDefaults,
  type PrescriptionFieldConfigItem,
} from '../services/prescriptionFieldLayoutApi';

/**
 * Loads a doctor's personalized prescription field layout (global per doctor), merged over the
 * built-in defaults. Read-only consumers (pad, print) use `fields`; the editor uses `saveLayout`.
 */
export const usePrescriptionFieldLayout = (overrideDoctorId?: string) => {
  const { getDoctorId } = useAuthStore();
  const doctorId = overrideDoctorId || getDoctorId() || '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['prescriptionFieldLayout', doctorId],
    queryFn: () => prescriptionFieldLayoutApi.getFieldLayout(doctorId),
    enabled: !!doctorId,
    staleTime: 5 * 60 * 1000,
  });

  // Always resolved against defaults so consumers get a complete, ordered list.
  const fields = useMemo(() => mergeFieldsWithDefaults(query.data?.fields), [query.data]);

  // True once the doctor has explicitly saved a layout. Consumers use this to avoid overriding
  // legacy section preferences before the doctor has opted into the new layout.
  const hasSavedLayout = (query.data?.fields?.length ?? 0) > 0;

  const saveMutation = useMutation({
    mutationFn: (next: PrescriptionFieldConfigItem[]) => prescriptionFieldLayoutApi.updateFieldLayout(doctorId, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptionFieldLayout', doctorId] });
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
