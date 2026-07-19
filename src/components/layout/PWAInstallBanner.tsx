import React from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isAppInstalled, promptInstall, dismissPrompt } = usePWAInstall();

  // Do not show if already installed or not installable
  if (isAppInstalled || !isInstallable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="lg:hidden fixed bottom-20 left-4 right-4 z-50 pointer-events-auto"
      >
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
          <div className="bg-brand-100 dark:bg-brand-900/40 p-2.5 rounded-xl shrink-0">
            <Download className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              Install 1HMS App
            </h4>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">
              Get the native experience & offline access
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                void promptInstall();
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors active:scale-95"
            >
              Install
            </button>
            <button
              onClick={dismissPrompt}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
