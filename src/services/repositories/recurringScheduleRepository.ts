import type { IStorageAdapter } from '../storage/storageAdapter';
import type { RecurringSchedule } from '../../types/recurring';

export class RecurringScheduleRepository {
  private storage: IStorageAdapter;

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
  }

  async getAll(): Promise<RecurringSchedule[]> {
    const data = this.storage.loadData();
    return data.recurringSchedules || [];
  }

  async getById(id: string): Promise<RecurringSchedule | null> {
    const all = await this.getAll();
    return all.find((s) => s.id === id) || null;
  }

  async getActive(): Promise<RecurringSchedule[]> {
    const all = await this.getAll();
    return all.filter((s) => s.isActive);
  }

  async create(
    schedule: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<RecurringSchedule> {
    const data = this.storage.loadData();
    const now = new Date().toISOString();

    // Derive preferredDayOfMonth if not explicitly provided and frequency is monthly
    let preferredDayOfMonth = schedule.preferredDayOfMonth;
    if (preferredDayOfMonth === undefined || preferredDayOfMonth === null) {
      if (schedule.frequency === 'monthly' && schedule.startDate) {
        const parts = schedule.startDate.split('-');
        preferredDayOfMonth = parseInt(parts[2], 10) || 1;
      }
    }

    const newSchedule: RecurringSchedule = {
      ...schedule,
      id: crypto.randomUUID ? crypto.randomUUID() : `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      preferredDayOfMonth: preferredDayOfMonth ?? null,
      createdAt: now,
      updatedAt: now,
    };

    data.recurringSchedules = [...(data.recurringSchedules || []), newSchedule];
    this.storage.saveData(data);
    return newSchedule;
  }

  async update(id: string, updates: Partial<Omit<RecurringSchedule, 'id' | 'createdAt'>>): Promise<RecurringSchedule> {
    const data = this.storage.loadData();
    const schedules = data.recurringSchedules || [];
    const index = schedules.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new Error(`RecurringSchedule with id ${id} not found`);
    }

    const updated: RecurringSchedule = {
      ...schedules[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    schedules[index] = updated;
    data.recurringSchedules = schedules;
    this.storage.saveData(data);
    return updated;
  }

  async cancel(id: string): Promise<RecurringSchedule> {
    return this.update(id, { isActive: false });
  }

  async resume(id: string): Promise<RecurringSchedule> {
    return this.update(id, { isActive: true });
  }

  async delete(id: string): Promise<void> {
    const data = this.storage.loadData();
    data.recurringSchedules = (data.recurringSchedules || []).filter((s) => s.id !== id);
    // Cascade delete associated occurrence records
    data.occurrenceRecords = (data.occurrenceRecords || []).filter((r) => r.scheduleId !== id);
    this.storage.saveData(data);
  }
}
