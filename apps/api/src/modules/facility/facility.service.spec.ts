import { Test, TestingModule } from '@nestjs/testing';
import { FacilityEligibilityService } from './facility.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FacilityCategory } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('FacilityEligibilityService', () => {
  let service: FacilityEligibilityService;

  const mockPrismaService = {
    employee: {
      findFirst: jest.fn(),
    },
    facilityEligibilityRule: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityEligibilityService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FacilityEligibilityService>(FacilityEligibilityService);
    jest.clearAllMocks();
  });

  describe('resolve', () => {
    it('should resolve category based on gradeId when a grade rule exists', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue({
        id: 'emp-uuid',
        employeeId: 'EMP-1001',
        postId: 'post-1',
        gradeId: 'grade-1',
      });

      mockPrismaService.facilityEligibilityRule.findFirst.mockResolvedValueOnce({
        id: 'rule-grade-1',
        postId: 'post-1',
        gradeId: 'grade-1',
        category: FacilityCategory.A,
        wardEligibility: 'Private Ward',
        room: 'Single Room',
        facilityLevel: 'Premium',
        version: 1,
        active: true,
      });

      const result = await service.resolve('EMP-1001');

      expect(result.category).toBe(FacilityCategory.A);
      expect(result.ruleId).toBe('rule-grade-1');
      expect(mockPrismaService.facilityEligibilityRule.findFirst).toHaveBeenCalledWith({
        where: {
          gradeId: 'grade-1',
          active: true,
        },
        orderBy: { version: 'desc' },
      });
    });

    it('should resolve based on postId when no grade rule exists but post rule exists', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue({
        id: 'emp-uuid',
        employeeId: 'EMP-1002',
        postId: 'post-2',
        gradeId: 'grade-2',
      });

      // First call for gradeId returns null
      mockPrismaService.facilityEligibilityRule.findFirst.mockResolvedValueOnce(null);
      // Second call for postId returns rule
      mockPrismaService.facilityEligibilityRule.findFirst.mockResolvedValueOnce({
        id: 'rule-post-2',
        postId: 'post-2',
        gradeId: null,
        category: FacilityCategory.C,
        wardEligibility: 'General Ward',
        room: 'General Bed',
        facilityLevel: 'Standard',
        version: 1,
        active: true,
      });

      const result = await service.resolve('EMP-1002');

      expect(result.category).toBe(FacilityCategory.C);
      expect(result.ruleId).toBe('rule-post-2');
    });

    it('should throw NotFoundException if no rule is found', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue({
        id: 'emp-uuid',
        employeeId: 'EMP-1003',
        postId: 'post-none',
        gradeId: 'grade-none',
      });

      mockPrismaService.facilityEligibilityRule.findFirst.mockResolvedValue(null);

      await expect(service.resolve('EMP-1003')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (Versioning Discipline)', () => {
    it('should mark old rule inactive and create a new rule row with incremented version', async () => {
      const oldRule = {
        id: 'rule-old-id',
        postId: 'post-1',
        gradeId: null,
        category: FacilityCategory.C,
        wardEligibility: 'General Ward',
        room: 'General Bed',
        facilityLevel: 'Standard',
        version: 1,
        active: true,
      };

      mockPrismaService.facilityEligibilityRule.findUnique.mockResolvedValue(oldRule);

      const updateDto = {
        category: FacilityCategory.B,
        wardEligibility: 'Semi-Private',
        room: 'Shared Room',
        facilityLevel: 'Enhanced',
      };

      mockPrismaService.facilityEligibilityRule.update.mockResolvedValue({
        ...oldRule,
        active: false,
      });

      mockPrismaService.facilityEligibilityRule.create.mockResolvedValue({
        id: 'rule-new-id',
        postId: oldRule.postId,
        gradeId: oldRule.gradeId,
        category: updateDto.category,
        wardEligibility: updateDto.wardEligibility,
        room: updateDto.room,
        facilityLevel: updateDto.facilityLevel,
        version: 2,
        active: true,
      });

      const result = await service.update('rule-old-id', updateDto, 'admin-id');

      expect(mockPrismaService.facilityEligibilityRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-old-id' },
        data: { active: false },
      });

      expect(mockPrismaService.facilityEligibilityRule.create).toHaveBeenCalledWith({
        data: {
          postId: oldRule.postId,
          gradeId: oldRule.gradeId,
          category: updateDto.category,
          wardEligibility: updateDto.wardEligibility,
          room: updateDto.room,
          facilityLevel: updateDto.facilityLevel,
          version: 2,
          active: true,
          createdById: 'admin-id',
        },
        include: {
          post: true,
          grade: true,
        },
      });

      expect(result.version).toBe(2);
      expect(result.category).toBe(FacilityCategory.B);
    });
  });
});
