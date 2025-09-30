/**
 * UnifiedBranchStrategy Tests
 * Unit tests for the unified branch strategy implementation
 */

const UnifiedBranchStrategy = require('@domain/services/version/UnifiedBranchStrategy');
const BranchStrategyRegistry = require('@domain/services/version/BranchStrategyRegistry');
const SemanticVersioningService = require('@domain/services/version/SemanticVersioningService');

describe('UnifiedBranchStrategy', () => {
  let strategy;
  let mockTask;
  let mockContext;

  beforeEach(() => {
    strategy = new UnifiedBranchStrategy({
      prefix: 'task',
      includeTaskId: true,
      includeTimestamp: true,
      sanitizeTitle: true
    });

    mockTask = {
      id: 'test-task-123',
      title: 'Test Feature Implementation',
      description: 'This is a test feature',
      type: { value: 'feature' },
      priority: { value: 'medium' },
      category: 'automation'
    };

    mockContext = {
      get: (key) => {
        const contextData = {
          taskId: 'test-task-123',
          priority: 'medium',
          category: 'automation'
        };
        return contextData[key];
      }
    };
  });

  describe('generateBranchName', () => {
    it('should generate a proper branch name with all components', () => {
      const branchName = strategy.generateBranchName(mockTask, mockContext);
      
      expect(branchName).toMatch(/^task\/test-task-123/);
      expect(branchName).toContain('test-feature-implementation');
      expect(branchName).toMatch(/\d{12}$/); // timestamp
    });

    it('should handle missing task ID gracefully', () => {
      const taskWithoutId = { ...mockTask };
      delete taskWithoutId.id;
      
      const branchName = strategy.generateBranchName(taskWithoutId, mockContext);
      
      expect(branchName).toMatch(/^task\/unknown/);
    });

    it('should sanitize title properly', () => {
      const taskWithSpecialChars = {
        ...mockTask,
        title: 'Test Feature with Special Characters!@#$%'
      };
      
      const branchName = strategy.generateBranchName(taskWithoutId, mockContext);
      
      expect(branchName).toMatch(/test-feature-with-special-characters/);
      expect(branchName).not.toMatch(/[!@#$%]/);
    });
  });

  describe('validateBranchName', () => {
    it('should validate correct branch names', () => {
      const validBranchName = 'task/test-task-123/test-feature-implementation/202412301200';
      const validation = strategy.validateBranchName(validBranchName);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid branch names', () => {
      const invalidBranchName = 'task/test-task-123/test feature with spaces/202412301200';
      const validation = strategy.validateBranchName(invalidBranchName);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('determineStrategy', () => {
    it('should determine correct strategy for feature tasks', () => {
      const featureTask = { ...mockTask, type: { value: 'feature' } };
      const strategyConfig = strategy.determineStrategy(featureTask, mockContext);
      
      expect(strategyConfig.mergeTarget).toBe('pidea-ai-main');
      expect(strategyConfig.protection).toBe('medium');
    });

    it('should determine correct strategy for hotfix tasks', () => {
      const hotfixTask = { ...mockTask, type: { value: 'hotfix' }, priority: { value: 'critical' } };
      const strategyConfig = strategy.determineStrategy(hotfixTask, mockContext);
      
      expect(strategyConfig.mergeTarget).toBe('main');
      expect(strategyConfig.protection).toBe('high');
    });
  });

  describe('getConfiguration', () => {
    it('should return proper configuration', () => {
      const config = strategy.getConfiguration();
      
      expect(config.type).toBe('unified');
      expect(config.prefix).toBe('task');
      expect(config.includeTaskId).toBe(true);
      expect(config.includeTimestamp).toBe(true);
    });
  });
});

describe('BranchStrategyRegistry', () => {
  let registry;
  let mockStrategy;

  beforeEach(() => {
    registry = new BranchStrategyRegistry();
    mockStrategy = new UnifiedBranchStrategy();
  });

  describe('registerStrategy', () => {
    it('should register a strategy successfully', () => {
      registry.registerStrategy('test-strategy', mockStrategy);
      
      expect(registry.hasStrategy('test-strategy')).toBe(true);
      expect(registry.getStrategy('test-strategy')).toBe(mockStrategy);
    });

    it('should throw error for invalid strategy', () => {
      expect(() => {
        registry.registerStrategy('invalid', {});
      }).toThrow('Strategy must be an instance of BaseBranchStrategy');
    });
  });

  describe('determineStrategy', () => {
    beforeEach(() => {
      registry.registerStrategy('unified', mockStrategy);
    });

    it('should determine strategy based on task type', () => {
      const task = { type: { value: 'feature' } };
      const strategyName = registry.determineStrategy(task);
      
      expect(strategyName).toBe('unified');
    });

    it('should use default strategy when no match found', () => {
      const task = { type: { value: 'unknown-type' } };
      const strategyName = registry.determineStrategy(task);
      
      expect(strategyName).toBe('unified'); // default
    });
  });
});

describe('SemanticVersioningService', () => {
  let service;

  beforeEach(() => {
    service = new SemanticVersioningService();
  });

  describe('parseVersion', () => {
    it('should parse valid semantic versions', () => {
      const parsed = service.parseVersion('1.2.3');
      
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: null,
        build: null,
        version: '1.2.3'
      });
    });

    it('should parse versions with prerelease', () => {
      const parsed = service.parseVersion('1.2.3-alpha.1');
      
      expect(parsed.prerelease).toBe('alpha.1');
    });

    it('should return null for invalid versions', () => {
      const parsed = service.parseVersion('invalid-version');
      
      expect(parsed).toBeNull();
    });
  });

  describe('bumpVersion', () => {
    it('should bump major version', () => {
      const newVersion = service.bumpVersion('1.2.3', 'major');
      
      expect(newVersion).toBe('2.0.0');
    });

    it('should bump minor version', () => {
      const newVersion = service.bumpVersion('1.2.3', 'minor');
      
      expect(newVersion).toBe('1.3.0');
    });

    it('should bump patch version', () => {
      const newVersion = service.bumpVersion('1.2.3', 'patch');
      
      expect(newVersion).toBe('1.2.4');
    });

    it('should throw error for invalid bump type', () => {
      expect(() => {
        service.bumpVersion('1.2.3', 'invalid');
      }).toThrow('Invalid bump type: invalid');
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(service.compareVersions('1.2.3', '1.2.4')).toBe(-1);
      expect(service.compareVersions('1.2.4', '1.2.3')).toBe(1);
      expect(service.compareVersions('1.2.3', '1.2.3')).toBe(0);
    });

    it('should handle prerelease versions', () => {
      expect(service.compareVersions('1.2.3', '1.2.3-alpha')).toBe(1);
      expect(service.compareVersions('1.2.3-alpha', '1.2.3')).toBe(-1);
    });
  });

  describe('determineBumpType', () => {
    it('should determine major bump for breaking changes', () => {
      const changes = { breakingChanges: 1 };
      const bumpType = service.determineBumpType(changes);
      
      expect(bumpType).toBe('major');
    });

    it('should determine minor bump for new features', () => {
      const changes = { newFeatures: 1 };
      const bumpType = service.determineBumpType(changes);
      
      expect(bumpType).toBe('minor');
    });

    it('should determine patch bump for bug fixes', () => {
      const changes = { bugFixes: 1 };
      const bumpType = service.determineBumpType(changes);
      
      expect(bumpType).toBe('patch');
    });
  });
});
