export interface BrandingConfigRecord {
  hospitalName: string;
  tagline: string;
  primaryColor: string;
  logoUrl: string;
  updatedAt: string;
}

export async function fetchBranding(): Promise<BrandingConfigRecord> {
  const res = await fetch('/api/branding');
  if (!res.ok) throw new Error('Failed to fetch branding configuration');
  return res.json();
}

export async function updateBranding(
  payload: Partial<BrandingConfigRecord>,
  token: string,
): Promise<unknown> {
  const res = await fetch('/api/branding', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(errData.message || 'Failed to update branding configuration');
  }
  return res.json();
}
