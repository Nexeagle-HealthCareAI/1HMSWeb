import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar, User, Stethoscope, Building2, Ticket } from 'lucide-react';

interface TokenPayload {
    tn: string; // Token Number
    pn: string; // Patient Name
    pid: string; // Patient ID
    dn: string; // Doctor Name
    d?: string; // Department
    ad: string; // Appointment Date
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
                <div className="mt-8 mb-2">
                    <div className="text-sm font-bold uppercase">Token Number</div>
                    <div className="text-6xl font-black my-1 leading-none">{tokenData.tn}</div>
                </div>

                {/* Details */}
                <div className="w-full text-left space-y-1.5 mb-4 border-t-2 border-dashed border-black pt-3 mt-2 pl-4">
                    <div className="flex justify-between items-baseline">
                        <span className="font-bold text-xs">Date:</span>
                        <span className="text-sm font-mono">{format(new Date(tokenData.ad), 'dd/MM/yyyy')}</span>
                    </div>

                    <div>
                        <span className="font-bold block text-[10px] uppercase text-gray-600">Patient Details</span>
                        <div className="text-sm font-bold truncate">{tokenData.pn}</div>
                        <div className="text-xs font-mono">{tokenData.pid}</div>
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
