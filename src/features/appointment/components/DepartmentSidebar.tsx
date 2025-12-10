import React from 'react';
import { useTranslation } from 'react-i18next';
import { Doctor, Department } from './AppointmentBooking';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DepartmentSidebarProps {
  departments: Department[];
  selectedDepartment: Department;
  selectedDoctor: Doctor;
  onDepartmentSelect: (department: Department) => void;
  onDoctorSelect: (doctor: Doctor) => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  departments,
  selectedDepartment,
  selectedDoctor,
  onDepartmentSelect,
  onDoctorSelect
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-80 bg-white border-r border-border p-4 shadow-lg">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('departmentSidebar.selectDepartment')}
        </h3>
        
        <div className="space-y-2">
          {departments.map((department) => {
            const Icon = department.icon;
            return (
              <Button
                key={department.id}
                variant={selectedDepartment.id === department.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 px-4",
                  selectedDepartment.id === department.id 
                    ? "bg-healthcare-primary hover:bg-healthcare-primary/90 text-white" 
                    : "hover:bg-muted"
                )}
                onClick={() => onDepartmentSelect(department)}
              >
                <Icon className="mr-3 h-5 w-5" />
                <span className="font-medium">{department.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <Separator className="my-4" />

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('departmentSidebar.availableDoctors')}
        </h3>
        
        <div className="space-y-2">
          {selectedDepartment.doctors.map((doctor) => (
            <Card
              key={doctor.id}
              className={cn(
                "p-3 cursor-pointer transition-all duration-200 hover:shadow-md",
                selectedDoctor.id === doctor.id 
                  ? "border-healthcare-primary bg-slot-selected" 
                  : "hover:border-healthcare-primary/50"
              )}
              onClick={() => onDoctorSelect(doctor)}
            >
              <div className="space-y-1">
                <h4 className={cn(
                  "font-medium",
                  selectedDoctor.id === doctor.id 
                    ? "text-healthcare-primary" 
                    : "text-foreground"
                )}>
                  {doctor.name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {doctor.specialization}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h4 className="font-medium text-foreground mb-3 text-sm">
          {t('departmentSidebar.slotLegend')}
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slot-available border border-slot-available-border rounded"></div>
            <span>{t('departmentSidebar.legend.available')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slot-booked border border-slot-booked-border rounded"></div>
            <span>{t('departmentSidebar.legend.booked')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slot-selected border border-slot-selected-border rounded"></div>
            <span>{t('departmentSidebar.legend.selected')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};