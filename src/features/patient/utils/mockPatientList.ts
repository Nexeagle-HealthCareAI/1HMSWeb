export interface PatientDetails {
    PatientId: string;
    Name: string;
    Age: string;
    Sex: string;
    Contact: string;
    AddressLine: string;
    City: string;
    State: string;
    Country: string;
    PinCode: string;
    RegistrationDate: string;
}

export interface PatientListResponse {
    HospitalId: string;
    Success: boolean;
    Patient: PatientDetails[];
}

export const mockPatientListResponse: PatientListResponse = {
    "HospitalId": "HOSP-001",
    "Success": true,
    "Patient": [
        {
            "PatientId": "P-101",
            "Name": "Sarah Wilson",
            "Age": "45",
            "Sex": "Female",
            "Contact": "+1 234-567-8901",
            "AddressLine": "123 Maple Avenue",
            "City": "Springfield",
            "State": "IL",
            "Country": "USA",
            "PinCode": "62704",
            "RegistrationDate": "2024-03-15"
        },
        {
            "PatientId": "P-102",
            "Name": "James Rodriguez",
            "Age": "32",
            "Sex": "Male",
            "Contact": "+1 234-567-8902",
            "AddressLine": "456 Oak Street",
            "City": "Chicago",
            "State": "IL",
            "Country": "USA",
            "PinCode": "60614",
            "RegistrationDate": "2024-06-22"
        },
        {
            "PatientId": "P-103",
            "Name": "Emily Chen",
            "Age": "28",
            "Sex": "Female",
            "Contact": "+1 234-567-8903",
            "AddressLine": "789 Pine Road",
            "City": "Evanston",
            "State": "IL",
            "Country": "USA",
            "PinCode": "60201",
            "RegistrationDate": "2025-01-10"
        },
        {
            "PatientId": "P-104",
            "Name": "Michael Brown",
            "Age": "55",
            "Sex": "Male",
            "Contact": "+1 234-567-8904",
            "AddressLine": "321 Elm Street",
            "City": "Naperville",
            "State": "IL",
            "Country": "USA",
            "PinCode": "60540",
            "RegistrationDate": "2023-11-08"
        }
    ]
};
