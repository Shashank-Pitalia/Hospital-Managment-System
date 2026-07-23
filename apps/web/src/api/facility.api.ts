export interface FacilityEligibilityRuleRecord {
  id: string;
  postId: string | null;
  gradeId: string | null;
  category: 'A' | 'B' | 'C' | 'D' | 'CONTRACTUAL';
  wardEligibility: string;
  room: string;
  facilityLevel: string;
  active: boolean;
  version: number;
  post?: {
    id: string;
    title: string;
  } | null;
  grade?: {
    id: string;
    payLevel: string;
  } | null;
}

export async function fetchFacilityRules(token: string): Promise<FacilityEligibilityRuleRecord[]> {
  const res = await fetch('/api/facility-rules', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch facility rules');
  }
  return res.json();
}

export async function updateFacilityRule(
  id: string,
  body: {
    category: 'A' | 'B' | 'C' | 'D' | 'CONTRACTUAL';
    wardEligibility: string;
    room: string;
    facilityLevel: string;
  },
  token: string,
): Promise<FacilityEligibilityRuleRecord> {
  const res = await fetch(`/api/facility-rules/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error('Failed to update facility rule');
  }
  return res.json();
}

export async function resolveFacilityRule(
  employeeId: string,
  token: string,
): Promise<{
  category: 'A' | 'B' | 'C' | 'D' | 'CONTRACTUAL';
  wardEligibility: string;
  room: string;
  facilityLevel: string;
  ruleId: string;
  version: number;
}> {
  const res = await fetch(`/api/facility-rules/resolve?employeeId=${encodeURIComponent(employeeId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to resolve facility eligibility rule');
  }
  return res.json();
}
