import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar, User, Stethoscope, Building2, Ticket } from 'lucide-react';
import { formatTokenNumber } from '@/lib/utils';

interface TokenPayload {
    tn: string; // Token Number
    pn: string; // Patient Name
    pid: string; // Patient ID
    dn: string; // Doctor Name
    d?: string; // Department
    ad: string; // Appointment Date
    ag?: string | number;
    agU?: string;
    g?: string; // Gender
    rn?: string; // Referrer Name
    rt?: string; // Referrer Type (DOCTOR/AGENT/REFERRER)
    hn?: string; // Hospital Name
    ha?: string; // Hospital Address
}



const TokenDetailsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [tokenData, setTokenData] = useState<TokenPayload | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const data = searchParams.get('data');
        if (data) {
            try {
                const decoded = JSON.parse(atob(data));
                setTokenData(decoded);
            } catch (err) {
                console.error('Failed to decode token data', err);
                setError('Invalid token data');
            }
        } else {
            setError('No token data found');
        }
    }, [searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md shadow-lg border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-600 text-center">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-gray-600">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!tokenData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded w-full max-w-md"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">
            <div
                className="bg-white p-2 flex flex-col items-center text-center shadow-lg max-w-[80mm] w-full"
                style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    color: 'black',
                }}
            >
                {/* Token Number */}
                <div className="bg-brand-50 rounded-b-xl border border-brand-100 p-6 text-center shadow-inner relative overflow-hidden">
                    {(tokenData.hn || tokenData.ha) && (
                        <div className="absolute top-0 left-0 right-0 p-3 bg-white/50 border-b border-brand-100 text-center">
                            {tokenData.hn && <div className="font-bold text-sm text-gray-800 break-words leading-tight">{tokenData.hn}</div>}
                            {tokenData.ha && <div className="text-[10px] text-gray-500 mt-0.5 break-words leading-tight">{tokenData.ha}</div>}
                        </div>
                    )}
                    <div className={`text-sm font-bold uppercase text-brand-600 ${tokenData.hn ? 'mt-12' : ''}`}>Token Number</div>
                    <div className="text-6xl font-black my-2 text-brand-900 tracking-tight">{formatTokenNumber(tokenData.tn)}</div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-600 shadow-sm border border-gray-100">
                        <Ticket className="w-3.5 h-3.5" /> Active
                    </div>
                </div>

                {/* Details */}
                <div className="w-full text-left space-y-1.5 mb-4 border-t-2 border-dashed border-black pt-3 mt-2 pl-4">
                    <div className="flex justify-between items-baseline">
                        <span className="font-bold text-xs">Date:</span>
                        <span className="text-sm font-mono">{format(new Date(tokenData.ad), 'dd/MM/yyyy')}</span>
                    </div>

                    {/* Patient */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mt-4">
                        <div className="flex items-center gap-2 mb-3 border-b border-gray-200 pb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Patient Details</span>
                        </div>
                        <div className="font-black text-lg text-gray-900 truncate mb-3">{tokenData.pn}</div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                            <div>
                                <span className="text-gray-500 block text-[10px] uppercase leading-none mb-1">Patient ID</span>
                                <span className="font-mono font-bold text-sm bg-gray-200 px-1.5 py-0.5 rounded text-gray-800">{tokenData.pid}</span>
                            </div>
                            {(tokenData.ag != null || tokenData.g) && (
                                <div className="flex justify-between items-baseline pt-2 border-t border-gray-100 mt-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Age/Sex</span>
                                    <span className="font-bold text-sm text-gray-800">
                                        {[tokenData.ag != null ? `${tokenData.ag} ${tokenData.agU || 'Y'}` : null, tokenData.g?.charAt(0)].filter(Boolean).join(' / ')}
                                    </span>
                                </div>
                            )}
                            {tokenData.rn && tokenData.rn !== 'Self' && (
                                <div className="col-span-2 pt-2 border-t border-gray-100 mt-1">
                                    <span className="text-gray-500 block text-[10px] uppercase leading-none mb-1.5">
                                        {tokenData.rt === 'DOCTOR' ? '🩺 Referred Doctor'
                                         : tokenData.rt === 'AGENT' ? '🤝 Referred Agent'
                                         : '👤 Referred By'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                            tokenData.rt === 'DOCTOR' ? 'bg-blue-50 text-blue-600 border-blue-200'
                                            : tokenData.rt === 'AGENT' ? 'bg-purple-50 text-purple-600 border-purple-200'
                                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        }`}>
                                            {tokenData.rt || 'REFERRER'}
                                        </span>
                                        <span className="font-bold text-sm text-gray-800 truncate">{tokenData.rn}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <span className="font-bold block text-[10px] uppercase text-gray-600">Doctor</span>
                        <div className="text-sm font-bold truncate">{tokenData.dn}</div>
                        {tokenData.d && (
                            <div className="text-xs">{tokenData.d}</div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-[10px] mt-3 font-semibold text-center w-full border-t-2 border-black pt-2">
                    Please wait for your turn.
                </div>
                <div className="text-[11px] mt-1 text-center w-full mb-4">
                    {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </div>
            </div>

            <p className="mt-6 text-xs text-gray-400">Digital Token View</p>
        </div>
    );
};

export default TokenDetailsPage;
