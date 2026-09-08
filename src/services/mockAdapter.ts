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
  // 13. Billing Policy
  else if (url.includes('billing/policy')) {
    mockData = {
      success: true,
      data: {
        labPathTrigger: 'OFF',
        labRadTrigger: 'OFF',
        pharmacyIpdTrigger: 'OFF',
        opdConsultTrigger: 'AUTO',
        ipdBedChargeMode: 'DAILY_AUTO',
        numberSeries: {
          INV: { prefix: 'INV', yearFormat: 'YYYY', separator: '-', currentValue: '142', padLength: '6', isActive: true },
          RCPT: { prefix: 'RCPT', yearFormat: 'YYYY', separator: '-', currentValue: '98', padLength: '6', isActive: true }
        }
      }
    };
  }
  // 14. Consent Templates
  else if (url.includes('/consent-template')) {
    mockData = {
      success: true,
      templates: [
        {
          consentTemplateId: 'CT-GEN-01',
          typeCode: 'GENERAL_ADMISSION',
          title: 'General Admission & Medical Treatment',
          language: 'English',
          version: 1,
          isActive: true,
          bodyHtml: '<h4>General Consent for Admission and Treatment</h4><p>I hereby authorize the medical staff of this hospital to perform such medical treatments, administer such medications, and perform such diagnostic procedures as may be deemed necessary for my care.</p><p>I understand that the practice of medicine and surgery is not an exact science and I acknowledge that no guarantees have been made to me regarding the outcome of any treatments or examinations.</p><p>I consent to the disposal of any bodily fluids or tissues removed during diagnostic procedures according to standard hospital protocols.</p>'
        },
        {
          consentTemplateId: 'CT-SURG-01',
          typeCode: 'PROCEDURE',
          title: 'High-Risk Surgical / Invasive Procedure',
          language: 'English',
          version: 2,
          isActive: true,
          bodyHtml: '<h4>Consent for Surgical/Invasive Procedure</h4><p>I authorize the surgical team to perform the planned operation and any other additional procedures they deem necessary during the operation to ensure my safety and health.</p><p>The specific risks of this procedure, the expected benefits, and the alternatives (including the risks of not having the procedure) have been explained to me clearly. I am aware that risks may include, but are not limited to: severe bleeding, infection, allergic reactions, cardiac arrest, or even death.</p><p>I understand I have the right to ask questions and have had all my questions answered satisfactorily.</p>'
        },
        {
          consentTemplateId: 'CT-ANES-01',
          typeCode: 'PROCEDURE',
          title: 'Administration of Anaesthesia',
          language: 'English',
          version: 1,
          isActive: true,
          bodyHtml: '<h4>Consent for Anaesthesia</h4><p>I consent to the administration of anaesthesia (General, Regional, or Local) under the direction of the attending Anaesthesiologist.</p><p>I have been informed of the risks associated with anaesthesia, which may include respiratory problems, drug reactions, nerve damage, brain damage, or in extremely rare cases, death. I understand that the exact type of anaesthesia will be determined by my condition and the requirements of the surgery.</p>'
        },
        {
          consentTemplateId: 'CT-BLOOD-01',
          typeCode: 'PROCEDURE',
          title: 'Blood and Blood Products Transfusion',
          language: 'English',
          version: 1,
          isActive: true,
          bodyHtml: '<h4>Consent for Blood Transfusion</h4><p>I understand that my medical condition may require the transfusion of whole blood or blood products (like PRBC, platelets, or plasma). The attending doctor has explained the risks, benefits, and alternatives.</p><p>I have been informed of the potential risks including, but not limited to: severe allergic reactions, fever, and the transmission of infectious diseases such as HIV, Hepatitis B, and Hepatitis C, despite rigorous testing of the blood supply.</p><p>I hereby give my informed consent to receive blood/blood products as deemed necessary by my physician.</p>'
        },
        {
          consentTemplateId: 'CT-LAMA-01',
          typeCode: 'LAMA',
          title: 'Leave Against Medical Advice (LAMA)',
          language: 'English',
          version: 1,
          isActive: true,
          bodyHtml: '<h4>Leave Against Medical Advice</h4><p>I, the undersigned, insist on leaving the hospital against the explicit advice of the attending physician.</p><p>I have been informed of the potential risks to my health, life, and recovery if I leave without completing the recommended medical treatment. I fully understand that leaving the hospital prematurely may lead to severe complications or death.</p><p>I hereby completely discharge the hospital, the attending physicians, and all nursing staff from any liability or legal responsibility for any adverse consequences resulting from my decision.</p>'
        },
        {
          consentTemplateId: 'CT-REFUSAL-01',
          typeCode: 'OTHER',
          title: 'Refusal of Medical Treatment',
          language: 'English',
          version: 1,
          isActive: true,
          bodyHtml: '<h4>Refusal of Recommended Treatment</h4><p>I have been advised by the medical staff that a specific medical intervention or medication is necessary for my proper care and recovery.</p><p>I am explicitly refusing this recommended treatment. The potential medical risks of my refusal have been fully explained to me. I assume full responsibility for this decision and release the hospital and its staff from any liability arising from this refusal.</p>'
        },
        {
          consentTemplateId: 'CT-RESTRAINT-01',
          typeCode: 'OTHER',
          title: 'Consent for Use of Restraints',
          language: 'English',
          version: 1,
          isActive: true,
          bodyHtml: '<h4>Consent for Restraints</h4><p>I understand that for the safety of the patient, the medical team may need to employ physical or chemical restraints. This is to prevent the patient from unintentionally removing vital medical devices (like breathing tubes or IV lines) or causing harm to themselves or others.</p><p>I consent to the temporary use of these restraints, which will be regularly monitored and removed as soon as it is medically safe to do so.</p>'
        },
        {
          consentTemplateId: 'CT-MEDIA-01',
          typeCode: 'OTHER',
          title: 'Consent for Clinical Photography/Videography',
          language: 'English',
          version: 1,
          isActive: true,
          bodyHtml: '<h4>Consent for Clinical Media</h4><p>I give my consent to be photographed or video-recorded by the medical staff for the specific purposes of clinical documentation, treatment planning, telemedicine consultation, or medical education.</p><p>I understand that my identity will remain confidential to the greatest extent possible, and these images will not be used for public marketing or unauthorized dissemination without a separate explicit agreement.</p>'
        },
        {
          consentTemplateId: 'CT-HIV-01',
          typeCode: 'PROCEDURE',
          title: 'Consent for HIV / High-Risk Viral Testing',
          language: 'English',
          version: 1,
          isActive: true,
          bodyHtml: '<h4>Consent for HIV/Viral Testing</h4><p>I give my consent to have my blood tested for the Human Immunodeficiency Virus (HIV) and other high-risk viral infections (like Hepatitis B and C).</p><p>I have received appropriate pre-test counseling regarding the implications of the test results. I understand that the results will be kept strictly confidential in my medical record and only disclosed as required by public health laws.</p>'
        }
      ]
    };
  }
  // 15. Consent Records (GET and POST)
  else if (url.includes('/consent-record')) {
    if (method === 'GET') {
      mockData = {
        success: true,
        records: [
          {
            consentRecordId: 'REC-001',
            templateTypeCode: 'GENERAL_ADMISSION',
            templateTitle: 'General Admission & Treatment Consent',
            templateVersion: 1,
            signedByName: 'Patient Name',
            signerRelation: 'Self',
            signedAt: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      };
    } else {
      mockData = {
        success: true,
        message: 'Consent signed successfully',
        recordId: 'REC-NEW-' + Math.floor(Math.random() * 1000)
      };
    }
  }
  return {
    data: mockData,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
  };
};
