import { AuthService } from '@/services/authService';
import { API_BASE_URL, API_ENDPOINTS, DEFAULT_HEADERS } from '@/config/api';

// Base API configuration

// Generic API client for making authenticated requests
export class ApiClient {
  private static getHeaders(): HeadersInit {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // GET request
  static async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        AuthService.logout();
        window.location.href = '/';
        throw new Error('Authentication required');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // POST request
  static async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        AuthService.logout();
        window.location.href = '/';
        throw new Error('Authentication required');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // PUT request
  static async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        AuthService.logout();
        window.location.href = '/';
        throw new Error('Authentication required');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // DELETE request
  static async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        AuthService.logout();
        window.location.href = '/';
        throw new Error('Authentication required');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Example usage functions for common API calls
export const patientApi = {
  // Get all patients
  getAll: () => ApiClient.get(API_ENDPOINTS.PATIENTS),
  
  // Get patient by ID
  getById: (id: string) => ApiClient.get(`${API_ENDPOINTS.PATIENTS}/${id}`),
  
  // Create new patient
  create: (patientData: any) => ApiClient.post(API_ENDPOINTS.PATIENTS, patientData),
  
  // Update patient
  update: (id: string, patientData: any) => ApiClient.put(`${API_ENDPOINTS.PATIENTS}/${id}`, patientData),
  
  // Delete patient
  delete: (id: string) => ApiClient.delete(`${API_ENDPOINTS.PATIENTS}/${id}`),
};

export const appointmentApi = {
  // Get all appointments
  getAll: () => ApiClient.get(API_ENDPOINTS.APPOINTMENTS),
  
  // Get appointment by ID
  getById: (id: string) => ApiClient.get(`${API_ENDPOINTS.APPOINTMENTS}/${id}`),
  
  // Create new appointment
  create: (appointmentData: any) => ApiClient.post(API_ENDPOINTS.APPOINTMENTS, appointmentData),
  
  // Update appointment
  update: (id: string, appointmentData: any) => ApiClient.put(`${API_ENDPOINTS.APPOINTMENTS}/${id}`, appointmentData),
  
  // Delete appointment
  delete: (id: string) => ApiClient.delete(`${API_ENDPOINTS.APPOINTMENTS}/${id}`),
};

export const doctorApi = {
  // Get all doctors
  getAll: () => ApiClient.get(API_ENDPOINTS.DOCTORS),
  
  // Get doctor by ID
  getById: (id: string) => ApiClient.get(`${API_ENDPOINTS.DOCTORS}/${id}`),
  
  // Get doctor profile
  getProfile: () => ApiClient.get(`${API_ENDPOINTS.DOCTORS}/profile`),
  
  // Update doctor profile
  updateProfile: (profileData: any) => ApiClient.put(`${API_ENDPOINTS.DOCTORS}/profile`, profileData),
}; 