import React, { useState } from 'react';

/**
 * DEV-ONLY mobile-review gallery for the IPD + Billing screens.
 *
 * Each screen is embedded in an <iframe> sized to a phone width. An iframe has its own viewport, so
 * the responsive (sm:/md:/lg:) breakpoints inside render the true MOBILE layout even though this
 * page is opened on a desktop browser. Every embedded route is a dummy-data preview harness.
 * Routed at /ipd-mobile-review only under import.meta.env.DEV (see AppRoutes).
 */

const IPD_SCREENS: { title: string; path: string; note: string }[] = [
    { title: 'Dashboard (Home)', path: '/ipd-preview', note: 'Admissions list, KPIs, filters, sticky Admit' },
    { title: 'Bed Board', path: '/bedboard-preview', note: 'Census, legend, responsive bed grid' },
    { title: 'KPI Dashboard', path: '/kpi-preview', note: 'Stat tiles, occupancy & ALOS charts' },
    { title: 'Admit Patient', path: '/admit-preview', note: '4-step wizard, opens directly' },
    { title: 'Consultant Ledger', path: '/ledger-preview', note: 'Tap a doctor to drill into the ledger' },
    { title: 'Referred Admissions', path: '/referrals-preview', note: 'Filters, referral cards, comments' },
];

const BILLING_SCREENS: { title: string; path: string; note: string }[] = [
    { title: 'Billing (Revenue/Expense/Incentive/Approvals)', path: '/billing-preview', note: 'Tap the tabs inside the phone to switch sections' },
];

const DEVICES = {
    'iPhone (390×844)': { w: 390, h: 844 },
    'small (360×780)': { w: 360, h: 780 },
    'large (430×860)': { w: 430, h: 860 },
} as const;

const IpdMobileReview: React.FC = () => {
    const [deviceKey, setDeviceKey] = useState<keyof typeof DEVICES>('iPhone (390×844)');
    const [nonce, setNonce] = useState(0);
    const device = DEVICES[deviceKey];

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <div className="max-w-[1600px] mx-auto px-6 py-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">IPD &amp; Billing — Mobile Review</h1>
                        <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                            Every screen below is rendered at a real phone width with dummy data — this is exactly how it
                            looks on a mobile device. Scroll and tap inside a phone to explore (the Admit Patient wizard
                            and the Billing tabs are both fully interactive).
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <select value={deviceKey} onChange={e => setDeviceKey(e.target.value as keyof typeof DEVICES)}
                            className="h-10 rounded-xl bg-slate-800 border border-slate-700 text-sm font-semibold px-3 text-white">
                            {Object.keys(DEVICES).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <button onClick={() => setNonce(n => n + 1)}
                            className="h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-sm font-bold transition-colors">
                            Reload all
                        </button>
                    </div>
                </div>

                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">IPD</h2>
                <div className="flex flex-wrap gap-8 justify-center sm:justify-start mb-10">
                    {IPD_SCREENS.map(s => (
                        <PhoneCard key={s.path} screen={s} device={device} deviceKey={deviceKey} nonce={nonce} />
                    ))}
                </div>

                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Billing</h2>
                <div className="flex flex-wrap gap-8 justify-center sm:justify-start">
                    {BILLING_SCREENS.map(s => (
                        <PhoneCard key={s.path} screen={s} device={device} deviceKey={deviceKey} nonce={nonce} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const PhoneCard: React.FC<{
    screen: { title: string; path: string; note: string };
    device: { w: number; h: number };
    deviceKey: string;
    nonce: number;
}> = ({ screen: s, device, deviceKey, nonce }) => (
    <div className="flex flex-col items-center gap-3">
        <div className="text-center max-w-[280px]">
            <p className="font-bold text-sm">{s.title}</p>
            <p className="text-[11px] text-slate-400">{s.note}</p>
        </div>
        {/* Phone bezel */}
        <div className="rounded-[2.5rem] bg-slate-950 p-2.5 shadow-2xl ring-1 ring-slate-700/70">
            <iframe
                key={`${s.path}-${deviceKey}-${nonce}`}
                src={s.path}
                title={s.title}
                width={device.w}
                height={device.h}
                className="rounded-[2rem] bg-white block"
                style={{ border: 0 }}
            />
        </div>
        <a href={s.path} target="_blank" rel="noreferrer"
            className="text-[11px] font-semibold text-brand-300 hover:text-brand-200 underline underline-offset-2">
            Open full page ↗
        </a>
    </div>
);

export default IpdMobileReview;
