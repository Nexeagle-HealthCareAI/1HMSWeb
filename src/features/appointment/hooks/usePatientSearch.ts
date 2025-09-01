import { useState } from 'react';
import { appointmentApi, PatientSearchRequest, PatientSearchResponse } from '../services/appointmentApi';

interface UsePatientSearchReturn {
  searchPatients: (request: PatientSearchRequest) => Promise<PatientSearchResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const usePatientSearch = (): UsePatientSearchReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPatients = async (request: PatientSearchRequest): Promise<PatientSearchResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await appointmentApi.searchPatients(request);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search patients';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    searchPatients,
    isLoading,
    error,
    clearError
  };
};
