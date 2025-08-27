import { useInactivity } from '@/components/providers/InactivityProvider';

/**
 * Custom hook to reset the inactivity timer
 * Use this hook in components where you want to reset the inactivity timer
 * after specific user actions (like form submissions, API calls, etc.)
 */
export const useInactivityReset = () => {
  const { resetInactivityTimer } = useInactivity();
  
  return {
    resetInactivityTimer
  };
};
