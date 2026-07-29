import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class HospitalUidGeneratorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generates a unique, permanent Hospital UID code formatted as ESIC-{YYYY}-{SEQUENCE}
   * e.g. ESIC-2026-000001
   */
  async generateUid(): Promise<string> {
    const year = new Date().getFullYear();

    // Query total count of HospitalUIDs issued in the current year
    const prefix = `ESIC-${year}-`;
    const count = await this.prisma.hospitalUID.count({
      where: {
        uidCode: {
          startsWith: prefix,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    return `${prefix}${sequence}`;
  }
}
