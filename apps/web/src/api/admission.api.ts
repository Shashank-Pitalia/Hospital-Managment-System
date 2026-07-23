export interface AdmissionNoteRecord {
  id: string;
  admissionId: string;
  authoredBy: string;
  note: string;
  createdAt: string;
  author: {
    id: string;
    identifier: string;
  };
}

export interface DischargeSummaryRecord {
  id: string;
  admissionId: string;
  approvedBy: string;
  summaryText: string;
  generatedAt: string;
  approver: {
    id: string;
    identifier: string;
  };
}

export interface BedRecord {
  id: string;
  bedNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  room: {
    id: string;
    roomNumber: string;
    type: 'SINGLE' | 'SHARED' | 'GENERAL';
    ward: {
      id: string;
      name: string;
      category: string;
    };
  };
}

export interface AdmissionRecord {
  id: string;
  visitId: string;
  status: 'REQUESTED' | 'ELIGIBILITY_CHECKED' | 'AWAITING_BED' | 'ALLOCATED' | 'UNDER_TREATMENT' | 'DISCHARGE_APPROVED' | 'DISCHARGED';
  eligibleCategory: string;
  requestedAt: string;
  allocatedAt: string | null;
  dischargedAt: string | null;
  wardId: string | null;
  roomId: string | null;
  bedId: string | null;
  assignedDoctorId: string | null;
  assignedNurseId: string | null;
  visit: {
    id: string;
    employee: {
      id: string;
      employeeId: string;
      name: string;
      department: string;
      post: { title: string };
      grade: { payLevel: string };
    };
  };
  bed?: {
    id: string;
    bedNumber: string;
    status: string;
  } | null;
  assignedDoctor?: {
    id: string;
    identifier: string;
  } | null;
  assignedNurse?: {
    id: string;
    identifier: string;
  } | null;
  notes?: AdmissionNoteRecord[];
  dischargeSummary?: DischargeSummaryRecord | null;
}

export async function fetchAdmissions(token: string): Promise<AdmissionRecord[]> {
  const res = await fetch('/api/admissions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admissions');
  }
  return res.json();
}

export async function fetchAdmissionById(id: string, token: string): Promise<AdmissionRecord> {
  const res = await fetch(`/api/admissions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admission details');
  }
  return res.json();
}

export async function resolveAdmissionEligibility(id: string, token: string): Promise<AdmissionRecord> {
  const res = await fetch(`/api/admissions/${id}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to resolve admission eligibility');
  }
  return res.json();
}

export async function fetchEligibleBeds(id: string, token: string): Promise<BedRecord[]> {
  const res = await fetch(`/api/admissions/${id}/eligible-beds`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch eligible available beds');
  }
  return res.json();
}

export async function allocateBed(
  id: string,
  body: {
    bedId: string;
    assignedDoctorId: string;
    assignedNurseId: string;
  },
  token: string,
): Promise<AdmissionRecord> {
  const res = await fetch(`/api/admissions/${id}/allocate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to allocate bed');
  }
  return res.json();
}

export async function addAdmissionNote(
  id: string,
  body: { note: string },
  token: string,
): Promise<AdmissionNoteRecord> {
  const res = await fetch(`/api/admissions/${id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error('Failed to add admission note');
  }
  return res.json();
}

export async function dischargePatient(
  id: string,
  body: { summaryText: string },
  token: string,
): Promise<AdmissionRecord> {
  const res = await fetch(`/api/admissions/${id}/discharge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error('Failed to approve discharge');
  }
  return res.json();
}
