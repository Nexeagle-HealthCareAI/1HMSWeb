export interface ChiefComplaintItem {
  id: string;
  label: string;
  category: 'personal' | 'general';
}

export const chiefComplaintMock: ChiefComplaintItem[] = [
  {
    id: 'cc-1',
    label: 'Chest pain',
    category: 'personal',
  },
  {
    id: 'cc-2',
    label: 'Shortness of breath',
    category: 'personal',
  },
  {
    id: 'cc-3',
    label: 'Fever',
    category: 'general',
  },
  {
    id: 'cc-4',
    label: 'Headache',
    category: 'general',
  },
  {
    id: 'cc-5',
    label: 'Abdominal pain',
    category: 'general',
  },
  {
    id: 'cc-6',
    label: 'Cough',
    category: 'general',
  },
  {
    id: 'cc-7',
    label: 'Nausea and vomiting',
    category: 'general',
  },
  {
    id: 'cc-8',
    label: 'Back pain',
    category: 'general',
  },
  {
    id: 'cc-9',
    label: 'Dizziness',
    category: 'general',
  },
  {
    id: 'cc-10',
    label: 'Fatigue',
    category: 'general',
  },
  {
    id: 'cc-11',
    label: 'Joint pain',
    category: 'general',
  },
  {
    id: 'cc-12',
    label: 'Weight loss',
    category: 'general',
  },
];

export const filterChiefComplaints = (query: string): ChiefComplaintItem[] => {
  const term = query.trim().toLowerCase();
  if (!term) {
    return chiefComplaintMock.slice(0, 10);
  }

  return chiefComplaintMock.filter((item) =>
    item.label.toLowerCase().includes(term),
  );
};
