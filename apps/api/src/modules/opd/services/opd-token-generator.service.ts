import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OpdTokenGeneratorService {
  private readonly logger = new Logger(OpdTokenGeneratorService.name);

  // In-memory atomic counters for fallback/dev execution
  // Key format: token:{deptCode}:{YYYY-MM-DD}
  private readonly counters = new Map<string, number>();

  /**
   * Atomically increments the daily counter for a department and formats
   * a collision-free 3-digit queue token (e.g. CARDIO-001, CARDIO-002).
   */
  async generateDailyToken(deptCode: string): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const key = `token:${deptCode.toUpperCase()}:${today}`;

    // Synchronous atomic increment on the map instance
    const current = (this.counters.get(key) || 0) + 1;
    this.counters.set(key, current);

    const tokenSeq = current.toString().padStart(3, '0');
    const tokenNumber = `${deptCode.toUpperCase()}-${tokenSeq}`;

    this.logger.log(`⚡ Issued Atomic Daily Token ${tokenNumber} (Key: ${key})`);
    return tokenNumber;
  }
}
