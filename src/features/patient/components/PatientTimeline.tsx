import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Stethoscope,
  Pill,
  Activity,
  FileText,
  Syringe,
  FileCheck,
  AlertCircle,
  Paperclip,
  Eye,
  File,
  Lock,
  MessageSquare,
  Share2
} from 'lucide-react';
import { TimelineEventData } from '../services/timelineApi';
import { labApi } from '../services/labApi';

interface PatientTimelineProps {
  timelineEvents: TimelineEventData[];
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
  timelineEvents
}) => {
  const [expandedEventId, setExpandedEventId] = React.useState<string | null>(null);
  const [selectedAttachmentUrl, setSelectedAttachmentUrl] = React.useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);

  const toggleExpand = (id: string) => {
    setExpandedEventId(prev => {
      if (prev === id) {
        setSelectedAttachmentUrl(null); // Clear preview on collapse
        return null;
      }
      return id;
    });
  };

  const handleViewAttachment = async (url: string) => {
    setSelectedAttachmentUrl(null);
    setIsPreviewLoading(true);
    try {
      const blobUrl = await labApi.viewAttachment(url);
      setSelectedAttachmentUrl(blobUrl);
    } catch (error) {
      console.error("Failed to load attachment", error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  if (!timelineEvents || timelineEvents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No timeline events recorded.
        </CardContent>
      </Card>
    );
  }

  // Helper to format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VITALS_REQUIRED': return 'bg-amber-100 text-amber-800 border-amber-200 ring-amber-500';
      case 'LAB_REQUIRED': return 'bg-blue-100 text-blue-800 border-blue-200 ring-blue-500';
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200 ring-green-500';
      case 'DRAFT': return 'bg-gray-100 text-gray-800 border-gray-200 ring-gray-500';
      default: return 'bg-gray-100 text-gray-600 border-gray-200 ring-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderStatusTimeline = (history: TimelineEventData['statusJsonHistory']) => {
    if (!history || history.length === 0) return null;

    // Filter duplicates: keep only the latest timestamp for each status
    const uniqueHistoryMap = new Map<string, TimelineEventData['statusJsonHistory'][0]>();

    history.forEach(item => {
      const existing = uniqueHistoryMap.get(item.status);
      if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
        uniqueHistoryMap.set(item.status, item);
      }
    });

    const uniqueHistory = Array.from(uniqueHistoryMap.values()).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800 ml-4">
        {uniqueHistory.map((item, i) => {
          const isLast = i === uniqueHistory.length - 1;
          const colorClass = getStatusColor(item.status);
          const date = new Date(item.timestamp);
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const borderColor = colorClass.split(' ').find(c => c.startsWith('border')) || 'border-gray-200';
          const ringColor = colorClass.split(' ').find(c => c.startsWith('ring')) || 'ring-gray-200';
          const bgColor = colorClass.split(' ').find(c => c.startsWith('bg')) || 'bg-gray-100';

          return (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center min-w-[80px] relative group">
                {/* Full Circle Dot */}
                <div className={`w-4 h-4 rounded-full border-2 ${borderColor} ${bgColor} ring-2 ring-offset-2 ${ringColor} z-10 box-border`}></div>

                {/* Label */}
                <div className="mt-1.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {getStatusLabel(item.status)}
                  </div>
                  <div className="text-[9px] text-gray-400 font-medium">{timeStr}</div>
                </div>
              </div>
              {/* Connector Line */}
              {!isLast && (
                <div className="h-[2px] w-full bg-gray-200 dark:bg-gray-700 -ml-6 -mr-6 relative top-[-26px] -z-0"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };


  return (
    <div className="space-y-6 relative ml-4">
      {/* Vertical Spine */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800"></div>

      <div className="space-y-8">
        {timelineEvents.map((event, index) => {
          const isExpanded = expandedEventId === (event.apptID || String(index));
          const eventId = event.apptID || String(index);

          return (
            <div key={eventId} className="relative flex items-start gap-6">
              {/* Icon Bubble with Date */}
              <div className="relative z-10 flex flex-col items-center min-w-[4rem]">
                <div className="flex flex-col items-center justify-center w-16 h-16 bg-white dark:bg-gray-900 border-2 border-primary/20 rounded-full shadow-sm z-20">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{new Date(event.appDate).toLocaleString('default', { month: 'short' })}</span>
                  <span className="text-2xl font-bold text-primary leading-none">{new Date(event.appDate).getDate()}</span>
                </div>
              </div>

              {/* Content Card */}
              <Card className="flex-1 hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary/50 relative">
                <CardHeader className="pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(eventId)}
                    className="absolute top-4 right-4 text-primary hover:text-primary/80 hover:bg-primary/10 z-10"
                  >
                    {isExpanded ? 'Show Less' : 'View Details'}
                  </Button>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Meta Row: Private Notes & Follow-up */}
                      <div className="flex justify-between items-start mb-3 text-sm pr-24">
                        <div className="flex-1 mr-4">
                          <div className={`flex items-start gap-1.5 px-2 py-1 rounded text-xs font-medium border inline-block ${event.privateNotes ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-gray-500 bg-gray-50 border-gray-100'}`}>
                            <Lock className="w-3 h-3 mt-0.5" />
                            <span>Your Notes: {event.privateNotes || "No Private Notes"}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {event.followUp && event.followUp.followUpOn && (
                            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                              <AlertCircle className="w-3 h-3" />
                              <span>Follow-up: {formatDate(event.followUp.followUpOn)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Referral Section */}
                      {event.followUp && event.followUp.referralEnabled && event.followUp.referral && (
                        <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/10 rounded border border-purple-100 dark:border-purple-800/50 text-sm">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-medium text-purple-900 dark:text-purple-100">
                              <Share2 className="w-3.5 h-3.5 text-purple-600" />
                              <span>Referred To: {event.followUp.referral.referredTo?.doctorName || 'Unknown Doctor'} <span className="text-purple-600 dark:text-purple-400 font-normal">({event.followUp.referral.referredTo?.specialty || 'General'})</span></span>
                            </div>
                            {event.followUp.referral.clinicalSummary && (
                              <p className="text-xs text-purple-700 dark:text-purple-300 ml-5.5">
                                <span className="font-semibold">Summary:</span> {event.followUp.referral.clinicalSummary}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1 overflow-hidden">
                          <CardTitle className="text-lg font-bold flex items-center gap-2 shrink-0">
                            <span>Visit / Consultation</span>
                            {event.status && (
                              <Badge className={`text-xs px-2 py-0.5 ${event.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' :
                                event.status.toLowerCase() === 'in progress' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' :
                                  event.status.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' :
                                    'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200'
                                }`}>
                                {event.status}
                              </Badge>
                            )}
                          </CardTitle>
                          {/* Status Timeline Inline */}
                          <div className="flex-1 min-w-0">
                            {renderStatusTimeline(event.statusJsonHistory)}
                          </div>
                        </div>

                      </div>

                      {/* Clinical Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Chief Complaint */}
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm flex flex-col gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Chief Complaint</span>
                          <div className="flex flex-wrap gap-1.5">
                            {event.chiefComplaint ? event.chiefComplaint.split(';').map((item, i) => (
                              item.trim() && <Badge key={i} variant="secondary" className="font-normal text-xs bg-gray-100 text-gray-700 border-0">{item.trim()}</Badge>
                            )) : <span className="text-sm text-gray-400">-</span>}
                          </div>
                        </div>

                        {/* History */}
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm flex flex-col gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">History</span>
                          <div className="flex flex-wrap gap-1.5">
                            {event.history ? event.history.split(';').map((item, i) => (
                              item.trim() && <Badge key={i} variant="secondary" className="font-normal text-xs bg-gray-100 text-gray-700 border-0">{item.trim()}</Badge>
                            )) : <span className="text-sm text-gray-400">-</span>}
                          </div>
                        </div>

                        {/* Comorbidities */}
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm flex flex-col gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Comorbidities</span>
                          <div className="flex flex-wrap gap-1.5">
                            {event.comorbidity ? event.comorbidity.split(';').map((item, i) => (
                              item.trim() && <Badge key={i} variant="secondary" className="font-normal text-xs bg-gray-100 text-gray-700 border-0">{item.trim()}</Badge>
                            )) : <span className="text-sm text-gray-400">-</span>}
                          </div>
                        </div>

                        {/* Examination */}
                        <div className="p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30 shadow-sm flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Examination</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {event.examination ? event.examination.split(';').map((item, i) => (
                              item.trim() && <Badge key={i} variant="outline" className="font-normal text-xs bg-blue-50 text-blue-700 border-blue-200">{item.trim()}</Badge>
                            )) : <span className="text-sm text-gray-400 italic">No findings</span>}
                          </div>
                        </div>

                        {/* Diagnosis */}
                        <div className="p-3 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30 shadow-sm flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Diagnosis</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {event.diagnosis ? event.diagnosis.split(';').map((item, i) => (
                              item.trim() && <Badge key={i} variant="outline" className="font-normal text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{item.trim()}</Badge>
                            )) : <span className="text-sm text-gray-400 italic">Pending</span>}
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Medicine Table */}
                      {event.medications && event.medications.length > 0 && (
                        <div className="mt-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                              <Pill className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Prescribed Medications</h4>
                          </div>
                          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 dark:bg-gray-900/80 text-xs uppercase text-gray-500 font-semibold">
                                <tr>
                                  <th className="px-4 py-2.5">Medicine</th>
                                  <th className="px-4 py-2.5">Dosage</th>
                                  <th className="px-4 py-2.5">Freq</th>
                                  <th className="px-4 py-2.5">Duration</th>
                                  <th className="px-4 py-2.5">Instructions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-transparent">
                                {event.medications.map((med, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/40 transition-colors">
                                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{med.drugName}</td>
                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{med.dose}</td>
                                    <td className="px-4 py-2.5">
                                      <Badge variant="secondary" className="font-normal text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 border-0">{med.frequency}</Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{med.duration}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground italic">{med.instructions}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Details */}
                {isExpanded && (
                  <CardContent className="px-5 pb-5 pt-0 mt-4 border-t border-dashed bg-gray-50/30 dark:bg-gray-900/10">
                    <Tabs defaultValue="details" className="pt-4 w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-100/50 dark:bg-gray-800/50">
                        <TabsTrigger value="details" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm">Clinical Details</TabsTrigger>
                        <TabsTrigger value="attachments" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm flex items-center gap-2">
                          <Paperclip className="w-3.5 h-3.5" /> Attachments
                          {event.attachments && event.attachments.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 min-w-[1.25rem]">{event.attachments.length}</Badge>}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="details" className="space-y-6 mt-0">
                        <div className="pt-0 grid gap-6">
                          {/* Vitals */}
                          {event.vitalsJson && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Recorded Vitals</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {event.vitalsJson.bp?.sys > 0 && <div className="bg-white dark:bg-gray-800 p-2.5 rounded-md border shadow-sm text-center"><div className="text-[10px] text-muted-foreground uppercase">BP</div><div className="font-bold text-gray-900 dark:text-gray-100">{event.vitalsJson.bp.sys}/{event.vitalsJson.bp.dia}</div></div>}
                                {event.vitalsJson.pulse > 0 && <div className="bg-white dark:bg-gray-800 p-2.5 rounded-md border shadow-sm text-center"><div className="text-[10px] text-muted-foreground uppercase">Pulse</div><div className="font-bold text-gray-900 dark:text-gray-100">{event.vitalsJson.pulse} <span className="text-[10px] font-normal text-muted-foreground">bpm</span></div></div>}
                                {event.vitalsJson.tempC > 0 && <div className="bg-white dark:bg-gray-800 p-2.5 rounded-md border shadow-sm text-center"><div className="text-[10px] text-muted-foreground uppercase">Temp</div><div className="font-bold text-gray-900 dark:text-gray-100">{event.vitalsJson.tempC}<span className="text-[10px] font-normal text-muted-foreground">°C</span></div></div>}
                                {event.vitalsJson.spo2 > 0 && <div className="bg-white dark:bg-gray-800 p-2.5 rounded-md border shadow-sm text-center"><div className="text-[10px] text-muted-foreground uppercase">SpO2</div><div className="font-bold text-gray-900 dark:text-gray-100">{event.vitalsJson.spo2}<span className="text-[10px] font-normal text-muted-foreground">%</span></div></div>}
                                {event.vitalsJson.weightKg > 0 && <div className="bg-white dark:bg-gray-800 p-2.5 rounded-md border shadow-sm text-center"><div className="text-[10px] text-muted-foreground uppercase">Weight</div><div className="font-bold text-gray-900 dark:text-gray-100">{event.vitalsJson.weightKg} <span className="text-[10px] font-normal text-muted-foreground">kg</span></div></div>}
                              </div>
                            </div>
                          )}

                          {/* Other Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Non-Pharmacological Advice - Taking prominent spot if exists */}
                            {event.nonPharmacologicalAdvice && event.nonPharmacologicalAdvice.length > 0 && (
                              <div className="md:col-span-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5" /> Advice / Instructions
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {event.nonPharmacologicalAdvice.map((advice, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 break-words">{advice.advice}</p>
                                        {advice.duration && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Duration: {advice.duration}</p>}
                                        {advice.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{advice.notes}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Lab Orders & Procedures */}
                            {(event.orders && ((event.orders.investigations && event.orders.investigations.length > 0) || (event.orders.procedures && event.orders.procedures.length > 0))) && (
                              <div>
                                {event.orders.investigations && event.orders.investigations.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5" /> Lab Investigations
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {event.orders.investigations.map((inv, i) => (
                                        <Badge key={i} variant="outline" className="font-medium px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">{inv}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {event.orders.procedures && event.orders.procedures.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                      <Activity className="w-3.5 h-3.5" /> Procedures
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {event.orders.procedures.map((proc, i) => (
                                        <Badge key={i} variant="outline" className="font-medium px-3 py-1 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">{proc}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Immunizations */}
                            {event.immunizations && event.immunizations.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                  <Syringe className="w-3.5 h-3.5" /> Immunizations
                                </h4>
                                <ul className="space-y-1.5">
                                  {event.immunizations.map((imm, i) => (
                                    <li key={i} className="text-sm flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border">
                                      <span className="font-medium">{imm.name}</span>
                                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Due: {formatDate(imm.nextDueDate)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Certs Only (Follow-up moved to header) */}
                          <div className="flex flex-col sm:flex-row gap-4">
                            {event.certificates && event.certificates.type && (
                              <div className="flex-1 flex items-start gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded text-blue-600">
                                  <FileCheck className="w-4 h-4" />
                                </div>
                                <div className="text-sm">
                                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-0.5">{event.certificates.type} Certificate</p>
                                  <p className="text-xs text-blue-600 dark:text-blue-400">Valid: {formatDate(event.certificates.fromDate)} - {formatDate(event.certificates.toDate)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="attachments" className="mt-4">
                        {!event.attachments || event.attachments.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed text-muted-foreground text-sm">
                            No attachments available for this visit.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Attachment Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {event.attachments.map((att, idx) => (
                                <div key={idx} className="group relative flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded">
                                      <File className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100" title={att.fileName}>{att.fileName}</p>
                                      <p className="text-xs text-muted-foreground truncate">{att.reportType}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                      onClick={() => handleViewAttachment(att.storageUrl)}
                                      title="Preview"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                      onClick={() => window.open(att.storageUrl, '_blank')} // Fallback download/view
                                      title="Open New Tab"
                                    >
                                      <Paperclip className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Preview Area */}
                            {isPreviewLoading && (
                              <div className="w-full h-64 flex items-center justify-center bg-gray-50 border rounded-lg">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </div>
                            )}

                            {!isPreviewLoading && selectedAttachmentUrl && (
                              <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 mt-4 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 border-b">
                                  <span className="text-xs font-semibold uppercase tracking-wide pl-2">Preview</span>
                                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedAttachmentUrl(null)}>Close Preview</Button>
                                </div>
                                <iframe
                                  src={selectedAttachmentUrl}
                                  className="w-full h-[500px] bg-white"
                                  title="Attachment Preview"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div >
  );
};
