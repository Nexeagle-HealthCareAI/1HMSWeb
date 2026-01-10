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
        <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-indigo-600">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-gray-800 text-xl font-bold uppercase tracking-wider">Appointment Token</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">

                    <div className="text-center bg-indigo-50 py-6 rounded-xl border border-indigo-100">
                        <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-1">Your Token Number</p>
                        <h1 className="text-6xl font-black text-indigo-700 tabular-nums">{tokenData.tn}</h1>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                            <div className="bg-blue-100 p-2 rounded-full mr-3">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Patient</p>
                                <p className="font-medium text-gray-900 truncate">{tokenData.pn}</p>
                                <p className="text-xs text-gray-400 font-mono">{tokenData.pid}</p>
                            </div>
                        </div>

                        <div className="flex items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                            <div className="bg-green-100 p-2 rounded-full mr-3">
                                <Stethoscope className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Doctor</p>
                                <p className="font-medium text-gray-900 truncate">{tokenData.dn}</p>
                            </div>
                        </div>

                        {tokenData.d && (
                            <div className="flex items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="bg-purple-100 p-2 rounded-full mr-3">
                                    <Building2 className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Department</p>
                                    <p className="font-medium text-gray-900 truncate">{tokenData.d}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                            <div className="bg-orange-100 p-2 rounded-full mr-3">
                                <Calendar className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Date</p>
                                <p className="font-medium text-gray-900">
                                    {format(new Date(tokenData.ad), 'EEEE, MMMM do, yyyy')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center pt-4 border-t border-dashed border-gray-200">
                        <p className="text-sm text-gray-500 italic">Please wait for your turn.</p>
                        <p className="text-xs text-gray-400 mt-2">Thank you for choosing us.</p>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};

export default TokenDetailsPage;
