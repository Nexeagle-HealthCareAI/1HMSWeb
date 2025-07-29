import React, { useState } from 'react';
import { 
  Settings,
  Building2,
  FileText,
  Palette
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  DepartmentManagement, 
  PrescriptionTemplateConfig, 
  HospitalBrandingConfig,
  type Department,
  type PrescriptionTemplate,
  type HospitalBranding
} from './system-config';

// Sample data
const sampleDepartments: Department[] = [
  {
    id: 'CARD',
    name: 'Cardiology',
    shortCode: 'CARD',
    description: 'Specialized care for heart and cardiovascular conditions',
    doctors: [
      {
        doctorId: 'D001',
        doctorName: 'Dr. Sarah Johnson',
        role: 'HOD',
        schedule: 'Mon-Fri 9AM-5PM'
      },
      {
        doctorId: 'D004',
        doctorName: 'Dr. Robert Chen',
        role: 'Consultant',
        schedule: 'Mon, Wed, Fri 2PM-8PM'
      }
    ],
    stats: {
      totalPatients: 1250,
      todayAppointments: 45,
      monthlyRevenue: 850000
    },
    isActive: true
  },
  {
    id: 'PEDI',
    name: 'Pediatrics',
    shortCode: 'PEDI',
    description: 'Comprehensive healthcare for children and adolescents',
    doctors: [
      {
        doctorId: 'D002',
        doctorName: 'Dr. Emily Davis',
        role: 'HOD',
        schedule: 'Mon-Sat 8AM-4PM'
      }
    ],
    stats: {
      totalPatients: 890,
      todayAppointments: 32,
      monthlyRevenue: 520000
    },
    isActive: true
  },
  {
    id: 'NEUR',
    name: 'Neurology',
    shortCode: 'NEUR',
    description: 'Expert care for neurological disorders and conditions',
    doctors: [
      {
        doctorId: 'D003',
        doctorName: 'Dr. Michael Wilson',
        role: 'HOD',
        schedule: 'Tue-Thu 10AM-6PM'
      }
    ],
    stats: {
      totalPatients: 650,
      todayAppointments: 18,
      monthlyRevenue: 420000
    },
    isActive: true
  }
];

const defaultTemplate: PrescriptionTemplate = {
  id: 'default',
  name: 'Default Template',
  isDefault: true,
  header: {
    showLogo: true,
    hospitalName: 'NexEagle Hospital',
    contactInfo: true,
    customText: 'Providing Quality Healthcare'
  },
  sections: {
    vitals: true,
    diagnosis: true,
    advice: true,
    medicines: true,
    nextAppointment: true
  },
  footer: {
    signature: true,
    qrCode: true,
    customNotes: 'Thank you for choosing our services'
  }
};

const defaultBranding: HospitalBranding = {
  name: 'NexEagle Hospital',
  tagline: 'Providing Quality Healthcare',
  phone: '+91 98765 43210',
  email: 'info@nexeagle.com',
  website: 'www.nexeagle.com',
  address: '123 Hospital Street, Medical District, City - 123456',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b'
};

interface SystemConfigurationProps {
  focusTab?: string;
}

export const SystemConfiguration: React.FC<SystemConfigurationProps> = ({ focusTab }) => {
  const [activeTab, setActiveTab] = useState(focusTab || 'departments');
  const [departments, setDepartments] = useState<Department[]>(sampleDepartments);
  const [prescriptionTemplate, setPrescriptionTemplate] = useState<PrescriptionTemplate>(defaultTemplate);
  const [hospitalBranding, setHospitalBranding] = useState<HospitalBranding>(defaultBranding);
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">System Configuration</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Departments</span>
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Prescription</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <DepartmentManagement
            departments={departments}
            onDepartmentsChange={setDepartments}
          />
        </TabsContent>

        {/* Prescription Template Tab */}
        <TabsContent value="prescription">
          <PrescriptionTemplateConfig
            template={prescriptionTemplate}
            onTemplateChange={setPrescriptionTemplate}
          />
        </TabsContent>

        {/* Hospital Branding Tab */}
        <TabsContent value="branding">
          <HospitalBrandingConfig
            branding={hospitalBranding}
            onBrandingChange={setHospitalBranding}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};