import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Eye,
  Shield,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface AuditSecurityModuleProps {
  moduleName: string;
  moduleDescription: string;
  moduleIcon: React.ComponentType<{ className?: string }>;
}

export const AuditSecurityModule: React.FC<AuditSecurityModuleProps> = ({ 
  moduleName, 
  moduleDescription, 
  moduleIcon: IconComponent 
}) => {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <IconComponent className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-4">
          {moduleName}
        </h2>
        <p className="text-muted-foreground mb-6">
          {moduleDescription}
        </p>
        <div className="space-y-3 text-left max-w-md mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-primary" />
            <span>Track all user activities (record edits)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            <span>Manage role permissions</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span>Session tracking</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Two-factor authentication setup</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          This module is under development and will be available soon.
        </p>
      </CardContent>
    </Card>
  );
};
