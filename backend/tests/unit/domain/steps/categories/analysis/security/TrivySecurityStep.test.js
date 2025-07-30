/**
 * TrivySecurityStep Unit Tests
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Test TrivySecurityStep functionality
 */

const TrivySecurityStep = require('@domain/steps/categories/analysis/security/TrivySecurityStep');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('@steps/StepBuilder');
jest.mock('@logging/Logger');

describe('TrivySecurityStep', () => {
  let trivyStep;
  let mockLogger;

  beforeEach(() => {
    trivyStep = new TrivySecurityStep();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    require('@logging/Logger').mockImplementation(() => mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(trivyStep.name).toBe('TrivySecurityStep');
      expect(trivyStep.description).toBe('Detects security vulnerabilities using Trivy-like patterns');
      expect(trivyStep.category).toBe('security');
      expect(trivyStep.dependencies).toEqual([]);
    });
  });

  describe('getConfig', () => {
    it('should return correct configuration', () => {
      const config = TrivySecurityStep.getConfig();
      
      expect(config.name).toBe('TrivySecurityStep');
      expect(config.type).toBe('analysis');
      expect(config.category).toBe('security');
      expect(config.version).toBe('1.0.0');
      expect(config.settings.timeout).toBe(30000);
      expect(config.validation.requiredFiles).toContain('package.json');
    });
  });

  describe('execute', () => {
    const mockContext = {
      projectPath: '/test/project',
      projectId: 'test-123',
      includeVulnerabilities: true,
      includeBestPractices: true
    };

    beforeEach(() => {
      // Mock StepBuilder
      require('@steps/StepBuilder').build.mockReturnValue({});
    });

    it('should execute successfully with valid context', async () => {
      // Mock file system operations
      jest.spyOn(fs, 'readdir').mockResolvedValue(['test.js', 'package.json']);
      jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => false });
      jest.spyOn(fs, 'readFile').mockResolvedValue('console.log("test");');

      const result = await trivyStep.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.metadata.stepName).toBe('TrivySecurityStep');
      expect(result.metadata.projectPath).toBe('/test/project');
      expect(result.metadata.projectId).toBe('test-123');
      expect(mockLogger.info).toHaveBeenCalledWith('🔒 Executing TrivySecurityStep...');
      expect(mockLogger.info).toHaveBeenCalledWith('✅ Trivy security analysis completed successfully');
    });

    it('should handle missing project path', async () => {
      const invalidContext = { ...mockContext, projectPath: null };

      const result = await trivyStep.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project path is required');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ Trivy security analysis failed: Project path is required');
    });

    it('should handle file system errors gracefully', async () => {
      jest.spyOn(fs, 'readdir').mockRejectedValue(new Error('File system error'));

      const result = await trivyStep.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.result.vulnerabilities).toEqual([]);
      expect(result.result.bestPractices).toEqual([]);
    });
  });

  describe('detectSecurityIssues', () => {
    it('should detect eval() usage', () => {
      const content = 'const result = eval("2 + 2");';
      const filePath = '/test/file.js';

      const result = trivyStep.detectSecurityIssues(content, filePath);

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0].severity).toBe('critical');
      expect(result.vulnerabilities[0].message).toBe('eval() usage detected');
      expect(result.vulnerabilities[0].cve).toBe('CWE-78');
      expect(result.vulnerabilities[0].scanner).toBe('TrivySecurityStep');
    });

    it('should detect innerHTML assignment', () => {
      const content = 'element.innerHTML = userInput;';
      const filePath = '/test/file.js';

      const result = trivyStep.detectSecurityIssues(content, filePath);

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0].severity).toBe('high');
      expect(result.vulnerabilities[0].message).toBe('innerHTML assignment detected');
      expect(result.vulnerabilities[0].cve).toBe('CWE-79');
    });

    it('should detect security best practices', () => {
      const content = 'app.use(helmet());';
      const filePath = '/test/file.js';

      const result = trivyStep.detectSecurityIssues(content, filePath);

      expect(result.bestPractices).toHaveLength(1);
      expect(result.bestPractices[0].message).toBe('Helmet security middleware detected');
      expect(result.bestPractices[0].scanner).toBe('TrivySecurityStep');
    });

    it('should return empty arrays for secure code', () => {
      const content = 'const safe = "no vulnerabilities here";';
      const filePath = '/test/file.js';

      const result = trivyStep.detectSecurityIssues(content, filePath);

      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.bestPractices).toHaveLength(0);
    });
  });

  describe('calculateSecurityScore', () => {
    it('should return 100 for no issues', () => {
      const score = trivyStep.calculateSecurityScore([]);
      expect(score).toBe(100);
    });

    it('should calculate score based on severity weights', () => {
      const issues = [
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'medium' }
      ];

      const score = trivyStep.calculateSecurityScore(issues);
      // critical(10) + high(7) + medium(4) = 21, so 100 - 21 = 79
      expect(score).toBe(79);
    });

    it('should not go below 0', () => {
      const issues = Array(20).fill({ severity: 'critical' });
      const score = trivyStep.calculateSecurityScore(issues);
      expect(score).toBe(0);
    });
  });

  describe('calculateCoverage', () => {
    it('should return 0 for no files', () => {
      const coverage = trivyStep.calculateCoverage([], '/test/project');
      expect(coverage).toBe(0);
    });

    it('should calculate coverage based on file count', () => {
      const files = Array(50).fill('file.js');
      const coverage = trivyStep.calculateCoverage(files, '/test/project');
      expect(coverage).toBe(50);
    });

    it('should cap coverage at 100', () => {
      const files = Array(200).fill('file.js');
      const coverage = trivyStep.calculateCoverage(files, '/test/project');
      expect(coverage).toBe(100);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0 for no result', () => {
      const confidence = trivyStep.calculateConfidence({});
      expect(confidence).toBe(0);
    });

    it('should return 50 for no issues found', () => {
      const result = { vulnerabilities: [], bestPractices: [] };
      const confidence = trivyStep.calculateConfidence(result);
      expect(confidence).toBe(50);
    });

    it('should increase confidence with more issues', () => {
      const result = {
        vulnerabilities: [{ severity: 'high' }],
        bestPractices: [{ message: 'good practice' }]
      };
      const confidence = trivyStep.calculateConfidence(result);
      expect(confidence).toBe(54); // 50 + (2 * 2) = 54
    });

    it('should cap confidence at 100', () => {
      const result = {
        vulnerabilities: Array(30).fill({ severity: 'high' }),
        bestPractices: Array(30).fill({ message: 'good practice' })
      };
      const confidence = trivyStep.calculateConfidence(result);
      expect(confidence).toBe(100);
    });
  });

  describe('validateContext', () => {
    it('should not throw for valid context', () => {
      const context = { projectPath: '/valid/path' };
      expect(() => trivyStep.validateContext(context)).not.toThrow();
    });

    it('should throw for missing project path', () => {
      const context = {};
      expect(() => trivyStep.validateContext(context)).toThrow('Project path is required');
    });

    it('should throw for null project path', () => {
      const context = { projectPath: null };
      expect(() => trivyStep.validateContext(context)).toThrow('Project path is required');
    });
  });
}); 