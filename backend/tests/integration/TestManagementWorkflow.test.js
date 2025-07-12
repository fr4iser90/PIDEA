/**
 * Test Management Workflow Integration Tests
 */

const TestManagementService = require('@services/TestManagementService');
const TestMetadataRepository = require('@repositories/TestMetadataRepository');
const UpdateTestStatusCommand = require('@categories/management/UpdateTestStatusCommand');
const UpdateTestStatusHandler = require('@handler-categories/management/UpdateTestStatusHandler');
const TestStatusTracker = require('@/scripts/test-management/test-status-tracker');
const LegacyDetector = require('@/scripts/test-management/legacy-detector');
const TestVersioner = require('@/scripts/test-management/test-versioner');
const TestReporter = require('@/scripts/test-management/test-reporter');
const fs = require('fs').promises;
const path = require('path');

describe('Test Management Workflow Integration', () => {
  let testManagementService;
  let testMetadataRepository;
  let updateTestStatusHandler;
  let testStatusTracker;
  let legacyDetector;
  let testVersioner;
  let testReporter;
  let tempDir;

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = path.join(__dirname, 'temp-test-files');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Initialize services with fresh repositories
    testMetadataRepository = new TestMetadataRepository();
    testManagementService = new TestManagementService(testMetadataRepository);
    updateTestStatusHandler = new UpdateTestStatusHandler(testManagementService);
    testStatusTracker = new TestStatusTracker();
    legacyDetector = new LegacyDetector();
    testVersioner = new TestVersioner();
    testReporter = new TestReporter();

    // Clear any existing data
    await testMetadataRepository.clear();
  });

  describe('Complete Test Management Workflow', () => {
    it('should handle complete test lifecycle from registration to reporting', async () => {
      // Step 1: Create test files
      const testFile1 = path.join(tempDir, 'user.test.js');
      const testFile2 = path.join(tempDir, 'legacy.test.js');
      
      await fs.writeFile(testFile1, `
        describe('User Service', () => {
          it('should create user', () => {
            expect(true).toBe(true);
          });
          
          it('should update user', () => {
            expect(true).toBe(true);
          });
        });
      `);
      
      await fs.writeFile(testFile2, `
        describe('Legacy Service', () => {
          it('should handle legacy functionality', () => {
            console.log('legacy test');
            expect(true).toBe(true);
          });
        });
      `);

      // Step 2: Register tests
      const test1 = await testManagementService.registerTest(testFile1, 'User Service', {
        framework: 'jest',
        category: 'unit'
      });
      
      const test2 = await testManagementService.registerTest(testFile2, 'Legacy Service', {
        framework: 'jest',
        category: 'legacy'
      });

      expect(test1).toBeDefined();
      expect(test2).toBeDefined();
      expect(test1.status).toBe('unknown');
      expect(test2.status).toBe('unknown');

      // Step 3: Update test statuses
      const command1 = UpdateTestStatusCommand.create(testFile1, 'User Service', 'passing', 1500);
      const command2 = UpdateTestStatusCommand.create(testFile2, 'Legacy Service', 'failing', 3000, 'Legacy error');

      const result1 = await updateTestStatusHandler.handle(command1);
      const result2 = await updateTestStatusHandler.handle(command2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Step 4: Scan for legacy tests
      const legacyResults = await legacyDetector.scanDirectory(tempDir, {
        minScore: 20,
        includeDetails: true
      });

      expect(legacyResults.legacyFiles).toBeGreaterThan(0);
      expect(legacyResults.files.some(f => f.fileName === 'legacy.test.js')).toBe(true);

      // Step 5: Track test status
      const mockJestResults = {
        testResults: [
          {
            testFilePath: testFile1,
            testResults: [
              {
                fullName: 'User Service should create user',
                status: 'passed',
                duration: 1500
              },
              {
                fullName: 'User Service should update user',
                status: 'passed',
                duration: 1200
              }
            ]
          },
          {
            testFilePath: testFile2,
            testResults: [
              {
                fullName: 'Legacy Service should handle legacy functionality',
                status: 'failed',
                duration: 3000,
                failureMessages: ['Legacy error']
              }
            ]
          }
        ]
      };

      const trackingResults = await testStatusTracker.trackTestResults(mockJestResults);
      expect(trackingResults.trackedTests).toBe(3);
      expect(trackingResults.updatedTests).toBe(3);

      // Step 6: Version a test
      const versionResult = await testVersioner.versionTest(testFile1, '2.0.0', 'Major refactor');
      expect(versionResult.success).toBe(true);
      expect(versionResult.version).toBe('2.0.0');

      // Step 7: Generate report
      const report = await testReporter.generateReport({
        format: 'json',
        includeDetails: true
      });

      expect(report.reportData.summary.total).toBeGreaterThan(0);
      expect(report.reportData.insights.length).toBeGreaterThan(0);
      expect(report.reportData.recommendations.length).toBeGreaterThan(0);

      // Step 8: Verify final state
      const allTests = await testMetadataRepository.findAll();
      expect(allTests.length).toBeGreaterThan(0);

      const passingTests = allTests.filter(t => t.isPassing());
      const failingTests = allTests.filter(t => t.isFailing());
      const legacyTests = allTests.filter(t => t.isLegacy);

      expect(passingTests.length).toBeGreaterThan(0);
      expect(failingTests.length).toBeGreaterThan(0);
      expect(legacyTests.length).toBeGreaterThan(0);
    });
  });

  describe('Test Status Tracking', () => {
    it('should track test status changes over time', async () => {
      const testFile = path.join(tempDir, 'status-tracking.test.js');
      await fs.writeFile(testFile, `
        describe('Status Tracking', () => {
          it('should track status changes', () => {
            expect(true).toBe(true);
          });
        });
      `);

      // Register test
      const test = await testManagementService.registerTest(testFile, 'Status Tracking');

      // Initial status
      expect(test.status).toBe('unknown');

      // Update to passing
      await testManagementService.updateTestStatus(testFile, 'Status Tracking', 'passing', 1000);
      const updatedTest1 = await testMetadataRepository.findByFilePath(testFile);
      expect(updatedTest1.isPassing()).toBe(true);
      expect(updatedTest1.executionCount).toBe(1);
      expect(updatedTest1.successCount).toBe(1);

      // Update to failing
      await testManagementService.updateTestStatus(testFile, 'Status Tracking', 'failing', 2000, 'Test error');
      const updatedTest2 = await testMetadataRepository.findByFilePath(testFile);
      expect(updatedTest2.isFailing()).toBe(true);
      expect(updatedTest2.executionCount).toBe(2);
      expect(updatedTest2.failureCount).toBe(1);
      expect(updatedTest2.getMetadata('lastError')).toBe('Test error');

      // Update back to passing
      await testManagementService.updateTestStatus(testFile, 'Status Tracking', 'passing', 1500);
      const updatedTest3 = await testMetadataRepository.findByFilePath(testFile);
      expect(updatedTest3.isPassing()).toBe(true);
      expect(updatedTest3.executionCount).toBe(3);
      expect(updatedTest3.successCount).toBe(2);
      expect(updatedTest3.failureCount).toBe(1);
    });
  });

  describe('Legacy Detection', () => {
    it('should detect legacy patterns in test files', async () => {
      const legacyFile = path.join(tempDir, 'legacy-patterns.test.js');
      await fs.writeFile(legacyFile, `
        describe('Legacy Patterns', () => {
          it('should use console.log', () => {
            console.log('debug info');
            expect(true).toBe(true);
          });
          
          it('should use setTimeout', () => {
            setTimeout(() => {}, 1000);
            expect(true).toBe(true);
          });
          
          it('should use eval', () => {
            eval('console.log("dangerous")');
            expect(true).toBe(true);
          });
        });
      `);

      const results = await legacyDetector.scanDirectory(tempDir, {
        minScore: 10,
        includeDetails: true
      });

      expect(results.legacyFiles).toBeGreaterThan(0);
      
      const legacyFileResult = results.files.find(f => f.fileName === 'legacy-patterns.test.js');
      expect(legacyFileResult).toBeDefined();
      expect(legacyFileResult.legacyScore).toBeGreaterThan(50);
      expect(legacyFileResult.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Test Versioning', () => {
    it('should version test files and track changes', async () => {
      const testFile = path.join(tempDir, 'versioning.test.js');
      await fs.writeFile(testFile, `
        describe('Versioning Test', () => {
          it('should be versioned', () => {
            expect(true).toBe(true);
          });
        });
      `);

      // Version 1.0.0
      const version1 = await testVersioner.versionTest(testFile, '1.0.0', 'Initial version');
      expect(version1.success).toBe(true);

      // Modify file
      await fs.writeFile(testFile, `
        describe('Versioning Test v2', () => {
          it('should be versioned', () => {
            expect(true).toBe(true);
          });
          
          it('should have new test', () => {
            expect(true).toBe(true);
          });
        });
      `);

      // Version 2.0.0
      const version2 = await testVersioner.versionTest(testFile, '2.0.0', 'Added new test');
      expect(version2.success).toBe(true);

      // Compare versions
      const comparison = await testVersioner.compareVersions(testFile, '1.0.0', '2.0.0');
      expect(comparison.changes.contentChanged).toBe(true);
      expect(comparison.changes.sizeChanged).toBe(true);

      // Get version history
      const history = testVersioner.getVersionHistory(testFile);
      expect(history.length).toBe(2);
      expect(history[0].version).toBe('1.0.0');
      expect(history[1].version).toBe('2.0.0');
    });
  });

  describe('Test Reporting', () => {
    it('should generate comprehensive reports', async () => {
      // Create multiple test files with different characteristics
      const files = [
        { name: 'fast.test.js', content: 'describe("Fast", () => { it("should be fast", () => expect(true).toBe(true)); });' },
        { name: 'slow.test.js', content: 'describe("Slow", () => { it("should be slow", () => { setTimeout(() => {}, 1000); expect(true).toBe(true); }); });' },
        { name: 'failing.test.js', content: 'describe("Failing", () => { it("should fail", () => expect(true).toBe(false)); });' }
      ];

      for (const file of files) {
        await fs.writeFile(path.join(tempDir, file.name), file.content);
        await testManagementService.registerTest(path.join(tempDir, file.name), file.name.replace('.test.js', ''));
      }

      // Update some test statuses
      await testManagementService.updateTestStatus(path.join(tempDir, 'fast.test.js'), 'fast.test.js', 'passing', 100);
      await testManagementService.updateTestStatus(path.join(tempDir, 'slow.test.js'), 'slow.test.js', 'passing', 5000);
      await testManagementService.updateTestStatus(path.join(tempDir, 'failing.test.js'), 'failing.test.js', 'failing', 2000, 'Test failed');

      // Generate different report formats
      const markdownReport = await testReporter.generateReport({ format: 'markdown' });
      const jsonReport = await testReporter.generateReport({ format: 'json' });
      const htmlReport = await testReporter.generateReport({ format: 'html' });

      expect(markdownReport.formattedReport).toContain('Test Management Report');
      expect(jsonReport.reportData.summary.total).toBe(3);
      expect(htmlReport.formattedReport).toContain('<html>');

      // Generate health report
      const healthReport = await testManagementService.generateHealthReport();
      expect(healthReport.overallHealth).toBeGreaterThan(0);
      expect(healthReport.recommendations.length).toBeGreaterThan(0);

      // Generate dashboard data
      const dashboard = await testReporter.generateDashboardData();
      expect(dashboard.summary.total).toBe(3);
      expect(dashboard.topIssues.length).toBeGreaterThan(0);
    });
  });

  describe('API Integration', () => {
    it('should handle API operations correctly', async () => {
      const testFile = path.join(tempDir, 'api.test.js');
      await fs.writeFile(testFile, `
        describe('API Test', () => {
          it('should work with API', () => {
            expect(true).toBe(true);
          });
        });
      `);

      // Register via service
      const test = await testManagementService.registerTest(testFile, 'API Test');

      // Test repository operations
      const foundTest = await testMetadataRepository.findById(test.id);
      expect(foundTest).toBeDefined();
      expect(foundTest.id).toBe(test.id);

      const testsByStatus = await testMetadataRepository.findByStatus('unknown');
      expect(testsByStatus.length).toBeGreaterThan(0);

      const stats = await testMetadataRepository.getStatistics();
      expect(stats.total).toBeGreaterThan(0);

      // Test filtering
      const filteredTests = await testManagementService.getTestsByFilters({
        status: 'unknown'
      });
      expect(filteredTests.length).toBeGreaterThan(0);

      // Test pagination
      const paginated = await testMetadataRepository.findWithPagination(1, 10);
      expect(paginated.data.length).toBeGreaterThan(0);
      expect(paginated.total).toBeGreaterThan(0);
      expect(paginated.page).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Test with invalid file path
      await expect(
        testManagementService.registerTest('/nonexistent/file.js', 'Test')
      ).rejects.toThrow();

      // Test with invalid command
      const invalidCommand = UpdateTestStatusCommand.create('', '', '');
      const result = await updateTestStatusHandler.handle(invalidCommand);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Test with invalid status
      await expect(
        testManagementService.updateTestStatus('/path/test.js', 'Test', 'invalid-status')
      ).rejects.toThrow('Invalid test status: invalid-status');
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of tests efficiently', async () => {
      const testCount = 100;
      const tests = [];

      // Create many test files
      for (let i = 0; i < testCount; i++) {
        const testFile = path.join(tempDir, `bulk-test-${i}.test.js`);
        await fs.writeFile(testFile, `
          describe('Bulk Test ${i}', () => {
            it('should work', () => {
              expect(true).toBe(true);
            });
          });
        `);
        tests.push(testFile);
      }

      // Register all tests
      const startTime = Date.now();
      for (const testFile of tests) {
        await testManagementService.registerTest(testFile, `Bulk Test ${tests.indexOf(testFile)}`);
      }
      const registrationTime = Date.now() - startTime;

      // Update status for all tests
      const updateStartTime = Date.now();
      for (const testFile of tests) {
        await testManagementService.updateTestStatus(testFile, `Bulk Test ${tests.indexOf(testFile)}`, 'passing', 100);
      }
      const updateTime = Date.now() - updateStartTime;

      // Verify performance
      expect(registrationTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(updateTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all tests were processed
      const allTests = await testMetadataRepository.findAll();
      expect(allTests.length).toBe(testCount);

      const passingTests = allTests.filter(t => t.isPassing());
      expect(passingTests.length).toBe(testCount);
    });
  });
}); 