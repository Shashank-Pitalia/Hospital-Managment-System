export interface BillingTransactionRecord {
  id: string;
  prescriptionItemId: string;
  outcome: 'FREE' | 'COVERED' | 'PAID';
  amount?: number | null;
  receiptReference?: string | null;
  createdAt: string;
  prescriptionItem?: {
    medicineName: string;
    dose: string;
    frequency: string;
    duration: string;
    prescription?: {
      id: string;
      visit?: {
        employee?: {
          employeeId?: string;
          employmentType?: { name: string };
          patientProfile?: { fullName: string; gender: string };
        };
      };
    };
  };
}

export interface ReceiptRecord {
  receiptReference: string;
  transactionId: string;
  issueDate: string;
  patientName: string;
  employeeId: string;
  employmentType: string;
  medicineName: string;
  dose: string;
  frequency: string;
  duration: string;
  outcome: string;
  amountCharged: number;
  currency: string;
  issuingHospital: string;
  status: string;
}

export async function fetchBillingTransactions(token: string): Promise<BillingTransactionRecord[]> {
  const res = await fetch('/api/billing/transactions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch billing transactions');
  return res.json();
}

export async function fetchReceipt(transactionId: string, token: string): Promise<ReceiptRecord> {
  const res = await fetch(`/api/billing/receipts/${transactionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch receipt data');
  return res.json();
}
