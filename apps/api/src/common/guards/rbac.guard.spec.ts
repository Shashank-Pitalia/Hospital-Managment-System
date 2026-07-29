import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RbacGuard(reflector);
  });

  const createMockContext = (user?: AuthenticatedUser) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow access if no roles or permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow SuperAdmin role unconditionally', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Administrator']);
    const context = createMockContext({
      id: '1',
      identifier: 'superadmin',
      roleId: 'r1',
      roleName: 'SuperAdmin',
      permissions: [],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject request if user role does not match required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'roles') return ['Administrator'];
      return undefined;
    });

    const context = createMockContext({
      id: '2',
      identifier: 'deop',
      roleId: 'r2',
      roleName: 'DataEntryOperator',
      permissions: [],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow request if user has required resource-action permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permission') return { resource: 'Employee', action: 'create' };
      return undefined;
    });

    const context = createMockContext({
      id: '3',
      identifier: 'deop',
      roleId: 'r2',
      roleName: 'DataEntryOperator',
      permissions: [{ resource: 'Employee', action: 'create' }],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject request if user lacks required permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permission') return { resource: 'Prescription', action: 'sign' };
      return undefined;
    });

    const context = createMockContext({
      id: '3',
      identifier: 'deop',
      roleId: 'r2',
      roleName: 'DataEntryOperator',
      permissions: [{ resource: 'Employee', action: 'create' }],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
