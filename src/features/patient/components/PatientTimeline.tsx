import React, { useState, useMemo } from 'react';
import { 
  Calendar,
  Clock,
  Stethoscope,
  Pill,
  Microscope,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  Heart,
  Activity,
  FileText,
  User,
  MapPin,
  Phone,
  Mail,
  MoreVertical,
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  patientStatus?: string;
  lastVisitDate?: Date;
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
  timelineEvents,
  patientStatus = 'Active',
  lastVisitDate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');

  const getTimelineEventIcon = (event: TimelineEvent) => {
    const iconMap = {
      'appointment': Calendar,
      'prescription': Pill,
      'lab-test': Microscope,
      'vital-update': Activity,
      'consultation': Stethoscope
    };
    const IconComponent = iconMap[event.type] || Calendar;
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

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'prescription':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'lab-test':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'vital-update':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'consultation':
        return 'bg-indigo-50 border-indigo-200 text-indigo-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const filteredEvents = useMemo(() => {
    return timelineEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.doctor.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === 'all' || event.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || event.status === selectedStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [timelineEvents, searchTerm, selectedType, selectedStatus]);

  const eventTypes = ['all', 'appointment', 'prescription', 'lab-test', 'vital-update', 'consultation'];
  const eventStatuses = ['all', 'completed', 'active', 'scheduled', 'cancelled'];

  const renderEventDetails = (event: TimelineEvent) => {
    if (!expandedEvents.has(event.id)) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        {event.type === 'appointment' && event.details && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Time:</span>
                <p className="text-sm text-gray-900">{event.details.time}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <p className="text-sm text-gray-900">{event.details.type}</p>
              </div>
            </div>
            {event.details.notes && (
              <div>
                <span className="text-sm font-medium text-gray-600">Notes:</span>
                <p className="text-sm text-gray-900 mt-1">{event.details.notes}</p>
              </div>
            )}
          </div>
        )}

        {event.type === 'prescription' && event.details && (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Chief Complaint:</span>
              <p className="text-sm text-gray-900 mt-1">{event.details.chiefComplaint}</p>
            </div>
            {event.details.medications && event.details.medications.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-600">Medications:</span>
                <div className="mt-2 space-y-2">
                  {event.details.medications.map((med: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                      <div>
                        <p className="font-medium text-gray-900">{med.name}</p>
                        <p className="text-sm text-gray-600">{med.dosage} - {med.frequency}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {med.duration || 'As needed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {event.type === 'lab-test' && event.details && (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Test Name:</span>
              <p className="text-sm text-gray-900 mt-1">{event.details.testName}</p>
            </div>
            {event.details.results && (
              <div>
                <span className="text-sm font-medium text-gray-600">Results:</span>
                <div className="mt-2 space-y-2">
                  {event.details.results.map((result: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                      <div>
                        <p className="font-medium text-gray-900">{result.parameter}</p>
                        <p className="text-sm text-gray-600">{result.value}</p>
                      </div>
                      <Badge 
                        variant={result.status === 'normal' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {result.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Patient Timeline</h2>
            <p className="text-sm text-gray-600">Complete medical history and events</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Patient Status */}
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Badge 
                className={`${
                  patientStatus === 'Active' 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : patientStatus === 'Critical'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                }`}
              >
                {patientStatus}
              </Badge>
            </div>
            {lastVisitDate && (
              <p className="text-xs text-gray-500 mt-1">
                Last visit: {lastVisitDate.toLocaleDateString()}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events, doctors, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {eventStatuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'timeline' | 'grid')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="text-sm text-gray-600">
              {filteredEvents.length} of {timelineEvents.length} events
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="relative">
          {/* Timeline Line with Date Markers */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200"></div>
          
          {/* Date Markers on Timeline */}
          {filteredEvents.map((event, index) => (
            <div 
              key={`date-${event.id}`}
              className="absolute left-0 top-0 transform -translate-y-1/2"
              style={{ 
                top: `${(index * 200) + 32}px` // Approximate positioning based on event index
              }}
            >
              <div className="bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                <div className="text-xs font-medium text-gray-700">
                  {event.date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  {event.date.getFullYear()}
                </div>
              </div>
            </div>
          ))}

          {/* Timeline Events */}
          <div className="space-y-8">
            {filteredEvents.map((event, index) => (
              <div key={event.id} className="relative flex items-start gap-6">
                {/* Timeline Dot */}
                <div className={`relative z-10 flex items-center justify-center w-16 h-16 bg-white border-2 rounded-full shadow-lg ${getEventTypeColor(event.type).replace('text-', 'border-').replace('bg-', 'bg-')}`}>
                  {getTimelineEventIcon(event)}
                </div>

                {/* Event Content - Simplified */}
                <Card className="flex-1 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getEventTypeColor(event.type)}>
                            {event.type.replace('-', ' ').toUpperCase()}
                          </Badge>
                          <Badge className={getTimelineEventStatusColor(event.status)}>
                            {event.status.toUpperCase()}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEventExpansion(event.id)}
                        className="h-8 w-8 p-0"
                      >
                        {expandedEvents.has(event.id) ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Important Info Only */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {event.date.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-4 w-4" />
                        {event.doctor}
                      </span>
                      {/* Show only critical info for each event type */}
                      {event.type === 'appointment' && event.details?.type && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {event.details.type}
                        </span>
                      )}
                      {event.type === 'prescription' && event.details?.medications?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Pill className="h-4 w-4" />
                          {event.details.medications.length} medications
                        </span>
                      )}
                      {event.type === 'lab-test' && event.details?.testName && (
                        <span className="flex items-center gap-1">
                          <Microscope className="h-4 w-4" />
                          {event.details.testName}
                        </span>
                      )}
                    </div>

                    {renderEventDetails(event)}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getEventTypeColor(event.type)}>
                    {event.type.replace('-', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={getTimelineEventStatusColor(event.status)}>
                    {event.status.toUpperCase()}
                  </Badge>
                </div>
                <CardTitle className="text-base">{event.title}</CardTitle>
                <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {event.date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {event.date.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    {event.doctor}
                  </div>
                  {/* Show important info based on event type */}
                  {event.type === 'appointment' && event.details?.type && (
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      {event.details.type}
                    </div>
                  )}
                  {event.type === 'prescription' && event.details?.medications?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      {event.details.medications.length} medications
                    </div>
                  )}
                  {event.type === 'lab-test' && event.details?.testName && (
                    <div className="flex items-center gap-2">
                      <Microscope className="h-4 w-4" />
                      {event.details.testName}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleEventExpansion(event.id)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {expandedEvents.has(event.id) ? 'Hide' : 'View'} Details
                  </Button>
                </div>

                {expandedEvents.has(event.id) && (
                  <div className="mt-4">
                    {renderEventDetails(event)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters to see more events.'
                : 'No timeline events have been recorded yet.'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add First Event
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
