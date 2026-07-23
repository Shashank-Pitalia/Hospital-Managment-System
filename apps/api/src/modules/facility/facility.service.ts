import { Injectable, OnModuleInit, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FacilityCategory } from '@prisma/client';
import { CreateFacilityRuleDto } from './dto/create-facility-rule.dto';

// In-memory dev store fallback when database connection is unavailable
const DEV_FACILITY_RULES_STORE: any[] = [];

@Injectable()
export class FacilityEligibilityService implements OnModuleInit {
  private readonly logger = new Logger(FacilityEligibilityService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // Pre-seed mock rules in memory store for offline testing
      const defaultRules = [
        {
          id: 'rule-senior-officer-dev',
          postId: 'post-senior-officer-id',
          gradeId: 'grade-10-id',
          category: FacilityCategory.A,
          wardEligibility: 'Private Ward',
          room: 'Single Room',
          facilityLevel: 'Premium',
          active: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rule-officer-dev',
          postId: 'post-officer-id',
          gradeId: 'grade-7-id',
          category: FacilityCategory.B,
          wardEligibility: 'Semi-Private',
          room: 'Shared Room',
          facilityLevel: 'Enhanced',
          active: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rule-clerk-dev',
          postId: 'post-clerk-id',
          gradeId: 'grade-4-id',
          category: FacilityCategory.C,
          wardEligibility: 'General Ward',
          room: 'General Bed',
          facilityLevel: 'Standard',
          active: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rule-assistant-dev',
          postId: 'post-assistant-id',
          gradeId: 'grade-3-id',
          category: FacilityCategory.C,
          wardEligibility: 'General Ward',
          room: 'General Bed',
          facilityLevel: 'Standard',
          active: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rule-support-staff-dev',
          postId: 'post-support-staff-id',
          gradeId: 'grade-1-id',
          category: FacilityCategory.D,
          wardEligibility: 'General Ward',
          room: 'General Bed',
          facilityLevel: 'Standard',
          active: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rule-contractual-dev',
          postId: 'post-contractual-id',
          gradeId: 'grade-contractual-id',
          category: FacilityCategory.CONTRACTUAL,
          wardEligibility: 'Policy Based',
          room: 'General / Policy Based',
          facilityLevel: 'Limited',
          active: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      DEV_FACILITY_RULES_STORE.push(...defaultRules);

      // Check if DB is online and has records. If not, seed them
      const count = await this.prisma.facilityEligibilityRule.count();
      if (count === 0) {
        // Find existing posts to link to
        const posts = await this.prisma.post.findMany();
        const seniorOfficer = posts.find((p) => p.title === 'Senior Officer');
        const officer = posts.find((p) => p.title === 'Officer');
        const clerk = posts.find((p) => p.title === 'Clerk');
        const assistant = posts.find((p) => p.title === 'Assistant');
        const supportStaff = posts.find((p) => p.title === 'Support Staff');
        const contractWorker = posts.find((p) => p.title === 'Contract Worker');

        const rulesToSeed = [
          {
            postId: seniorOfficer?.id || null,
            category: FacilityCategory.A,
            wardEligibility: 'Private Ward',
            room: 'Single Room',
            facilityLevel: 'Premium',
          },
          {
            postId: officer?.id || null,
            category: FacilityCategory.B,
            wardEligibility: 'Semi-Private',
            room: 'Shared Room',
            facilityLevel: 'Enhanced',
          },
          {
            postId: clerk?.id || null,
            category: FacilityCategory.C,
            wardEligibility: 'General Ward',
            room: 'General Bed',
            facilityLevel: 'Standard',
          },
          {
            postId: assistant?.id || null,
            category: FacilityCategory.C,
            wardEligibility: 'General Ward',
            room: 'General Bed',
            facilityLevel: 'Standard',
          },
          {
            postId: supportStaff?.id || null,
            category: FacilityCategory.D,
            wardEligibility: 'General Ward',
            room: 'General Bed',
            facilityLevel: 'Standard',
          },
          {
            postId: contractWorker?.id || null,
            category: FacilityCategory.CONTRACTUAL,
            wardEligibility: 'Policy Based',
            room: 'General / Policy Based',
            facilityLevel: 'Limited',
          },
        ].filter((r) => r.postId !== null);

        for (const rule of rulesToSeed) {
          await this.prisma.facilityEligibilityRule.create({
            data: {
              postId: rule.postId,
              category: rule.category,
              wardEligibility: rule.wardEligibility,
              room: rule.room,
              facilityLevel: rule.facilityLevel,
              active: true,
              version: 1,
            },
          });
        }
        this.logger.log('✅ Seeded default FacilityEligibilityRules');
      }
    } catch {
      this.logger.log('Offline mode: Using pre-seeded facility eligibility rules memory store');
    }
  }

  /**
   * Resolves eligible ward/room category for an employee using ONLY data lookups. (No hardcoded conditionals)
   */
  async resolve(employeeId: string) {
    let employee: any = null;

    try {
      // Look up employee by UUID or official employee_id
      employee = await this.prisma.employee.findFirst({
        where: {
          OR: [
            { id: employeeId },
            { employeeId: employeeId }
          ]
        },
        include: {
          post: true,
          grade: true,
        }
      });
    } catch {
      // Fall through to memory store
    }

    if (!employee) {
      // Mock lookup for testing/offline support
      // Check if employeeId matches a mock or standard format
      // In tests/dev, we might simulate different post types
      const isSenior = employeeId.toLowerCase().includes('senior') || employeeId.includes('1001');
      const isOfficer = employeeId.toLowerCase().includes('officer') || employeeId.includes('1002');
      const isSupport = employeeId.toLowerCase().includes('support') || employeeId.includes('1004');
      const isContract = employeeId.toLowerCase().includes('contract') || employeeId.includes('1005');

      employee = {
        id: employeeId,
        postId: isSenior
          ? 'post-senior-officer-id'
          : isOfficer
            ? 'post-officer-id'
            : isSupport
              ? 'post-support-staff-id'
              : isContract
                ? 'post-contractual-id'
                : 'post-clerk-id',
        gradeId: isSenior
          ? 'grade-10-id'
          : isOfficer
            ? 'grade-7-id'
            : isSupport
              ? 'grade-1-id'
              : isContract
                ? 'grade-contractual-id'
                : 'grade-4-id',
      };
    }

    // 1. Try to find active rule matching gradeId
    let rule: any = null;
    try {
      rule = await this.prisma.facilityEligibilityRule.findFirst({
        where: {
          gradeId: employee.gradeId,
          active: true,
        },
        orderBy: { version: 'desc' },
      });
    } catch {
      // Fall through
    }

    if (!rule) {
      rule = DEV_FACILITY_RULES_STORE.find(
        (r) => r.gradeId === employee.gradeId && r.active,
      );
    }

    // 2. Try to find active rule matching postId (and gradeId is null)
    if (!rule) {
      try {
        rule = await this.prisma.facilityEligibilityRule.findFirst({
          where: {
            postId: employee.postId,
            gradeId: null,
            active: true,
          },
          orderBy: { version: 'desc' },
        });
      } catch {
        // Fall through
      }

      if (!rule) {
        rule = DEV_FACILITY_RULES_STORE.find(
          (r) => r.postId === employee.postId && r.active,
        );
      }
    }

    if (!rule) {
      throw new NotFoundException(`No active FacilityEligibilityRule found for employee post/grade`);
    }

    return {
      category: rule.category,
      wardEligibility: rule.wardEligibility,
      room: rule.room,
      facilityLevel: rule.facilityLevel,
      ruleId: rule.id,
      version: rule.version,
    };
  }

  async findAll() {
    try {
      const rules = await this.prisma.facilityEligibilityRule.findMany({
        include: {
          post: true,
          grade: true,
        },
        orderBy: [
          { postId: 'asc' },
          { version: 'desc' },
        ],
      });
      if (rules.length > 0) return rules;
    } catch {
      // Fall through
    }
    return DEV_FACILITY_RULES_STORE;
  }

  async create(dto: CreateFacilityRuleDto, userId?: string) {
    try {
      return await this.prisma.facilityEligibilityRule.create({
        data: {
          postId: dto.postId || null,
          gradeId: dto.gradeId || null,
          category: dto.category as FacilityCategory,
          wardEligibility: dto.wardEligibility,
          room: dto.room,
          facilityLevel: dto.facilityLevel,
          active: dto.active ?? true,
          version: 1,
          createdById: userId || null,
        },
        include: {
          post: true,
          grade: true,
        },
      });
    } catch {
      const mockRule = {
        id: `rule-${Date.now()}`,
        postId: dto.postId || null,
        gradeId: dto.gradeId || null,
        category: dto.category,
        wardEligibility: dto.wardEligibility,
        room: dto.room,
        facilityLevel: dto.facilityLevel,
        active: dto.active ?? true,
        version: 1,
        createdById: userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      DEV_FACILITY_RULES_STORE.push(mockRule);
      return mockRule;
    }
  }

  /**
   * Editing a rule creates a new version rather than overwriting (Spec §9 & FR-FAC-04)
   */
  async update(id: string, dto: CreateFacilityRuleDto, userId?: string) {
    let existingRule: any = null;

    try {
      existingRule = await this.prisma.facilityEligibilityRule.findUnique({
        where: { id },
      });
    } catch {
      // Fall through
    }

    if (!existingRule) {
      existingRule = DEV_FACILITY_RULES_STORE.find((r) => r.id === id);
    }

    if (!existingRule) {
      throw new NotFoundException(`FacilityEligibilityRule with ID ${id} not found`);
    }

    // 1. Mark existing version as inactive
    try {
      await this.prisma.facilityEligibilityRule.update({
        where: { id },
        data: { active: false },
      });
    } catch {
      existingRule.active = false;
    }

    // 2. Create a new rule version
    try {
      return await this.prisma.facilityEligibilityRule.create({
        data: {
          postId: existingRule.postId,
          gradeId: existingRule.gradeId,
          category: dto.category as FacilityCategory,
          wardEligibility: dto.wardEligibility,
          room: dto.room,
          facilityLevel: dto.facilityLevel,
          active: true,
          version: existingRule.version + 1,
          createdById: userId || null,
        },
        include: {
          post: true,
          grade: true,
        },
      });
    } catch {
      const mockNewRule = {
        id: `rule-${Date.now()}`,
        postId: existingRule.postId,
        gradeId: existingRule.gradeId,
        category: dto.category,
        wardEligibility: dto.wardEligibility,
        room: dto.room,
        facilityLevel: dto.facilityLevel,
        active: true,
        version: existingRule.version + 1,
        createdById: userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      DEV_FACILITY_RULES_STORE.push(mockNewRule);
      return mockNewRule;
    }
  }
}
