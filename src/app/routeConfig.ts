// Route configuration for the application
export interface RouteConfig {
  path: string;
  component: string;
  allowedRoles: string[];
  requiresAuth: boolean;
  layout?: string;
}

export const ROUTES = {
  // Public routes
  HOME: '/easyHMS/',
  LOGIN: '/easyHMS/login',
  NOT_FOUND: '/easyHMS/404',
  FORGOT_PASSWORD: '/easyHMS/forgot-password',

  USER_TYPE_SELECTION: '/easyHMS/user-type-selection',
  USER_ONBOARDING: '/easyHMS/user-onboarding',
  LOCKED_ACCOUNT: '/easyHMS/locked-account',

  // Protected routes
  DOCBOARD: '/easyHMS/docboard',
  ADMIN: '/easyHMS/admin',
  CALENDAR: '/easyHMS/calendar',
  APPOINTMENT_DASHBOARD: '/easyHMS/appointment-dashboard',
  APPOINTMENT_SCHEDULER: '/easyHMS/appointment-scheduler',
  BOOK_APPOINTMENT: '/easyHMS/book-appointment',
  BILLING: '/easyHMS/billing',
  DOC_AI: '/easyHMS/doc-ai',
  CHAT: '/easyHMS/chat',
  BULK_MESSAGING: '/easyHMS/bulk-messaging',
  PATIENTS: '/easyHMS/patients',
  PROFILE: '/easyHMS/profile',
  PRESCRIPTION: '/easyHMS/prescription/:patientId',
} as const;

export const ROUTE_CONFIG: RouteConfig[] = [
  // Public routes
  {
    path: ROUTES.HOME,
    component: 'LoginPage',
    allowedRoles: [],
    requiresAuth: false,
  },
  {
    path: ROUTES.LOGIN,
    component: 'LoginPage',
    allowedRoles: [],
    requiresAuth: false,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    component: 'ForgotPasswordPage',
    allowedRoles: [],
    requiresAuth: false,
  },

  {
    path: ROUTES.USER_TYPE_SELECTION,
    component: 'UserTypeSelectionPage',
    allowedRoles: [],
    requiresAuth: false,
  },
  {
    path: ROUTES.USER_ONBOARDING,
    component: 'UserOnboardingRegistration',
    allowedRoles: [],
    requiresAuth: false,
  },
  {
    path: ROUTES.LOCKED_ACCOUNT,
    component: 'LockedAccountPage',
    allowedRoles: [],
    requiresAuth: false,
  },
  {
    path: ROUTES.NOT_FOUND,
    component: 'NotFoundPage',
    allowedRoles: [],
    requiresAuth: false,
  },

  // Admin-only routes
  {
    path: ROUTES.ADMIN,
    component: 'AdminDashboard',
    allowedRoles: ['admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },

  // Doctor and Admin routes
  {
    path: ROUTES.DOCBOARD,
    component: 'DocBoard',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.CALENDAR,
    component: 'DoctorCalendar',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.APPOINTMENT_DASHBOARD,
    component: 'AppointmentDashboard',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.APPOINTMENT_SCHEDULER,
    component: 'AppointmentDashboard',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.BOOK_APPOINTMENT,
    component: 'AppointmentBooking',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.BILLING,
    component: 'Billing',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.DOC_AI,
    component: 'DocAI',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.CHAT,
    component: 'InternalChat',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.BULK_MESSAGING,
    component: 'BulkMessaging',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.PATIENTS,
    component: 'PatientsPage',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.PROFILE,
    component: 'ProfilePage',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
  {
    path: ROUTES.PRESCRIPTION,
    component: 'EPrescription',
    allowedRoles: ['doctor', 'admin'],
    requiresAuth: true,
    layout: 'MainLayout',
  },
];

// Helper functions
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return ROUTE_CONFIG.find(route => route.path === path);
};

export const isRouteProtected = (path: string): boolean => {
  const route = getRouteByPath(path);
  return route?.requiresAuth || false;
};

export const getRouteRoles = (path: string): string[] => {
  const route = getRouteByPath(path);
  return route?.allowedRoles || [];
};
