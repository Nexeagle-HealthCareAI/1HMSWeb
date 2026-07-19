import React, { useState } from 'react';
import { Download, X, Share, MoreVertical, Plus } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isAppInstalled, promptInstall, dismissPrompt, platform, hasNativePrompt } =
    usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Do not show if already installed or not installable
  if (isAppInstalled || !isInstallable) return null;

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      // Android / Desktop Chrome — trigger browser's native prompt
      await promptInstall();
    } else {
      // iOS Safari or any browser where the native prompt isn't available
      setShowIOSInstructions(true);
    }
  };

  return (
    <AnimatePresence>
      {/* iOS step-by-step instructions */}
      {showIOSInstructions && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="lg:hidden fixed bottom-20 left-4 right-4 z-[75] pointer-events-auto"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Add to Home Screen</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Follow these steps in your browser
                </p>
              </div>
              <button
                onClick={() => { setShowIOSInstructions(false); dismissPrompt(); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="space-y-3">
              {platform === 'ios' ? (
                <>
                  <Step number={1} icon={<Share className="h-4 w-4 text-blue-500" />}>
                    Tap the <strong>Share</strong> button (
                    <span className="inline-flex items-center gap-0.5 font-mono text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1 rounded text-[11px]">
                      <Share className="h-3 w-3" /> Share
                    </span>
                    ) in Safari's toolbar
                  </Step>
                  <Step number={2} icon={<Plus className="h-4 w-4 text-blue-500" />}>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </Step>
                  <Step number={3} icon={<Download className="h-4 w-4 text-brand-500" />}>
                    Tap <strong>"Add"</strong> — the app icon will appear on your home screen
                  </Step>
                </>
              ) : (
                <>
                  <Step number={1} icon={<MoreVertical className="h-4 w-4 text-gray-500" />}>
                    Tap the <strong>⋮ Menu</strong> (3-dot menu) at the top-right of your browser
                  </Step>
                  <Step number={2} icon={<Plus className="h-4 w-4 text-brand-500" />}>
                    Select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>
                  </Step>
                  <Step number={3} icon={<Download className="h-4 w-4 text-brand-500" />}>
                    Tap <strong>"Install"</strong> to confirm
                  </Step>
                </>
              )}
            </ol>
          </div>
        </motion.div>
      )}

      {/* Main install banner */}
      {!showIOSInstructions && (
        <motion.div
          key="install-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="lg:hidden fixed bottom-20 left-4 right-4 z-[75] pointer-events-auto"
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
                {hasNativePrompt
                  ? 'One tap to install — works offline too'
                  : 'Add to home screen for native experience'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-brand-500/20"
              >
                {hasNativePrompt ? 'Install' : 'How to'}
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
      )}
    </AnimatePresence>
  );
};

// Helper component for numbered steps
const Step: React.FC<{ number: number; icon: React.ReactNode; children: React.ReactNode }> = ({
  number,
  icon,
  children,
}) => (
  <li className="flex items-start gap-3">
    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-bold shrink-0 mt-0.5">
      {number}
    </div>
    <div className="flex items-start gap-1.5 flex-1">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{children}</p>
    </div>
  </li>
);
