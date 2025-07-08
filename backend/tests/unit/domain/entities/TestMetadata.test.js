/**
 * TestMetadata Entity Unit Tests
 */

const TestMetadata = require('@/domain/entities/TestMetadata');

describe('TestMetadata Entity', () => {
  let testMetadata;

  beforeEach(() => {
    testMetadata = new TestMetadata(
      'test-id',
      '/path/to/test.js',
      'test.js',
      'Test Suite',
      'unknown',
      '1.0.0',
      false,
      null,
      null,
      0,
      0,
      0,
      0,
      [],
      {}
    );
  });

  describe('Constructor', () => {
    it('should create a TestMetadata instance with valid parameters', () => {
      expect(testMetadata).toBeInstanceOf(TestMetadata);
      expect(testMetadata.id).toBe('test-id');
      expect(testMetadata.filePath).toBe('/path/to/test.js');
      expect(testMetadata.fileName).toBe('test.js');
      expect(testMetadata.testName).toBe('Test Suite');
    });

    it('should generate UUID if no id provided', () => {
      const metadata = TestMetadata.create('/path/to/test.js', 'test.js', 'Test Suite');
      expect(metadata.id).toBeDefined();
      expect(typeof metadata.id).toBe('string');
      expect(metadata.id.length).toBeGreaterThan(0);
    });

    it('should throw error for missing required fields', () => {
      expect(() => new TestMetadata()).toThrow('File path is required for TestMetadata');
      expect(() => new TestMetadata('id', null, 'test.js', 'Test Suite')).toThrow('File path is required for TestMetadata');
      expect(() => new TestMetadata('id', '/path/to/test.js', null, 'Test Suite')).toThrow('File name is required for TestMetadata');
      expect(() => new TestMetadata('id', '/path/to/test.js', 'test.js', null)).toThrow('Test name is required for TestMetadata');
    });

    it('should throw error for negative values', () => {
      expect(() => new TestMetadata('id', '/path/to/test.js', 'test.js', 'Test Suite', 'unknown', '1.0.0', false, null, null, -1, 0, 0, 0)).toThrow('Execution count cannot be negative');
      expect(() => new TestMetadata('id', '/path/to/test.js', 'test.js', 'Test Suite', 'unknown', '1.0.0', false, null, null, 0, -1, 0, 0)).toThrow('Success count cannot be negative');
      expect(() => new TestMetadata('id', '/path/to/test.js', 'test.js', 'Test Suite', 'unknown', '1.0.0', false, null, null, 0, 0, -1, 0)).toThrow('Failure count cannot be negative');
      expect(() => new TestMetadata('id', '/path/to/test.js', 'test.js', 'Test Suite', 'unknown', '1.0.0', false, null, null, 0, 0, 0, -1)).toThrow('Average duration cannot be negative');
    });
  });

  describe('Status Methods', () => {
    it('should correctly identify test status', () => {
      testMetadata._status = 'passing';
      expect(testMetadata.isPassing()).toBe(true);
      expect(testMetadata.isFailing()).toBe(false);

      testMetadata._status = 'failing';
      expect(testMetadata.isFailing()).toBe(true);
      expect(testMetadata.isPassing()).toBe(false);

      testMetadata._status = 'skipped';
      expect(testMetadata.isSkipped()).toBe(true);

      testMetadata._status = 'pending';
      expect(testMetadata.isPending()).toBe(true);

      testMetadata._status = 'unknown';
      expect(testMetadata.isUnknown()).toBe(true);
    });

    it('should check if test has been run', () => {
      expect(testMetadata.hasBeenRun()).toBe(false);
      
      testMetadata._lastRunAt = new Date();
      expect(testMetadata.hasBeenRun()).toBe(true);
    });
  });

  describe('Statistics Methods', () => {
    it('should calculate success rate correctly', () => {
      testMetadata._executionCount = 10;
      testMetadata._successCount = 8;
      testMetadata._failureCount = 2;

      expect(testMetadata.getSuccessRate()).toBe(80);
    });

    it('should calculate failure rate correctly', () => {
      testMetadata._executionCount = 10;
      testMetadata._successCount = 8;
      testMetadata._failureCount = 2;

      expect(testMetadata.getFailureRate()).toBe(20);
    });

    it('should return 0 for rates when no executions', () => {
      expect(testMetadata.getSuccessRate()).toBe(0);
      expect(testMetadata.getFailureRate()).toBe(0);
    });

    it('should check if test is recently modified', () => {
      expect(testMetadata.isRecentlyModified()).toBe(false);
      
      testMetadata._lastModifiedAt = new Date();
      expect(testMetadata.isRecentlyModified()).toBe(true);
      
      testMetadata._lastModifiedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      expect(testMetadata.isRecentlyModified()).toBe(false);
    });

    it('should check if test is frequently run', () => {
      expect(testMetadata.isFrequentlyRun()).toBe(false);
      
      testMetadata._executionCount = 5;
      expect(testMetadata.isFrequentlyRun()).toBe(true);
    });

    it('should check if test is stable', () => {
      testMetadata._executionCount = 10;
      testMetadata._successCount = 9;
      expect(testMetadata.isStable()).toBe(true);
      
      testMetadata._successCount = 7;
      expect(testMetadata.isStable()).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should mark test as passing', () => {
      testMetadata.markAsPassing(1000);
      
      expect(testMetadata.isPassing()).toBe(true);
      expect(testMetadata.executionCount).toBe(1);
      expect(testMetadata.successCount).toBe(1);
      expect(testMetadata.averageDuration).toBe(1000);
      expect(testMetadata.lastRunAt).toBeInstanceOf(Date);
    });

    it('should mark test as failing', () => {
      const error = 'Test failed';
      testMetadata.markAsFailing(2000, error);
      
      expect(testMetadata.isFailing()).toBe(true);
      expect(testMetadata.executionCount).toBe(1);
      expect(testMetadata.failureCount).toBe(1);
      expect(testMetadata.averageDuration).toBe(2000);
      expect(testMetadata.getMetadata('lastError')).toBe(error);
    });

    it('should mark test as skipped', () => {
      testMetadata.markAsSkipped();
      
      expect(testMetadata.isSkipped()).toBe(true);
      expect(testMetadata.lastRunAt).toBeInstanceOf(Date);
    });

    it('should mark test as pending', () => {
      testMetadata.markAsPending();
      
      expect(testMetadata.isPending()).toBe(true);
    });

    it('should mark test as legacy', () => {
      testMetadata.markAsLegacy(75);
      
      expect(testMetadata.isLegacy).toBe(true);
      expect(testMetadata.legacyScore).toBe(75);
    });

    it('should update version', () => {
      testMetadata.updateVersion('2.0.0');
      
      expect(testMetadata.version).toBe('2.0.0');
    });

    it('should update last modified', () => {
      const before = testMetadata.lastModifiedAt;
      testMetadata.updateLastModified();
      
      expect(testMetadata.lastModifiedAt).not.toBe(before);
    });
  });

  describe('Score Methods', () => {
    it('should set complexity score', () => {
      testMetadata.setComplexityScore(85);
      expect(testMetadata.complexityScore).toBe(85);
      
      testMetadata.setComplexityScore(150);
      expect(testMetadata.complexityScore).toBe(100);
      
      testMetadata.setComplexityScore(-10);
      expect(testMetadata.complexityScore).toBe(0);
    });

    it('should set maintenance score', () => {
      testMetadata.setMaintenanceScore(60);
      expect(testMetadata.maintenanceScore).toBe(60);
      
      testMetadata.setMaintenanceScore(150);
      expect(testMetadata.maintenanceScore).toBe(100);
      
      testMetadata.setMaintenanceScore(-10);
      expect(testMetadata.maintenanceScore).toBe(0);
    });

    it('should check if test needs maintenance', () => {
      expect(testMetadata.needsMaintenance()).toBe(false);
      
      testMetadata.setMaintenanceScore(80);
      expect(testMetadata.needsMaintenance()).toBe(true);
    });

    it('should check if test is high complexity', () => {
      expect(testMetadata.isHighComplexity()).toBe(false);
      
      testMetadata.setComplexityScore(85);
      expect(testMetadata.isHighComplexity()).toBe(true);
    });
  });

  describe('Tag Methods', () => {
    it('should add and remove tags', () => {
      testMetadata.addTag('integration');
      expect(testMetadata.hasTag('integration')).toBe(true);
      expect(testMetadata.tags).toContain('integration');
      
      testMetadata.addTag('slow');
      expect(testMetadata.tags).toContain('slow');
      expect(testMetadata.tags.length).toBe(2);
      
      testMetadata.removeTag('integration');
      expect(testMetadata.hasTag('integration')).toBe(false);
      expect(testMetadata.tags).not.toContain('integration');
    });

    it('should not add duplicate tags', () => {
      testMetadata.addTag('test');
      testMetadata.addTag('test');
      expect(testMetadata.tags.filter(tag => tag === 'test').length).toBe(1);
    });
  });

  describe('Metadata Methods', () => {
    it('should set and get metadata', () => {
      testMetadata.setMetadata('framework', 'jest');
      expect(testMetadata.getMetadata('framework')).toBe('jest');
      
      testMetadata.setMetadata('priority', 'high');
      expect(testMetadata.getMetadata('priority')).toBe('high');
    });

    it('should remove metadata', () => {
      testMetadata.setMetadata('temp', 'value');
      expect(testMetadata.getMetadata('temp')).toBe('value');
      
      testMetadata.removeMetadata('temp');
      expect(testMetadata.getMetadata('temp')).toBeUndefined();
    });
  });

  describe('Health Score', () => {
    it('should calculate health score correctly', () => {
      // Perfect test
      testMetadata._executionCount = 10;
      testMetadata._successCount = 10;
      testMetadata._failureCount = 0;
      testMetadata._isLegacy = false;
      testMetadata._complexityScore = 30;
      testMetadata._maintenanceScore = 90;
      
      expect(testMetadata.getHealthScore()).toBe(100);
    });

    it('should reduce health score for failures', () => {
      testMetadata._executionCount = 10;
      testMetadata._successCount = 7;
      testMetadata._failureCount = 3;
      
      const healthScore = testMetadata.getHealthScore();
      expect(healthScore).toBeLessThan(100);
      expect(healthScore).toBeGreaterThan(0);
    });

    it('should reduce health score for legacy tests', () => {
      testMetadata._isLegacy = true;
      testMetadata._legacyScore = 80;
      
      const healthScore = testMetadata.getHealthScore();
      expect(healthScore).toBeLessThan(100);
    });

    it('should reduce health score for high complexity', () => {
      testMetadata._complexityScore = 90;
      
      const healthScore = testMetadata.getHealthScore();
      expect(healthScore).toBeLessThan(100);
    });

    it('should reduce health score for maintenance needs', () => {
      testMetadata._maintenanceScore = 30;
      
      const healthScore = testMetadata.getHealthScore();
      expect(healthScore).toBeLessThan(100);
    });
  });

  describe('Priority', () => {
    it('should return correct priority based on health score', () => {
      testMetadata._executionCount = 10;
      testMetadata._successCount = 10;
      testMetadata._failureCount = 0;
      expect(testMetadata.getPriority()).toBe('low');
      
      testMetadata._failureCount = 5;
      expect(testMetadata.getPriority()).toBe('high');
      
      testMetadata._failureCount = 8;
      expect(testMetadata.getPriority()).toBe('critical');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      testMetadata._status = 'passing';
      testMetadata._executionCount = 5;
      testMetadata._successCount = 4;
      testMetadata._failureCount = 1;
      testMetadata.addTag('unit');
      
      const json = testMetadata.toJSON();
      
      expect(json.id).toBe('test-id');
      expect(json.filePath).toBe('/path/to/test.js');
      expect(json.status).toBe('passing');
      expect(json.executionCount).toBe(5);
      expect(json.successCount).toBe(4);
      expect(json.failureCount).toBe(1);
      expect(json.tags).toContain('unit');
    });

    it('should deserialize from JSON correctly', () => {
      const json = {
        id: 'test-id',
        filePath: '/path/to/test.js',
        fileName: 'test.js',
        testName: 'Test Suite',
        status: 'passing',
        version: '1.0.0',
        isLegacy: false,
        lastRunAt: new Date(),
        lastModifiedAt: new Date(),
        executionCount: 10,
        successCount: 8,
        failureCount: 2,
        averageDuration: 1500,
        tags: ['unit', 'fast'],
        metadata: { framework: 'jest' },
        createdAt: new Date(),
        updatedAt: new Date(),
        legacyScore: 0,
        complexityScore: 30,
        maintenanceScore: 80
      };
      
      const metadata = TestMetadata.fromJSON(json);
      
      expect(metadata.id).toBe('test-id');
      expect(metadata.filePath).toBe('/path/to/test.js');
      expect(metadata.status).toBe('passing');
      expect(metadata.executionCount).toBe(10);
      expect(metadata.tags).toContain('unit');
      expect(metadata.tags).toContain('fast');
      expect(metadata.getMetadata('framework')).toBe('jest');
    });
  });

  describe('Comparison Methods', () => {
    it('should check equality correctly', () => {
      const metadata1 = new TestMetadata('same-id', '/path1', 'test1.js', 'Test 1');
      const metadata2 = new TestMetadata('same-id', '/path2', 'test2.js', 'Test 2');
      const metadata3 = new TestMetadata('different-id', '/path1', 'test1.js', 'Test 1');
      
      expect(metadata1.equals(metadata2)).toBe(true);
      expect(metadata1.equals(metadata3)).toBe(false);
    });

    it('should check if same test correctly', () => {
      const metadata1 = new TestMetadata('id1', '/path/test.js', 'test.js', 'Test Suite');
      const metadata2 = new TestMetadata('id2', '/path/test.js', 'test.js', 'Test Suite');
      const metadata3 = new TestMetadata('id3', '/path/test.js', 'test.js', 'Different Test');
      
      expect(metadata1.isSameTest(metadata2)).toBe(true);
      expect(metadata1.isSameTest(metadata3)).toBe(false);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create test metadata with defaults', () => {
      const metadata = TestMetadata.create('/path/test.js', 'test.js', 'Test Suite');
      
      expect(metadata.filePath).toBe('/path/test.js');
      expect(metadata.fileName).toBe('test.js');
      expect(metadata.testName).toBe('Test Suite');
      expect(metadata.status).toBe('unknown');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.isLegacy).toBe(false);
      expect(metadata.executionCount).toBe(0);
      expect(metadata.tags).toEqual([]);
    });

    it('should create test metadata with custom metadata', () => {
      const customMetadata = { framework: 'jest', priority: 'high' };
      const metadata = TestMetadata.create('/path/test.js', 'test.js', 'Test Suite', customMetadata);
      
      expect(metadata.getMetadata('framework')).toBe('jest');
      expect(metadata.getMetadata('priority')).toBe('high');
    });
  });
}); 