import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// import { mockApi } from '@/services/mockApi';
import { buildInvoiceA4 } from '@/printTemplates/invoiceA4';
import { buildReceiptA4 } from '@/printTemplates/receiptA4';
import { buildBillCumReceiptA4 } from '@/printTemplates/billCumReceiptA4';
import { openPrintHtml } from '@/utils/printUtils';
import {
    Search, Plus, Receipt, Calendar, ArrowRight, User, Settings,
    TrendingUp, AlertCircle, CheckCircle2, IndianRupee, Filter,
    ChevronLeft, ChevronRight, LayoutDashboard, Printer, MoreHorizontal, FileText, Download
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { LedgerEntry, Visit, Patient } from '../types';

import { useToast } from "@/hooks/use-toast";

export const BillingDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'FINAL'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const { toast } = useToast();

    const handlePrintInvoice = async (visitId: string, type: 'invoice' | 'receipt' | 'bill-cum-receipt') => {
        try {
            toast({ title: "Generating Print...", description: "Please wait while we prepare the document." });
            // Placeholder: When backend APIs are ready, fetch the real invoice/receipt data here
            toast({ variant: 'default', title: "Not Supported", description: "Backend print API is not implemented yet. Please hold." });
            console.log(`Print requested for ${type} against visit ${visitId}`);
            /*
            if (type === 'invoice') { ... } 
            else if (type === 'receipt') { ... } 
            else if (type === 'bill-cum-receipt') { ... }
            */
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Print Failed", description: "Could not fetch print data." });
        }
    };


    // --- Analytics & Data Prep ---

    // --- Analytics & Data Prep ---

    // For now, initialize empty. In future, fetch from API.
    const [billingData, setBillingData] = useState<Visit[]>([]);

    // TODO: Fetch real data
    /*
    useEffect(() => {
        // fetchBillingData().then(data => setBillingData(data));
    }, []);
    */

    const filteredRows = useMemo(() => {
        return billingData.filter(row => {
            const matchesSearch =
                row.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.patientIdDisplay.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [billingData, searchTerm, statusFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRows.slice(start, start + itemsPerPage);
    }, [filteredRows, currentPage]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 px-4 sm:px-6 pt-1 pb-4 gap-6 overflow-auto">

            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white/80 backdrop-blur-md border-b border-slate-200 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] px-3 py-3 sm:px-6 sm:py-4 relative overflow-hidden">
                {/* Decorative glowing accent */}
                <div className="absolute -left-10 -top-10 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Left: Title */}
                <div className="flex flex-col gap-1 min-w-0 z-10">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 drop-shadow-sm">
                            <IndianRupee className="h-6 w-6 text-indigo-500 flex-shrink-0" />
                            DASHBOARD
                        </h1>
                        <Button size="sm" className="ml-2 gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] uppercase tracking-widest font-bold border border-cyan-400/50 shadow-[0_0_15px_rgba(8,145,178,0.3)] hover:shadow-[0_0_20px_rgba(8,145,178,0.5)] rounded-full px-4" onClick={() => {
                            navigate('/billing/ledger');
                        }}>
                            <Plus className="h-3.5 w-3.5" /> NEW BILL
                        </Button>
                    </div>
                    <p className="text-sm font-medium text-slate-500 tracking-wide">Administer invoicing, settlements, and financial overview.</p>
                </div>
            </div>

            {/* Main Content Area */}
            <Card className="border border-slate-200 shadow-[0_0_15px_rgba(0,0,0,0.03)] flex flex-col flex-1 overflow-hidden bg-white">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-sm backdrop-blur-sm">
                        {['ALL', 'OPEN', 'FINAL'].map((status) => (
                            <button
                                key={status}
                                onClick={() => { setStatusFilter(status as any); setCurrentPage(1); }}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 ease-out",
                                    statusFilter === status
                                        ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200 scale-[1.02] font-bold"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                )}
                            >
                                {status === 'ALL' ? 'ALL RECORDS' : status === 'OPEN' ? 'OPEN BILLS' : 'FINALIZED'}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64 group">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                placeholder="Search by PTID or Name..."
                                className="pl-9 bg-white border-slate-300 text-sm font-medium focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white/50">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md">
                            <TableRow className="border-none">
                                <TableHead className="w-[200px] text-xs font-semibold text-slate-500 uppercase tracking-widest">PATIENT DETAILS</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">VISIT INFO</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">DATE</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">STATUS</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">TOTAL BILL</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">PAID</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">DUE</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">ACTION</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-48 text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search className="h-8 w-8 opacity-20 text-indigo-500" />
                                            <p className="text-xs tracking-wider uppercase">NO BILLING RECORDS FOUND MATCHING YOUR FILTERS</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRows.map((row) => (
                                    <TableRow key={row.id} className="group hover:bg-indigo-50/50 border-b border-slate-100 transition-colors cursor-pointer" onClick={() => navigate(`/billing/${row.id}`)}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 transition-transform group-hover:scale-110 shadow-sm">
                                                    {row.patientName.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 tracking-tight">{row.patientName}</span>
                                                    <span className="text-[10px] tracking-widest text-slate-500">{row.patientIdDisplay}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-2 py-0.5 rounded w-fit border border-indigo-100 mb-1">{row.type}</span>
                                                <span className="text-[10px] tracking-widest text-slate-500">DR. {row.doctorName || 'UNASSIGNED'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                {format(new Date(row.date), 'dd MMM')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'OPEN' ? 'default' : 'secondary'}
                                                className={cn(
                                                    "text-xs px-2 py-0.5 border font-semibold tracking-wide uppercase rounded shadow-sm",
                                                    row.status === 'OPEN' ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-slate-100 text-slate-600 border-slate-300"
                                                )}>
                                                {row.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-slate-700">
                                            ₹ {row.totalDebit.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right text-emerald-600 text-sm font-bold">
                                            ₹ {row.totalCredit.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {row.balance > 0 ? (
                                                <span className="font-bold text-rose-600 text-sm">₹ {row.balance.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase border border-slate-200 px-2 py-0.5 rounded bg-slate-50">SETTLED</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-semibold border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100/50 hover:text-cyan-800 tracking-wide uppercase shadow-sm" title="Manage Bill" onClick={(e) => { e.stopPropagation(); navigate(`/billing/${row.id}`); }}>
                                                    <ArrowRight className="h-3 w-3 mr-1" /> BILL
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 shadow-sm">
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-xl rounded-xl">
                                                        <DropdownMenuLabel className="text-[9px] tracking-widest text-slate-400 uppercase">PRINT OPTIONS</DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-slate-100" />
                                                        <DropdownMenuItem className="text-xs font-medium text-slate-700 focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(row.id, 'invoice'); }}>
                                                            <FileText className="mr-2 h-3.5 w-3.5 text-indigo-500" /> INVOICE (A4)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs font-medium text-slate-700 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(row.id, 'receipt'); }}>
                                                            <Receipt className="mr-2 h-3.5 w-3.5 text-emerald-500" /> LATEST RECEIPT
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs font-medium text-slate-700 focus:bg-cyan-50 focus:text-cyan-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(row.id, 'bill-cum-receipt'); }}>
                                                            <FileText className="mr-2 h-3.5 w-3.5 text-cyan-500" /> BILL-CUM-RECEIPT
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-slate-100" />
                                                        <DropdownMenuItem className="text-xs font-medium text-slate-700 focus:bg-slate-100 cursor-pointer" onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/print-preview?type=invoice&id=${row.id}`);
                                                        }}>
                                                            <Printer className="mr-2 h-3.5 w-3.5 text-slate-400" /> PRINT PREVIEW...
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500 tracking-wide uppercase">
                    <div>SHOWING {filteredRows.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} TO {Math.min(currentPage * itemsPerPage, filteredRows.length)} OF {filteredRows.length} RECORDS</div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 border-slate-300 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 shadow-sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center justify-center px-3 font-bold bg-white border border-slate-200 rounded shadow-sm">
                            PAGE {currentPage} OF {Math.max(1, totalPages)}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 border-slate-300 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 shadow-sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div >
    );
};
