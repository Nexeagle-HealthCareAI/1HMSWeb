import React from 'react';
import { SystemConfiguration } from '@/features/hospital/components/SystemConfiguration';

interface SystemConfigModuleProps {
  focusTab?: string;
}

export const SystemConfigModule: React.FC<SystemConfigModuleProps> = ({ focusTab }) => {
  return <SystemConfiguration focusTab={focusTab} />;
};
