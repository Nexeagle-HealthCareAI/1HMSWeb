import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
      // Set 15-minute inactivity timeout
      inactivityTimeoutRef.current = setTimeout(() => {
        setIsInactivityDialogOpen(true);
        startCountdown();
      }, 15 * 60 * 1000); // 15 minutes
    }
  };

  // Start countdown timer
  const startCountdown = () => {
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto logout when countdown reaches 0
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
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
      'wheel'
    ];

    const handleUserActivity = () => {
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

  return (
    <InactivityContext.Provider value={contextValue}>
      {children}
      
      {/* Inactivity Warning Dialog */}
      <Dialog open={isInactivityDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                     <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-red-600">
               <AlertCircle className="h-5 w-5" />
               {t('inactivity.title')}
             </DialogTitle>
           </DialogHeader>
           
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
                 className="flex-1 bg-green-600 hover:bg-green-700"
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
        </DialogContent>
      </Dialog>
    </InactivityContext.Provider>
  );
};
