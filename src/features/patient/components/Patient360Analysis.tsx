import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { PatientAnalytics } from './PatientAnalytics';
import { PatientSimulator } from './PatientSimulator';
import { mockTimelineEvents } from '../utils/mockTimelineData';

interface Patient360AnalysisProps {
    patientId: string;
    onBack: () => void;
}

export const Patient360Analysis: React.FC<Patient360AnalysisProps> = ({ patientId, onBack }) => {
    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-black/20 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <BarChart2 className="h-6 w-6 text-blue-600" />
                        360 Analysis
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Deep dive analysis for patient <span className="font-medium text-gray-700 dark:text-gray-300">#{patientId}</span>
                    </p>
                </div>

                {/* Content Grid */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Column: Analytics (Scrollable) */}
                    <div className="flex-1 overflow-y-auto p-6 pr-2">
                        <PatientAnalytics timelineEvents={mockTimelineEvents} />
                    </div>
                    {/* Right Column: 3D Patient Simulator (Fixed) */}
                    <div className="w-1/2 h-full p-4 shrink-0 bg-gray-50 dark:bg-black/20">
                        <Card className="w-full h-full overflow-hidden shadow-lg border-gray-200 dark:border-gray-800 relative bg-white dark:bg-gray-900">
                            <PatientSimulator />
                        </Card>
                    </div>
                </div>
            </div>


        </div>
    );
};
