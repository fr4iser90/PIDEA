const TestCorrection = require('@entities/TestCorrection');
const TestAnalyzer = require('@external/TestAnalyzer');
const TestFixer = require('@external/TestFixer');
const logger = require('@logging/logger');

class TestCorrectionService {
  constructor({
    testAnalyzer = new TestAnalyzer(),
    testFixer = new TestFixer(),
    eventBus = null,
    config = {}
  }) {
    this.testAnalyzer = testAnalyzer;
    this.testFixer = testFixer;
    this.eventBus = eventBus;
    this.config = {
      maxConcurrentFixes: 5,
      retryAttempts: 3,
      timeoutMs: 300000, // 5 minutes
      ...config
    };
    
    this.activeCorrections = new Map();
    this.correctionQueue = [];
    this.isProcessing = false;
  }

  /**
   * Analyze and create correction tasks for failing tests
   */
  async analyzeFailingTests(testResults) {
    logger.info('Starting analysis of failing tests', { count: testResults.failing?.length || 0 });
    
    const corrections = [];
    
    for (const testResult of testResults.failing || []) {
      try {
        const analysis = await this.testAnalyzer.analyzeTest(testResult);
        const fixStrategy = this.determineFixStrategy(analysis);
        
        const correction = TestCorrection.createForFailingTest(
          testResult.file,
          testResult.name,
          testResult.error,
          fixStrategy
        );
        
        correction.addMetadata('analysis', analysis);
        corrections.push(correction);
        
        logger.debug('Created correction task', {
          testFile: testResult.file,
          testName: testResult.name,
          strategy: fixStrategy
        });
      } catch (error) {
        logger.error('Failed to analyze test', {
          testFile: testResult.file,
          testName: testResult.name,
          error: error.message
        });
      }
    }
    
    logger.info('Completed analysis of failing tests', { 
      total: corrections.length,
      strategies: this.getStrategyDistribution(corrections)
    });
    
    return corrections;
  }

  /**
   * Analyze and create correction tasks for legacy tests
   */
  async analyzeLegacyTests(testResults) {
    logger.info('Starting analysis of legacy tests', { count: testResults.legacy?.length || 0 });
    
    const corrections = [];
    
    for (const testResult of testResults.legacy || []) {
      try {
        const analysis = await this.testAnalyzer.analyzeLegacyTest(testResult);
        
        const correction = TestCorrection.createForLegacyTest(
          testResult.file,
          testResult.name
        );
        
        correction.addMetadata('analysis', analysis);
        correction.addMetadata('legacyPatterns', analysis.legacyPatterns);
        corrections.push(correction);
        
        logger.debug('Created legacy correction task', {
          testFile: testResult.file,
          testName: testResult.name
        });
      } catch (error) {
        logger.error('Failed to analyze legacy test', {
          testFile: testResult.file,
          testName: testResult.name,
          error: error.message
        });
      }
    }
    
    logger.info('Completed analysis of legacy tests', { total: corrections.length });
    return corrections;
  }

  /**
   * Analyze and create correction tasks for complex tests
   */
  async analyzeComplexTests(testResults) {
    logger.info('Starting analysis of complex tests', { count: testResults.complex?.length || 0 });
    
    const corrections = [];
    
    for (const testResult of testResults.complex || []) {
      try {
        const analysis = await this.testAnalyzer.analyzeComplexTest(testResult);
        
        const correction = TestCorrection.createForComplexTest(
          testResult.file,
          testResult.name,
          analysis.complexity
        );
        
        correction.addMetadata('analysis', analysis);
        correction.addMetadata('refactoringSuggestions', analysis.suggestions);
        corrections.push(correction);
        
        logger.debug('Created complex test correction task', {
          testFile: testResult.file,
          testName: testResult.name,
          complexity: analysis.complexity
        });
      } catch (error) {
        logger.error('Failed to analyze complex test', {
          testFile: testResult.file,
          testName: testResult.name,
          error: error.message
        });
      }
    }
    
    logger.info('Completed analysis of complex tests', { total: corrections.length });
    return corrections;
  }

  /**
   * Process a single test correction
   */
  async processCorrection(correction) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting test correction', {
        id: correction.id,
        testFile: correction.testFile,
        testName: correction.testName,
        strategy: correction.fixStrategy
      });
      
      correction.start();
      this.activeCorrections.set(correction.id, correction);
      
      // Emit correction started event
      if (this.eventBus) {
        this.eventBus.emit('testCorrection.started', { correction: correction.toJSON() });
      }
      
      // Apply the fix based on strategy
      const fixResult = await this.applyFix(correction);
      
      // Update correction with results
      correction.complete(fixResult);
      correction.setActualTime(Date.now() - startTime);
      
      logger.info('Completed test correction', {
        id: correction.id,
        testFile: correction.testFile,
        testName: correction.testName,
        success: fixResult.success,
        timeMs: correction.actualTime
      });
      
      // Emit correction completed event
      if (this.eventBus) {
        this.eventBus.emit('testCorrection.completed', { 
          correction: correction.toJSON(),
          fixResult 
        });
      }
      
      return { success: true, correction, fixResult };
      
    } catch (error) {
      correction.incrementAttempts();
      
      if (correction.canRetry()) {
        logger.warn('Test correction failed, will retry', {
          id: correction.id,
          testFile: correction.testFile,
          testName: correction.testName,
          attempt: correction.attempts,
          error: error.message
        });
        
        // Re-queue for retry
        this.correctionQueue.unshift(correction);
        
      } else {
        correction.fail(error.message);
        logger.error('Test correction failed permanently', {
          id: correction.id,
          testFile: correction.testFile,
          testName: correction.testName,
          error: error.message
        });
      }
      
      // Emit correction failed event
      if (this.eventBus) {
        this.eventBus.emit('testCorrection.failed', { 
          correction: correction.toJSON(),
          error: error.message 
        });
      }
      
      return { success: false, correction, error: error.message };
      
    } finally {
      this.activeCorrections.delete(correction.id);
    }
  }

  /**
   * Process multiple corrections with concurrency control
   */
  async processCorrections(corrections, options = {}) {
    const {
      maxConcurrent = this.config.maxConcurrentFixes,
      onProgress = null,
      onComplete = null
    } = options;
    
    logger.info('Starting batch test correction', {
      total: corrections.length,
      maxConcurrent
    });
    
    // Add all corrections to queue
    this.correctionQueue.push(...corrections);
    
    const results = [];
    const activePromises = new Set();
    
    while (this.correctionQueue.length > 0 || activePromises.size > 0) {
      // Start new corrections up to max concurrent
      while (this.correctionQueue.length > 0 && activePromises.size < maxConcurrent) {
        const correction = this.correctionQueue.shift();
        const promise = this.processCorrection(correction)
          .then(result => {
            results.push(result);
            activePromises.delete(promise);
            
            if (onProgress) {
              onProgress({
                completed: results.length,
                total: corrections.length,
                current: correction
              });
            }
            
            return result;
          })
          .catch(error => {
            logger.error('Unexpected error in test correction', {
              correctionId: correction.id,
              error: error.message
            });
            activePromises.delete(promise);
            return { success: false, correction, error: error.message };
          });
        
        activePromises.add(promise);
      }
      
      // Wait for at least one promise to complete
      if (activePromises.size > 0) {
        await Promise.race(activePromises);
      }
    }
    
    logger.info('Completed batch test correction', {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
    if (onComplete) {
      onComplete(results);
    }
    
    return results;
  }

  /**
   * Apply specific fix strategy to a test
   */
  async applyFix(correction) {
    const { testFile, testName, fixStrategy, originalError } = correction;
    
    switch (fixStrategy) {
      case 'simple_fix':
        return await this.testFixer.applySimpleFix(testFile, testName, originalError);
        
      case 'mock_fix':
        return await this.testFixer.applyMockFix(testFile, testName, originalError);
        
      case 'refactor':
        return await this.testFixer.applyRefactorFix(testFile, testName, originalError);
        
      case 'migrate':
        return await this.testFixer.applyMigrationFix(testFile, testName, originalError);
        
      case 'rewrite':
        return await this.testFixer.applyRewriteFix(testFile, testName, originalError);
        
      default:
        throw new Error(`Unknown fix strategy: ${fixStrategy}`);
    }
  }

  /**
   * Determine the best fix strategy based on test analysis
   */
  determineFixStrategy(analysis) {
    const { errorType, complexity, patterns } = analysis;
    
    // Simple fixes for basic errors
    if (errorType === 'syntax' || errorType === 'import') {
      return 'simple_fix';
    }
    
    // Mock fixes for external dependencies
    if (patterns.includes('external_dependency') || patterns.includes('network_call')) {
      return 'mock_fix';
    }
    
    // Migration for legacy patterns
    if (patterns.includes('legacy') || patterns.includes('deprecated')) {
      return 'migrate';
    }
    
    // Refactor for complex tests
    if (complexity > 70 || patterns.includes('complex_logic')) {
      return 'refactor';
    }
    
    // Rewrite for severely broken tests
    if (complexity > 90 || patterns.includes('severely_broken')) {
      return 'rewrite';
    }
    
    // Default to simple fix
    return 'simple_fix';
  }

  /**
   * Get statistics about correction strategies
   */
  getStrategyDistribution(corrections) {
    const distribution = {};
    
    for (const correction of corrections) {
      const strategy = correction.fixStrategy;
      distribution[strategy] = (distribution[strategy] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * Get current status of all corrections
   */
  getStatus() {
    return {
      active: this.activeCorrections.size,
      queued: this.correctionQueue.length,
      isProcessing: this.isProcessing,
      activeCorrections: Array.from(this.activeCorrections.values()).map(c => c.toJSON())
    };
  }

  /**
   * Stop all active corrections
   */
  async stopAll() {
    logger.info('Stopping all active test corrections');
    
    for (const correction of this.activeCorrections.values()) {
      correction.skip('Service stopped');
    }
    
    this.activeCorrections.clear();
    this.correctionQueue = [];
    this.isProcessing = false;
  }
}

module.exports = TestCorrectionService; 