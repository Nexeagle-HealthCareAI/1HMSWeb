import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = 'android' | 'ios' | 'desktop' | 'unknown';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('unknown');

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isMac = /macintosh|mac os x/.test(ua) && !isIOS;

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else if (isMac || /windows|linux/.test(ua)) setPlatform('desktop');

    // Check if the app is already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    ) {
      setIsAppInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS: the beforeinstallprompt never fires. Show the banner with manual instructions.
    if (isIOS) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Returns true if native prompt was used, false if manual instructions needed.
   */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      return outcome === 'accepted';
    }
    // No native prompt (iOS or prompt not captured) — caller handles manual instructions
    return false;
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, []);

  /** True if the native browser prompt is available (Android/Desktop Chrome) */
  const hasNativePrompt = deferredPrompt !== null;

  return { isInstallable, isAppInstalled, promptInstall, dismissPrompt, platform, hasNativePrompt };
};
