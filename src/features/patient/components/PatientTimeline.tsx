import React from 'react';
import { 
  Calendar,
  Clock,
  Stethoscope,
  Pill,
  Microscope
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'appointment' | 'prescription' | 'lab-test' | 'vital-update' | 'consultation';
  title: string;
  description: string;
  doctor: string;
  status: string;
  icon: React.ComponentType<any>;
  color: string;
  details?: any;
}

interface PatientTimelineProps {
  timelineEvents: TimelineEvent[];
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
  timelineEvents
}) => {
  const getTimelineEventIcon = (event: TimelineEvent) => {
    const IconComponent = event.icon;
    return <IconComponent className={`h-5 w-5 ${event.color}`} />;
  };

  const getTimelineEventStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Patient Timeline</h2>
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline Events */}
        <div className="space-y-8">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start gap-6">
              {/* Timeline Dot */}
              <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-white border-2 border-gray-200 rounded-full shadow-sm">
                {getTimelineEventIcon(event)}
              </div>

              {/* Event Content */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  </div>
                  <Badge className={getTimelineEventStatusColor(event.status)}>
                    {event.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {event.date.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-4 w-4" />
                    {event.doctor}
                  </span>
                </div>

                {/* Event Details */}
                {event.type === 'appointment' && event.details && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Appointment Details</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>Time:</strong> {event.details.time} | <strong>Type:</strong> {event.details.type}
                    </p>
                    {event.details.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Notes:</strong> {event.details.notes}
                      </p>
                    )}
                  </div>
                )}

                {event.type === 'prescription' && event.details && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Prescription Details</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Chief Complaint:</strong> {event.details.chiefComplaint}
                    </p>
                    <div className="space-y-1">
                      {event.details.medications.map((med: any, idx: number) => (
                        <div key={idx} className="text-sm text-gray-600 bg-white rounded px-2 py-1">
                          {med.name} - {med.dosage} ({med.frequency})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {event.type === 'lab-test' && event.details && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Microscope className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Lab Test Details</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Test:</strong> {event.details.testName}
                    </p>
                    {event.details.results && (
                      <div className="space-y-1">
                        {event.details.results.slice(0, 3).map((result: any, idx: number) => (
                          <div key={idx} className="text-sm text-gray-600 bg-white rounded px-2 py-1">
                            {result.parameter}: {result.value} ({result.status})
                          </div>
                        ))}
                        {event.details.results.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{event.details.results.length - 3} more results
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
