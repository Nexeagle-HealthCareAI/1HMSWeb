import React, { useState } from 'react';
import { Sparkles, X, PhoneCall, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { recordDemoLoginLead } from '@/features/auth/services/demoLeadApi';

const DEMO_LOGIN_EMAIL = (import.meta.env.VITE_DEMO_LOGIN_EMAIL as string | undefined)?.toLowerCase();
const DISMISS_KEY = 'demo_welcome_banner_dismissed';

// Shown only for the shared "scan a QR, land in a live demo" account (see the Marketing tab in
// CMS) -- a doctor who lands in a real dashboard with zero guidance just clicks around
// aimlessly; naming 2-3 concrete things to look at converts that into a focused first
// impression. Dismissal is session-scoped (sessionStorage), not permanent -- this is a shared
// account many different doctors hit, "first login ever" doesn't make sense here.
export const DemoWelcomeBanner: React.FC = () => {
  const userEmail = useAuthStore((s) => s.user?.email)?.toLowerCase();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!DEMO_LOGIN_EMAIL || userEmail !== DEMO_LOGIN_EMAIL || dismissed) return null;

  const dismiss = () => {
    try { window.sessionStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignore */ }
    setDismissed(true);
  };

  const submitCallbackRequest = () => {
    if (!name.trim() && !mobile.trim()) return;
    recordDemoLoginLead({ patientName: name.trim() || undefined, mobile: mobile.trim() || undefined });
    setSubmitted(true);
  };

  return (
    <div className="relative mb-4 rounded-2xl border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 p-4 md:p-5">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 bg-brand-600 rounded-xl text-white shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Welcome to your 1HMS Flow demo!</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            This is a live, fully working sandbox — nothing you do here affects a real hospital. A few places worth a look:
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-200 mt-2 space-y-1">
            <li>• <strong>Appointments</strong> — the OPD queue and booking flow your front desk uses every day</li>
            <li>• <strong>Billing</strong> — charges, insurance, and the discharge/invoice flow</li>
            <li>• <strong>ABHA / ABDM</strong> — India's national health-record integration, built in</li>
          </ul>

          {!showCallbackForm && !submitted && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-9 rounded-lg font-semibold"
              onClick={() => setShowCallbackForm(true)}
            >
              <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
              Get a callback about your hospital
            </Button>
          )}

          {showCallbackForm && !submitted && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Your name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-lg w-full sm:max-w-[200px]"
              />
              <Input
                placeholder="Mobile number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="h-10 rounded-lg w-full sm:max-w-[200px]"
              />
              <Button size="sm" className="h-10 rounded-lg font-semibold w-full sm:w-auto" onClick={submitCallbackRequest}>
                Submit
              </Button>
            </div>
          )}

          {submitted && (
            <p className="mt-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Thanks — our team will reach out shortly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
