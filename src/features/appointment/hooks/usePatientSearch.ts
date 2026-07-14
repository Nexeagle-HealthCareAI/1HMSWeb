import { useCallback, useState } from 'react';
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

  // Stable across renders (useCallback, no deps) — callers (e.g. PatientForm's debounced search
  // effect) list this in their own dependency array. Without memoizing it, a brand-new function
  // was created every render, so ANY unrelated re-render of the form while a search was in flight
  // re-ran that effect, tore down the in-flight request's "active" guard, and silently discarded
  // the response when it arrived a moment later — even though the network call itself succeeded.
  const searchPatients = useCallback(async (request: PatientSearchRequest): Promise<PatientSearchResponse> => {
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
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    searchPatients,
    isLoading,
    error,
    clearError
  };
};
