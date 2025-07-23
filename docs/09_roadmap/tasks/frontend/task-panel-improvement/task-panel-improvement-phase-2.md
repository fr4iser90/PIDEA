# Task Panel Improvement - Phase 2: Category Filtering System

## 📋 Phase Overview
- **Phase**: 2 of 3
- **Focus**: Category Filtering System
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Dependencies**: Phase 1 completion

## 🎯 Objectives
- Create CategoryFilterComponent with multi-select capability
- Implement useTaskFiltering custom hook for filtering logic
- Add category-based filtering with existing priority and search filters
- Add category badges and visual indicators
- Implement filter persistence

## 📁 Files to Create/Modify

### New Files to Create:
- [ ] `frontend/src/presentation/components/chat/sidebar-right/CategoryFilterComponent.jsx` - Category filter component
- [ ] `frontend/src/hooks/useTaskFiltering.js` - Custom hook for task filtering logic
- [ ] `frontend/src/css/components/category-filter.css` - Category filter styling

### Files to Modify:
- [ ] `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx` - Integrate category filtering
- [ ] `frontend/src/utils/taskUtils.js` - Add category-related utility functions

## 🔧 Implementation Steps

### Step 1: Create CategoryFilterComponent (45 minutes)
```jsx
// CategoryFilterComponent.jsx
import React, { useState, useEffect } from 'react';
import { getAllCategories, getCategoryDescription } from '@/utils/taskUtils';
import '@/css/components/category-filter.css';

const CategoryFilterComponent = ({ 
  selectedCategories, 
  onCategoryChange, 
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Get all available categories from backend constants
    const availableCategories = getAllCategories();
    setCategories(availableCategories);
  }, []);

  const handleCategoryToggle = (category) => {
    const newSelected = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    onCategoryChange(newSelected);
  };

  const handleSelectAll = () => {
    onCategoryChange(categories.map(c => c.value));
  };

  const handleClearAll = () => {
    onCategoryChange([]);
  };

  const filteredCategories = categories.filter(category =>
    category.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = selectedCategories.length;
  const totalCount = categories.length;

  return (
    <div className="category-filter">
      <div className="category-filter-header">
        <button
          className={`category-filter-toggle ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="category-filter-icon">🏷️</span>
          <span className="category-filter-label">
            Categories {selectedCount > 0 && `(${selectedCount})`}
          </span>
          <span className="category-filter-arrow">▼</span>
        </button>
        
        {selectedCount > 0 && (
          <button
            className="category-filter-clear"
            onClick={handleClearAll}
            title="Clear all categories"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="category-filter-dropdown">
          <div className="category-filter-search">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="category-search-input"
            />
          </div>

          <div className="category-filter-actions">
            <button
              className="category-filter-action"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              className="category-filter-action"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          </div>

          <div className="category-filter-list">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <label
                  key={category.value}
                  className={`category-filter-item ${
                    selectedCategories.includes(category.value) ? 'selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.value)}
                    onChange={() => handleCategoryToggle(category.value)}
                    className="category-checkbox"
                  />
                  <span className="category-label">{category.label}</span>
                  <span className="category-description">
                    {getCategoryDescription(category.value)}
                  </span>
                </label>
              ))
            ) : (
              <div className="category-filter-empty">
                No categories found matching "{searchTerm}"
              </div>
            )}
          </div>

          <div className="category-filter-footer">
            <span className="category-filter-count">
              {selectedCount} of {totalCount} categories selected
            </span>
          </div>
        </div>
      )}

      {/* Selected Categories Display */}
      {selectedCount > 0 && (
        <div className="selected-categories">
          {selectedCategories.map((categoryValue) => {
            const category = categories.find(c => c.value === categoryValue);
            return (
              <span
                key={categoryValue}
                className="selected-category-badge"
                title={getCategoryDescription(categoryValue)}
              >
                {category?.label || categoryValue}
                <button
                  className="selected-category-remove"
                  onClick={() => handleCategoryToggle(categoryValue)}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryFilterComponent;
```

### Step 2: Create useTaskFiltering Hook (30 minutes)
```javascript
// useTaskFiltering.js
import { useState, useEffect, useMemo } from 'react';

export const useTaskFiltering = (tasks, initialFilters = {}) => {
  const [filters, setFilters] = useState({
    search: '',
    priority: 'all',
    status: 'all',
    categories: [],
    ...initialFilters
  });

  const [filterHistory, setFilterHistory] = useState([]);

  // Save filter state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('taskPanelFilters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filter state:', error);
    }
  }, [filters]);

  // Load filter state from localStorage
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem('taskPanelFilters');
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(prev => ({ ...prev, ...parsedFilters }));
      }
    } catch (error) {
      console.warn('Failed to load filter state:', error);
    }
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = (task.title || '').toLowerCase().includes(searchLower);
        const descriptionMatch = (task.description || '').toLowerCase().includes(searchLower);
        const filenameMatch = (task.filename || '').toLowerCase().includes(searchLower);
        
        if (!titleMatch && !descriptionMatch && !filenameMatch) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority !== 'all') {
        const taskPriority = task.priority?.value || task.priority;
        if (taskPriority !== filters.priority) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all') {
        const taskStatus = task.status?.value || task.status;
        if (taskStatus !== filters.status) {
          return false;
        }
      }

      // Category filter
      if (filters.categories.length > 0) {
        const taskCategory = task.category || task.metadata?.category;
        if (!taskCategory || !filters.categories.includes(taskCategory)) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, filters]);

  const updateFilter = (filterType, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Add to history (keep last 10)
      setFilterHistory(prevHistory => {
        const newHistory = [...prevHistory, { type: filterType, value, timestamp: Date.now() }];
        return newHistory.slice(-10);
      });
      
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      priority: 'all',
      status: 'all',
      categories: []
    });
  };

  const getFilterStats = () => {
    const totalTasks = tasks.length;
    const filteredCount = filteredTasks.length;
    const hiddenCount = totalTasks - filteredCount;

    return {
      total: totalTasks,
      filtered: filteredCount,
      hidden: hiddenCount,
      hasActiveFilters: filters.search || filters.priority !== 'all' || filters.status !== 'all' || filters.categories.length > 0
    };
  };

  return {
    filters,
    filteredTasks,
    updateFilter,
    clearFilters,
    getFilterStats,
    filterHistory
  };
};
```

### Step 3: Create Category Filter CSS (30 minutes)
```css
/* category-filter.css */
.category-filter {
  position: relative;
  width: 100%;
}

.category-filter-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #404040;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  color: #ffffff;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.category-filter-toggle:hover {
  background: #505050;
  border-color: #666;
}

.category-filter-toggle.open {
  background: #3b82f6;
  border-color: #3b82f6;
}

.category-filter-icon {
  font-size: 0.9rem;
}

.category-filter-label {
  flex: 1;
  text-align: left;
}

.category-filter-arrow {
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.category-filter-toggle.open .category-filter-arrow {
  transform: rotate(180deg);
}

.category-filter-clear {
  background: #ef4444;
  border: 1px solid #ef4444;
  border-radius: 4px;
  color: #ffffff;
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-filter-clear:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.category-filter-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #2a2a2a;
  border: 1px solid #404040;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  margin-top: 0.25rem;
  max-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.category-filter-search {
  padding: 0.75rem;
  border-bottom: 1px solid #404040;
}

.category-search-input {
  width: 100%;
  background: #404040;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 0.5rem;
  color: #ffffff;
  font-size: 0.8rem;
}

.category-search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.category-filter-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid #404040;
}

.category-filter-action {
  background: #374151;
  border: 1px solid #4b5563;
  border-radius: 4px;
  color: #ffffff;
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.category-filter-action:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.category-filter-list {
  flex: 1;
  overflow-y: auto;
  max-height: 250px;
}

.category-filter-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #333;
}

.category-filter-item:hover {
  background: #374151;
}

.category-filter-item.selected {
  background: #1e3a8a;
}

.category-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.category-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #ffffff;
  flex: 1;
}

.category-description {
  font-size: 0.7rem;
  color: #9ca3af;
  font-style: italic;
}

.category-filter-empty {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.8rem;
}

.category-filter-footer {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #404040;
  background: #1f1f1f;
}

.category-filter-count {
  font-size: 0.7rem;
  color: #9ca3af;
}

.selected-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.selected-category-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #3b82f6;
  color: #ffffff;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.selected-category-remove {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.selected-category-remove:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Responsive Design */
@media (max-width: 768px) {
  .category-filter-dropdown {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 400px;
    max-height: 80vh;
  }
  
  .category-filter-actions {
    flex-direction: column;
  }
}
```

### Step 4: Update taskUtils with Category Functions (15 minutes)
```javascript
// Add to existing taskUtils.js
import { STANDARD_CATEGORIES, CATEGORY_DESCRIPTIONS } from '@/backend/domain/constants/Categories';

export const getAllCategories = () => {
  return Object.entries(STANDARD_CATEGORIES).map(([key, value]) => ({
    value,
    label: key.charAt(0) + key.slice(1).toLowerCase().replace(/([A-Z])/g, ' $1')
  }));
};

export const getCategoryDescription = (category) => {
  return CATEGORY_DESCRIPTIONS[category] || 'Unknown category';
};

export const getCategoryColor = (category) => {
  const colors = {
    'analysis': '#3b82f6',
    'testing': '#10b981',
    'refactoring': '#f59e0b',
    'deployment': '#8b5cf6',
    'generate': '#06b6d4',
    'management': '#6366f1',
    'security': '#ef4444',
    'validation': '#f97316',
    'optimization': '#84cc16',
    'documentation': '#14b8a6',
    'task': '#6b7280',
    'application': '#8b5cf6',
    'ide': '#3b82f6',
    'git': '#059669',
    'terminal': '#7c3aed',
    'chat': '#0ea5e9'
  };
  return colors[category] || '#6b7280';
};
```

## ✅ Success Criteria
- [ ] CategoryFilterComponent renders with all available categories
- [ ] Multi-select functionality works correctly
- [ ] Filter persistence saves and loads from localStorage
- [ ] Category filtering integrates with existing priority and search filters
- [ ] Selected categories display as badges
- [ ] Filter statistics show correct counts
- [ ] Responsive design works on mobile devices

## 🔄 Next Phase
After completing Phase 2, proceed to [Phase 3: Integration & Testing](./task-panel-improvement-phase-3.md)

## 📝 Notes
- Ensure category data is properly imported from backend constants
- Test filter combinations thoroughly
- Verify localStorage persistence works across browser sessions
- Test responsive design on different screen sizes 