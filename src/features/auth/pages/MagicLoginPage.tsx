import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInvalidateQueries } from '@/hooks/useApi';
import { readMagicLinkToken, signInWithMagicLink } from '@/features/auth/services/magicLinkSession';

// Landing page for the one-tap "Log in to view" link in WhatsApp/email notifications
// (https://<app>/magic-login#t=<single-use token>). It reads the token from the URL fragment,
// removes it from the address bar/history straight away, exchanges it for a session, and forwards
// to the page the notification was about. A dead link ends on a plain "go to login" screen.
const MagicLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateAuth } = useInvalidateQueries();
  const [error, setError] = useState<string | null>(null);

  // Read once, during the first render, so React StrictMode's double-invoked effect (dev only)
  // still sees the token after the fragment has been scrubbed. `started` makes the exchange
  // itself run exactly once -- the token is single-use, so a second attempt would always fail.
  const tokenRef = useRef<string | null | undefined>(undefined);
  if (tokenRef.current === undefined) tokenRef.current = readMagicLinkToken(window.location.hash);
  const started = useRef(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (started.current) return;
    started.current = true;

    const token = tokenRef.current;
    if (!token) {
      setError('This sign-in link is incomplete. Please open the link from your message again, or log in with your mobile number.');
      return;
    }

    signInWithMagicLink(token, queryClient).then(result => {
      if (result.ok) {
        invalidateAuth();
        navigate(result.targetPath || '/appointment-dashboard', { replace: true });
      } else {
        setError(result.message || 'This sign-in link is invalid or has expired. Please log in with your mobile number.');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white/90 dark:bg-zinc-900/90 p-8 text-center shadow-xl">
        {error ? (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Couldn't sign you in</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <Button className="mt-6 w-full" onClick={() => navigate('/login', { replace: true })}>
              Go to login
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" />
            <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Signing you in…</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Taking you to your appointments.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MagicLoginPage;
