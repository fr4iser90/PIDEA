/**
 * InterfaceRegistry Unit Tests
 * 
 * Tests for the InterfaceRegistry service functionality,
 * including interface type registration, categorization,
 * metadata management, and search capabilities.
 */
const InterfaceRegistry = require('../../domain/services/interface/InterfaceRegistry');

describe('InterfaceRegistry', () => {
  let interfaceRegistry;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    interfaceRegistry = new InterfaceRegistry({ logger: mockLogger });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      const registry = new InterfaceRegistry();
      
      expect(registry.interfaceTypes).toBeInstanceOf(Map);
      expect(registry.typeCategories).toBeInstanceOf(Map);
      expect(registry.typeMetadata).toBeInstanceOf(Map);
      expect(registry.typeConstraints).toBeInstanceOf(Map);
      expect(registry.stats.totalRegistered).toBe(0);
      expect(registry.stats.totalUnregistered).toBe(0);
      expect(registry.stats.activeTypes).toBe(0);
    });

    test('should initialize with provided dependencies', () => {
      expect(interfaceRegistry.logger).toBe(mockLogger);
    });
  });

  describe('Interface Type Registration', () => {
    test('should register interface type with metadata', () => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      
      interfaceRegistry.registerInterfaceType('test', metadata);
      
      expect(interfaceRegistry.interfaceTypes.has('test')).toBe(true);
      expect(interfaceRegistry.isRegistered('test')).toBe(true);
      
      const registeredType = interfaceRegistry.interfaceTypes.get('test');
      expect(registeredType).toEqual({
        ...metadata,
        registeredAt: expect.any(Date),
        lastUpdated: expect.any(Date)
      });
      
      expect(interfaceRegistry.stats.totalRegistered).toBe(1);
      expect(interfaceRegistry.stats.activeTypes).toBe(1);
    });

    test('should update existing interface type', () => {
      const initialMetadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      
      const updatedMetadata = {
        name: 'Updated Test Interface',
        description: 'An updated test interface',
        version: '2.0.0'
      };
      
      interfaceRegistry.registerInterfaceType('test', initialMetadata);
      interfaceRegistry.registerInterfaceType('test', updatedMetadata);
      
      expect(interfaceRegistry.stats.totalRegistered).toBe(2);
      expect(interfaceRegistry.stats.activeTypes).toBe(1);
      
      const registeredType = interfaceRegistry.interfaceTypes.get('test');
      expect(registeredType.name).toBe('Updated Test Interface');
      expect(registeredType.version).toBe('2.0.0');
    });

    test('should throw error for invalid interface type', () => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      
      expect(() => {
        interfaceRegistry.registerInterfaceType(null, metadata);
      }).toThrow('interfaceType must be a non-empty string');

      expect(() => {
        interfaceRegistry.registerInterfaceType('', metadata);
      }).toThrow('interfaceType must be a non-empty string');
    });

    test('should throw error for invalid metadata', () => {
      expect(() => {
        interfaceRegistry.registerInterfaceType('test', null);
      }).toThrow('metadata must be an object');

      expect(() => {
        interfaceRegistry.registerInterfaceType('test', 'invalid');
      }).toThrow('metadata must be an object');
    });

    test('should throw error for missing required metadata fields', () => {
      expect(() => {
        interfaceRegistry.registerInterfaceType('test', {});
      }).toThrow("Required metadata field 'name' is missing");

      expect(() => {
        interfaceRegistry.registerInterfaceType('test', { name: 'Test' });
      }).toThrow("Required metadata field 'description' is missing");

      expect(() => {
        interfaceRegistry.registerInterfaceType('test', { name: 'Test', description: 'Test' });
      }).toThrow("Required metadata field 'version' is missing");
    });
  });

  describe('Interface Type Unregistration', () => {
    beforeEach(() => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test', metadata);
    });

    test('should unregister interface type successfully', () => {
      const result = interfaceRegistry.unregisterInterfaceType('test');
      
      expect(result).toBe(true);
      expect(interfaceRegistry.isRegistered('test')).toBe(false);
      expect(interfaceRegistry.stats.totalUnregistered).toBe(1);
      expect(interfaceRegistry.stats.activeTypes).toBe(0);
    });

    test('should return false for non-existent interface type', () => {
      const result = interfaceRegistry.unregisterInterfaceType('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Category Management', () => {
    beforeEach(() => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test', metadata);
    });

    test('should add interface type to category', () => {
      interfaceRegistry.addToCategory('test', 'development');
      
      expect(interfaceRegistry.isInCategory('test', 'development')).toBe(true);
      expect(interfaceRegistry.getInterfaceTypesByCategory('development')).toContain('test');
    });

    test('should remove interface type from category', () => {
      interfaceRegistry.addToCategory('test', 'development');
      const removed = interfaceRegistry.removeFromCategory('test', 'development');
      
      expect(removed).toBe(true);
      expect(interfaceRegistry.isInCategory('test', 'development')).toBe(false);
    });

    test('should return false when removing from non-existent category', () => {
      const removed = interfaceRegistry.removeFromCategory('test', 'non-existent');
      expect(removed).toBe(false);
    });

    test('should clean up empty categories', () => {
      interfaceRegistry.addToCategory('test', 'development');
      interfaceRegistry.removeFromCategory('test', 'development');
      
      expect(interfaceRegistry.typeCategories.has('development')).toBe(false);
    });

    test('should throw error for invalid interface type in category operations', () => {
      expect(() => {
        interfaceRegistry.addToCategory('non-existent', 'development');
      }).toThrow("Interface type 'non-existent' is not registered");
    });

    test('should throw error for invalid category', () => {
      expect(() => {
        interfaceRegistry.addToCategory('test', null);
      }).toThrow('category must be a non-empty string');

      expect(() => {
        interfaceRegistry.addToCategory('test', '');
      }).toThrow('category must be a non-empty string');
    });
  });

  describe('Metadata Management', () => {
    beforeEach(() => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test', metadata);
    });

    test('should set interface type metadata', () => {
      const additionalMetadata = { author: 'Test Author', license: 'MIT' };
      interfaceRegistry.setTypeMetadata('test', additionalMetadata);
      
      const typeInfo = interfaceRegistry.getInterfaceType('test');
      expect(typeInfo.metadata).toEqual({
        ...additionalMetadata,
        lastUpdated: expect.any(Date)
      });
    });

    test('should merge metadata with existing data', () => {
      const initialMetadata = { author: 'Initial Author' };
      const additionalMetadata = { license: 'MIT' };
      
      interfaceRegistry.setTypeMetadata('test', initialMetadata);
      interfaceRegistry.setTypeMetadata('test', additionalMetadata);
      
      const typeInfo = interfaceRegistry.getInterfaceType('test');
      expect(typeInfo.metadata).toEqual({
        author: 'Initial Author',
        license: 'MIT',
        lastUpdated: expect.any(Date)
      });
    });

    test('should throw error for invalid interface type', () => {
      expect(() => {
        interfaceRegistry.setTypeMetadata('non-existent', {});
      }).toThrow("Interface type 'non-existent' is not registered");
    });

    test('should throw error for invalid metadata', () => {
      expect(() => {
        interfaceRegistry.setTypeMetadata('test', null);
      }).toThrow('metadata must be an object');
    });
  });

  describe('Constraints Management', () => {
    beforeEach(() => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test', metadata);
    });

    test('should set interface type constraints', () => {
      const constraints = {
        supportedFrameworks: ['react', 'vue'],
        supportedTypes: ['web', 'mobile'],
        minVersion: '1.0.0'
      };
      
      interfaceRegistry.setTypeConstraints('test', constraints);
      
      const typeInfo = interfaceRegistry.getInterfaceType('test');
      expect(typeInfo.constraints).toEqual({
        ...constraints,
        lastUpdated: expect.any(Date)
      });
    });

    test('should throw error for invalid interface type', () => {
      expect(() => {
        interfaceRegistry.setTypeConstraints('non-existent', {});
      }).toThrow("Interface type 'non-existent' is not registered");
    });

    test('should throw error for invalid constraints', () => {
      expect(() => {
        interfaceRegistry.setTypeConstraints('test', null);
      }).toThrow('constraints must be an object');
    });
  });

  describe('Interface Type Retrieval', () => {
    beforeEach(() => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test', metadata);
      interfaceRegistry.addToCategory('test', 'development');
      interfaceRegistry.setTypeMetadata('test', { author: 'Test Author' });
      interfaceRegistry.setTypeConstraints('test', { supportedFrameworks: ['react'] });
    });

    test('should get interface type information', () => {
      const typeInfo = interfaceRegistry.getInterfaceType('test');
      
      expect(typeInfo).toEqual({
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0',
        registeredAt: expect.any(Date),
        lastUpdated: expect.any(Date),
        metadata: {
          author: 'Test Author',
          lastUpdated: expect.any(Date)
        },
        constraints: {
          supportedFrameworks: ['react'],
          lastUpdated: expect.any(Date)
        },
        categories: ['development']
      });
    });

    test('should return null for non-existent interface type', () => {
      const typeInfo = interfaceRegistry.getInterfaceType('non-existent');
      expect(typeInfo).toBeNull();
    });

    test('should get all interface types', () => {
      const metadata2 = {
        name: 'Test Interface 2',
        description: 'Another test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test2', metadata2);
      
      const allTypes = interfaceRegistry.getAllInterfaceTypes();
      expect(allTypes).toContain('test');
      expect(allTypes).toContain('test2');
    });

    test('should get interface types by category', () => {
      const metadata2 = {
        name: 'Test Interface 2',
        description: 'Another test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test2', metadata2);
      interfaceRegistry.addToCategory('test2', 'development');
      
      const developmentTypes = interfaceRegistry.getInterfaceTypesByCategory('development');
      expect(developmentTypes).toContain('test');
      expect(developmentTypes).toContain('test2');
    });

    test('should return empty array for non-existent category', () => {
      const types = interfaceRegistry.getInterfaceTypesByCategory('non-existent');
      expect(types).toHaveLength(0);
    });

    test('should get categories for interface type', () => {
      interfaceRegistry.addToCategory('test', 'testing');
      
      const categories = interfaceRegistry.getCategoriesForType('test');
      expect(categories).toContain('development');
      expect(categories).toContain('testing');
    });

    test('should get all categories', () => {
      const metadata2 = {
        name: 'Test Interface 2',
        description: 'Another test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test2', metadata2);
      interfaceRegistry.addToCategory('test2', 'production');
      
      const allCategories = interfaceRegistry.getAllCategories();
      expect(allCategories).toContain('development');
      expect(allCategories).toContain('production');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      const metadata1 = {
        name: 'React Interface',
        description: 'Interface for React applications',
        version: '1.0.0'
      };
      const metadata2 = {
        name: 'Vue Interface',
        description: 'Interface for Vue applications',
        version: '2.0.0'
      };
      
      interfaceRegistry.registerInterfaceType('react', metadata1);
      interfaceRegistry.registerInterfaceType('vue', metadata2);
      
      interfaceRegistry.addToCategory('react', 'frontend');
      interfaceRegistry.addToCategory('vue', 'frontend');
      
      interfaceRegistry.setTypeMetadata('react', { author: 'React Team' });
      interfaceRegistry.setTypeMetadata('vue', { author: 'Vue Team' });
    });

    test('should search by name', () => {
      const results = interfaceRegistry.searchInterfaceTypes({ name: 'React' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('React Interface');
    });

    test('should search by description', () => {
      const results = interfaceRegistry.searchInterfaceTypes({ description: 'Vue' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Vue Interface');
    });

    test('should search by version', () => {
      const results = interfaceRegistry.searchInterfaceTypes({ version: '2.0.0' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Vue Interface');
    });

    test('should search by category', () => {
      const results = interfaceRegistry.searchInterfaceTypes({ category: 'frontend' });
      expect(results).toHaveLength(2);
    });

    test('should search by metadata', () => {
      const results = interfaceRegistry.searchInterfaceTypes({ 
        metadata: { author: 'React Team' } 
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('React Interface');
    });

    test('should combine multiple search criteria', () => {
      const results = interfaceRegistry.searchInterfaceTypes({
        category: 'frontend',
        metadata: { author: 'Vue Team' }
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Vue Interface');
    });

    test('should return empty results for no matches', () => {
      const results = interfaceRegistry.searchInterfaceTypes({ name: 'Angular' });
      expect(results).toHaveLength(0);
    });

    test('should handle case-insensitive search', () => {
      const results = interfaceRegistry.searchInterfaceTypes({ name: 'react' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('React Interface');
    });
  });

  describe('Statistics and Summary', () => {
    beforeEach(() => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test', metadata);
      interfaceRegistry.addToCategory('test', 'development');
      interfaceRegistry.setTypeMetadata('test', { author: 'Test Author' });
      interfaceRegistry.setTypeConstraints('test', { supportedFrameworks: ['react'] });
    });

    test('should get registry statistics', () => {
      const stats = interfaceRegistry.getStats();
      
      expect(stats).toEqual({
        totalRegistered: 1,
        totalUnregistered: 0,
        activeTypes: 1,
        lastActivity: expect.any(Date),
        categories: 1,
        typesWithMetadata: 1,
        typesWithConstraints: 1
      });
    });

    test('should get registry summary', () => {
      const summary = interfaceRegistry.getSummary();
      
      expect(summary).toEqual({
        totalTypes: 1,
        categories: {
          development: ['test']
        },
        types: ['test'],
        lastActivity: expect.any(Date)
      });
    });
  });

  describe('Data Export and Import', () => {
    beforeEach(() => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test', metadata);
      interfaceRegistry.addToCategory('test', 'development');
      interfaceRegistry.setTypeMetadata('test', { author: 'Test Author' });
      interfaceRegistry.setTypeConstraints('test', { supportedFrameworks: ['react'] });
    });

    test('should export registry data', () => {
      const exportedData = interfaceRegistry.exportData();
      
      expect(exportedData).toHaveProperty('interfaceTypes');
      expect(exportedData).toHaveProperty('typeCategories');
      expect(exportedData).toHaveProperty('typeMetadata');
      expect(exportedData).toHaveProperty('typeConstraints');
      expect(exportedData).toHaveProperty('stats');
      expect(exportedData).toHaveProperty('exportedAt');
      
      expect(exportedData.interfaceTypes).toHaveProperty('test');
      expect(exportedData.typeCategories).toHaveProperty('development');
    });

    test('should import registry data', () => {
      const exportedData = interfaceRegistry.exportData();
      const newRegistry = new InterfaceRegistry({ logger: mockLogger });
      
      newRegistry.importData(exportedData);
      
      expect(newRegistry.isRegistered('test')).toBe(true);
      expect(newRegistry.isInCategory('test', 'development')).toBe(true);
      
      const typeInfo = newRegistry.getInterfaceType('test');
      expect(typeInfo.metadata.author).toBe('Test Author');
      expect(typeInfo.constraints.supportedFrameworks).toContain('react');
    });

    test('should throw error for invalid import data', () => {
      expect(() => {
        interfaceRegistry.importData(null);
      }).toThrow('data must be an object');

      expect(() => {
        interfaceRegistry.importData('invalid');
      }).toThrow('data must be an object');
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      const metadata = {
        name: 'Test Interface',
        description: 'A test interface',
        version: '1.0.0'
      };
      interfaceRegistry.registerInterfaceType('test', metadata);
      interfaceRegistry.addToCategory('test', 'development');
      interfaceRegistry.setTypeMetadata('test', { author: 'Test Author' });
      interfaceRegistry.setTypeConstraints('test', { supportedFrameworks: ['react'] });
    });

    test('should clear all registry data', () => {
      expect(interfaceRegistry.interfaceTypes.size).toBe(1);
      expect(interfaceRegistry.typeCategories.size).toBe(1);
      expect(interfaceRegistry.typeMetadata.size).toBe(1);
      expect(interfaceRegistry.typeConstraints.size).toBe(1);
      
      interfaceRegistry.clear();
      
      expect(interfaceRegistry.interfaceTypes.size).toBe(0);
      expect(interfaceRegistry.typeCategories.size).toBe(0);
      expect(interfaceRegistry.typeMetadata.size).toBe(0);
      expect(interfaceRegistry.typeConstraints.size).toBe(0);
      expect(interfaceRegistry.stats.activeTypes).toBe(0);
    });

    test('should destroy registry and clear resources', () => {
      interfaceRegistry.destroy();
      
      expect(interfaceRegistry.interfaceTypes.size).toBe(0);
      expect(interfaceRegistry.typeCategories.size).toBe(0);
      expect(interfaceRegistry.typeMetadata.size).toBe(0);
      expect(interfaceRegistry.typeConstraints.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty registry', () => {
      expect(interfaceRegistry.getAllInterfaceTypes()).toHaveLength(0);
      expect(interfaceRegistry.getAllCategories()).toHaveLength(0);
      expect(interfaceRegistry.getStats().activeTypes).toBe(0);
    });

    test('should handle special characters in interface type', () => {
      const metadata = {
        name: 'Special Interface',
        description: 'Interface with special characters',
        version: '1.0.0'
      };
      
      interfaceRegistry.registerInterfaceType('test-type_123', metadata);
      expect(interfaceRegistry.isRegistered('test-type_123')).toBe(true);
    });

    test('should handle concurrent operations', () => {
      const metadata1 = {
        name: 'Interface 1',
        description: 'First interface',
        version: '1.0.0'
      };
      const metadata2 = {
        name: 'Interface 2',
        description: 'Second interface',
        version: '1.0.0'
      };
      
      interfaceRegistry.registerInterfaceType('test1', metadata1);
      interfaceRegistry.registerInterfaceType('test2', metadata2);
      
      expect(interfaceRegistry.getAllInterfaceTypes()).toHaveLength(2);
    });
  });
});
