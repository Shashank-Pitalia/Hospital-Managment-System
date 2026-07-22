import { PrismaClient, EmploymentTypeCode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const SYSTEM_ROLES = [
  'Reception',
  'Doctor',
  'AdmissionDesk',
  'Nurse',
  'Pharmacist',
  'StoreManager',
  'ProcurementOfficer',
  'DataEntryOperator',
  'Administrator',
  'SuperAdmin',
] as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[number];

export async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed System Roles & Permissions
  const roleMap: Record<string, string> = {};

  for (const roleName of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isSystemRole: true },
      create: {
        name: roleName,
        isSystemRole: true,
      },
    });

    roleMap[roleName] = role.id;
    console.log(`  ✓ Role: ${roleName} (${role.id})`);
  }

  // 2. Define Permissions per Role
  // DataEntryOperator is strictly scoped to Employee create/update only (FR-SEC-13)
  const permissionsData: { roleName: SystemRoleName; resource: string; action: string }[] = [
    // --- DataEntryOperator (Demographic CRUD only) ---
    { roleName: 'DataEntryOperator', resource: 'Employee', action: 'create' },
    { roleName: 'DataEntryOperator', resource: 'Employee', action: 'read' },
    { roleName: 'DataEntryOperator', resource: 'Employee', action: 'update' },

    // --- Reception ---
    { roleName: 'Reception', resource: 'Employee', action: 'create' },
    { roleName: 'Reception', resource: 'Employee', action: 'read' },
    { roleName: 'Reception', resource: 'Employee', action: 'update' },
    { roleName: 'Reception', resource: 'HospitalUID', action: 'create' },
    { roleName: 'Reception', resource: 'HospitalUID', action: 'read' },
    { roleName: 'Reception', resource: 'Visit', action: 'create' },
    { roleName: 'Reception', resource: 'Visit', action: 'read' },
    { roleName: 'Reception', resource: 'OPDVisit', action: 'create' },
    { roleName: 'Reception', resource: 'OPDVisit', action: 'read' },

    // --- Doctor ---
    { roleName: 'Doctor', resource: 'Employee', action: 'read' },
    { roleName: 'Doctor', resource: 'Visit', action: 'read' },
    { roleName: 'Doctor', resource: 'OPDVisit', action: 'read' },
    { roleName: 'Doctor', resource: 'Diagnosis', action: 'create' },
    { roleName: 'Doctor', resource: 'Diagnosis', action: 'read' },
    { roleName: 'Doctor', resource: 'Prescription', action: 'create' },
    { roleName: 'Doctor', resource: 'Prescription', action: 'read' },
    { roleName: 'Doctor', resource: 'Prescription', action: 'sign' },
    { roleName: 'Doctor', resource: 'Admission', action: 'create' }, // Recommendation stub
    { roleName: 'Doctor', resource: 'Admission', action: 'read' },
    { roleName: 'Doctor', resource: 'Admission', action: 'approve' }, // Discharge approval

    // --- AdmissionDesk ---
    { roleName: 'AdmissionDesk', resource: 'Employee', action: 'read' },
    { roleName: 'AdmissionDesk', resource: 'Visit', action: 'read' },
    { roleName: 'AdmissionDesk', resource: 'Admission', action: 'create' },
    { roleName: 'AdmissionDesk', resource: 'Admission', action: 'read' },
    { roleName: 'AdmissionDesk', resource: 'Admission', action: 'update' },

    // --- Nurse ---
    { roleName: 'Nurse', resource: 'Employee', action: 'read' },
    { roleName: 'Nurse', resource: 'Visit', action: 'read' },
    { roleName: 'Nurse', resource: 'Admission', action: 'read' },
    { roleName: 'Nurse', resource: 'AdmissionNote', action: 'create' },
    { roleName: 'Nurse', resource: 'AdmissionNote', action: 'read' },

    // --- Pharmacist ---
    { roleName: 'Pharmacist', resource: 'Employee', action: 'read' },
    { roleName: 'Pharmacist', resource: 'Prescription', action: 'read' },
    { roleName: 'Pharmacist', resource: 'StockTransaction', action: 'dispense' },
    { roleName: 'Pharmacist', resource: 'StockTransaction', action: 'read' },
    { roleName: 'Pharmacist', resource: 'MedicineBatch', action: 'read' },

    // --- StoreManager ---
    { roleName: 'StoreManager', resource: 'Medicine', action: 'create' },
    { roleName: 'StoreManager', resource: 'Medicine', action: 'read' },
    { roleName: 'StoreManager', resource: 'Medicine', action: 'update' },
    { roleName: 'StoreManager', resource: 'MedicineBatch', action: 'create' },
    { roleName: 'StoreManager', resource: 'MedicineBatch', action: 'read' },
    { roleName: 'StoreManager', resource: 'MedicineBatch', action: 'update' },
    { roleName: 'StoreManager', resource: 'PurchaseRequisition', action: 'create' },
    { roleName: 'StoreManager', resource: 'PurchaseRequisition', action: 'read' },

    // --- ProcurementOfficer ---
    { roleName: 'ProcurementOfficer', resource: 'PurchaseRequisition', action: 'read' },
    { roleName: 'ProcurementOfficer', resource: 'Approval', action: 'approve' },
    { roleName: 'ProcurementOfficer', resource: 'PurchaseOrder', action: 'create' },
    { roleName: 'ProcurementOfficer', resource: 'PurchaseOrder', action: 'read' },

    // --- Administrator ---
    { roleName: 'Administrator', resource: 'Employee', action: 'read' },
    { roleName: 'Administrator', resource: 'Employee', action: 'update' },
    { roleName: 'Administrator', resource: 'FacilityEligibilityRule', action: 'create' },
    { roleName: 'Administrator', resource: 'FacilityEligibilityRule', action: 'read' },
    { roleName: 'Administrator', resource: 'FacilityEligibilityRule', action: 'update' },
    { roleName: 'Administrator', resource: 'BenefitRule', action: 'create' },
    { roleName: 'Administrator', resource: 'BenefitRule', action: 'read' },
    { roleName: 'Administrator', resource: 'BenefitRule', action: 'update' },
    { roleName: 'Administrator', resource: 'AuditLog', action: 'read' },

    // --- SuperAdmin (Wildcard / all permissions) ---
    { roleName: 'SuperAdmin', resource: '*', action: '*' },
  ];

  for (const perm of permissionsData) {
    const roleId = roleMap[perm.roleName];
    await prisma.permission.upsert({
      where: {
        roleId_resource_action: {
          roleId,
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {},
      create: {
        roleId,
        resource: perm.resource,
        action: perm.action,
      },
    });
  }
  console.log(`  ✓ Seeded permissions for all 10 roles`);

  // 3. Seed Employment Types
  const permanentType = await prisma.employmentType.upsert({
    where: { code: EmploymentTypeCode.PERMANENT },
    update: {},
    create: {
      code: EmploymentTypeCode.PERMANENT,
      name: 'Permanent Employee',
    },
  });

  const contractualType = await prisma.employmentType.upsert({
    where: { code: EmploymentTypeCode.CONTRACTUAL },
    update: {},
    create: {
      code: EmploymentTypeCode.CONTRACTUAL,
      name: 'Contractual Employee',
    },
  });
  console.log(`  ✓ Seeded EmploymentTypes: Permanent & Contractual`);

  // 4. Seed Posts & Grades
  const clerkPost = await prisma.post.upsert({
    where: { title: 'Clerk' },
    update: {},
    create: { title: 'Clerk' },
  });

  await prisma.grade.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      payLevel: 'Pay Level 4',
      postId: clerkPost.id,
    },
  });
  console.log(`  ✓ Seeded sample Posts & Grades`);

  // 5. Seed SuperAdmin User
  const passwordHash = await bcrypt.hash('SuperAdminSecret123!', 10);

  const superAdminUser = await prisma.user.upsert({
    where: { identifier: 'superadmin@esic.gov.in' },
    update: {
      passwordHash,
      roleId: roleMap['SuperAdmin'],
      active: true,
    },
    create: {
      identifier: 'superadmin@esic.gov.in',
      passwordHash,
      roleId: roleMap['SuperAdmin'],
      active: true,
    },
  });

  console.log(`  ✓ Seeded SuperAdmin user: superadmin@esic.gov.in (${superAdminUser.id})`);
  console.log('✅ Seed completed successfully!');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
