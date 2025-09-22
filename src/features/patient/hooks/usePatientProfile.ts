import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patientProfileApi, PatientProfileData, UpdatePatientProfileData } from '../services/patientProfileApi';
import { useToast } from '@/hooks/use-toast';

export const usePatientProfile = (hospitalId: string, patientId: string) => {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for getting patient profile
  const {
    data: patientProfile,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['patient-profile', hospitalId, patientId],
    queryFn: () => patientProfileApi.getPatientProfile(hospitalId, patientId),
    enabled: !!hospitalId && !!patientId,
    retry: 1,
  });

  // Mutation for updating patient profile
  const updateMutation = useMutation({
    mutationFn: (data: UpdatePatientProfileData) => 
      patientProfileApi.updatePatientProfile(hospitalId, patientId, data),
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: response.message || "Patient profile updated successfully",
        variant: "default",
      });
      
      // Invalidate and refetch patient profile data
      queryClient.invalidateQueries({ 
        queryKey: ['patient-profile', hospitalId, patientId] 
      });
      
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update patient profile",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = (data: UpdatePatientProfileData) => {
    updateMutation.mutate(data);
  };

  return {
    patientProfile,
    isLoading,
    error,
    isEditing,
    isUpdating: updateMutation.isPending,
    handleEdit,
    handleCancel,
    handleSave,
    refetch,
  };
};
