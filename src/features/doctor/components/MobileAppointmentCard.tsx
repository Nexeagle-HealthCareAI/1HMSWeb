import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Upload, FileText, BedDouble, Calendar, X, MoreVertical, Stethoscope, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { AdmissionStatusBadge } from '@/features/patient/components/AdmissionStatusBadge';
import { AdviseAdmissionSheet } from '@/features/patient/components/AdviseAdmissionSheet';
// Since PatientAppointment is in DocBoard.tsx and we can't easily import it if it's not exported,
// we'll redefine the minimal type here or just use any/unknown if it's too complex.
// Wait, I will export it from DocBoard.tsx later, but for now I'll just import it.
import { PatientAppointment } from './DocBoard';

interface MobileAppointmentCardProps {
  appointment: PatientAppointment;
  hospitalId: string | null;
  doctorId: string | null;
  referral: any;
  getStatusBadge: (status: string) => React.ReactNode;
  onPatientIdClick: (appointment: PatientAppointment) => void;
  onOpenLabAttachments: (appointment: PatientAppointment) => void;
  onAddBillClick: (appointment: PatientAppointment) => void;
  onRescheduleClick: (appointment: PatientAppointment) => void;
  onCancelClick: (appointment: PatientAppointment) => void;
  onPrintClick: (appointment: PatientAppointment) => void;
  onPrimaryActionClick?: (appointment: PatientAppointment) => void;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ReactNode;
  /** Opens the full-screen InkRx handwriting pad for this appointment. */
  onInkRx?: (appointment: PatientAppointment) => void;
}

export const MobileAppointmentCard: React.FC<MobileAppointmentCardProps> = ({
  appointment,
  hospitalId,
  doctorId,
  referral,
  getStatusBadge,
  onPatientIdClick,
  onOpenLabAttachments,
  onAddBillClick,
  onRescheduleClick,
  onCancelClick,
  onPrintClick,
  onPrimaryActionClick,
  primaryActionLabel,
  primaryActionIcon,
  onInkRx,
}) => {
  const { t } = useTranslation();

  const showLabReport = ['LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED'].includes(String(appointment.finalStatusCode || '').toUpperCase());
  const showRescheduleCancel = !['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED'].includes(appointment.finalStatusCode);

  return (
    <div className="rounded-2xl border border-white/20 dark:border-gray-800/70 bg-white/70 dark:bg-gray-950/70 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] backdrop-blur-xl mb-3 active:scale-[0.98] transition-transform duration-200 relative overflow-hidden">
      
      {/* Decorative background gradient blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-100/30 dark:bg-brand-900/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPatientIdClick(appointment)}
              className="text-sm font-bold text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-200 inline-flex items-center gap-1 transition-colors"
            >
              {appointment.patientId}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </button>
            <Badge variant="outline" className="text-[10px] bg-brand-50/50 text-brand-700 border-brand-200/50 px-1.5 py-0 font-semibold tracking-wide shadow-sm">
              {(!appointment.appointmentType || appointment.appointmentType === 'New')
                ? t('docBoard.table.newCase', { defaultValue: 'New Case' })
                : appointment.appointmentType}
            </Badge>
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-white truncate tracking-tight">{appointment.patientFullName}</p>
          {appointment.phone && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium opacity-80">{appointment.phone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right shrink-0">
          <div className="scale-105 origin-top-right">{getStatusBadge(appointment.finalStatusCode)}</div>
          {referral && <div className="scale-105 origin-top-right"><AdmissionStatusBadge referral={referral} /></div>}
          
          <div className="flex flex-col items-end mt-1">
            <div className="text-xs text-gray-800 dark:text-gray-200 font-bold bg-gray-100/80 dark:bg-gray-800/80 px-2 py-0.5 rounded-md shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              {format(new Date(appointment.startAt), 'HH:mm')}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5 uppercase tracking-widest">
              {format(new Date(appointment.startAt), 'MMM dd')}
            </div>
          </div>
        </div>
      </div>

      {appointment.tokenDetails?.tokenNumber && (
        <div className="mt-4 flex items-center gap-2 relative z-10">
           <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-gray-900 text-brand-700 dark:text-brand-300 px-3 py-1 text-xs font-bold border border-brand-100/50 dark:border-brand-800/50 shadow-sm">
             <span className="text-[10px] uppercase tracking-wider opacity-70">Token</span>
             <span className="text-brand-800 dark:text-brand-200">#{appointment.tokenDetails.tokenNumber}</span>
           </div>
        </div>
      )}

      {/* Primary Action & Drawer Trigger */}
      <div className="mt-4 flex gap-2 relative z-10">
        {primaryActionLabel && onPrimaryActionClick && (
          <Button 
            className="flex-1 rounded-xl font-bold shadow-md bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white transition-all transform hover:scale-[1.02]" 
            onClick={() => onPrimaryActionClick(appointment)}
          >
            {primaryActionIcon || <Stethoscope className="mr-2 h-4 w-4" />}
            {primaryActionLabel}
          </Button>
        )}
        
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" className={`rounded-xl border-gray-200/80 dark:border-gray-800 shadow-sm bg-white/50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!primaryActionLabel ? 'flex-1' : 'px-3'}`}>
              {!primaryActionLabel && <span className="mr-1 font-semibold">Manage Appointment</span>}
              <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="pb-safe bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-xl border-t-0">
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            <DrawerHeader className="text-left pb-4 pt-6">
              <DrawerTitle className="text-xl font-bold text-gray-900 dark:text-white">Manage Options</DrawerTitle>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{appointment.patientFullName} • <span className="text-brand-600 dark:text-brand-400">{appointment.patientId}</span></p>
            </DrawerHeader>
            <div className="p-4 pt-0 grid gap-3 overflow-y-auto max-h-[60vh]">
              {onInkRx && (
                <Button variant="outline" className="w-full justify-start h-14 rounded-2xl text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/50 bg-brand-50/50 dark:bg-brand-900/20 font-semibold shadow-sm" onClick={() => onInkRx(appointment)}>
                  <div className="bg-brand-100 dark:bg-brand-800/50 p-2 rounded-xl mr-3"><PenLine className="h-4 w-4 text-brand-600 dark:text-brand-400" /></div>
                  InkRx — Handwritten Rx
                </Button>
              )}
              {showLabReport && (
                <Button variant="outline" className="w-full justify-start h-14 rounded-2xl text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/50 bg-brand-50/50 dark:bg-brand-900/20 font-semibold shadow-sm" onClick={() => onOpenLabAttachments(appointment)}>
                  <div className="bg-brand-100 dark:bg-brand-800/50 p-2 rounded-xl mr-3"><Upload className="h-4 w-4 text-brand-600 dark:text-brand-400" /></div>
                  {t('docBoard.table.addLabReport', { defaultValue: 'Add Lab Report' })}
                </Button>
              )}
              
              <Button variant="outline" className="w-full justify-start h-14 rounded-2xl text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 font-semibold shadow-sm" onClick={() => onAddBillClick(appointment)}>
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl mr-3"><FileText className="h-4 w-4 text-gray-500" /></div>
                {t('docBoard.table.addBill', { defaultValue: 'Add Bill' })}
              </Button>

              <AdviseAdmissionSheet
                hospitalId={hospitalId || ''}
                doctorId={doctorId || ''}
                patientId={appointment.patientId}
                appointmentId={appointment.appointmentId}
                trigger={
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/20 font-semibold shadow-sm">
                    <div className="bg-blue-100 dark:bg-blue-800/50 p-2 rounded-xl mr-3"><BedDouble className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
                    Advise Admission
                  </Button>
                }
              />

              <Button variant="outline" className="w-full justify-start h-14 rounded-2xl text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 font-semibold shadow-sm" disabled={!hospitalId || !doctorId} onClick={() => onPrintClick(appointment)}>
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl mr-3"><FileText className="h-4 w-4 text-gray-500" /></div>
                {t('common.print')} Prescription
              </Button>

              {showRescheduleCancel && (
                <>
                  <div className="h-px bg-gray-200/60 dark:bg-gray-800/60 my-2" />
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-900/20 font-semibold shadow-sm" onClick={() => onRescheduleClick(appointment)}>
                    <div className="bg-orange-100 dark:bg-orange-800/50 p-2 rounded-xl mr-3"><Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" /></div>
                    {t('common.reschedule', { defaultValue: 'Reschedule' })}
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-14 rounded-2xl text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/20 font-semibold shadow-sm" onClick={() => onCancelClick(appointment)}>
                    <div className="bg-red-100 dark:bg-red-800/50 p-2 rounded-xl mr-3"><X className="h-4 w-4 text-red-600 dark:text-red-400" /></div>
                    {t('common.cancel')} Appointment
                  </Button>
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};
