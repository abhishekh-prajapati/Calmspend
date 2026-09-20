import React from 'react';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { Category } from '../../types/transaction';
import './CategorySelector.css';

export interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (categoryId: string) => void;
  error?: string;
  className?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  error,
  className = '',
}) => {
  return (
    <div className={`category-selector-group ${className}`}>
      <label className="ui-input-label">Category *</label>
      <div className="category-selector-grid">
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              className={`category-item-btn ${isSelected ? 'category-item-btn--selected' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <div
                className="category-item-btn__icon-wrap"
                style={{
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface-secondary)',
                  color: isSelected ? 'var(--color-text-inverse)' : (cat.color || 'var(--color-text-primary)'),
                }}
              >
                <CategoryIcon iconName={cat.icon} size={18} />
              </div>
              <span className="category-item-btn__name caption">{cat.name}</span>
            </button>
          );
        })}
      </div>
      {error && <span className="ui-input-helper ui-input-helper--error">{error}</span>}
    </div>
  );
};
