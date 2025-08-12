import React from 'react';
import { PrescriptionCanvasEditor } from '@/features/prescriptions';

export default function CanvasPage() {
  // In a real app, you would get hospitalId from router params, store, or context
  const hospitalId = 'demo-hospital-id';
  
  return <PrescriptionCanvasEditor hospitalId={hospitalId} />;
}
