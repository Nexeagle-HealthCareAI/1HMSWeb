import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock } from 'lucide-react';

interface InactivityContextType {
  resetInactivityTimer: () => void;
  isInactivityDialogOpen: boolean;
}

const InactivityContext = createContext<InactivityContextType | undefined>(undefined);

export const useInactivity = () => {
  const context = useContext(InactivityContext);
  if (!context) {
    throw new Error('useInactivity must be used within an InactivityProvider');
  }
  return context;
};

interface InactivityProviderProps {
  children: React.ReactNode;
}

export const InactivityProvider: React.FC<InactivityProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuthStore();
  const [isInactivityDialogOpen, setIsInactivityDialogOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    // Clear existing timeouts
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Reset dialog state
    setIsInactivityDialogOpen(false);
    setTimeRemaining(120);

    // Only set up timers if user is authenticated
    if (isAuthenticated) {
      // Set inactivity timeout (reduced to 30 seconds for testing, change back to 15 minutes in production)
      const timeoutDuration = process.env.NODE_ENV === 'development' ? 30 * 1000 : 15 * 60 * 1000;
     
      
      inactivityTimeoutRef.current = setTimeout(() => {
        console.log('Inactivity timeout triggered - showing dialog');
        setIsInactivityDialogOpen(true);
        startCountdown();
      }, timeoutDuration);
    }
  };

  // Start countdown timer
  const startCountdown = () => {
    console.log('Starting countdown timer...');
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        console.log(`Countdown: ${prev} seconds remaining`);
        if (prev <= 1) {
          // Auto logout when countdown reaches 0
          console.log('Countdown finished - auto logout');
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle user choosing to stay connected
  const handleStayConnected = () => {
    resetInactivityTimer();
  };

  // Handle logout
  const handleLogout = () => {
    // Clear all timeouts
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Reset state
    setIsInactivityDialogOpen(false);
    setTimeRemaining(120);

    // Perform logout
    logout();
  };

  // Set up event listeners for user activity
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const events = [
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
      'wheel'
    ];

    const handleUserActivity = () => {
      console.log('User activity detected - resetting timer');
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Start initial timer
    resetInactivityTimer();

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });

      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isAuthenticated]);

  // Prevent escape key from closing inactivity dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInactivityDialogOpen && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isInactivityDialogOpen) {
      document.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isInactivityDialogOpen]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const contextValue: InactivityContextType = {
    resetInactivityTimer,
    isInactivityDialogOpen
  };

  // Debug function to test inactivity dialog (remove in production)
  const testInactivityDialog = () => {
    console.log('Testing inactivity dialog...');
    setIsInactivityDialogOpen(true);
    setTimeRemaining(120);
    startCountdown();
  };

  // Add test button in development mode
  if (process.env.NODE_ENV === 'development') {
    // Add test button to window for debugging
    (window as any).testInactivityDialog = testInactivityDialog;
    console.log('Inactivity test function available: window.testInactivityDialog()');
  }

  return (
    <InactivityContext.Provider value={contextValue}>
      {children}
      
      {/* Inactivity Warning Dialog - Rendered via Portal */}
      {isInactivityDialogOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          onClick={(e) => e.preventDefault()}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">{t('inactivity.title')}</h2>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-600 mb-2">
                  {t('inactivity.message')}
                </p>
                
                <div className="flex items-center justify-center gap-2 text-orange-600 font-semibold">
                  <Clock className="h-4 w-4" />
                  <span>{t('inactivity.timeRemaining', { time: formatTimeRemaining(timeRemaining) })}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleStayConnected}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {t('inactivity.stayConnected')}
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="flex-1"
                >
                  {t('inactivity.logoutNow')}
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                {t('inactivity.autoLogoutMessage')}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </InactivityContext.Provider>
  );
};
