/**
 * AutoTestFixSystem - Domain Service
 * Orchestrates automated test fixing and correction workflows
 */

const Logger = require("@logging/Logger");
const TestCorrectionService = require("@domain/services/testing/TestCorrectionService");
const TestFixer = require("@infrastructure/task-execution/services/TestFixer");
const TestOrchestrator = require("@infrastructure/task-execution/services/TestOrchestrator");

class AutoTestFixSystem {
  constructor(dependencies = {}) {
    this.logger = new Logger("AutoTestFixSystem");
    this.testCorrectionService = dependencies.testCorrectionService || new TestCorrectionService();
    this.testFixer = dependencies.testFixer || new TestFixer();
    this.testOrchestrator = dependencies.testOrchestrator || new TestOrchestrator();
    this.eventBus = dependencies.eventBus || { emit: () => {} };
    
    this.activeFixes = new Map();
    this.fixQueue = [];
    this.isProcessing = false;
  }

  /**
   * Execute automated test fixing for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Fix options
   * @returns {Promise<Object>} Fix results
   */
  async autoFixTests(projectPath, options = {}) {
    try {
      this.logger.info("Starting automated test fixing", { projectPath });

      const fixId = `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.activeFixes.set(fixId, {
        projectPath,
        status: 'running',
        startTime: Date.now(),
        options
      });

      // Run test analysis to identify failing tests
      const testResults = await this.testOrchestrator.executeTest('test-analysis', projectPath, {
        includeFailing: true,
        includeCoverage: true
      });

      if (!testResults.success) {
        throw new Error(`Test analysis failed: ${testResults.error}`);
      }

      // Analyze failing tests and create correction tasks
      const corrections = await this.testCorrectionService.analyzeFailingTests(testResults.data);

      if (corrections.length === 0) {
        this.logger.info("No failing tests found to fix");
        return {
          fixId,
          success: true,
          fixesApplied: 0,
          message: "No failing tests found"
        };
      }

      // Process corrections
      const fixResults = await this.processCorrections(corrections, {
        maxConcurrent: options.maxConcurrent || 3,
        timeout: options.timeout || 300000,
        retryAttempts: options.retryAttempts || 2
      });

      // Update fix status
      const fixRecord = this.activeFixes.get(fixId);
      fixRecord.status = 'completed';
      fixRecord.endTime = Date.now();
      fixRecord.results = fixResults;

      this.logger.info("Automated test fixing completed", {
        fixId,
        fixesApplied: fixResults.successful.length,
        failures: fixResults.failed.length
      });

      return {
        fixId,
        success: true,
        fixesApplied: fixResults.successful.length,
        failures: fixResults.failed.length,
        results: fixResults
      };

    } catch (error) {
      this.logger.error("Automated test fixing failed", { error: error.message });
      
      return {
        success: false,
        error: error.message,
        fixesApplied: 0
      };
    }
  }

  /**
   * Process multiple test corrections
   * @param {Array} corrections - Array of correction objects
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processCorrections(corrections, options = {}) {
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    this.isProcessing = true;

    try {
      // Process corrections in batches
      const batchSize = options.maxConcurrent || 3;
      for (let i = 0; i < corrections.length; i += batchSize) {
        const batch = corrections.slice(i, i + batchSize);
        
        const batchPromises = batch.map(correction => 
          this.processSingleCorrection(correction, options)
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              results.successful.push(result.value);
            } else {
              results.failed.push(result.value);
            }
          } else {
            results.failed.push({
              correction: batch[index],
              error: result.reason.message
            });
          }
        });
      }

    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Process a single test correction
   * @param {Object} correction - Correction object
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Correction result
   */
  async processSingleCorrection(correction, options = {}) {
    try {
      this.logger.info("Processing correction", { 
        testFile: correction.testFile,
        testName: correction.testName 
      });

      // Apply the fix using TestCorrectionService
      const fixResult = await this.testCorrectionService.applyFix(correction);

      return {
        success: true,
        correction,
        fixResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error("Correction processing failed", {
        correction,
        error: error.message
      });

      return {
        success: false,
        correction,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get status of active fixes
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      active: this.activeFixes.size,
      queued: this.fixQueue.length,
      processing: this.isProcessing,
      fixes: Array.from(this.activeFixes.values())
    };
  }

  /**
   * Cancel an active fix
   * @param {string} fixId - Fix identifier
   * @returns {boolean} Success status
   */
  cancelFix(fixId) {
    if (this.activeFixes.has(fixId)) {
      const fixRecord = this.activeFixes.get(fixId);
      fixRecord.status = 'cancelled';
      fixRecord.endTime = Date.now();
      
      this.logger.info("Fix cancelled", { fixId });
      return true;
    }
    return false;
  }

  /**
   * Clear completed fixes from memory
   * @param {number} maxAge - Maximum age in milliseconds
   */
  clearCompletedFixes(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [fixId, fixRecord] of this.activeFixes.entries()) {
      if (fixRecord.status === 'completed' && 
          (now - fixRecord.endTime) > maxAge) {
        this.activeFixes.delete(fixId);
      }
    }
  }
}

module.exports = AutoTestFixSystem;
