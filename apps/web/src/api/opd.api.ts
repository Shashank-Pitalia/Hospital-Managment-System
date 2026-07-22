export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface OPDVisitRecord {
  id: string;
  visitId: string;
  departmentId: string;
  tokenNumber: string;
  calledAt: string | null;
  closedAt: string | null;
  createdAt: string;
  department?: Department;
  visit?: {
    id: string;
    employeeId: string;
    type: string;
    status: string;
    employee?: {
      name: string;
      employeeId: string;
      department?: string;
    };
  };
}

export async function fetchDepartments(token: string): Promise<Department[]> {
  const res = await fetch('/api/departments', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch departments');
  }
  return res.json();
}

export async function createOpdVisit(
  payload: { visitId: string; departmentId: string },
  token: string,
): Promise<{ status: string; opdVisit: OPDVisitRecord; tokenNumber: string }> {
  const res = await fetch('/api/opd-visits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create OPD visit');
  }
  return res.json();
}

export async function fetchOpdQueue(
  departmentId: string,
  token: string,
): Promise<OPDVisitRecord[]> {
  const res = await fetch(
    `/api/opd-visits/queue?departmentId=${encodeURIComponent(departmentId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    throw new Error('Failed to fetch OPD queue');
  }
  return res.json();
}

export async function callOpdToken(id: string, token: string): Promise<OPDVisitRecord> {
  const res = await fetch(`/api/opd-visits/${id}/call`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to call token');
  }
  return res.json();
}

export async function closeOpdVisit(id: string, token: string): Promise<OPDVisitRecord> {
  const res = await fetch(`/api/opd-visits/${id}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to close OPD visit');
  }
  return res.json();
}
