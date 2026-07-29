export interface PharmacyQueueRecord {
  id: string;
  visitId: string;
  status: 'DRAFT' | 'SIGNED' | 'PARTIALLY_DISPENSED' | 'CLOSED';
  signedAt: string;
  visit: {
    id: string;
    patientProfile: {
      id: string;
      fullName: string;
      hospitalUid: string;
      employee: {
        employeeId: string;
        employmentType: {
          code: string;
          name: string;
        };
      };
    };
  };
  items: Array<{
    id: string;
    medicineName: string;
    dose: string;
    frequency: string;
    duration: string;
    dispensedQuantity: number;
    dispenseStatus: 'PENDING' | 'DISPENSED' | 'PARTIALLY_DISPENSED';
    benefitOutcome: 'FREE' | 'COVERED' | 'PAID';
  }>;
}

export interface MedicineBatchOption {
  id: string;
  medicineId: string;
  batchNumber: string;
  manufacturer: string;
  expiryDate: string;
  issuePrice: number;
  currentStock: number;
  stockStatus: string;
}

export async function fetchPharmacyQueue(token: string): Promise<PharmacyQueueRecord[]> {
  const res = await fetch('/api/pharmacy/queue', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch pharmacy queue');
  return res.json();
}

export async function fetchBatchOptions(
  prescriptionId: string,
  token: string,
): Promise<Record<string, MedicineBatchOption[]>> {
  const res = await fetch(`/api/pharmacy/prescriptions/${prescriptionId}/batches`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch batch options');
  return res.json();
}

export async function dispenseMedicines(
  prescriptionId: string,
  items: Array<{ prescriptionItemId: string; medicineBatchId: string; dispenseQuantity: number }>,
  token: string,
) {
  const res = await fetch('/api/pharmacy/dispense', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prescriptionId, items }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to dispense medicines');
  }

  return res.json();
}
