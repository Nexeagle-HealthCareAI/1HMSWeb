import React, { useState } from 'react';
import { useAppointments } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Filter, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AppointmentList: React.FC = () => {
  const { toast } = useToast();
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
        title: "Success",
        description: "Appointment created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: appointmentId, status: newStatus });
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  if (appointmentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (appointmentsQuery.isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive">Error loading appointments</p>
          <Button 
            onClick={() => appointmentsQuery.refetch()}
            variant="outline"
            className="mt-2"
          >
            Retry
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
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search patient..."
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
              Clear Filters
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
                      {new Date(appointment.appointment_date).toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(appointment.appointment_date).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-medium">{appointment.patient_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Dr. {appointment.doctor_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.reason || 'No reason provided'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={
                    appointment.status === 'completed' ? 'default' :
                    appointment.status === 'cancelled' ? 'destructive' :
                    appointment.status === 'confirmed' ? 'secondary' : 'outline'
                  }>
                    {appointment.status}
                  </Badge>
                  
                  {appointment.status === 'scheduled' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? 'Updating...' : 'Confirm'}
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
            <p className="text-muted-foreground">No appointments found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
