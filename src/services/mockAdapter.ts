import { AxiosRequestConfig } from 'axios';

export const mockAxiosAdapter = async (config: AxiosRequestConfig) => {
  const url = config.url || '';
  const method = config.method?.toUpperCase() || 'GET';
  
  console.log(`[MOCK-API] Intercepted request: ${method} ${url}`, config);
  
  let mockData: any = { success: true, message: 'Mock data fallback' };
  
  // 1. Health
  if (url.includes('health')) {
    mockData = { status: 'healthy', database: 'connected' };
  }
  // 2. Login & signup
  else if (url.includes('auth/user/login')) {
    mockData = {
      success: true,
      message: 'Logged in successfully',
      userId: 'mock-user-aquib',
      accessToken: 'mock-jwt-token-bypass'
    };
  }
  // 3. User permissions
  else if (url.includes('user/permissions')) {
    mockData = {
      success: true,
      roleName: 'AdminDoctor',
      permissionKeys: [
        'appointment:view', 'appointment:create', 'appointment:edit',
        'patient:view', 'patient:create', 'patient:edit', 'patient:delete',
        'billing:view', 'billing:create',
        'doctor:view', 'doctor:edit',
        'admin:view', 'admin:edit'
      ]
    };
  }
  // 4. Hospital mappings / users
  else if (url.includes('hospitals/users/')) {
    mockData = {
      success: true,
      hospitalId: 'PREVIEW-HOSPITAL',
      hospitalID: 'PREVIEW-HOSPITAL',
      employeeId: 'mock-employee-aquib',
      employeeID: 'mock-employee-aquib',
      message: 'Found',
    };
  }
  // 5. Hospital mine
  else if (url.includes('hospitals/mine')) {
    mockData = [
      {
        hospitalId: 'PREVIEW-HOSPITAL',
        hospitalName: 'Star Hospital Preview',
        isPrimary: true,
      }
    ];
  }
  // 6. Hospital details
  else if (url.includes('hospitals/PREVIEW-HOSPITAL') || url.includes('hospitals/')) {
    mockData = {
      success: true,
      hospitalId: 'PREVIEW-HOSPITAL',
      hospitalName: 'Star Hospital Preview',
      address: '123 Main Street',
      mobileNumber: '8319694497',
    };
  }
  // 7. Get user details
  else if (url.includes('user/get-user-details')) {
    mockData = {
      success: true,
      data: {
        userId: 'mock-user-aquib',
        fullName: 'Md Aquib',
        email: 'aquib@gmail.com',
        mobileNumber: '8319694497',
        roles: ['AdminDoctor'],
      }
    };
  }
  // 8. Departments
  else if (url.includes('appointments/departments') || url.includes('departments/global')) {
    mockData = {
      success: true,
      data: [
        { departmentId: 'DEP-GEN', name: 'General Medicine' },
        { departmentId: 'DEP-PED', name: 'Pediatrics' },
        { departmentId: 'DEP-CAR', name: 'Cardiology' },
      ]
    };
  }
  // 9. Doctors / profile
  else if (url.includes('doctors/profile') || url.includes('doctors/stats') || url.includes('doctors/')) {
    mockData = {
      success: true,
      data: {
        doctorId: 'mock-doctor-aquib',
        fullName: 'Dr. Md Aquib',
        specialization: 'Cardiologist',
        department: 'Cardiology',
      }
    };
  }
  // 10. Patient appointments / counts / oversight
  else if (url.includes('appointments/') || url.includes('appointments')) {
    mockData = {
      success: true,
      data: [],
      statusCounts: [],
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }
    };
  }
  // 11. Referred Admissions API
  else if (url.includes('referrals') || url.includes('referral') || url.includes('admission/referral')) {
    mockData = {
      success: true,
      data: [],
      items: [],
      statusCounts: []
    };
  }
  // 12. Bed board
  else if (url.includes('bed/board') || url.includes('beds')) {
    mockData = {
      success: true,
      items: [
        {
          bedId: 'bed-1',
          wardCode: 'GEN-WARD',
          wardName: 'General Ward',
          wardType: 'General',
          floorNo: '1st Floor',
          roomCode: 'RM-101',
          roomType: 'General',
          bedCode: 'B1',
          bedName: 'Bed 1',
          statusCode: 'AVAILABLE',
          isActive: true,
          effectiveDailyRate: 1500,
          sortOrder: 1
        },
        {
          bedId: 'bed-2',
          wardCode: 'GEN-WARD',
          wardName: 'General Ward',
          wardType: 'General',
          floorNo: '1st Floor',
          roomCode: 'RM-101',
          roomType: 'General',
          bedCode: 'B2',
          bedName: 'Bed 2',
          statusCode: 'AVAILABLE',
          isActive: true,
          effectiveDailyRate: 1500,
          sortOrder: 2
        },
        {
          bedId: 'bed-3',
          wardCode: 'PVT-WARD',
          wardName: 'Semi-Private Ward',
          wardType: 'Semi-Private',
          floorNo: '2nd Floor',
          roomCode: 'RM-201',
          roomType: 'Semi-Private',
          bedCode: 'B3',
          bedName: 'Bed 3',
          statusCode: 'AVAILABLE',
          isActive: true,
          effectiveDailyRate: 3000,
          sortOrder: 3
        }
      ]
    };
  }
  
  return {
    data: mockData,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
  };
};
