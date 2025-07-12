/**
 * Unit tests for IDEFactory
 */
const { IDEFactory, getIDEFactory, setIDEFactory } = require('@services/ide/IDEFactory');
const IDETypes = require('@services/ide/IDETypes');

// Mock IDE implementations
class MockCursorIDE {
  constructor(browserManager, ideManager, eventBus) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
  }
  
  async detect() { return true; }
  async start() { return { success: true }; }
  async stop() { return { success: true }; }
  async getStatus() { return { success: true }; }
  async getVersion() { return '1.0.0'; }
  async getFeatures() { return ['feature1']; }
  async executeCommand() { return { success: true }; }
  async getDOM() { return { success: true }; }
  async interact() { return { success: true }; }
  async sendMessage() { return { success: true }; }
  async getWorkspacePath() { return '/workspace'; }
  async switchToPort() { return { success: true }; }
  getActivePort() { return 3000; }
  async monitorTerminalOutput() { return null; }
  async getUserAppUrlForPort() { return null; }
  async detectDevServerFromPackageJson() { return null; }
  async applyRefactoring() { return { success: true }; }
  async sendTask() { return { success: true }; }
  async sendAutoModeTasks() { return { success: true }; }
}

class MockVSCodeIDE {
  constructor(browserManager, ideManager, eventBus) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
  }
  
  async detect() { return true; }
  async start() { return { success: true }; }
  async stop() { return { success: true }; }
  async getStatus() { return { success: true }; }
  async getVersion() { return '1.0.0'; }
  async getFeatures() { return ['feature1']; }
  async executeCommand() { return { success: true }; }
  async getDOM() { return { success: true }; }
  async interact() { return { success: true }; }
  async sendMessage() { return { success: true }; }
  async getWorkspacePath() { return '/workspace'; }
  async switchToPort() { return { success: true }; }
  getActivePort() { return 3001; }
  async monitorTerminalOutput() { return null; }
  async getUserAppUrlForPort() { return null; }
  async detectDevServerFromPackageJson() { return null; }
  async applyRefactoring() { return { success: true }; }
  async sendTask() { return { success: true }; }
  async sendAutoModeTasks() { return { success: true }; }
}

describe('IDEFactory', () => {
  let factory;

  beforeEach(() => {
    factory = new IDEFactory();
  });

  afterEach(() => {
    factory.clear();
  });

  describe('Constructor', () => {
    it('should create factory instance', () => {
      expect(factory).toBeInstanceOf(IDEFactory);
    });

    it('should initialize with empty implementations', () => {
      expect(factory.ideImplementations.size).toBe(0);
    });

    it('should set default IDE type to cursor', () => {
      expect(factory.defaultIDEType).toBe(IDETypes.CURSOR);
    });

    it('should set initialized to false', () => {
      expect(factory.initialized).toBe(false);
    });
  });

  describe('registerIDE', () => {
    it('should register valid IDE implementation', () => {
      const result = factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      expect(result).toBe(true);
      expect(factory.ideImplementations.has(IDETypes.CURSOR)).toBe(true);
    });

    it('should reject invalid IDE type', () => {
      const result = factory.registerIDE('invalid', MockCursorIDE);
      expect(result).toBe(false);
    });

    it('should reject null implementation', () => {
      const result = factory.registerIDE(IDETypes.CURSOR, null);
      expect(result).toBe(false);
    });

    it('should reject implementation without required methods', () => {
      class InvalidIDE {
        // Missing required methods
      }
      
      const result = factory.registerIDE(IDETypes.CURSOR, InvalidIDE);
      expect(result).toBe(false);
    });

    it('should register multiple IDE types', () => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      factory.registerIDE(IDETypes.VSCODE, MockVSCodeIDE);
      
      expect(factory.ideImplementations.has(IDETypes.CURSOR)).toBe(true);
      expect(factory.ideImplementations.has(IDETypes.VSCODE)).toBe(true);
    });
  });

  describe('createIDE', () => {
    beforeEach(() => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
    });

    it('should create IDE instance with valid dependencies', () => {
      const dependencies = {
        browserManager: {},
        ideManager: {},
        eventBus: {}
      };

      const result = factory.createIDE(IDETypes.CURSOR, dependencies);
      
      expect(result.success).toBe(true);
      expect(result.ide).toBeInstanceOf(MockCursorIDE);
      expect(result.type).toBe(IDETypes.CURSOR);
    });

    it('should fail with invalid IDE type', () => {
      const dependencies = {
        browserManager: {},
        ideManager: {},
        eventBus: {}
      };

      const result = factory.createIDE('invalid', dependencies);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid IDE type');
    });

    it('should fail with unregistered IDE type', () => {
      const dependencies = {
        browserManager: {},
        ideManager: {},
        eventBus: {}
      };

      const result = factory.createIDE(IDETypes.VSCODE, dependencies);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No implementation registered');
    });

    it('should fail with missing browserManager', () => {
      const dependencies = {
        ideManager: {},
        eventBus: {}
      };

      const result = factory.createIDE(IDETypes.CURSOR, dependencies);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('browserManager is required');
    });

    it('should fail with missing ideManager', () => {
      const dependencies = {
        browserManager: {},
        eventBus: {}
      };

      const result = factory.createIDE(IDETypes.CURSOR, dependencies);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('ideManager is required');
    });
  });

  describe('getAvailableIDEs', () => {
    it('should return empty array when no IDEs registered', () => {
      const available = factory.getAvailableIDEs();
      expect(available).toEqual([]);
    });

    it('should return registered IDE types', () => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      factory.registerIDE(IDETypes.VSCODE, MockVSCodeIDE);
      
      const available = factory.getAvailableIDEs();
      expect(available).toContain(IDETypes.CURSOR);
      expect(available).toContain(IDETypes.VSCODE);
    });
  });

  describe('getDefaultIDE', () => {
    it('should return default IDE type', () => {
      expect(factory.getDefaultIDE()).toBe(IDETypes.CURSOR);
    });
  });

  describe('setDefaultIDE', () => {
    beforeEach(() => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      factory.registerIDE(IDETypes.VSCODE, MockVSCodeIDE);
    });

    it('should set valid IDE type as default', () => {
      const result = factory.setDefaultIDE(IDETypes.VSCODE);
      expect(result).toBe(true);
      expect(factory.getDefaultIDE()).toBe(IDETypes.VSCODE);
    });

    it('should reject invalid IDE type', () => {
      const result = factory.setDefaultIDE('invalid');
      expect(result).toBe(false);
      expect(factory.getDefaultIDE()).toBe(IDETypes.CURSOR);
    });

    it('should reject unregistered IDE type', () => {
      const result = factory.setDefaultIDE(IDETypes.WINDSURF);
      expect(result).toBe(false);
      expect(factory.getDefaultIDE()).toBe(IDETypes.CURSOR);
    });
  });

  describe('isRegistered', () => {
    it('should return false for unregistered IDE', () => {
      expect(factory.isRegistered(IDETypes.CURSOR)).toBe(false);
    });

    it('should return true for registered IDE', () => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      expect(factory.isRegistered(IDETypes.CURSOR)).toBe(true);
    });
  });

  describe('getImplementation', () => {
    it('should return null for unregistered IDE', () => {
      expect(factory.getImplementation(IDETypes.CURSOR)).toBe(null);
    });

    it('should return implementation for registered IDE', () => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      expect(factory.getImplementation(IDETypes.CURSOR)).toBe(MockCursorIDE);
    });
  });

  describe('unregisterIDE', () => {
    beforeEach(() => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      factory.registerIDE(IDETypes.VSCODE, MockVSCodeIDE);
    });

    it('should unregister IDE type', () => {
      const result = factory.unregisterIDE(IDETypes.VSCODE);
      expect(result).toBe(true);
      expect(factory.isRegistered(IDETypes.VSCODE)).toBe(false);
    });

    it('should not unregister default IDE type', () => {
      const result = factory.unregisterIDE(IDETypes.CURSOR);
      expect(result).toBe(false);
      expect(factory.isRegistered(IDETypes.CURSOR)).toBe(true);
    });

    it('should return false for unregistered IDE', () => {
      const result = factory.unregisterIDE(IDETypes.WINDSURF);
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return factory status', () => {
      const status = factory.getStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('defaultIDEType');
      expect(status).toHaveProperty('registeredTypes');
      expect(status).toHaveProperty('totalImplementations');
      expect(status).toHaveProperty('timestamp');
    });
  });

  describe('validateIDEInstance', () => {
    it('should validate correct IDE instance', () => {
      const ideInstance = new MockCursorIDE({}, {}, {});
      const result = factory.validateIDEInstance(ideInstance);
      
      expect(result.valid).toBe(true);
    });

    it('should reject null instance', () => {
      const result = factory.validateIDEInstance(null);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('null or undefined');
    });

    it('should reject instance with missing methods', () => {
      const invalidInstance = {
        detect: () => {},
        // Missing other required methods
      };
      
      const result = factory.validateIDEInstance(invalidInstance);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing required methods');
    });
  });

  describe('createIDEWithFallback', () => {
    beforeEach(() => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      factory.registerIDE(IDETypes.VSCODE, MockVSCodeIDE);
    });

    it('should create preferred IDE when available', () => {
      const dependencies = {
        browserManager: {},
        ideManager: {},
        eventBus: {}
      };

      const result = factory.createIDEWithFallback(IDETypes.VSCODE, dependencies);
      
      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.preferredType).toBe(IDETypes.VSCODE);
    });

    it('should fallback to default IDE when preferred not available', () => {
      const dependencies = {
        browserManager: {},
        ideManager: {},
        eventBus: {}
      };

      const result = factory.createIDEWithFallback(IDETypes.WINDSURF, dependencies);
      
      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(true);
      expect(result.preferredType).toBe(IDETypes.WINDSURF);
      expect(result.fallbackType).toBe(IDETypes.CURSOR);
    });

    it('should fail when both preferred and default are unavailable', () => {
      factory.clear();
      
      const dependencies = {
        browserManager: {},
        ideManager: {},
        eventBus: {}
      };

      const result = factory.createIDEWithFallback(IDETypes.CURSOR, dependencies);
      
      expect(result.success).toBe(false);
      expect(result.usedFallback).toBe(false);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      factory.registerIDE(IDETypes.CURSOR, MockCursorIDE);
      factory.registerIDE(IDETypes.VSCODE, MockVSCodeIDE);
    });

    it('should clear all registrations', () => {
      factory.clear();
      
      expect(factory.ideImplementations.size).toBe(0);
      expect(factory.initialized).toBe(false);
      expect(factory.defaultIDEType).toBe(IDETypes.CURSOR);
    });
  });
});

describe('IDEFactory Singleton', () => {
  afterEach(() => {
    setIDEFactory(null);
  });

  describe('getIDEFactory', () => {
    it('should return singleton instance', () => {
      const factory1 = getIDEFactory();
      const factory2 = getIDEFactory();
      
      expect(factory1).toBe(factory2);
    });

    it('should create new instance if none exists', () => {
      setIDEFactory(null);
      const factory = getIDEFactory();
      
      expect(factory).toBeInstanceOf(IDEFactory);
    });
  });

  describe('setIDEFactory', () => {
    it('should set factory instance', () => {
      const newFactory = new IDEFactory();
      setIDEFactory(newFactory);
      
      const retrieved = getIDEFactory();
      expect(retrieved).toBe(newFactory);
    });
  });
}); 