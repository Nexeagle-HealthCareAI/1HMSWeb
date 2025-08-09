import { useState, useEffect } from 'react';
// import { useToast } from '@/hooks/use-toast';
import { Department } from '../components/DepartmentManagement';
import { PrescriptionTemplate } from '../components/PrescriptionTemplateConfig';
import { HospitalBranding } from '../components/HospitalBrandingConfig';

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
  // Core Info
  name: '',
  type: '',

  // Contact
  email: '',
  contact: '',
  alternateContact: '',
  website: '',

  // Location
  location: '',
  city: '',
  state: '',
  country: '',
  pincode: '',

  // Config & Metadata
  timeZone: '',
  registrationNumber: ''
};

export const useSystemConfiguration = (focusTab?: string) => {
  // Map focusTab to the correct tab value
  const getInitialTab = () => {
    if (focusTab === 'hospital') return 'branding';
    if (focusTab === 'prescription') return 'prescription';
    if (focusTab === 'departments') return 'departments';
    return 'departments';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [departments, setDepartments] = useState<Department[]>(sampleDepartments);
  const [prescriptionTemplate, setPrescriptionTemplate] = useState<PrescriptionTemplate>(defaultTemplate);
  const [hospitalBranding, setHospitalBranding] = useState<HospitalBranding>(defaultBranding);
  // Disable toasts temporarily
  const toast = (_?: any) => {};

  // Update active tab when focusTab changes
  useEffect(() => {
    if (focusTab) {
      const newTab = getInitialTab();
      setActiveTab(newTab);
    }
  }, [focusTab]);

  const handleDepartmentChange = (updatedDepartments: Department[]) => {
    setDepartments(updatedDepartments);
    toast({
      title: "Departments Updated",
      description: "Department configuration has been saved successfully."
    });
  };

  const handleTemplateChange = (updatedTemplate: PrescriptionTemplate) => {
    setPrescriptionTemplate(updatedTemplate);
    toast({
      title: "Template Updated",
      description: "Prescription template has been saved successfully."
    });
  };

  const handleBrandingChange = (updatedBranding: HospitalBranding) => {
    setHospitalBranding(updatedBranding);
    // toast removed temporarily
  };

  const addDepartment = (department: Department) => {
    setDepartments(prev => [...prev, department]);
    toast({
      title: "Department Added",
      description: "New department has been added successfully."
    });
  };

  const updateDepartment = (id: string, updatedDepartment: Department) => {
    setDepartments(prev => prev.map(dept => dept.id === id ? updatedDepartment : dept));
    toast({
      title: "Department Updated",
      description: "Department has been updated successfully."
    });
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(dept => dept.id !== id));
    toast({
      title: "Department Deleted",
      description: "Department has been deleted successfully."
    });
  };

  return {
    activeTab,
    setActiveTab,
    departments,
    prescriptionTemplate,
    hospitalBranding,
    handleDepartmentChange,
    handleTemplateChange,
    handleBrandingChange,
    addDepartment,
    updateDepartment,
    deleteDepartment
  };
};
