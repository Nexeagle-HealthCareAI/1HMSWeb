import { axiosInstance as api } from '@/services/axiosClient';

export interface MedicationModel {
  drugName?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  saltName?: string;
}

export interface PrescriptionDetailsDataModel {
  prescriptionId?: string;
  appointmentId: string;
  patientId?: string;
  doctorId: string;
  hospitalId: string;
  medications?: MedicationModel[];
}

export interface GetPrescriptionDetailsResponseModel {
  success: boolean;
  message?: string;
  data?: PrescriptionDetailsDataModel;
}

export const ePrescriptionApi = {
  getPrescriptionDetails: async (
    hospitalId: string,
    appointmentId: string,
    patientId: string,
    doctorId: string
  ): Promise<GetPrescriptionDetailsResponseModel> => {
    // Note: URL path includes route prefix configured on backend: /e-prescription/...
    const response = await api.get<GetPrescriptionDetailsResponseModel>(
      `/e-prescription/details/appointmentId=${appointmentId}&patientId=${patientId}&doctorId=${doctorId}&hospitalId=${hospitalId}`
    );
    return response.data;
  },
};
