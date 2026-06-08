import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BarChart2, Calendar, Activity, Repeat, AlertCircle, CheckCircle, UserX, Stethoscope, User, MapPin, Phone, Edit3, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { patientAnalysisApi } from '../services/patientAnalysisApi';
import { useAuthStore } from '@/store/authStore';
import { usePatientProfile } from '../hooks/usePatientProfile';
import { PatientProfileModal } from './PatientProfileModal';

interface Patient360AnalysisProps {
    patientId: string;
    onBack: () => void;
}

export const Patient360Analysis: React.FC<Patient360AnalysisProps> = ({ patientId, onBack }) => {
    const { hospitalId } = useAuthStore();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Fetch Analysis Data
    const { data: analysisResponse, isLoading: isAnalysisLoading } = useQuery({
        queryKey: ['patientAnalysis', hospitalId, patientId],
        queryFn: () => patientAnalysisApi.getPatientAnalysis(hospitalId!, patientId),
        enabled: !!hospitalId && !!patientId,
    });
    const analysis = analysisResponse?.patientAnalysis;

    // Fetch Patient Profile Data
    const { patientProfile, isLoading: isProfileLoading } = usePatientProfile(hospitalId!, patientId);

    const StatCard = ({ title, value, subtext, icon: Icon, gradient, textColor = "text-white" }: any) => (
        <Card className={`border-0 shadow-lg ${gradient} relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="w-24 h-24" />
            </div>
            <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Icon className={`w-5 h-5 ${textColor}`} />
                    </div>
                    <span className={`text-sm font-medium ${textColor} opacity-90`}>{title}</span>
                </div>
                <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
                {subtext && <div className={`text-xs mt-1 ${textColor} opacity-80`}>{subtext}</div>}
            </CardContent>
        </Card>
    );

    const isLoading = isAnalysisLoading || isProfileLoading;

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-black/20 space-y-6">

            {/* Unified Header with Patient Details */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-3 md:p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start">

                    {/* Left: Back Button & Patient Info */}
                    <div className="flex items-start gap-4 flex-1">
                        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 mt-1">
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </Button>

                        {/* Patient Details Inline */}
                        {patientProfile ? (
                            <div className="flex flex-col gap-3 w-full">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex flex-wrap items-center gap-2">
                                        {patientProfile.fullName}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setIsProfileModalOpen(true)}
                                            className="h-6 px-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-gray-800 ml-auto sm:ml-0"
                                        >
                                            <Edit3 className="h-3 w-3 mr-1" />
                                            <span className="text-xs">Edit Details</span>
                                        </Button>
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap md:items-center gap-y-3 gap-x-6 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Activity className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5 truncate">
                                            <span className="text-gray-500 text-xs uppercase">Age/Sex:</span>
                                            <span className="font-medium truncate">{patientProfile.ageYears} Y / {patientProfile.sex}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 min-w-0">
                                        <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5 truncate">
                                            <span className="text-gray-500 text-xs uppercase">Mobile:</span>
                                            <span className="font-medium truncate">{patientProfile.mobile}</span>
                                        </div>
                                    </div>

                                    <div className="hidden md:block w-px h-4 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                                    <div className="flex items-center gap-2 min-w-0 sm:col-span-2 md:col-span-1">
                                        <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5 truncate">
                                            <span className="text-gray-500 text-xs uppercase">Address:</span>
                                            <span className="font-medium truncate">{patientProfile.addressLine1}, {patientProfile.city}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-gray-500 text-xs uppercase ml-1">Pin:</span>
                                        <span className="font-medium truncate">{patientProfile.pincode || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-pulse h-16 w-64 bg-gray-100 rounded"></div>
                        )}
                    </div>

                    {/* Right: 360 Analysis Title */}
                    <div className="flex-shrink-0 border-l border-gray-200 dark:border-gray-700 pl-4 md:pl-6 pt-2 md:pt-0 border-t md:border-t-0 md:border-l w-full md:w-auto mt-2 md:mt-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center">
                        <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <BarChart2 className="h-5 w-5 md:h-6 md:w-6 text-brand-600" />
                            360 Analysis
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0 md:mt-1">
                            Patient <span className="font-medium text-gray-700 dark:text-gray-300">#{patientId}</span>
                        </p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
            ) : analysis ? (
                <div className="space-y-4 md:space-y-6 px-3 md:px-4 pb-6 animate-in fade-in duration-500">

                    {/* Patient Tags - Moved to Top with Highlight */}
                    {analysis.patientTags && (
                        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 shadow-sm">
                            <CardContent className="p-3 md:p-4 flex flex-wrap items-center gap-2 md:gap-3">
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Tags:
                                </span>
                                {analysis.patientTags.split(',').map((tag, i) => (
                                    <Badge key={i} className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700 px-3 py-1 hover:bg-amber-200 dark:hover:bg-amber-800">
                                        {tag.trim()}
                                    </Badge>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <StatCard
                            title="Total Visits"
                            value={analysis.totalVisit}
                            icon={Activity}
                            gradient="bg-gradient-to-br from-brand-500 to-brand-600"
                        />
                        <StatCard
                            title="Visit Frequency"
                            value={analysis.visitFrequency}
                            subtext="Visits per year"
                            icon={Repeat}
                            gradient="bg-gradient-to-br from-purple-500 to-fuchsia-600"
                        />
                        <StatCard
                            title="Last Visit"
                            value={new Date(analysis.lastVisitDate).toLocaleDateString()}
                            icon={Calendar}
                            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                        />
                        <StatCard
                            title="Follow-up Status"
                            value={analysis.followUpsDue ? "Due Now" : "Up to Date"}
                            icon={analysis.followUpsDue ? AlertCircle : CheckCircle}
                            gradient={analysis.followUpsDue
                                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                                : "bg-gradient-to-br from-cyan-500 to-brand-600"}
                        />
                    </div>

                    {/* Secondary Metrics & Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

                        {/* Attendance / No Show Status */}
                        <Card className="bg-white dark:bg-gray-900 border-none shadow-md overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-red-500 to-pink-500" />
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <UserX className="w-4 h-4 text-red-500" />
                                        Attendance History
                                    </h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-full ${analysis.noShow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {analysis.noShow ? <UserX className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">
                                            {analysis.noShow ? "History of No-Shows" : "Regular Attendance"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {analysis.noShow ? "Patient has missed appointments" : "Patient attends scheduled visits"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Doctor Consultation Breakdown */}
                        {analysis.doctorConsulted && Object.keys(analysis.doctorConsulted).length > 0 && (
                            <Card className="bg-white dark:bg-gray-900 border-none shadow-md overflow-hidden md:col-span-2">
                                <div className="h-1 bg-gradient-to-r from-brand-500 to-violet-500" />
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                            <Stethoscope className="w-4 h-4 text-brand-500" />
                                            Doctor Consultations
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                        {Object.entries(analysis.doctorConsulted).map(([doctorName, count]) => (
                                            <div key={doctorName} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-brand-50 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                        {doctorName.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={doctorName}>
                                                        {doctorName}
                                                    </span>
                                                </div>
                                                <Badge variant="secondary" className="bg-white dark:bg-gray-900 text-brand-700 dark:text-brand-400 shadow-sm border border-gray-100 dark:border-gray-700">
                                                    {count}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                    No analysis data available.
                </div>
            )}

            {/* Profile Edit Modal */}
            <PatientProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                hospitalId={hospitalId!}
                patientId={patientId}
                patientName={patientProfile?.fullName}
            />
        </div>
    );
};
