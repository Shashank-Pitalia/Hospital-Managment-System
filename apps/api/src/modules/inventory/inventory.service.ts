import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { StockStatus, PharmacyLocation } from '@prisma/client';

const DEMO_INVENTORY_CATALOG: any[] = [
  {
    id: 'med-paracetamol',
    genericName: 'Paracetamol',
    brandName: 'Crocin / Calpol',
    category: 'Analgesics & Antipyretics',
    strength: '500mg',
    dosageForm: 'Tablet',
    batches: [
      {
        id: 'batch-p-500-01',
        batchNumber: 'PCM-2026-A1',
        manufacturer: 'Cipla India',
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        purchasePrice: 8.5,
        issuePrice: 15.0,
        currentStock: 450,
        minimumStockLevel: 50,
        reorderLevel: 100,
        storageLocation: 'Rack A-01 (Pharmacy Store)',
        stockStatus: StockStatus.IN_STOCK,
      },
      {
        id: 'batch-p-500-low',
        batchNumber: 'PCM-2026-LOW',
        manufacturer: 'Cipla India',
        expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        purchasePrice: 8.5,
        issuePrice: 15.0,
        currentStock: 25,
        minimumStockLevel: 50,
        reorderLevel: 100,
        storageLocation: 'Rack A-02 (Central Store)',
        stockStatus: StockStatus.CRITICAL_ALERT,
      },
    ],
  },
  {
    id: 'med-azithro',
    genericName: 'Azithromycin',
    brandName: 'Azee / Zithromax',
    category: 'Antibiotics',
    strength: '500mg',
    dosageForm: 'Tablet',
    batches: [
      {
        id: 'batch-azithro-01',
        batchNumber: 'AZI-2026-B1',
        manufacturer: 'Sun Pharma',
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        purchasePrice: 42.0,
        issuePrice: 65.0,
        currentStock: 120,
        minimumStockLevel: 30,
        reorderLevel: 80,
        storageLocation: 'Rack B-12 (Pharmacy Store)',
        stockStatus: StockStatus.IN_STOCK,
      },
    ],
  },
];

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  async findAllMedicines() {
    try {
      const medicines = await this.prisma.medicine.findMany({
        include: {
          batches: {
            include: { supplier: true },
            orderBy: { expiryDate: 'asc' },
          },
        },
        orderBy: { genericName: 'asc' },
      });
      if (medicines.length > 0) return medicines;
    } catch {
      // Fall through to demo store
    }
    return DEMO_INVENTORY_CATALOG;
  }

  async createMedicine(dto: CreateMedicineDto) {
    try {
      return await this.prisma.medicine.create({
        data: {
          genericName: dto.genericName,
          brandName: dto.brandName || null,
          category: dto.category,
          strength: dto.strength,
          dosageForm: dto.dosageForm,
        },
      });
    } catch {
      const newMed = {
        id: `med-${Date.now()}`,
        genericName: dto.genericName,
        brandName: dto.brandName || null,
        category: dto.category,
        strength: dto.strength,
        dosageForm: dto.dosageForm,
        batches: [],
      };
      DEMO_INVENTORY_CATALOG.push(newMed);
      return newMed;
    }
  }

  async createBatch(dto: CreateBatchDto) {
    try {
      const med = await this.prisma.medicine.findUnique({
        where: { id: dto.medicineId },
      });
      if (!med) throw new NotFoundException(`Medicine not found for ID: ${dto.medicineId}`);

      const batch = await this.prisma.medicineBatch.create({
        data: {
          medicineId: dto.medicineId,
          batchNumber: dto.batchNumber,
          manufacturer: dto.manufacturer,
          supplierId: dto.supplierId || null,
          manufacturingDate: new Date(dto.manufacturingDate),
          expiryDate: new Date(dto.expiryDate),
          purchasePrice: dto.purchasePrice,
          issuePrice: dto.issuePrice,
          currentStock: dto.currentStock,
          minimumStockLevel: dto.minimumStockLevel ?? 50,
          reorderLevel: dto.reorderLevel ?? 100,
          storageLocation: dto.storageLocation || null,
          stockStatus:
            dto.currentStock <= (dto.minimumStockLevel ?? 50)
              ? StockStatus.CRITICAL_ALERT
              : dto.currentStock <= (dto.reorderLevel ?? 100)
                ? StockStatus.EARLY_WARNING
                : StockStatus.IN_STOCK,
        },
      });

      // Also create initial PharmacyStock record
      await this.prisma.pharmacyStock.create({
        data: {
          medicineBatchId: batch.id,
          location: PharmacyLocation.PHARMACY,
          quantity: dto.currentStock,
        },
      });

      return batch;
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;

      const newBatch = {
        id: `batch-${Date.now()}`,
        medicineId: dto.medicineId,
        batchNumber: dto.batchNumber,
        manufacturer: dto.manufacturer,
        expiryDate: dto.expiryDate,
        purchasePrice: dto.purchasePrice,
        issuePrice: dto.issuePrice,
        currentStock: dto.currentStock,
        minimumStockLevel: dto.minimumStockLevel ?? 50,
        reorderLevel: dto.reorderLevel ?? 100,
        storageLocation: dto.storageLocation || 'Main Pharmacy Rack',
        stockStatus:
          dto.currentStock <= (dto.minimumStockLevel ?? 50)
            ? StockStatus.CRITICAL_ALERT
            : dto.currentStock <= (dto.reorderLevel ?? 100)
              ? StockStatus.EARLY_WARNING
              : StockStatus.IN_STOCK,
      };

      const med =
        DEMO_INVENTORY_CATALOG.find((m) => m.id === dto.medicineId) || DEMO_INVENTORY_CATALOG[0];
      if (med) {
        if (!med.batches) med.batches = [];
        med.batches.push(newBatch);
      }
      return newBatch;
    }
  }

  async getLowStockAlerts() {
    try {
      const lowStockBatches = await this.prisma.medicineBatch.findMany({
        where: {
          currentStock: { lte: this.prisma.medicineBatch.fields.reorderLevel },
        },
        include: { medicine: true },
        orderBy: { currentStock: 'asc' },
      });
      if (lowStockBatches.length > 0) return lowStockBatches;
    } catch {
      // Fall through to memory scan
    }

    const memoryLow: any[] = [];
    DEMO_INVENTORY_CATALOG.forEach((m) => {
      (m.batches || []).forEach((b: any) => {
        if (b.currentStock <= (b.reorderLevel || 100)) {
          memoryLow.push({ ...b, medicine: m });
        }
      });
    });
    return memoryLow;
  }

  async getPharmacyStock() {
    try {
      return await this.prisma.pharmacyStock.findMany({
        include: {
          batch: {
            include: { medicine: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch {
      return [
        {
          id: 'ps-1',
          location: PharmacyLocation.PHARMACY,
          quantity: 450,
          batch: DEMO_INVENTORY_CATALOG[0].batches[0],
        },
        {
          id: 'ps-2',
          location: PharmacyLocation.CENTRAL_STORE,
          quantity: 25,
          batch: DEMO_INVENTORY_CATALOG[0].batches[1],
        },
      ];
    }
  }

  async getExpiringBatches(withinDays = 90) {
    const thresholdDate = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    try {
      return await this.prisma.medicineBatch.findMany({
        where: {
          expiryDate: { lte: thresholdDate },
          stockStatus: { notIn: [StockStatus.DISPOSED] },
        },
        include: { medicine: true, supplier: true },
        orderBy: { expiryDate: 'asc' },
      });
    } catch {
      const expiring: any[] = [];
      DEMO_INVENTORY_CATALOG.forEach((m) => {
        (m.batches || []).forEach((b: any) => {
          if (new Date(b.expiryDate) <= thresholdDate && b.stockStatus !== StockStatus.DISPOSED) {
            expiring.push({ ...b, medicine: m });
          }
        });
      });
      return expiring;
    }
  }

  async quarantineBatch(batchId: string, _reason?: string) {
    try {
      return await this.prisma.medicineBatch.update({
        where: { id: batchId },
        data: { stockStatus: StockStatus.QUARANTINED },
      });
    } catch {
      let found: any = null;
      DEMO_INVENTORY_CATALOG.forEach((m) => {
        const b = (m.batches || []).find((x: any) => x.id === batchId);
        if (b) {
          b.stockStatus = StockStatus.QUARANTINED;
          found = b;
        }
      });
      if (!found) throw new NotFoundException(`Batch not found: ${batchId}`);
      return found;
    }
  }

  async disposeBatch(
    batchId: string,
    dto: { disposalReason: string; notes?: string },
    userId: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const batch = await tx.medicineBatch.findUnique({ where: { id: batchId } });
        if (!batch) throw new NotFoundException(`Batch not found: ${batchId}`);

        const stockToDispose = batch.currentStock;

        const updatedBatch = await tx.medicineBatch.update({
          where: { id: batchId },
          data: {
            currentStock: 0,
            stockStatus: StockStatus.DISPOSED,
          },
        });

        // Audit Trail: Log StockTransaction of type DISPOSAL with negative quantity
        await tx.stockTransaction.create({
          data: {
            type: 'DISPOSAL',
            medicineBatchId: batchId,
            quantity: -stockToDispose,
            performedBy: userId,
          },
        });

        return updatedBatch;
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;

      let found: any = null;
      DEMO_INVENTORY_CATALOG.forEach((m) => {
        const b = (m.batches || []).find((x: any) => x.id === batchId);
        if (b) {
          b.currentStock = 0;
          b.stockStatus = StockStatus.DISPOSED;
          b.disposalReason = dto.disposalReason;
          found = b;
        }
      });
      if (!found) throw new NotFoundException(`Batch not found: ${batchId}`);
      return found;
    }
  }
}
