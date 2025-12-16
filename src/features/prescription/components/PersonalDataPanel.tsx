import React from 'react';
import { PrescriptionCustomizePanel } from './PrescriptionCustomizePanel';

// Thin wrapper to expose only the Personal Data experience
// without needing to navigate through the broader settings panel.
export const PersonalDataPanel: React.FC = () => (
  <PrescriptionCustomizePanel
    defaultTab="personalized"
    showCloseButton={false}
    hidePersonalizedHeader
  />
);
