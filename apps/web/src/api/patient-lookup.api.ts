export interface PatientLookupResponse {
  employee: {
    id: string;
    employeeId: string;
    uid: string;
    name: string;
    department: string;
    post: string;
    grade: string;
    employmentType: string;
    eligibilityCategory: string;
  };
  lastVisit: { id: string; date: string; type: string; status: string } | null;
  openVisit: { id: string; date: string; type: string; status: string } | null;
  activeAdmission: Record<string, unknown> | null;
  openPrescriptions: Record<string, unknown>[];
  historySummary: {
    visitId: string;
    date: string;
    type: string;
    status: string;
    diagnosis?: string;
  }[];
}

export interface CreateVisitPayload {
  employeeId: string;
  type: 'OPD' | 'IPD';
  ignoreOpenVisitWarning?: boolean;
}

export interface CreateVisitResponse {
  status: 'CREATED' | 'OPEN_VISIT_WARNING';
  visit?: {
    id: string;
    employeeId: string;
    type: 'OPD' | 'IPD';
    status: 'OPEN' | 'CLOSED';
    createdAt: string;
  };
  openVisit?: {
    id: string;
    type: string;
    status: string;
    createdAt: string;
  };
  message?: string;
}

export async function lookupPatientByUid(
  uid: string,
  token: string,
): Promise<PatientLookupResponse> {
  const res = await fetch(`/api/patients/lookup?uid=${encodeURIComponent(uid)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Patient lookup failed');
  }

  return res.json();
}

export async function createVisit(
  payload: CreateVisitPayload,
  token: string,
): Promise<CreateVisitResponse> {
  const res = await fetch('/api/visits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create visit');
  }

  return res.json();
}
