import type { IStorageAdapter } from '../storage/storageAdapter';
import type { OccurrenceRecord } from '../../types/recurring';

export class OccurrenceRecordRepository {
  private storage: IStorageAdapter;

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
  }

  async getAll(): Promise<OccurrenceRecord[]> {
    const data = this.storage.loadData();
    return data.occurrenceRecords || [];
  }

  async getByKey(occurrenceKey: string): Promise<OccurrenceRecord | null> {
    const all = await this.getAll();
    return all.find((r) => r.occurrenceKey === occurrenceKey) || null;
  }

  async recordPaid(
    record: Omit<OccurrenceRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
      transactionId: string;
      actualAmountMinor: number;
      actualDate: string;
    },
  ): Promise<OccurrenceRecord> {
    const data = this.storage.loadData();
    const records = data.occurrenceRecords || [];
    const existingIndex = records.findIndex((r) => r.occurrenceKey === record.occurrenceKey);

    if (existingIndex !== -1 && records[existingIndex].status === 'paid') {
      throw new Error(`DUPLICATE_PAYMENT_ERROR: Occurrence with key ${record.occurrenceKey} is already recorded as paid`);
    }

    const now = new Date().toISOString();
    const newRecord: OccurrenceRecord = {
      id: existingIndex !== -1 ? records[existingIndex].id : crypto.randomUUID ? crypto.randomUUID() : `occ_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      occurrenceKey: record.occurrenceKey,
      scheduleId: record.scheduleId || null,
      billId: record.billId || null,
      dueDate: record.dueDate,
      status: 'paid',
      transactionId: record.transactionId,
      actualAmountMinor: record.actualAmountMinor,
      actualDate: record.actualDate,
      createdAt: existingIndex !== -1 ? records[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex !== -1) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }

    data.occurrenceRecords = records;
    this.storage.saveData(data);
    return newRecord;
  }

  async recordSkipped(
    record: Omit<OccurrenceRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  ): Promise<OccurrenceRecord> {
    const data = this.storage.loadData();
    const records = data.occurrenceRecords || [];
    const existingIndex = records.findIndex((r) => r.occurrenceKey === record.occurrenceKey);

    if (existingIndex !== -1 && records[existingIndex].status === 'paid') {
      throw new Error(`Cannot skip occurrence ${record.occurrenceKey} because it is already paid`);
    }

    const now = new Date().toISOString();
    const newRecord: OccurrenceRecord = {
      id: existingIndex !== -1 ? records[existingIndex].id : crypto.randomUUID ? crypto.randomUUID() : `occ_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      occurrenceKey: record.occurrenceKey,
      scheduleId: record.scheduleId || null,
      billId: record.billId || null,
      dueDate: record.dueDate,
      status: 'skipped',
      transactionId: null,
      actualAmountMinor: undefined,
      actualDate: undefined,
      createdAt: existingIndex !== -1 ? records[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex !== -1) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }

    data.occurrenceRecords = records;
    this.storage.saveData(data);
    return newRecord;
  }

  async delete(id: string): Promise<void> {
    const data = this.storage.loadData();
    data.occurrenceRecords = (data.occurrenceRecords || []).filter((r) => r.id !== id);
    this.storage.saveData(data);
  }
}
