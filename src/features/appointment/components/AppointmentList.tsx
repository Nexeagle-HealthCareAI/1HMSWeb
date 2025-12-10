import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppointments } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AppointmentList: React.FC = () => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const [filters, setFilters] = useState({
    status: '',
    doctorId: '',
    patientId: '',
    date: ''
  });

  // Using the new React Query hooks
  const appointmentsQuery = useAppointments.getAll(filters);
  const createAppointmentMutation = useAppointments.create();
  const updateStatusMutation = useAppointments.updateStatus();

  const handleCreateAppointment = async (appointmentData: any) => {
    try {
      await createAppointmentMutation.mutateAsync(appointmentData);
      toast({
        title: t('appointmentList.toast.successTitle'),
        description: t('appointmentList.toast.createSuccess'),
      });
    } catch (error: any) {
      toast({
        title: t('appointmentList.toast.errorTitle'),
        description: error?.message || t('appointmentList.toast.createFail'),
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: appointmentId, status: newStatus });
      toast({
        title: t('appointmentList.toast.successTitle'),
        description: t('appointmentList.toast.statusUpdated'),
      });
    } catch (error: any) {
      toast({
        title: t('appointmentList.toast.errorTitle'),
        description: error?.message || t('appointmentList.toast.statusFail'),
        variant: "destructive"
      });
    }
  };

  if (appointmentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t('appointmentList.loading')}</p>
        </div>
      </div>
    );
  }

  if (appointmentsQuery.isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive">{t('appointmentList.error')}</p>
          <Button 
            onClick={() => appointmentsQuery.refetch()}
            variant="outline"
            className="mt-2"
          >
            {t('appointmentList.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const appointments = appointmentsQuery.data?.data || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('appointmentList.filters.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('appointmentList.filters.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('appointmentList.filters.allStatus')}</SelectItem>
                <SelectItem value="scheduled">{t('appointmentList.status.scheduled')}</SelectItem>
                <SelectItem value="confirmed">{t('appointmentList.status.confirmed')}</SelectItem>
                <SelectItem value="completed">{t('appointmentList.status.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('appointmentList.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder={t('appointmentList.filters.searchPatient')}
              value={filters.patientId}
              onChange={(e) => setFilters(prev => ({ ...prev, patientId: e.target.value }))}
            />

            <Input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
            />

            <Button
              onClick={() => setFilters({ status: '', doctorId: '', patientId: '', date: '' })}
              variant="outline"
            >
              {t('appointmentList.filters.clear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <div className="grid gap-4">
        {appointments.map((appointment) => (
          <Card key={appointment.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(appointment.appointment_date))}
                    </span>
                    <span className="text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(appointment.appointment_date))}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-medium">{appointment.patient_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('appointmentList.doctorName', { name: appointment.doctor_name })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.reason || t('appointmentList.noReason')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={
                    appointment.status === 'completed' ? 'default' :
                    appointment.status === 'cancelled' ? 'destructive' :
                    appointment.status === 'confirmed' ? 'secondary' : 'outline'
                  }>
                    {t(`appointmentList.status.${appointment.status}`)}
                  </Badge>
                  
                  {appointment.status === 'scheduled' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? t('appointmentList.actions.updating') : t('appointmentList.actions.confirm')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {appointments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t('appointmentList.empty')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
