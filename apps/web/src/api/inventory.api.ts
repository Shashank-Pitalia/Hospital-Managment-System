export interface MedicineBatchRecord {
  id: string;
  medicineId: string;
  batchNumber: string;
  manufacturer: string;
  supplierId?: string | null;
  manufacturingDate: string;
  expiryDate: string;
  purchasePrice: number;
  issuePrice: number;
  currentStock: number;
  minimumStockLevel: number;
  reorderLevel: number;
  storageLocation?: string | null;
  stockStatus:
    | 'IN_STOCK'
    | 'EARLY_WARNING'
    | 'CRITICAL_ALERT'
    | 'EXPIRED'
    | 'QUARANTINED'
    | 'DISPOSED';
  medicine?: {
    genericName: string;
    brandName?: string | null;
    category: string;
  } | null;
  supplier?: {
    name: string;
  } | null;
}

export interface MedicineRecord {
  id: string;
  genericName: string;
  brandName?: string | null;
  category: string;
  strength: string;
  dosageForm: string;
  batches: MedicineBatchRecord[];
}

export async function fetchMedicines(token: string): Promise<MedicineRecord[]> {
  const res = await fetch('/api/inventory/medicines', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch inventory medicines');
  return res.json();
}

export async function createMedicine(
  payload: {
    genericName: string;
    brandName?: string;
    category: string;
    strength: string;
    dosageForm: string;
  },
  token: string,
): Promise<MedicineRecord> {
  const res = await fetch('/api/inventory/medicines', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create medicine entry');
  return res.json();
}

export async function createBatch(
  payload: {
    medicineId: string;
    batchNumber: string;
    manufacturer: string;
    manufacturingDate: string;
    expiryDate: string;
    purchasePrice: number;
    issuePrice: number;
    currentStock: number;
    minimumStockLevel?: number;
    reorderLevel?: number;
    storageLocation?: string;
  },
  token: string,
): Promise<MedicineBatchRecord> {
  const res = await fetch('/api/inventory/batches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create batch entry');
  return res.json();
}

export async function fetchLowStockAlerts(token: string): Promise<MedicineBatchRecord[]> {
  const res = await fetch('/api/inventory/low-stock', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch low stock alerts');
  return res.json();
}

export async function triggerDailyExpiryScan(token: string): Promise<{
  quarantinedCount: number;
  criticalCount: number;
  earlyCount: number;
  scannedAt: string;
}> {
  const res = await fetch('/api/inventory/scan-expiry', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to trigger daily expiry scan');
  return res.json();
}

export async function fetchExpiringBatches(
  withinDays = 90,
  token: string,
): Promise<MedicineBatchRecord[]> {
  const res = await fetch(`/api/inventory/expiring?within=${withinDays}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch expiring batches');
  return res.json();
}

export async function quarantineBatch(
  batchId: string,
  reason: string | undefined,
  token: string,
): Promise<MedicineBatchRecord> {
  const res = await fetch(`/api/inventory/batches/${batchId}/quarantine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to quarantine batch');
  return res.json();
}

export async function disposeBatch(
  batchId: string,
  payload: { disposalReason: string; notes?: string },
  token: string,
): Promise<MedicineBatchRecord> {
  const res = await fetch(`/api/inventory/batches/${batchId}/dispose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to dispose batch');
  return res.json();
}
