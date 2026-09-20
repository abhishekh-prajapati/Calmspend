import type { IStorageAdapter } from '../storage/storageAdapter';
import type { ScheduledBill } from '../../types/recurring';

export class ScheduledBillRepository {
  private storage: IStorageAdapter;

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
  }

  async getAll(): Promise<ScheduledBill[]> {
    const data = this.storage.loadData();
    return data.scheduledBills || [];
  }

  async getById(id: string): Promise<ScheduledBill | null> {
    const all = await this.getAll();
    return all.find((b) => b.id === id) || null;
  }

  async create(
    bill: Omit<ScheduledBill, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ScheduledBill> {
    const data = this.storage.loadData();
    const now = new Date().toISOString();

    const newBill: ScheduledBill = {
      ...bill,
      id: crypto.randomUUID ? crypto.randomUUID() : `bill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };

    data.scheduledBills = [...(data.scheduledBills || []), newBill];
    this.storage.saveData(data);
    return newBill;
  }

  async update(id: string, updates: Partial<Omit<ScheduledBill, 'id' | 'createdAt'>>): Promise<ScheduledBill> {
    const data = this.storage.loadData();
    const bills = data.scheduledBills || [];
    const index = bills.findIndex((b) => b.id === id);

    if (index === -1) {
      throw new Error(`ScheduledBill with id ${id} not found`);
    }

    const updated: ScheduledBill = {
      ...bills[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    bills[index] = updated;
    data.scheduledBills = bills;
    this.storage.saveData(data);
    return updated;
  }

  async cancel(id: string): Promise<ScheduledBill> {
    return this.update(id, { status: 'cancelled' });
  }

  async delete(id: string): Promise<void> {
    const data = this.storage.loadData();
    data.scheduledBills = (data.scheduledBills || []).filter((b) => b.id !== id);
    // Cascade delete associated occurrence records
    data.occurrenceRecords = (data.occurrenceRecords || []).filter((r) => r.billId !== id);
    this.storage.saveData(data);
  }
}
