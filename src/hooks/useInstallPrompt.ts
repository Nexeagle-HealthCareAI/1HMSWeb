import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global variable to hold the prompt event so multiple components can share it
let globalDeferredPrompt: BeforeInstallPromptEvent | null = typeof window !== "undefined" ? (window as any).deferredPrompt : null;
let listeners: Array<(prompt: BeforeInstallPromptEvent | null) => void> = [];

const setGlobalPrompt = (prompt: BeforeInstallPromptEvent | null) => {
  globalDeferredPrompt = prompt;
  listeners.forEach(listener => listener(prompt));
};

if (typeof window !== "undefined") {
  (window as any).onDeferredPromptReady = (e: BeforeInstallPromptEvent) => {
    setGlobalPrompt(e);
  };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setGlobalPrompt(e as BeforeInstallPromptEvent);
  });
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true to prevent flash

  useEffect(() => {
    const handleUpdate = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };
    
    listeners.push(handleUpdate);
    setDeferredPrompt(globalDeferredPrompt);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(userAgent));
    
    const standalone = window.matchMedia("(display-mode: standalone)").matches || 
                       (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    return () => {
      listeners = listeners.filter(l => l !== handleUpdate);
    };
  }, []);

  const promptInstall = async () => {
    if (isIos) {
      toast({
        title: "Install on iOS",
        description: "Tap the Share button and select 'Add to Home Screen'.",
      });
      return false;
    }

    if (!deferredPrompt) {
      toast({
        title: "PWA Installation Details",
        description: "To install this app:\n1. On Chrome/Edge (Desktop): Click the 'Install' icon in your browser's address bar (right side).\n2. On Safari (macOS): Click 'File' > 'Add to Dock' in the menu bar.\n3. On Mobile: Tap your browser's menu (three dots / share icon) and select 'Add to Home Screen'.",
        duration: 8000,
      });
      return false;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setGlobalPrompt(null);
    }
    return outcome === "accepted";
  };

  const isInstallable = !isStandalone;

  return { promptInstall, isInstallable, isIos, isStandalone };
}
