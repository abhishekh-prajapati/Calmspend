import type { Category } from '../../types/transaction';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

export class CategoryRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAll(): Category[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.categories.filter((c) => c.isActive);
  }

  getById(id: string): Category | undefined {
    const categories = this.getAll();
    return categories.find((c) => c.id === id);
  }

  create(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>): Category {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const newCategory: Category = {
      ...categoryData,
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };

    data.categories.push(newCategory);
    this.adapter.saveData(data);
    return newCategory;
  }
}

export const categoryRepository = new CategoryRepository();
