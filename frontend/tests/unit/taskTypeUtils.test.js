import {
  MAIN_CATEGORIES,
  SUB_CATEGORIES,
  getCategoryInfo,
  getCategoryColor,
  getCategoryIcon,
  getCategoryDisplay,
  getAllCategories,
  getSubcategoriesForCategory,
  isValidCategoryCombination,
  mapTaskTypeToCategory
} from '@/utils/taskTypeUtils';

describe('taskTypeUtils', () => {
  describe('MAIN_CATEGORIES', () => {
    test('contains all expected categories', () => {
      expect(MAIN_CATEGORIES).toHaveProperty('manual', 'Manual Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('analysis', 'Analysis Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('testing', 'Testing Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('refactoring', 'Refactoring Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('deployment', 'Deployment Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('generate', 'Generate Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('management', 'Management Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('security', 'Security Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('validation', 'Validation Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('optimization', 'Optimization Tasks');
      expect(MAIN_CATEGORIES).toHaveProperty('documentation', 'Documentation Tasks');
    });
  });

  describe('SUB_CATEGORIES', () => {
    test('contains subcategories for main categories', () => {
      expect(SUB_CATEGORIES).toHaveProperty('manual');
      expect(SUB_CATEGORIES).toHaveProperty('analysis');
      expect(SUB_CATEGORIES).toHaveProperty('testing');
      expect(SUB_CATEGORIES).toHaveProperty('refactoring');
    });

    test('manual category has expected subcategories', () => {
      expect(SUB_CATEGORIES.manual).toHaveProperty('implementation', 'Implementation Tasks');
      expect(SUB_CATEGORIES.manual).toHaveProperty('index', 'Index Tasks');
      expect(SUB_CATEGORIES.manual).toHaveProperty('phase', 'Phase Tasks');
      expect(SUB_CATEGORIES.manual).toHaveProperty('summary', 'Summary Tasks');
    });
  });

  describe('getCategoryInfo', () => {
    test('returns correct info for main category only', () => {
      const info = getCategoryInfo('manual');
      expect(info).toEqual({
        main: 'Manual Tasks',
        sub: null,
        display: 'Manual Tasks'
      });
    });

    test('returns correct info for category with subcategory', () => {
      const info = getCategoryInfo('analysis', 'architecture');
      expect(info).toEqual({
        main: 'Analysis Tasks',
        sub: 'Architecture Analysis',
        display: 'Analysis Tasks • Architecture Analysis'
      });
    });

    test('handles unknown category', () => {
      const info = getCategoryInfo('unknown');
      expect(info).toEqual({
        main: 'Unknown Category',
        sub: null,
        display: 'Unknown Category'
      });
    });

    test('handles unknown subcategory', () => {
      const info = getCategoryInfo('manual', 'unknown');
      expect(info).toEqual({
        main: 'Manual Tasks',
        sub: null,
        display: 'Manual Tasks'
      });
    });
  });

  describe('getCategoryColor', () => {
    test('returns correct colors for known categories', () => {
      expect(getCategoryColor('manual')).toBe('#3B82F6');
      expect(getCategoryColor('analysis')).toBe('#06B6D4');
      expect(getCategoryColor('testing')).toBe('#10B981');
      expect(getCategoryColor('refactoring')).toBe('#F59E0B');
      expect(getCategoryColor('deployment')).toBe('#8B5CF6');
      expect(getCategoryColor('security')).toBe('#EF4444');
    });

    test('returns default color for unknown category', () => {
      expect(getCategoryColor('unknown')).toBe('#6B7280');
    });
  });

  describe('getCategoryIcon', () => {
    test('returns correct icons for known categories', () => {
      expect(getCategoryIcon('manual')).toBe('📚');
      expect(getCategoryIcon('analysis')).toBe('🔍');
      expect(getCategoryIcon('testing')).toBe('🧪');
      expect(getCategoryIcon('refactoring')).toBe('🔧');
      expect(getCategoryIcon('deployment')).toBe('🚀');
      expect(getCategoryIcon('security')).toBe('🔒');
    });

    test('returns default icon for unknown category', () => {
      expect(getCategoryIcon('unknown')).toBe('📋');
    });
  });

  describe('getCategoryDisplay', () => {
    test('returns display text for category and subcategory', () => {
      expect(getCategoryDisplay('analysis', 'architecture')).toBe('Analysis Tasks • Architecture Analysis');
    });

    test('returns display text for category only', () => {
      expect(getCategoryDisplay('manual')).toBe('Manual Tasks');
    });

    test('returns display text for structure fallback', () => {
      expect(getCategoryDisplay(null, null, 'implementation')).toBe('Implementation Tasks');
    });

    test('returns default for no category or structure', () => {
      expect(getCategoryDisplay(null, null, null)).toBe('Manual Tasks');
    });
  });

  describe('getAllCategories', () => {
    test('returns array of category objects', () => {
      const categories = getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('value');
      expect(categories[0]).toHaveProperty('label');
    });

    test('contains expected categories', () => {
      const categories = getAllCategories();
      const categoryValues = categories.map(c => c.value);
      expect(categoryValues).toContain('manual');
      expect(categoryValues).toContain('analysis');
      expect(categoryValues).toContain('testing');
    });
  });

  describe('getSubcategoriesForCategory', () => {
    test('returns subcategories for valid category', () => {
      const subcategories = getSubcategoriesForCategory('manual');
      expect(Array.isArray(subcategories)).toBe(true);
      expect(subcategories.length).toBeGreaterThan(0);
      expect(subcategories[0]).toHaveProperty('value');
      expect(subcategories[0]).toHaveProperty('label');
    });

    test('returns empty array for invalid category', () => {
      const subcategories = getSubcategoriesForCategory('unknown');
      expect(subcategories).toEqual([]);
    });
  });

  describe('isValidCategoryCombination', () => {
    test('returns true for valid category', () => {
      expect(isValidCategoryCombination('manual')).toBe(true);
    });

    test('returns true for valid category and subcategory', () => {
      expect(isValidCategoryCombination('manual', 'implementation')).toBe(true);
    });

    test('returns false for invalid category', () => {
      expect(isValidCategoryCombination('unknown')).toBe(false);
    });

    test('returns false for invalid subcategory', () => {
      expect(isValidCategoryCombination('manual', 'unknown')).toBe(false);
    });

    test('returns true for valid category with no subcategory', () => {
      expect(isValidCategoryCombination('manual', null)).toBe(true);
    });
  });

  describe('mapTaskTypeToCategory', () => {
    test('maps analysis task types correctly', () => {
      expect(mapTaskTypeToCategory('analysis_architecture')).toEqual({
        category: 'analysis',
        subcategory: 'architecture'
      });
      expect(mapTaskTypeToCategory('analyze_performance')).toEqual({
        category: 'analysis',
        subcategory: 'performance'
      });
    });

    test('maps testing task types correctly', () => {
      expect(mapTaskTypeToCategory('test_unit')).toEqual({
        category: 'testing',
        subcategory: 'unit'
      });
      expect(mapTaskTypeToCategory('test_integration')).toEqual({
        category: 'testing',
        subcategory: 'integration'
      });
    });

    test('maps refactoring task types correctly', () => {
      expect(mapTaskTypeToCategory('refactor_node')).toEqual({
        category: 'refactoring',
        subcategory: 'node'
      });
      expect(mapTaskTypeToCategory('refactor_react')).toEqual({
        category: 'refactoring',
        subcategory: 'react'
      });
    });

    test('returns manual for unknown task type', () => {
      expect(mapTaskTypeToCategory('unknown')).toEqual({
        category: 'manual',
        subcategory: 'general'
      });
    });

    test('returns manual for null task type', () => {
      expect(mapTaskTypeToCategory(null)).toEqual({
        category: 'manual',
        subcategory: 'general'
      });
    });
  });
}); 