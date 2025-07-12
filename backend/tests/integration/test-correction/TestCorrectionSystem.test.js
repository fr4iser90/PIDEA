const path = require('path');
const fs = require('fs-extra');
const TestCorrectionCommand = require('@categories/management/TestCorrectionCommand');
const TestCorrectionHandler = require('@handler-categories/management/TestCorrectionHandler');
const TestCorrectionService = require('@/domain/services/TestCorrectionService');
const CoverageAnalyzerService = require('@/domain/services/CoverageAnalyzerService');

describe('Test Correction System Integration', () => {
  let testCorrectionService;
  let coverageAnalyzerService;
  let handler;
  let tempDir;

  beforeAll(async () => {
    // Create temporary directory for testing
    tempDir = path.join(__dirname, 'temp-test-correction');
    await fs.ensureDir(tempDir);
    
    // Initialize services
    testCorrectionService = new TestCorrectionService();
    coverageAnalyzerService = new CoverageAnalyzerService();
    handler = new TestCorrectionHandler(testCorrectionService, coverageAnalyzerService);
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  beforeEach(async () => {
    // Clean up before each test
    await fs.emptyDir(tempDir);
  });

  describe('TestCorrectionCommand', () => {
    it('should create auto-fix command correctly', () => {
      const command = TestCorrectionCommand.createAutoFix('test-project', {
        legacy: true,
        complex: false,
        dryRun: true,
        maxConcurrent: 3
      });

      expect(command.commandId).toMatch(/^test_correction_test-project_\d+_/);
      expect(command.projectId).toBe('test-project');
      expect(command.correctionType).toBe('auto-fix');
      expect(command.options.legacy).toBe(true);
      expect(command.options.complex).toBe(false);
      expect(command.options.dryRun).toBe(true);
      expect(command.options.maxConcurrent).toBe(3);
    });

    it('should create coverage improvement command correctly', () => {
      const command = TestCorrectionCommand.createCoverageImprove('test-project', {
        targetCoverage: 95,
        minCoverage: 85,
        focusAreas: ['domain', 'application']
      });

      expect(command.correctionType).toBe('coverage-improve');
      expect(command.options.targetCoverage).toBe(95);
      expect(command.options.minCoverage).toBe(85);
      expect(command.options.focusAreas).toEqual(['domain', 'application']);
    });

    it('should create refactor command correctly', () => {
      const command = TestCorrectionCommand.createRefactor('test-project', {
        complex: true,
        legacy: false,
        slow: true,
        dryRun: true
      });

      expect(command.correctionType).toBe('refactor');
      expect(command.options.complex).toBe(true);
      expect(command.options.legacy).toBe(false);
      expect(command.options.slow).toBe(true);
      expect(command.options.dryRun).toBe(true);
    });

    it('should get correct task type', () => {
      const autoFixCommand = TestCorrectionCommand.createAutoFix('test-project');
      const coverageCommand = TestCorrectionCommand.createCoverageImprove('test-project');
      const refactorCommand = TestCorrectionCommand.createRefactor('test-project');
      const statusCommand = TestCorrectionCommand.createStatus('test-project');
      const reportCommand = TestCorrectionCommand.createReport('test-project');

      expect(autoFixCommand.getTaskType()).toBe('test_fix');
      expect(coverageCommand.getTaskType()).toBe('test_coverage');
      expect(refactorCommand.getTaskType()).toBe('test_refactor');
      expect(statusCommand.getTaskType()).toBe('test_status');
      expect(reportCommand.getTaskType()).toBe('test_report');
    });

    it('should get correct task priority', () => {
      const highPriorityCommand = TestCorrectionCommand.createAutoFix('test-project', {
        legacy: true,
        watch: true
      });
      const mediumPriorityCommand = TestCorrectionCommand.createAutoFix('test-project', {
        complex: true,
        coverageTarget: 95
      });
      const lowPriorityCommand = TestCorrectionCommand.createAutoFix('test-project');

      expect(highPriorityCommand.getTaskPriority()).toBe('high');
      expect(mediumPriorityCommand.getTaskPriority()).toBe('medium');
      expect(lowPriorityCommand.getTaskPriority()).toBe('low');
    });

    it('should generate correct task title', () => {
      const legacyCommand = TestCorrectionCommand.createAutoFix('test-project', { legacy: true });
      const complexCommand = TestCorrectionCommand.createAutoFix('test-project', { complex: true });
      const watchCommand = TestCorrectionCommand.createAutoFix('test-project', { watch: true });
      const basicCommand = TestCorrectionCommand.createAutoFix('test-project');

      expect(legacyCommand.getTaskTitle()).toBe('Auto Fix Tests - Legacy Tests');
      expect(complexCommand.getTaskTitle()).toBe('Auto Fix Tests - Complex Tests');
      expect(watchCommand.getTaskTitle()).toBe('Auto Fix Tests - Watch Mode');
      expect(basicCommand.getTaskTitle()).toBe('Auto Fix Tests');
    });

    it('should generate correct task description', () => {
      const command = TestCorrectionCommand.createAutoFix('test-project', {
        dryRun: true,
        coverageTarget: 95
      });

      const description = command.getTaskDescription();
      expect(description).toContain('Automatically fix failing, legacy, and complex tests');
      expect(description).toContain('Dry run mode - no actual changes will be made');
      expect(description).toContain('Target coverage: 95%');
    });
  });

  describe('TestCorrectionHandler', () => {
    it('should validate command correctly', () => {
      const validCommand = TestCorrectionCommand.createAutoFix('test-project');
      const invalidCommand = TestCorrectionCommand.createAutoFix('test-project', {
        maxConcurrent: 25, // Invalid value
        coverageTarget: 150 // Invalid value
      });

      expect(() => handler.validateCommand(validCommand)).not.toThrow();
      expect(() => handler.validateCommand(invalidCommand)).toThrow('Validation failed');
    });

    it('should handle status command', async () => {
      const command = TestCorrectionCommand.createStatus('test-project');
      
      // Mock the services to return expected data
      jest.spyOn(testCorrectionService, 'getStatus').mockResolvedValue({
        total: 100,
        fixed: 50,
        failed: 10,
        inProgress: 5
      });
      
      jest.spyOn(coverageAnalyzerService, 'getCurrentCoverage').mockResolvedValue({
        total: 85,
        branches: 80,
        functions: 90,
        lines: 85,
        statements: 85
      });

      const result = await handler.handle(command);

      expect(result.success).toBe(true);
      expect(result.commandId).toBe(command.commandId);
      expect(result.result).toBeDefined();
    });

    it('should handle command validation errors', async () => {
      const invalidCommand = {
        commandId: 'test',
        projectId: '', // Invalid - empty project ID
        correctionType: 'auto-fix',
        options: {}
      };

      const result = await handler.handle(invalidCommand);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('Integration with Task System', () => {
    it('should create task-compatible command', () => {
      const command = TestCorrectionCommand.createAutoFix('test-project', {
        legacy: true,
        complex: false,
        dryRun: true
      });

      const taskData = {
        projectId: command.projectId,
        title: command.getTaskTitle(),
        description: command.getTaskDescription(),
        priority: command.getTaskPriority(),
        type: command.getTaskType(),
        metadata: command.getMetadata()
      };

      expect(taskData.projectId).toBe('test-project');
      expect(taskData.title).toBe('Auto Fix Tests - Legacy Tests');
      expect(taskData.priority).toBe('high');
      expect(taskData.type).toBe('test_fix');
      expect(taskData.metadata.correctionType).toBe('auto-fix');
      expect(taskData.metadata.options.legacy).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const command = TestCorrectionCommand.createAutoFix('test-project');
      
      // Mock service to throw error
      jest.spyOn(testCorrectionService, 'analyzeFailingTests').mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await handler.handle(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });

    it('should validate command options', () => {
      const command = TestCorrectionCommand.createAutoFix('test-project', {
        maxConcurrent: -1, // Invalid
        coverageTarget: 101, // Invalid
        retryAttempts: 15 // Invalid
      });

      expect(() => handler.validateCommand(command)).toThrow('Validation failed');
    });
  });

  describe('CLI Integration', () => {
    it('should support command line arguments', () => {
      // This test verifies that the CLI interface can be used
      const { program } = require('commander');
      
      // Mock process.argv
      const originalArgv = process.argv;
      process.argv = ['node', 'test', 'auto-fix', '--legacy', '--dry-run'];
      
      // The CLI should be able to parse these arguments
      expect(() => {
        program.parse(process.argv);
      }).not.toThrow();
      
      // Restore original argv
      process.argv = originalArgv;
    });
  });
}); 