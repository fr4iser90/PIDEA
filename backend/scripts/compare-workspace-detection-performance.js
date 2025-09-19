#!/usr/bin/env node

/**
 * Performance Comparison Script: Legacy vs CDP Workspace Detection
 * 
 * This script compares the performance of the legacy terminal-based workspace detection
 * against the new CDP-based detection system.
 * 
 * Usage: node scripts/compare-workspace-detection-performance.js [options]
 * 
 * Options:
 *   --iterations N    Number of test iterations (default: 10)
 *   --port N         IDE port to test (default: 9222)
 *   --legacy-only    Test only legacy detection
 *   --cdp-only       Test only CDP detection
 *   --help           Show this help message
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');

const logger = new Logger('WorkspaceDetectionPerformance');

class WorkspaceDetectionPerformanceComparison {
  constructor(options = {}) {
    this.options = {
      iterations: options.iterations || 10,
      port: options.port || 9222,
      legacyOnly: options.legacyOnly || false,
      cdpOnly: options.cdpOnly || false,
      ...options
    };

    this.results = {
      legacy: {
        times: [],
        errors: [],
        successCount: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0
      },
      cdp: {
        times: [],
        errors: [],
        successCount: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0
      }
    };

    this.legacyDetector = null;
    this.cdpDetector = null;
  }

  /**
   * Run the performance comparison
   */
  async run() {
    try {
      logger.info('🚀 Starting Workspace Detection Performance Comparison');
      logger.info(`Port: ${this.options.port}, Iterations: ${this.options.iterations}`);
      
      // Initialize detectors
      await this.initializeDetectors();
      
      // Run legacy tests if not CDP-only
      if (!this.options.cdpOnly) {
        await this.runLegacyTests();
      }
      
      // Run CDP tests if not legacy-only
      if (!this.options.legacyOnly) {
        await this.runCDPTests();
      }
      
      // Calculate statistics
      this.calculateStatistics();
      
      // Generate report
      await this.generateReport();
      
      logger.info('✅ Performance comparison completed');
      
    } catch (error) {
      logger.error('❌ Performance comparison failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize the detectors
   */
  async initializeDetectors() {
    logger.info('🔧 Initializing detectors...');
    
    try {
      // Legacy detector removed - only CDP available
      if (!this.options.cdpOnly) {
        logger.warn('⚠️ Legacy detector has been removed. Only CDP-based detection is available.');
        this.options.cdpOnly = true;
      }
      
      // Initialize CDP detector
      if (!this.options.legacyOnly) {
        const CDPConnectionManager = require('@external/cdp/CDPConnectionManager');
        const CDPWorkspaceDetector = require('@services/workspace/CDPWorkspaceDetector');
        
        const cdpManager = new CDPConnectionManager({
          maxConnections: 2,
          connectionTimeout: 10000
        });
        
        this.cdpDetector = new CDPWorkspaceDetector(cdpManager, {
          cacheTimeout: 1000, // Short cache for testing
          maxSearchDepth: 5
        });
        
        await cdpManager.initialize();
        await this.cdpDetector.initialize();
        
        logger.info('✅ CDP detector initialized');
      }
      
    } catch (error) {
      logger.error('❌ Failed to initialize detectors:', error.message);
      throw error;
    }
  }

  /**
   * Run legacy detection tests
   */
  async runLegacyTests() {
    logger.info('🔄 Running legacy detection tests...');
    
    for (let i = 0; i < this.options.iterations; i++) {
      try {
        const startTime = Date.now();
        
        const result = await this.legacyDetector.getWorkspaceInfo(this.options.port);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.results.legacy.times.push(duration);
        this.results.legacy.successCount++;
        
        logger.info(`Legacy test ${i + 1}/${this.options.iterations}: ${duration}ms ${result ? '✅' : '❌'}`);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error(`Legacy test ${i + 1} failed:`, error.message);
        this.results.legacy.errors.push(error.message);
      }
    }
    
    logger.info(`✅ Legacy tests completed: ${this.results.legacy.successCount}/${this.options.iterations} successful`);
  }

  /**
   * Run CDP detection tests
   */
  async runCDPTests() {
    logger.info('🔄 Running CDP detection tests...');
    
    for (let i = 0; i < this.options.iterations; i++) {
      try {
        const startTime = Date.now();
        
        const result = await this.cdpDetector.detectWorkspace(this.options.port);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.results.cdp.times.push(duration);
        this.results.cdp.successCount++;
        
        logger.info(`CDP test ${i + 1}/${this.options.iterations}: ${duration}ms ${result ? '✅' : '❌'}`);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error(`CDP test ${i + 1} failed:`, error.message);
        this.results.cdp.errors.push(error.message);
      }
    }
    
    logger.info(`✅ CDP tests completed: ${this.results.cdp.successCount}/${this.options.iterations} successful`);
  }

  /**
   * Calculate performance statistics
   */
  calculateStatistics() {
    logger.info('📊 Calculating performance statistics...');
    
    // Calculate legacy statistics
    if (this.results.legacy.times.length > 0) {
      this.results.legacy.totalTime = this.results.legacy.times.reduce((sum, time) => sum + time, 0);
      this.results.legacy.averageTime = this.results.legacy.totalTime / this.results.legacy.times.length;
      this.results.legacy.minTime = Math.min(...this.results.legacy.times);
      this.results.legacy.maxTime = Math.max(...this.results.legacy.times);
    }
    
    // Calculate CDP statistics
    if (this.results.cdp.times.length > 0) {
      this.results.cdp.totalTime = this.results.cdp.times.reduce((sum, time) => sum + time, 0);
      this.results.cdp.averageTime = this.results.cdp.totalTime / this.results.cdp.times.length;
      this.results.cdp.minTime = Math.min(...this.results.cdp.times);
      this.results.cdp.maxTime = Math.max(...this.results.cdp.times);
    }
  }

  /**
   * Generate performance report
   */
  async generateReport() {
    logger.info('📊 Generating performance report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testConfiguration: {
        port: this.options.port,
        iterations: this.options.iterations,
        legacyOnly: this.options.legacyOnly,
        cdpOnly: this.options.cdpOnly
      },
      results: this.results,
      comparison: this.generateComparison(),
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = `workspace-detection-performance-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Log summary
    logger.info('📊 Performance Comparison Summary:');
    
    if (!this.options.cdpOnly) {
      logger.info(`Legacy Detection:`);
      logger.info(`  Average time: ${this.results.legacy.averageTime.toFixed(2)}ms`);
      logger.info(`  Min time: ${this.results.legacy.minTime}ms`);
      logger.info(`  Max time: ${this.results.legacy.maxTime}ms`);
      logger.info(`  Success rate: ${(this.results.legacy.successCount / this.options.iterations * 100).toFixed(1)}%`);
      logger.info(`  Errors: ${this.results.legacy.errors.length}`);
    }
    
    if (!this.options.legacyOnly) {
      logger.info(`CDP Detection:`);
      logger.info(`  Average time: ${this.results.cdp.averageTime.toFixed(2)}ms`);
      logger.info(`  Min time: ${this.results.cdp.minTime}ms`);
      logger.info(`  Max time: ${this.results.cdp.maxTime}ms`);
      logger.info(`  Success rate: ${(this.results.cdp.successCount / this.options.iterations * 100).toFixed(1)}%`);
      logger.info(`  Errors: ${this.results.cdp.errors.length}`);
    }
    
    if (!this.options.legacyOnly && !this.options.cdpOnly) {
      const improvement = ((this.results.legacy.averageTime - this.results.cdp.averageTime) / this.results.legacy.averageTime * 100);
      logger.info(`Performance Improvement: ${improvement.toFixed(1)}% faster`);
    }
    
    logger.info(`📊 Detailed report saved: ${reportPath}`);
  }

  /**
   * Generate comparison analysis
   */
  generateComparison() {
    if (this.options.legacyOnly || this.options.cdpOnly) {
      return { note: 'Single method tested - no comparison available' };
    }
    
    const improvement = ((this.results.legacy.averageTime - this.results.cdp.averageTime) / this.results.legacy.averageTime * 100);
    const reliabilityImprovement = ((this.results.cdp.successCount - this.results.legacy.successCount) / this.options.iterations * 100);
    
    return {
      performanceImprovement: {
        percentage: improvement,
        description: improvement > 0 ? `${improvement.toFixed(1)}% faster` : `${Math.abs(improvement).toFixed(1)}% slower`,
        legacyAverage: this.results.legacy.averageTime,
        cdpAverage: this.results.cdp.averageTime
      },
      reliabilityImprovement: {
        percentage: reliabilityImprovement,
        description: reliabilityImprovement > 0 ? `${reliabilityImprovement.toFixed(1)}% more reliable` : `${Math.abs(reliabilityImprovement).toFixed(1)}% less reliable`,
        legacySuccessRate: (this.results.legacy.successCount / this.options.iterations * 100),
        cdpSuccessRate: (this.results.cdp.successCount / this.options.iterations * 100)
      },
      consistency: {
        legacyVariance: this.calculateVariance(this.results.legacy.times),
        cdpVariance: this.calculateVariance(this.results.cdp.times),
        description: this.results.cdp.maxTime - this.results.cdp.minTime < this.results.legacy.maxTime - this.results.legacy.minTime ? 'CDP is more consistent' : 'Legacy is more consistent'
      }
    };
  }

  /**
   * Calculate variance for consistency analysis
   */
  calculateVariance(times) {
    if (times.length === 0) return 0;
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
    return variance;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.options.legacyOnly && !this.options.cdpOnly) {
      const improvement = ((this.results.legacy.averageTime - this.results.cdp.averageTime) / this.results.legacy.averageTime * 100);
      
      if (improvement > 50) {
        recommendations.push('Excellent performance improvement! CDP detection is significantly faster');
      } else if (improvement > 20) {
        recommendations.push('Good performance improvement. CDP detection shows measurable benefits');
      } else if (improvement > 0) {
        recommendations.push('Modest performance improvement. CDP detection is slightly faster');
      } else {
        recommendations.push('Performance regression detected. Review CDP implementation');
      }
      
      const reliabilityImprovement = ((this.results.cdp.successCount - this.results.legacy.successCount) / this.options.iterations * 100);
      
      if (reliabilityImprovement > 10) {
        recommendations.push('Significant reliability improvement with CDP detection');
      } else if (reliabilityImprovement > 0) {
        recommendations.push('Slight reliability improvement with CDP detection');
      } else if (reliabilityImprovement < -10) {
        recommendations.push('Reliability regression detected. Investigate CDP issues');
      }
    }
    
    if (this.results.legacy.errors.length > this.options.iterations * 0.1) {
      recommendations.push('High error rate in legacy detection - migration recommended');
    }
    
    if (this.results.cdp.errors.length > this.options.iterations * 0.1) {
      recommendations.push('High error rate in CDP detection - review implementation');
    }
    
    recommendations.push('Run tests with different IDE ports to validate consistency');
    recommendations.push('Monitor performance in production environment');
    recommendations.push('Consider implementing performance monitoring for workspace detection');
    
    return recommendations;
  }

  /**
   * Show help information
   */
  static showHelp() {
    console.log(`
Workspace Detection Performance Comparison Script

Usage: node scripts/compare-workspace-detection-performance.js [options]

Options:
  --iterations N    Number of test iterations (default: 10)
  --port N         IDE port to test (default: 9222)
  --legacy-only    Test only legacy detection
  --cdp-only       Test only CDP detection
  --help           Show this help message

Examples:
  # Compare both methods with default settings
  node scripts/compare-workspace-detection-performance.js

  # Test with more iterations for better accuracy
  node scripts/compare-workspace-detection-performance.js --iterations 50

  # Test only CDP detection
  node scripts/compare-workspace-detection-performance.js --cdp-only

  # Test specific IDE port
  node scripts/compare-workspace-detection-performance.js --port 9223
`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    WorkspaceDetectionPerformanceComparison.showHelp();
    return;
  }
  
  const options = {
    iterations: parseInt(args.find(arg => arg.startsWith('--iterations='))?.split('=')[1]) || 10,
    port: parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1]) || 9222,
    legacyOnly: args.includes('--legacy-only'),
    cdpOnly: args.includes('--cdp-only')
  };
  
  const comparison = new WorkspaceDetectionPerformanceComparison(options);
  
  try {
    await comparison.run();
  } catch (error) {
    logger.error('Performance comparison failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = WorkspaceDetectionPerformanceComparison;
