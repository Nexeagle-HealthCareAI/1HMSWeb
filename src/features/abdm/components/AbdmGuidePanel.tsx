import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HelpCircle, UserPlus, Link2, Calendar, Hotel, UserCog, Gift } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="space-y-2">
    <h3 className="flex items-center gap-2 font-bold text-sm">
      <span className="h-7 w-7 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
        {icon}
      </span>
      {title}
    </h3>
    <div className="text-sm text-muted-foreground pl-9 space-y-1.5">{children}</div>
  </div>
);

const Steps: React.FC<{ items: string[] }> = ({ items }) => (
  <ol className="list-decimal list-outside pl-4 space-y-1">
    {items.map((s, i) => <li key={i}>{s}</li>)}
  </ol>
);

export const AbdmGuidePanel: React.FC<Props> = ({ open, onOpenChange }) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-5 sm:px-6 pt-5 pb-4 shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/30 flex items-center justify-center shadow-inner">
              <HelpCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold">ABDM / ABHA guide</SheetTitle>
              <SheetDescription className="text-xs">M1 milestone workflows for hospital staff</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          <p className="text-sm text-muted-foreground">
            ABHA (Ayushman Bharat Health Account) is a patient's national digital health ID. This
            module covers what NHA's <span className="font-semibold text-foreground">M1 milestone</span> grades:
            creating a new ABHA via Aadhaar, and identifying a patient who already has one via a
            Mobile/Aadhaar/ABHA-number OTP login.
          </p>

          <Section icon={<UserPlus className="h-3.5 w-3.5" />} title="Create a new ABHA">
            <p>From the ABDM page, click <span className="font-medium text-foreground">Create new ABHA</span>.</p>
            <Steps items={[
              'Enter the patient’s 12-digit Aadhaar number and send the OTP.',
              'Enter the OTP received on the Aadhaar-linked mobile.',
              'If that mobile isn’t suitable, verify a different mobile number with its own OTP.',
              'Pick a suggested ABHA address, or type a custom one, and confirm.',
              'The new ABHA number and address are shown and saved to this hospital’s ABHA accounts list.',
            ]} />
          </Section>

          <Section icon={<Link2 className="h-3.5 w-3.5" />} title="Link an existing ABHA">
            <p>Use this when a patient already has an ABHA from elsewhere. Click <span className="font-medium text-foreground">Link existing ABHA</span>.</p>
            <Steps items={[
              'Choose how to identify them — mobile, Aadhaar, or ABHA number — and enter it.',
              'Enter the OTP sent for that identifier.',
              'Review the fetched profile, then click Save to hospital records.',
            ]} />
          </Section>

          <Section icon={<Calendar className="h-3.5 w-3.5" />} title="Linking ABHA at appointment booking">
            <p>
              In the appointment booking popup, under Personal &amp; Contact Information, there’s an
              <span className="font-medium text-foreground"> ABHA ID</span> field with a link icon button.
              Click it to run the same OTP-verification flow — once verified, the ABHA number is filled
              into the appointment automatically and saved with the patient record.
            </p>
          </Section>

          <Section icon={<Hotel className="h-3.5 w-3.5" />} title="Linking ABHA at IPD admission">
            <p>
              In the Admit Patient sheet, under the Government ID section, the
              <span className="font-medium text-foreground"> ABHA ID</span> field has the same link
              button — verify via OTP and the admission record picks up the ABHA number.
            </p>
          </Section>

          <Section icon={<UserCog className="h-3.5 w-3.5" />} title="Update mobile / email on an existing ABHA">
            <p>On the ABDM page’s accounts table, click <span className="font-medium text-foreground">Edit</span> on any row.</p>
            <Steps items={[
              'Re-verify the holder’s identity with an OTP — ABDM requires this fresh check before any change.',
              'To change the mobile: click Change, enter the new number, verify its OTP.',
              'To change the email: type it and click Save email (no OTP needed for email).',
            ]} />
          </Section>

          <Section icon={<Gift className="h-3.5 w-3.5" />} title="Government scheme benefits (Benefit APIs)">
            <p>
              <span className="font-semibold text-amber-600 dark:text-amber-400">Not available yet.</span>{' '}
              Checking what government scheme benefits (e.g. PM-JAY) an ABHA is entitled to uses ABDM’s
              separate Benefit APIs, which need NHA to approve this hospital as a
              &quot;Benefit Integrator&quot; — a different, additional approval from the standard HIP/HIU
              sandbox credentials already in use here. Once that approval is granted, this section
              will cover how to look up entitlements for a given ABHA.
            </p>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
};
