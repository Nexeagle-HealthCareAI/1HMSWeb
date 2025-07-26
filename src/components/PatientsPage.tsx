import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export const PatientsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-healthcare-primary" />
        <h1 className="text-2xl font-bold">Patients Management</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is where you can manage patient records, medical history, and treatment plans.
          </p>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Patient management features will be implemented here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};