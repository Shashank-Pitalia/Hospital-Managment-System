import { Test, TestingModule } from '@nestjs/testing';
import { QrCodeService } from './qr-code.service';

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QrCodeService],
    }).compile();

    service = module.get<QrCodeService>(QrCodeService);
  });

  it('should generate a valid PNG Data URL string starting with data:image/png;base64,', async () => {
    const uid = 'ESIC-2026-000001';
    const dataUrl = await service.generateQrDataUrl(uid);

    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });
});
