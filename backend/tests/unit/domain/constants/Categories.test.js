/**
 * Categories.test.js - Unit tests for Categories module
 * Tests category validation, descriptions, and utility functions
 */

const {
  STANDARD_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  isValidCategory,
  getCategoryDescription,
  getAllCategories,
  getCategoriesByType,
  getDefaultCategory
} = require('@domain/constants/Categories');

describe('Categories Module', () => {
  describe('STANDARD_CATEGORIES', () => {
    it('should contain all required categories', () => {
      expect(STANDARD_CATEGORIES).toHaveProperty('ANALYSIS');
      expect(STANDARD_CATEGORIES).toHaveProperty('TESTING');
      expect(STANDARD_CATEGORIES).toHaveProperty('REFACTORING');
      expect(STANDARD_CATEGORIES).toHaveProperty('DEPLOYMENT');
      expect(STANDARD_CATEGORIES).toHaveProperty('GENERATE');
      expect(STANDARD_CATEGORIES).toHaveProperty('MANAGEMENT');
      expect(STANDARD_CATEGORIES).toHaveProperty('SECURITY');
      expect(STANDARD_CATEGORIES).toHaveProperty('VALIDATION');
      expect(STANDARD_CATEGORIES).toHaveProperty('OPTIMIZATION');
      expect(STANDARD_CATEGORIES).toHaveProperty('DOCUMENTATION');
      expect(STANDARD_CATEGORIES).toHaveProperty('TASK');
      expect(STANDARD_CATEGORIES).toHaveProperty('APPLICATION');
      expect(STANDARD_CATEGORIES).toHaveProperty('ANALYZE');
    });

    it('should have string values for all categories', () => {
      Object.values(STANDARD_CATEGORIES).forEach(category => {
        expect(typeof category).toBe('string');
        expect(category.length).toBeGreaterThan(0);
      });
    });

    it('should have unique category values', () => {
      const values = Object.values(STANDARD_CATEGORIES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('CATEGORY_DESCRIPTIONS', () => {
    it('should have descriptions for all categories', () => {
      Object.values(STANDARD_CATEGORIES).forEach(category => {
        expect(CATEGORY_DESCRIPTIONS).toHaveProperty(category);
        expect(typeof CATEGORY_DESCRIPTIONS[category]).toBe('string');
        expect(CATEGORY_DESCRIPTIONS[category].length).toBeGreaterThan(0);
      });
    });

    it('should not have extra descriptions for non-existent categories', () => {
      Object.keys(CATEGORY_DESCRIPTIONS).forEach(category => {
        expect(Object.values(STANDARD_CATEGORIES)).toContain(category);
      });
    });
  });

  describe('isValidCategory', () => {
    it('should return true for valid categories', () => {
      Object.values(STANDARD_CATEGORIES).forEach(category => {
        expect(isValidCategory(category)).toBe(true);
      });
    });

    it('should return false for invalid categories', () => {
      const invalidCategories = [
        'invalid',
        'unknown',
        'test',
        '',
        null,
        undefined,
        'ANALYSIS', // Should be lowercase
        'Analysis'  // Wrong case
      ];

      invalidCategories.forEach(category => {
        expect(isValidCategory(category)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(isValidCategory('')).toBe(false);
      expect(isValidCategory(null)).toBe(false);
      expect(isValidCategory(undefined)).toBe(false);
      expect(isValidCategory(123)).toBe(false);
      expect(isValidCategory({})).toBe(false);
      expect(isValidCategory([])).toBe(false);
    });
  });

  describe('getCategoryDescription', () => {
    it('should return correct description for valid categories', () => {
      expect(getCategoryDescription(STANDARD_CATEGORIES.ANALYSIS)).toBe(
        'Code analysis, architecture review, dependency analysis'
      );
      expect(getCategoryDescription(STANDARD_CATEGORIES.TESTING)).toBe(
        'Test execution, test generation, test validation'
      );
      expect(getCategoryDescription(STANDARD_CATEGORIES.MANAGEMENT)).toBe(
        'Task management, project management, workflow management'
      );
    });

    it('should return "Unknown category" for invalid categories', () => {
      expect(getCategoryDescription('invalid')).toBe('Unknown category');
      expect(getCategoryDescription('')).toBe('Unknown category');
      expect(getCategoryDescription(null)).toBe('Unknown category');
      expect(getCategoryDescription(undefined)).toBe('Unknown category');
    });
  });

  describe('getAllCategories', () => {
    it('should return all category values', () => {
      const allCategories = getAllCategories();
      expect(Array.isArray(allCategories)).toBe(true);
      expect(allCategories.length).toBe(Object.keys(STANDARD_CATEGORIES).length);
      
      Object.values(STANDARD_CATEGORIES).forEach(category => {
        expect(allCategories).toContain(category);
      });
    });

    it('should return a new array each time', () => {
      const firstCall = getAllCategories();
      const secondCall = getAllCategories();
      expect(firstCall).not.toBe(secondCall); // Different array references
      expect(firstCall).toEqual(secondCall); // Same content
    });
  });

  describe('getCategoriesByType', () => {
    it('should return categories grouped by type', () => {
      const categoriesByType = getCategoriesByType();
      
      expect(categoriesByType).toHaveProperty('core');
      expect(categoriesByType).toHaveProperty('quality');
      expect(categoriesByType).toHaveProperty('specialized');
      
      expect(Array.isArray(categoriesByType.core)).toBe(true);
      expect(Array.isArray(categoriesByType.quality)).toBe(true);
      expect(Array.isArray(categoriesByType.specialized)).toBe(true);
    });

    it('should contain all categories in appropriate groups', () => {
      const categoriesByType = getCategoriesByType();
      const allGroupedCategories = [
        ...categoriesByType.core,
        ...categoriesByType.quality,
        ...categoriesByType.specialized
      ];
      
      Object.values(STANDARD_CATEGORIES).forEach(category => {
        expect(allGroupedCategories).toContain(category);
      });
    });

    it('should not have duplicate categories across groups', () => {
      const categoriesByType = getCategoriesByType();
      const allGroupedCategories = [
        ...categoriesByType.core,
        ...categoriesByType.quality,
        ...categoriesByType.specialized
      ];
      
      const uniqueCategories = new Set(allGroupedCategories);
      expect(uniqueCategories.size).toBe(allGroupedCategories.length);
    });
  });

  describe('getDefaultCategory', () => {
    it('should return correct default categories for component types', () => {
      expect(getDefaultCategory('framework')).toBe(STANDARD_CATEGORIES.APPLICATION);
      expect(getDefaultCategory('step')).toBe(STANDARD_CATEGORIES.TASK);
      expect(getDefaultCategory('command')).toBe(STANDARD_CATEGORIES.MANAGEMENT);
      expect(getDefaultCategory('handler')).toBe(STANDARD_CATEGORIES.MANAGEMENT);
    });

    it('should return APPLICATION for unknown component types', () => {
      expect(getDefaultCategory('unknown')).toBe(STANDARD_CATEGORIES.APPLICATION);
      expect(getDefaultCategory('')).toBe(STANDARD_CATEGORIES.APPLICATION);
      expect(getDefaultCategory(null)).toBe(STANDARD_CATEGORIES.APPLICATION);
      expect(getDefaultCategory(undefined)).toBe(STANDARD_CATEGORIES.APPLICATION);
    });

    it('should handle edge cases', () => {
      expect(getDefaultCategory(123)).toBe(STANDARD_CATEGORIES.APPLICATION);
      expect(getDefaultCategory({})).toBe(STANDARD_CATEGORIES.APPLICATION);
      expect(getDefaultCategory([])).toBe(STANDARD_CATEGORIES.APPLICATION);
    });
  });

  describe('Integration Tests', () => {
    it('should work together correctly', () => {
      // Test the complete flow
      const allCategories = getAllCategories();
      const categoriesByType = getCategoriesByType();
      
      // All categories should be valid
      allCategories.forEach(category => {
        expect(isValidCategory(category)).toBe(true);
        expect(getCategoryDescription(category)).not.toBe('Unknown category');
      });
      
      // All grouped categories should be valid
      Object.values(categoriesByType).flat().forEach(category => {
        expect(isValidCategory(category)).toBe(true);
      });
    });

    it('should maintain consistency between different functions', () => {
      const allCategories = getAllCategories();
      const categoriesByType = getCategoriesByType();
      const allGroupedCategories = [
        ...categoriesByType.core,
        ...categoriesByType.quality,
        ...categoriesByType.specialized
      ];
      
      // Both should contain the same categories
      expect(allCategories.sort()).toEqual(allGroupedCategories.sort());
    });
  });
}); 