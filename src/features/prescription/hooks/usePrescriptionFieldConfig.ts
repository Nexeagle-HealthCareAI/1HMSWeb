import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { prescriptionFieldConfigApi } from '../services/prescriptionFieldConfigApi';
import { toast } from '@/hooks/use-toast';

// Types
export interface FieldConfig {
  id: string;
  label: string;
  enabled: boolean;
}

export interface PrescriptionFieldPreference {
  preferenceId?: string;
  hospitalId?: string;
  doctorId: string;
  vitals: boolean;
  chiefComplaint: boolean;
  history: boolean;
  comorbidity: boolean;
  examination: boolean;
  diagnosis: boolean;
  investigations: boolean;
  procedures: boolean;
  medications: boolean;
  privateNotes: boolean;
  certificatesAndNotes: boolean;
  immunizations: boolean;
  followUpAndReferral: boolean;
  nonPharmacologicalAdvice: boolean;
  attachments: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
  rowVersion?: string;
}

export interface PrescriptionFieldPreferenceResponse {
  success: boolean;
  message: string;
  preference: PrescriptionFieldPreference | null;
}

export interface UpdatePrescriptionFieldPreferenceRequest {
  vitals: boolean;
  chiefComplaint: boolean;
  history: boolean;
  comorbidity: boolean;
  examination: boolean;
  diagnosis: boolean;
  investigations: boolean;
  procedures: boolean;
  medications: boolean;
  privateNotes: boolean;
  certificatesAndNotes: boolean;
  immunizations: boolean;
  followUpAndReferral: boolean;
  nonPharmacologicalAdvice: boolean;
  attachments: boolean;
}

export const usePrescriptionFieldConfig = () => {
  const { getDoctorId, hospitalId: storedHospitalId, getHospitalId } = useAuthStore();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<FieldConfig[]>([]);

  // Get doctor ID from auth store
  const doctorId = getDoctorId() || '';
  const hospitalId = storedHospitalId || getHospitalId?.() || '';

  // Create fields from API preferences
  const updateFieldsFromPreferences = useCallback((preferences: PrescriptionFieldPreference) => {   
    const fieldDefinitions = [
      { id: 'vitals', label: 'Vitals' },
      { id: 'chiefComplaint', label: 'Chief Complaint' },
      { id: 'history', label: 'History' },
      { id: 'comorbidity', label: 'Comorbidity' },
      { id: 'examination', label: 'Examination' },
      { id: 'diagnosis', label: 'Diagnosis' },
      { id: 'orders', label: 'Orders' }, // Maps to investigations + procedures
      { id: 'medications', label: 'Medications' },
      { id: 'nonPharmacologicalAdvice', label: 'Non-pharmacological Advice' },
      { id: 'privateNotes', label: 'Private Notes' },
      { id: 'certificates', label: 'Certificates & Notes' }, // Maps to certificatesAndNotes
      { id: 'immunizations', label: 'Immunizations' },
      { id: 'followUp', label: 'Follow-up & Referral' }, // Maps to followUpAndReferral
      { id: 'attachments', label: 'Attachments' }
    ];

    const fieldsFromApi = fieldDefinitions.map(field => {
      let apiFieldName = field.id;
      
      // Map component field IDs to API field names
      if (field.id === 'certificates') {
        apiFieldName = 'certificatesAndNotes';
      } else if (field.id === 'followUp') {
        apiFieldName = 'followUpAndReferral';
      } else if (field.id === 'orders') {
        // For orders, we need to check both investigations and procedures
        // If either is enabled, show the orders field
        const investigationsEnabled = preferences.investigations;
        const proceduresEnabled = preferences.procedures;
        return {
          ...field,
          enabled: investigationsEnabled || proceduresEnabled
        };
      }
      
      const enabled = preferences[apiFieldName as keyof PrescriptionFieldPreference];
      
      return {
        ...field,
        enabled: enabled !== undefined ? Boolean(enabled) : false
      };
    });    
    
    setFields(fieldsFromApi);
  }, []);

  // Query to get field preferences
  const {
    data: preferencesData,
    isLoading: isLoadingPreferences,
    error: preferencesError,
    refetch: refetchPreferences
  } = useQuery({
    queryKey: ['prescriptionFieldPreferences', doctorId, hospitalId],
    queryFn: async () => {      
      try {
        const result = await prescriptionFieldConfigApi.getFieldPreferences(doctorId, hospitalId);     
        return result;
      } catch (error) {       
        return {
          success: false,
          message: 'Failed to fetch preferences',
          preference: null
        };
      }
    },
    enabled: !!doctorId && doctorId.length > 0 && !!hospitalId && hospitalId.length > 0,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update fields when preferences data changes
  useEffect(() => {
    if (preferencesData?.success && preferencesData.preference) {
      updateFieldsFromPreferences(preferencesData?.preference);
    }
  }, [preferencesData, updateFieldsFromPreferences]);

  // Update field configuration
  const updateFieldConfig = (fieldId: string, enabled: boolean) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, enabled } : field
    ));
  };

  // Mutation for updating preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: UpdatePrescriptionFieldPreferenceRequest) => {
      if (!doctorId || !hospitalId) {
        throw new Error('Missing identifiers for updating field preferences');
      }
      return await prescriptionFieldConfigApi.updateFieldPreferences(doctorId, hospitalId, data);
    },
    onSuccess: (response) => {
      if (response.success) {
        // Show success popup
        toast({
          title: "Success",
          description: "Field preferences updated successfully!",
          variant: "default",
        });
        // Refetch data to get updated preferences
        refetchPreferences();
      }
    },
    onError: (error) => {
      console.error('Error updating field preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update field preferences. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Save field configuration
  const saveFieldConfiguration = async () => {
    const updateData: UpdatePrescriptionFieldPreferenceRequest = {
      vitals: fields.find(f => f.id === 'vitals')?.enabled || false,
      chiefComplaint: fields.find(f => f.id === 'chiefComplaint')?.enabled || false,
      history: fields.find(f => f.id === 'history')?.enabled || false,
      comorbidity: fields.find(f => f.id === 'comorbidity')?.enabled || false,
      examination: fields.find(f => f.id === 'examination')?.enabled || false,
      diagnosis: fields.find(f => f.id === 'diagnosis')?.enabled || false,
      investigations: fields.find(f => f.id === 'orders')?.enabled || false,
      procedures: fields.find(f => f.id === 'orders')?.enabled || false,
      medications: fields.find(f => f.id === 'medications')?.enabled || false,
      privateNotes: fields.find(f => f.id === 'privateNotes')?.enabled || false,
      certificatesAndNotes: fields.find(f => f.id === 'certificates')?.enabled || false,
      immunizations: fields.find(f => f.id === 'immunizations')?.enabled || false,
      followUpAndReferral: fields.find(f => f.id === 'followUp')?.enabled || false,
      nonPharmacologicalAdvice: fields.find(f => f.id === 'nonPharmacologicalAdvice')?.enabled || false,
      attachments: fields.find(f => f.id === 'attachments')?.enabled || false,
    };

    updatePreferencesMutation.mutate(updateData);
  };

  return {
    // State
    fields,
    isLoadingPreferences,
    preferencesError,
    
    // Actions
    updateFieldConfig,
    saveFieldConfiguration,
    isSaving: updatePreferencesMutation.isPending
  };
};
