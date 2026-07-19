import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const location = useLocation();
  const { isInstallable, promptInstall, isIos, isStandalone } = useInstallPrompt();

  const isLoginPage = location.pathname === '/' || location.pathname === '/login';

  useEffect(() => {
    // If the app is installed, never show
    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    if (isInstallable) {
      // Show immediately on login page, delay slightly otherwise
      const delay = isLoginPage ? 100 : 2000;
      const timer = setTimeout(() => setShowPrompt(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShowPrompt(false);
    }
  }, [isInstallable, isStandalone, isLoginPage]);

  const handleInstallClick = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          drag
          dragConstraints={{ left: -150, right: 150, top: -400, bottom: 50 }}
          whileDrag={{ scale: 1.02 }}
          initial={{ y: 50, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: 50, opacity: 0, x: "-50%" }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
          className={`fixed ${isLoginPage ? 'bottom-8' : 'bottom-[85px]'} left-1/2 z-[100] pointer-events-none w-[90%] max-w-[320px] touch-none transition-all duration-500`}
        >
          <div className="relative pointer-events-auto">
            {isIos ? (
              // iOS Fallback Guide (Apple doesn't support the prompt API)
              <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col gap-1.5 ring-1 ring-black/5">
                <p className="text-xs text-white/90 font-medium flex flex-wrap items-center gap-1.5 justify-center text-center leading-relaxed">
                  To install, tap <span className="inline-flex p-1 rounded-md bg-white/10 border border-white/10"><Share className="w-3 h-3 text-white" /></span> 
                  and select <span className="inline-flex p-1 rounded-md bg-white/10 border border-white/10"><PlusSquare className="w-3 h-3 text-white" /></span>
                  <strong className="text-white">Add to Home Screen</strong>
                </p>
              </div>
            ) : (
              // Android / Chrome Native Prompt Trigger
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-between bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-xl p-1.5 pl-3 pr-4 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 active:scale-[0.98] transition-transform cursor-grab active:cursor-grabbing ring-1 ring-black/5 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-teal to-teal-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(20,184,166,0.3)] group-hover:shadow-[0_0_20px_rgba(20,184,166,0.5)] transition-shadow">
                    <Download className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[13px] font-semibold text-white/95 tracking-wide">
                    Add to Homescreen
                  </span>
                </div>
              </button>
            )}
            
            {/* Close Button */}
            <button 
              onClick={handleDismiss}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800/90 backdrop-blur-sm border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 shadow-lg z-10 touch-auto active:scale-90 transition-all cursor-pointer"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
