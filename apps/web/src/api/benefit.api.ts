export interface BenefitRuleRecord {
  id: string;
  employmentTypeId: string;
  medicineCategory: string | null;
  outcome: 'FREE' | 'COVERED' | 'PAID';
  active: boolean;
  version: number;
  employmentType?: {
    code: string;
    name: string;
  };
}

export async function fetchBenefitRules(token: string): Promise<BenefitRuleRecord[]> {
  const res = await fetch('/api/benefit-rules', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch benefit rules');
  }
  return res.json();
}

export async function evaluateBenefitRule(
  employmentType: string,
  medicineCategory: string | undefined,
  token: string,
): Promise<{
  employmentType: string;
  medicineCategory: string | null;
  outcome: 'FREE' | 'COVERED' | 'PAID';
}> {
  const url = `/api/benefit-rules/evaluate?employmentType=${encodeURIComponent(
    employmentType,
  )}${medicineCategory ? `&medicineCategory=${encodeURIComponent(medicineCategory)}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Failed to evaluate benefit rule');
  }

  return res.json();
}
