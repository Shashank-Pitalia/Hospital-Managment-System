export interface PrescriptionItemPayload {
  medicineName: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface CreatePrescriptionPayload {
  visitId: string;
  symptoms?: string;
  examinationNotes?: string;
  diagnosisText: string;
  followUpFlag?: boolean;
  admissionRecommended?: boolean;
  items: PrescriptionItemPayload[];
  labTests?: string[];
}

export interface PrescriptionRecord {
  id: string;
  visitId: string;
  doctorId: string;
  status: 'DRAFT' | 'SIGNED' | 'PARTIALLY_DISPENSED' | 'CLOSED';
  signedAt: string | null;
  createdAt: string;
  items: {
    id: string;
    medicineName: string;
    dose: string;
    frequency: string;
    duration: string;
    dispenseStatus: string;
  }[];
}

export async function createPrescription(
  payload: CreatePrescriptionPayload,
  token: string,
): Promise<{ diagnosis: Record<string, unknown>; prescription: PrescriptionRecord }> {
  const res = await fetch('/api/prescriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create prescription');
  }

  return res.json();
}

export async function signPrescription(id: string, token: string): Promise<PrescriptionRecord> {
  const res = await fetch(`/api/prescriptions/${id}/sign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to sign prescription');
  }

  return res.json();
}
