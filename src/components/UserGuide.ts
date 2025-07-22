export interface GuideSection {
  id: string;
  title: string;
  description: string;
  steps?: GuideStep[];
  quickTips?: string[];
  commonIssues?: CommonIssue[];
}

export interface GuideStep {
  step: number;
  title: string;
  description: string;
  image?: string;
  note?: string;
}

export interface CommonIssue {
  issue: string;
  solution: string;
}

export const USER_GUIDE: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with NexEagle easyHMS',
    description: 'Learn the basics of navigating and using the Hospital Management System',
    steps: [
      {
        step: 1,
        title: 'Login to the System',
        description: 'Enter your credentials provided by your administrator. Contact IT support if you forgot your password.',
        note: 'First-time users will be required to complete their profile.'
      },
      {
        step: 2,
        title: 'Dashboard Overview',
        description: 'The main dashboard shows today\'s appointments, patient statistics, and quick actions. Use the sidebar navigation to access different modules.',
      },
      {
        step: 3,
        title: 'Complete Your Profile',
        description: 'Click on your profile icon and complete all required information including specialization, working hours, and contact details.',
      }
    ],
    quickTips: [
      'Use Ctrl+K to quickly search for patients, appointments, or navigate to any page',
      'The AI chatbot (bottom-right) can help with medical questions and system navigation',
      'Click the notification bell to see recent activities and alerts'
    ]
  },
  {
    id: 'patient-management',
    title: 'Patient Management',
    description: 'How to add, search, and manage patient records effectively',
    steps: [
      {
        step: 1,
        title: 'Adding New Patient',
        description: 'Go to Patients page → Click "Add Patient" → Fill in personal details, emergency contact, and medical history.',
        note: 'Patient ID is auto-generated. Ensure contact information is accurate for appointment reminders.'
      },
      {
        step: 2,
        title: 'Searching Patients',
        description: 'Use the search bar to find patients by: Patient ID, Name, Phone Number, or Email. Use filters for advanced search.',
      },
      {
        step: 3,
        title: 'Updating Patient Information',
        description: 'Click on patient name → Edit Patient → Update information → Save. All changes are logged for audit purposes.',
      },
      {
        step: 4,
        title: 'Patient History',
        description: 'View complete medical history, past appointments, prescriptions, lab reports, and billing information in the patient profile.',
      }
    ],
    commonIssues: [
      {
        issue: 'Patient not showing in search results',
        solution: 'Check spelling, try partial names, or search by phone/email. Patient might be marked inactive.'
      },
      {
        issue: 'Cannot edit patient information',
        solution: 'Check if you have edit permissions for Patient Management. Contact admin if needed.'
      }
    ]
  },
  {
    id: 'appointment-scheduling',
    title: 'Appointment Scheduling',
    description: 'Book, manage, and track patient appointments efficiently',
    steps: [
      {
        step: 1,
        title: 'Booking New Appointment',
        description: 'Navigate to Appointment Scheduler → Select Department and Doctor → Choose date and available time slot → Enter patient details or search existing patient.',
      },
      {
        step: 2,
        title: 'Managing Appointments',
        description: 'View appointments in calendar or list view. Use filters to see appointments by date, doctor, or department.',
      },
      {
        step: 3,
        title: 'Rescheduling Appointments',
        description: 'Click on appointment → Reschedule → Select new date/time → Notify patient via SMS/email.',
        note: 'System will automatically check for conflicts and suggest alternative slots.'
      },
      {
        step: 4,
        title: 'Appointment Check-in',
        description: 'When patient arrives, mark them as "Checked In" from the appointment list or patient profile.',
      }
    ],
    quickTips: [
      'Color-coded calendar: Green (Available), Orange (Busy), Red (Unavailable)',
      'Double-click on calendar to quickly book appointment for that time',
      'Use "Today\'s Appointments" widget for quick access to current day schedule'
    ],
    commonIssues: [
      {
        issue: 'Time slot shows as unavailable',
        solution: 'Check doctor\'s working hours and break times. Slot might be already booked or blocked.'
      },
      {
        issue: 'Cannot send appointment confirmation',
        solution: 'Verify patient\'s phone number and email. Check if SMS/email service is configured.'
      }
    ]
  },
  {
    id: 'prescription-management',
    title: 'Digital Prescription (E-Prescription)',
    description: 'Create, manage, and print digital prescriptions',
    steps: [
      {
        step: 1,
        title: 'Creating New Prescription',
        description: 'Open patient profile → Go to E-Prescription tab → Click "New Prescription" → Select from medicine database or add custom medications.',
      },
      {
        step: 2,
        title: 'Adding Medications',
        description: 'Search medicine by name → Select strength and form → Enter dosage (e.g., "1-0-1 After Food") → Add duration and instructions.',
        note: 'Use medicine database for accurate drug information and interactions.'
      },
      {
        step: 3,
        title: 'Adding Diagnosis and Advice',
        description: 'Enter primary and secondary diagnosis → Add general advice and lifestyle recommendations → Include next appointment date if needed.',
      },
      {
        step: 4,
        title: 'Printing and Saving',
        description: 'Preview prescription → Print or email to patient → Prescription is automatically saved in patient history.',
      }
    ],
    quickTips: [
      'Use prescription templates for common conditions to save time',
      'Right-click on medicine name to check drug interactions',
      'Include clear instructions for dosage timing and food relations'
    ]
  },
  {
    id: 'billing-insurance',
    title: 'Billing & Insurance Management',
    description: 'Handle patient billing, insurance claims, and financial transactions',
    steps: [
      {
        step: 1,
        title: 'Creating Patient Bill',
        description: 'Go to Billing → New Bill → Select patient → Add services (Consultation, Tests, Procedures) → Apply discounts if any → Calculate total.',
      },
      {
        step: 2,
        title: 'Processing Payments',
        description: 'Select payment method (Cash, Card, UPI, Insurance) → For insurance, verify coverage → Process payment → Generate receipt.',
      },
      {
        step: 3,
        title: 'Insurance Claim Processing',
        description: 'Billing & Insurance → Insurance Management → Create claim → Upload required documents → Submit to insurance provider → Track status.',
      },
      {
        step: 4,
        title: 'Financial Reports',
        description: 'Access Reports section for daily collection, outstanding dues, insurance settlements, and revenue analysis.',
      }
    ],
    commonIssues: [
      {
        issue: 'Insurance verification fails',
        solution: 'Check policy number, validity dates, and coverage limits. Contact insurance provider if needed.'
      },
      {
        issue: 'Payment gateway error',
        solution: 'Verify internet connection, card details, and try alternative payment methods.'
      }
    ]
  },
  {
    id: 'lab-reports',
    title: 'Laboratory Management',
    description: 'Order tests, track results, and manage lab workflows',
    steps: [
      {
        step: 1,
        title: 'Ordering Lab Tests',
        description: 'From patient profile → Lab Reports → Order Tests → Select tests from catalog → Set urgency level → Submit order.',
      },
      {
        step: 2,
        title: 'Sample Collection',
        description: 'Print sample collection labels → Mark samples as collected → Update collection time and technician details.',
      },
      {
        step: 3,
        title: 'Result Entry',
        description: 'Lab technician enters results → Doctor reviews and approves → System flags abnormal values → Results are available to patient.',
      },
      {
        step: 4,
        title: 'Report Generation',
        description: 'Generate formatted reports → Include reference ranges → Print or email to patient → Archive in patient records.',
      }
    ]
  },
  {
    id: 'user-management',
    title: 'User Management (Admin Only)',
    description: 'Manage users, roles, and permissions in the system',
    steps: [
      {
        step: 1,
        title: 'Adding New Users',
        description: 'User Management → Users tab → Add User → Enter basic details (name, email, phone) → Assign roles → Set department.',
        note: 'Users can be assigned multiple roles for flexibility.'
      },
      {
        step: 2,
        title: 'Managing Roles & Permissions',
        description: 'Go to Roles & Permissions tab → View permission matrix → Create custom roles → Duplicate existing roles for modifications.',
      },
      {
        step: 3,
        title: 'Bulk User Upload',
        description: 'Use Bulk Upload feature for adding multiple users → Download CSV template → Fill user details → Upload file.',
      },
      {
        step: 4,
        title: 'User Activity Monitoring',
        description: 'Monitor user activities in Activity tab → Track logins, actions, and system usage → Review audit logs for security.',
      }
    ],
    quickTips: [
      'Default roles: Doctor, Nurse, Receptionist, Lab Technician, Pharmacist, Admin',
      'Create department-specific roles for better organization',
      'Regular review of user permissions ensures security'
    ]
  },
  {
    id: 'system-configuration',
    title: 'System Configuration (Admin Only)',
    description: 'Configure hospital settings, departments, and system preferences',
    steps: [
      {
        step: 1,
        title: 'Department Management',
        description: 'System Configuration → Departments → Add/Edit departments → Assign doctors → Set working schedules → Configure department statistics.',
      },
      {
        step: 2,
        title: 'Prescription Templates',
        description: 'Configure prescription header, footer, and sections → Set hospital branding → Customize prescription format for different doctors.',
      },
      {
        step: 3,
        title: 'Hospital Branding',
        description: 'Update hospital information → Set contact details → Upload logo → Configure color theme → Customize system appearance.',
      }
    ]
  },
  {
    id: 'reports-analytics',
    title: 'Reports & Analytics',
    description: 'Generate various reports and analyze hospital performance',
    steps: [
      {
        step: 1,
        title: 'Patient Reports',
        description: 'Generate reports for patient registration, demographics, visit frequency, and medical history trends.',
      },
      {
        step: 2,
        title: 'Financial Reports',
        description: 'Daily collection reports, revenue analysis, insurance settlements, outstanding dues, and payment method analysis.',
      },
      {
        step: 3,
        title: 'Operational Reports',
        description: 'Doctor productivity, department performance, appointment analytics, and resource utilization reports.',
      },
      {
        step: 4,
        title: 'Custom Reports',
        description: 'Create custom reports with specific date ranges, filters, and parameters. Export in PDF, Excel, or CSV formats.',
      }
    ]
  },
  {
    id: 'ai-assistance',
    title: 'AI Assistant & DocAI',
    description: 'Leverage AI features for medical assistance and documentation',
    steps: [
      {
        step: 1,
        title: 'Using AI Chatbot',
        description: 'Click the AI assistant icon → Ask medical questions → Get system navigation help → Access quick actions.',
        note: 'AI can help with ICD codes, drug information, and medical guidelines.'
      },
      {
        step: 2,
        title: 'DocAI Features',
        description: 'Access DocAI for clinical decision support → Get differential diagnosis suggestions → Check drug interactions → Review treatment protocols.',
      },
      {
        step: 3,
        title: 'Voice Commands',
        description: 'Use voice input for hands-free operation → Dictate prescriptions → Voice search for patients → Navigate using voice commands.',
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Common Issues & Troubleshooting',
    description: 'Solutions for frequently encountered problems',
    commonIssues: [
      {
        issue: 'System is running slow',
        solution: 'Clear browser cache, check internet connection, close unnecessary tabs, or contact IT support.'
      },
      {
        issue: 'Cannot login to system',
        solution: 'Verify username/password, check caps lock, ensure account is not suspended, contact administrator.'
      },
      {
        issue: 'Prescription not printing correctly',
        solution: 'Check printer settings, verify paper size, update printer drivers, try different browser.'
      },
      {
        issue: 'Patient data not syncing',
        solution: 'Check internet connection, refresh page, logout and login again, contact technical support.'
      },
      {
        issue: 'Cannot access certain features',
        solution: 'Check user permissions with admin, verify role assignments, ensure proper license activation.'
      },
      {
        issue: 'Appointment reminders not sent',
        solution: 'Verify patient contact details, check SMS/email service status, review notification settings.'
      }
    ]
  },
  {
    id: 'best-practices',
    title: 'Best Practices & Tips',
    description: 'Recommendations for optimal system usage',
    quickTips: [
      'Regular backups: Ensure patient data is backed up regularly',
      'Data accuracy: Always verify patient information before saving',
      'Security: Use strong passwords and logout when not in use',
      'Updates: Keep the system updated for latest features and security',
      'Training: Regular training sessions for staff on new features',
      'Documentation: Maintain proper medical documentation standards',
      'Compliance: Follow HIPAA and local medical record regulations',
      'Performance: Close unused tabs and clear cache periodically',
      'Support: Document and report recurring issues to IT support',
      'Workflow: Establish standard operating procedures for common tasks'
    ]
  }
];

export const searchGuide = (query: string): GuideSection[] => {
  const searchTerm = query.toLowerCase();
  
  return USER_GUIDE.filter(section => {
    const titleMatch = section.title.toLowerCase().includes(searchTerm);
    const descriptionMatch = section.description.toLowerCase().includes(searchTerm);
    const stepsMatch = section.steps?.some(step => 
      step.title.toLowerCase().includes(searchTerm) || 
      step.description.toLowerCase().includes(searchTerm)
    );
    const tipsMatch = section.quickTips?.some(tip => 
      tip.toLowerCase().includes(searchTerm)
    );
    const issuesMatch = section.commonIssues?.some(issue => 
      issue.issue.toLowerCase().includes(searchTerm) ||
      issue.solution.toLowerCase().includes(searchTerm)
    );
    
    return titleMatch || descriptionMatch || stepsMatch || tipsMatch || issuesMatch;
  });
};

export const getGuideById = (id: string): GuideSection | undefined => {
  return USER_GUIDE.find(section => section.id === id);
};

export const getAllGuideCategories = (): string[] => {
  return USER_GUIDE.map(section => section.title);
};