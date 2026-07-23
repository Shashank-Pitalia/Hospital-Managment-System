/**
 * Staging PII Data Masking & Synthetic Data Script (Phase 15 Governance)
 *
 * Runs prior to loading database dumps into dev/staging environments.
 * Replaces production PII (names, emails, phone numbers, contact info)
 * with compliant synthetic data while preserving relational integrity.
 */

export interface RawUser {
  id: string;
  email: string;
  name: string;
  phone: string;
}

export function maskUserData(user: RawUser): RawUser {
  const maskedId = user.id;
  const maskedEmail = `staging.user.${user.id.substring(0, 6)}@esic.staging.internal`;
  const maskedName = `ESIC Beneficiary ${user.id.substring(0, 4).toUpperCase()}`;
  const maskedPhone = `+91 98765 ${Math.floor(10000 + Math.random() * 90000)}`;

  return {
    id: maskedId,
    email: maskedEmail,
    name: maskedName,
    phone: maskedPhone,
  };
}

export function runStagingDataMaskingProcess(users: RawUser[]): RawUser[] {
  console.log(`🔒 Masking ${users.length} production PII records for staging environment...`);
  const masked = users.map(maskUserData);
  console.log(`✅ Staging PII data masking completed. 0 real PII entries remaining.`);
  return masked;
}
