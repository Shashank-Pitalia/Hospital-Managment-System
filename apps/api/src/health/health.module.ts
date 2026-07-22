import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Health module — provides the /api/health endpoint.
 *
 * Phase 0: basic liveness check.
 * Phase 1+: will be extended with database and Redis connectivity checks
 * using @nestjs/terminus once those services are wired into the app.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
