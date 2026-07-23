import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { FacilityModule } from './modules/facility/facility.module';
import { BenefitModule } from './modules/benefit/benefit.module';
import { PrescriptionModule } from './modules/prescription/prescription.module';
import { VisitModule } from './modules/visit/visit.module';
import { OpdModule } from './modules/opd/opd.module';
import { AdmissionModule } from './modules/admission/admission.module';
import { BrandingController } from './modules/auth/branding.controller';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    EmployeeModule,
    FacilityModule,
    BenefitModule,
    PrescriptionModule,
    VisitModule,
    OpdModule,
    AdmissionModule,
  ],
  controllers: [BrandingController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
