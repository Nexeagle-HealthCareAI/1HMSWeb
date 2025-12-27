import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

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
  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {timelineEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No timeline events recorded.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {timelineEvents.map((event) => (
              <div key={event.id} className="relative flex items-start gap-6">
                <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-white border rounded-full">
                </div>
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-gray-500">{event.date.toLocaleDateString()}</p>
                    <p className="mt-2 text-sm">{event.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
