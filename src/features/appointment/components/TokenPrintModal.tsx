import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useHospitalApi } from '@/hooks/useApi';
import { formatTokenNumber } from '@/lib/utils';

interface TokenPrintModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tokenData: {
        tokenNumber: string;
        patientName: string;
        patientId: string;
        doctorName: string;
        appointmentDate: string;
        department?: string;
        age?: string | number;
        ageUnit?: string;
        gender?: string;
        referrerName?: string;
        referrerType?: string;
    } | null;
}

export const TokenPrintModal: React.FC<TokenPrintModalProps> = ({
    open,
    onOpenChange,
    tokenData
}) => {
    const componentRef = useRef<HTMLDivElement>(null);
    const getHospitalId = useAuthStore(state => state.getHospitalId);
    const { data: hospitalData } = useHospitalApi.getHospitalById(getHospitalId() || '');

    const hospitalAddress = React.useMemo(() => {
        if (!hospitalData) return undefined;
        return [hospitalData.location, hospitalData.city, hospitalData.state].filter(Boolean).join(', ');
    }, [hospitalData]);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        onAfterPrint: () => onOpenChange(false),
    });

    if (!tokenData) return null;

    // Generate encoded data for URL
    const tokenPayload = {
        tn: tokenData.tokenNumber,
        pn: tokenData.patientName,
        pid: tokenData.patientId,
        dn: tokenData.doctorName,
        d: tokenData.department,
        ad: tokenData.appointmentDate,
        ag: tokenData.age,
        agU: tokenData.ageUnit,
        g: tokenData.gender,
        rn: tokenData.referrerName,
        rt: tokenData.referrerType,
        hn: hospitalData?.name,
        ha: hospitalAddress
    };

    const encodedData = btoa(JSON.stringify(tokenPayload));
    // Use window.location.origin if available, otherwise fallback to root
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = `${baseUrl}/token-view?data=${encodedData}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Print Token</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-md border border-gray-200 overflow-auto max-h-[80vh]">
                    {/* Print Preview Area */}
                    <div className="flex justify-center w-full">
                        <div
                            ref={componentRef}
                            className="bg-white p-2 flex flex-col items-center text-center shadow-sm print:shadow-none print:w-full print:m-0 print:py-0 print:pl-4"
                            style={{
                                width: '80mm', // Standard thermal paper width
                                minHeight: '100px', // Allow content to dictate height
                                fontFamily: 'Arial, Helvetica, sans-serif', // Clean sans-serif for thermal
                                color: 'black',
                            }}
                        >
                            <style type="text/css" media="print">
                                {`
                                    @page {
                                        size: 80mm auto;
                                        margin: 0;
                                    }
                                    body {
                                        margin: 0;
                                        padding: 0;
                                        -webkit-print-color-adjust: exact;
                                    }
                                `}
                            </style>

                            {/* Hospital Header - Clean and premium without black background */}
                            <div className="w-full border-b-2 border-black pb-3 mb-4 text-center">
                                <div className="font-black text-[18px] leading-tight uppercase tracking-widest break-words whitespace-normal text-black">{hospitalData?.name || 'Loading Hospital...'}</div>
                                {hospitalAddress && (
                                    <div className="text-[10px] uppercase tracking-wide leading-tight mt-1 whitespace-normal text-gray-800">{hospitalAddress}</div>
                                )}
                            </div>

                            {/* Token Number Block - Refined sizing */}
                            <div className="w-full border-4 border-black p-3 mb-4 text-center rounded-sm relative mt-2">
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white print:bg-white px-2 text-[10px] font-black uppercase tracking-[0.2em]">Token No.</div>
                                <div className="text-5xl font-black mt-1 leading-none tracking-tighter">{formatTokenNumber(tokenData.tokenNumber)}</div>
                            </div>

                            {/* Patient Details - Clean, structured rows */}
                            <div className="w-full border-t-2 border-b-2 border-black py-3 mb-4 space-y-2 text-left px-1">
                                <div className="flex justify-between items-baseline border-b border-black/20 pb-2">
                                    <span className="font-bold text-[10px] uppercase tracking-wider">Patient</span>
                                    <span className="font-black text-[15px] text-right truncate pl-2">{tokenData.patientName}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b border-black/20 pb-2">
                                    <span className="font-bold text-[10px] uppercase tracking-wider">Patient ID</span>
                                    <span className="font-mono font-bold text-[12px]">{tokenData.patientId}</span>
                                </div>
                                {(tokenData.age != null || tokenData.gender) && (
                                    <div className="flex justify-between items-baseline border-b border-black/20 pb-2">
                                        <span className="font-bold text-[10px] uppercase tracking-wider">Age/Sex</span>
                                        <span className="font-bold text-[12px]">
                                            {[tokenData.age != null ? `${tokenData.age} ${tokenData.ageUnit || 'Y'}` : null, tokenData.gender?.charAt(0)].filter(Boolean).join(' / ')}
                                        </span>
                                    </div>
                                )}
                                {tokenData.referrerName && tokenData.referrerName !== 'Self' && (
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-[10px] uppercase tracking-wider">
                                            {tokenData.referrerType === 'DOCTOR' ? 'Ref. Doctor'
                                             : tokenData.referrerType === 'AGENT' ? 'Ref. Agent'
                                             : 'Ref. By'}
                                        </span>
                                        <span className="font-bold text-[12px] text-right truncate pl-2">{tokenData.referrerName}</span>
                                    </div>
                                )}
                            </div>

                            {/* Doctor & Date - Side by Side */}
                            <div className="w-full grid grid-cols-2 gap-2 text-left mb-5 px-1">
                                <div>
                                    <div className="font-bold text-[9px] uppercase tracking-wider">Date</div>
                                    <div className="font-bold text-[11px] mt-0.5">{format(new Date(tokenData.appointmentDate), 'dd MMM yyyy')}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-[9px] uppercase tracking-wider">Doctor</div>
                                    <div className="font-bold text-[11px] truncate mt-0.5">{tokenData.doctorName}</div>
                                </div>
                            </div>

                            {/* QR Code and Footer */}
                            <div className="flex flex-col items-center w-full">
                                <QRCodeSVG
                                    value={qrUrl}
                                    size={80} // Optimal size for verify scan
                                    level="H"
                                    includeMargin={false}
                                />
                                <div className="text-[9px] uppercase tracking-widest font-black mt-2">Scan to Track</div>
                                <div className="text-[10px] mt-4 font-bold text-center w-full border-t border-black pt-2">
                                    Please wait for your turn.
                                </div>
                                <div className="text-[9px] mt-1 text-center w-full uppercase tracking-wider">
                                    {format(new Date(), 'dd/MM/yyyy HH:mm')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" />
                        Print Token
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
