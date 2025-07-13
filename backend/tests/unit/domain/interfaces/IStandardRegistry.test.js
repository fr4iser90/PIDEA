/**
 * IStandardRegistry.test.js - Unit tests for IStandardRegistry interface
 * Tests interface definition and method signatures
 */

const IStandardRegistry = require('../../../domain/interfaces/IStandardRegistry');

describe('IStandardRegistry Interface', () => {
  describe('Interface Definition', () => {
    it('should be a class', () => {
      expect(typeof IStandardRegistry).toBe('function');
      expect(IStandardRegistry.prototype.constructor).toBe(IStandardRegistry);
    });

    it('should have all required static methods', () => {
      const requiredMethods = [
        'getByCategory',
        'buildFromCategory',
        'register',
        'execute',
        'getCategories',
        'get',
        'has',
        'remove',
        'getStats',
        'validateConfig',
        'getMetadata',
        'updateMetadata',
        'getExecutionHistory',
        'clear',
        'export',
        'import'
      ];

      requiredMethods.forEach(method => {
        expect(typeof IStandardRegistry[method]).toBe('function');
      });
    });
  });

  describe('Method Signatures', () => {
    describe('getByCategory', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.getByCategory('test');
        }).toThrow('getByCategory() must be implemented');
      });
    });

    describe('buildFromCategory', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.buildFromCategory('test', 'name', {});
        }).toThrow('buildFromCategory() must be implemented');
      });
    });

    describe('register', () => {
      it('should throw error when called directly', async () => {
        await expect(async () => {
          await IStandardRegistry.register('test', {}, 'category');
        }).rejects.toThrow('register() must be implemented');
      });
    });

    describe('execute', () => {
      it('should throw error when called directly', async () => {
        await expect(async () => {
          await IStandardRegistry.execute('test', {}, {});
        }).rejects.toThrow('execute() must be implemented');
      });
    });

    describe('getCategories', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.getCategories();
        }).toThrow('getCategories() must be implemented');
      });
    });

    describe('get', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.get('test');
        }).toThrow('get() must be implemented');
      });
    });

    describe('has', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.has('test');
        }).toThrow('has() must be implemented');
      });
    });

    describe('remove', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.remove('test');
        }).toThrow('remove() must be implemented');
      });
    });

    describe('getStats', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.getStats();
        }).toThrow('getStats() must be implemented');
      });
    });

    describe('validateConfig', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.validateConfig({});
        }).toThrow('validateConfig() must be implemented');
      });
    });

    describe('getMetadata', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.getMetadata('test');
        }).toThrow('getMetadata() must be implemented');
      });
    });

    describe('updateMetadata', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.updateMetadata('test', {});
        }).toThrow('updateMetadata() must be implemented');
      });
    });

    describe('getExecutionHistory', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.getExecutionHistory('test');
        }).toThrow('getExecutionHistory() must be implemented');
      });
    });

    describe('clear', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.clear();
        }).toThrow('clear() must be implemented');
      });
    });

    describe('export', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.export();
        }).toThrow('export() must be implemented');
      });
    });

    describe('import', () => {
      it('should throw error when called directly', () => {
        expect(() => {
          IStandardRegistry.import({});
        }).toThrow('import() must be implemented');
      });
    });
  });

  describe('Interface Contract', () => {
    it('should not have instance methods', () => {
      const instance = new IStandardRegistry();
      
      // All methods should be static, not instance methods
      expect(instance.getByCategory).toBeUndefined();
      expect(instance.buildFromCategory).toBeUndefined();
      expect(instance.register).toBeUndefined();
      expect(instance.execute).toBeUndefined();
      expect(instance.getCategories).toBeUndefined();
      expect(instance.get).toBeUndefined();
      expect(instance.has).toBeUndefined();
      expect(instance.remove).toBeUndefined();
      expect(instance.getStats).toBeUndefined();
      expect(instance.validateConfig).toBeUndefined();
      expect(instance.getMetadata).toBeUndefined();
      expect(instance.updateMetadata).toBeUndefined();
      expect(instance.getExecutionHistory).toBeUndefined();
      expect(instance.clear).toBeUndefined();
      expect(instance.export).toBeUndefined();
      expect(instance.import).toBeUndefined();
    });

    it('should not have a constructor that accepts parameters', () => {
      // The constructor should not throw when called with any parameters
      expect(() => {
        new IStandardRegistry();
        new IStandardRegistry({});
        new IStandardRegistry('test');
        new IStandardRegistry(123);
      }).not.toThrow();
    });
  });

  describe('Documentation', () => {
    it('should have JSDoc comments for all methods', () => {
      const sourceCode = IStandardRegistry.toString();
      
      // Check for JSDoc patterns
      expect(sourceCode).toMatch(/\/\*\*/);
      expect(sourceCode).toMatch(/@param/);
      expect(sourceCode).toMatch(/@returns/);
    });

    it('should have consistent method documentation', () => {
      const methods = [
        'getByCategory',
        'buildFromCategory',
        'register',
        'execute',
        'getCategories',
        'get',
        'has',
        'remove',
        'getStats',
        'validateConfig',
        'getMetadata',
        'updateMetadata',
        'getExecutionHistory',
        'clear',
        'export',
        'import'
      ];

      const sourceCode = IStandardRegistry.toString();
      
      methods.forEach(method => {
        expect(sourceCode).toMatch(new RegExp(`\\* ${method}\\(`));
      });
    });
  });

  describe('Error Messages', () => {
    it('should have descriptive error messages', () => {
      const errorMessages = [
        'getByCategory() must be implemented',
        'buildFromCategory() must be implemented',
        'register() must be implemented',
        'execute() must be implemented',
        'getCategories() must be implemented',
        'get() must be implemented',
        'has() must be implemented',
        'remove() must be implemented',
        'getStats() must be implemented',
        'validateConfig() must be implemented',
        'getMetadata() must be implemented',
        'updateMetadata() must be implemented',
        'getExecutionHistory() must be implemented',
        'clear() must be implemented',
        'export() must be implemented',
        'import() must be implemented'
      ];

      errorMessages.forEach(message => {
        expect(() => {
          // This will trigger one of the error messages
          IStandardRegistry.getByCategory('test');
        }).toThrow(message);
      });
    });
  });

  describe('Type Safety', () => {
    it('should handle various parameter types gracefully', () => {
      // Test that the interface doesn't crash with various parameter types
      expect(() => {
        IStandardRegistry.getByCategory(null);
        IStandardRegistry.getByCategory(undefined);
        IStandardRegistry.getByCategory(123);
        IStandardRegistry.getByCategory({});
        IStandardRegistry.getByCategory([]);
      }).toThrow('getByCategory() must be implemented');
    });

    it('should handle async methods correctly', async () => {
      await expect(async () => {
        await IStandardRegistry.register(null, null, null);
      }).rejects.toThrow('register() must be implemented');

      await expect(async () => {
        await IStandardRegistry.execute(null, null, null);
      }).rejects.toThrow('execute() must be implemented');
    });
  });
}); 