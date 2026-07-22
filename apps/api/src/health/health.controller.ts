import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

/**
 * Health check controller for the ESIC HMS API.
 *
 * Provides a lightweight unauthenticated endpoint for infrastructure monitoring,
 * load balancer health probes, and Docker Compose healthchecks.
 *
 * Route: GET /api/health
 */
@Controller('health')
export class HealthController {
  /**
   * Returns the current health status of the API service.
   *
   * @returns Health status payload with metadata
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}
