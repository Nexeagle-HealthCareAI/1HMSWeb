import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDoctorApi } from '@/hooks/useApi';
import { useUserDetails } from './useUserProfileApi';
import { UserDetailsResponse } from '@/features/profile/services/userProfileApi';
import { DoctorProfileResponse } from '@/features/doctor/services/doctorProfileApi';

export const useProfileCompletion = () => {
  const userId = useAuthStore((state) => state.userId);
  const userRole = useAuthStore((state) => state.userRole);
  
  // Fetch user details
  const { data: userDetailsResponse } = useUserDetails(userId || '');
  
  // Fetch doctor profile data - only for doctor users
  const { data: doctorProfileResponse, error: doctorProfileError } = useDoctorApi.getDoctorProfile(userId || '');
  
  // Debug logging
  if (userRole === 'Doctor' || userRole === 'AdminDoctor') {
    console.log('Doctor Profile Debug:', {
      userId,
      userRole,
      doctorProfileResponse,
      doctorProfileError,
      errorStatus: doctorProfileError?.response?.status,
      profileCompletionPercentage: (doctorProfileResponse as DoctorProfileResponse)?.profileCompletionPercentage
    });
  }

  const completionPercentage = useMemo(() => {
    let totalFields = 0;
    let filledFields = 0;

    // User profile fields (for all users)
    if (userDetailsResponse && (userDetailsResponse as UserDetailsResponse).userProfile) {
      const userProfile = (userDetailsResponse as UserDetailsResponse).userProfile;
      
      // Basic user profile fields
      const userFields = [
        userProfile.fullName,
        userProfile.gender,
        userProfile.language,
        userProfile.dateOfBirth,
        userProfile.bloodGroup,
        userProfile.addressLine1,
        userProfile.city,
        userProfile.state,
        userProfile.country,
        userProfile.pincode,
        userProfile.emergencyContactName,
        userProfile.emergencyContactNumber
      ];

      totalFields += userFields.length;
      filledFields += userFields.filter(field => 
        field && field.toString().trim() !== '' && field !== 'null' && field !== 'undefined'
      ).length;
    }

    // Doctor-specific fields (only for doctor users)
    if (userRole === 'Doctor' || userRole === 'AdminDoctor') {
      if (doctorProfileResponse && (doctorProfileResponse as DoctorProfileResponse).profileCompletionPercentage !== undefined) {
        // Use the profileCompletionPercentage from API response
        const doctorCompletion = (doctorProfileResponse as DoctorProfileResponse).profileCompletionPercentage;
        
        // Calculate weighted completion: 50% user profile + 50% doctor profile
        const userCompletion = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
        const weightedCompletion = (userCompletion * 0.5) + (doctorCompletion * 0.5);
        
        return Math.round(weightedCompletion);
      } else if (doctorProfileError) {
        // If there's an error (like 404), it means no doctor profile exists
        // Add doctor fields to total but count them as 0% complete
        const doctorFields = [
          'licenseNumber',
          'qualifications',
          'experienceYears',
          'medicalCouncil',
          'registrationYear',
          'bio',
          'departmentId',
          'specializations'
        ];
        totalFields += doctorFields.length;
        // filledFields remains the same (0 for doctor fields)
      }
    }

    // Calculate percentage
    if (totalFields === 0) return 0;
    const percentage = Math.round((filledFields / totalFields) * 100);
    
    return Math.min(percentage, 100); // Ensure it doesn't exceed 100%
  }, [userDetailsResponse, doctorProfileResponse, userRole]);

  return {
    completionPercentage,
    isLoading: (!userDetailsResponse && !userId) || 
              ((userRole === 'Doctor' || userRole === 'AdminDoctor') && !doctorProfileResponse && !doctorProfileError),
    hasProfile: !!(userDetailsResponse as UserDetailsResponse)?.userProfile || !!doctorProfileResponse,
    doctorProfileCompletion: (doctorProfileResponse as DoctorProfileResponse)?.profileCompletionPercentage || 0
  };
};
