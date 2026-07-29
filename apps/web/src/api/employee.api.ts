export interface VerifiedEmployeeData {
  employeeId: string;
  name: string;
  department: string;
  postTitle: string;
  gradePayLevel: string;
  employmentTypeCode: 'PERMANENT' | 'CONTRACTUAL';
  contactPhone?: string;
  contactEmail?: string;
}

export interface VerificationResponse {
  status: 'VERIFIED' | 'UNVERIFIED';
  verifiedData: VerifiedEmployeeData | null;
  message?: string;
}

export interface RegistrationResponse {
  status: 'REGISTERED' | 'ALREADY_REGISTERED' | 'MANUAL_VERIFICATION_PENDING';
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    post: { title: string };
    grade: { payLevel: string };
    employmentType: { code: string; name: string };
    contactPhone?: string;
    contactEmail?: string;
  };
  hospitalUid?: {
    uidCode: string;
    issuedAt: string;
  };
  qrDataUrl?: string;
  caseId?: string;
  reason?: string;
}

export interface UidCardDataResponse {
  uidCode: string;
  qrDataUrl: string;
  issuedAt: string;
  employee: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    post: { title: string };
    grade: { payLevel: string };
    employmentType: { code: string; name: string };
    contactPhone?: string;
    contactEmail?: string;
  };
}

export async function verifyEmployeeId(
  employeeId: string,
  token: string,
): Promise<VerificationResponse> {
  const res = await fetch('/api/employees/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ employeeId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Verification request failed');
  }

  return res.json();
}

export async function registerEmployee(
  employeeId: string,
  token: string,
): Promise<RegistrationResponse> {
  const res = await fetch('/api/employees/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ employeeId }),
  });

  if (res.status === 409) {
    const data = await res.json();
    throw new Error(data.message || 'Employee ID is already registered');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Registration failed');
  }

  return res.json();
}

export async function fetchUidCard(uidCode: string, token: string): Promise<UidCardDataResponse> {
  const res = await fetch(`/api/employees/${encodeURIComponent(uidCode)}/card`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch Hospital UID Card data');
  }

  return res.json();
}
