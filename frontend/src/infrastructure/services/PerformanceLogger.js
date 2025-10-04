/**
 * Performance Logger Service
 * Tracks timing for all operations to identify performance bottlenecks
 */

class PerformanceLogger {
  constructor() {
    this.timings = new Map();
    this.operations = new Map();
    this.thresholds = {
      fast: 100,      // < 100ms
      medium: 500,    // 100-500ms
      slow: 1000,     // 500ms-1s
      verySlow: 2000  // > 1s
    };
  }

  /**
   * Start timing an operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {string} operationName - Human-readable name
   * @param {Object} metadata - Additional context
   */
  start(operationId, operationName, metadata = {}) {
    const startTime = performance.now();
    this.timings.set(operationId, {
      startTime,
      operationName,
      metadata,
      status: 'running'
    });
    
    console.log(`🚀 [PERF] Starting: ${operationName} (${operationId})`, metadata);
  }

  /**
   * End timing an operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} result - Operation result or error
   */
  end(operationId, result = {}) {
    const timing = this.timings.get(operationId);
    if (!timing) {
      console.warn(`⚠️ [PERF] No timing found for operation: ${operationId}`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - timing.startTime;
    
    timing.endTime = endTime;
    timing.duration = duration;
    timing.status = 'completed';
    timing.result = result;

    // Categorize performance
    let category = 'fast';
    if (duration >= this.thresholds.verySlow) category = 'verySlow';
    else if (duration >= this.thresholds.slow) category = 'slow';
    else if (duration >= this.thresholds.medium) category = 'medium';

    // Log with appropriate emoji based on performance
    const emoji = this.getPerformanceEmoji(category);
    console.log(`${emoji} [PERF] Completed: ${timing.operationName} - ${duration.toFixed(2)}ms (${category})`, {
      operationId,
      duration,
      category,
      metadata: timing.metadata,
      result
    });

    // Store for analysis
    this.operations.set(operationId, timing);
    
    // Clean up timing
    this.timings.delete(operationId);
  }

  /**
   * Get performance emoji based on category
   */
  getPerformanceEmoji(category) {
    switch (category) {
      case 'fast': return '⚡';
      case 'medium': return '🟡';
      case 'slow': return '🟠';
      case 'verySlow': return '🔴';
      default: return '❓';
    }
  }

  /**
   * Log a performance warning for slow operations
   */
  warnSlow(operationId, threshold = 1000) {
    const timing = this.timings.get(operationId);
    if (timing) {
      const currentDuration = performance.now() - timing.startTime;
      if (currentDuration > threshold) {
        console.warn(`⚠️ [PERF] Slow operation detected: ${timing.operationName} - ${currentDuration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      }
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const operations = Array.from(this.operations.values());
    const summary = {
      totalOperations: operations.length,
      averageDuration: operations.reduce((sum, op) => sum + op.duration, 0) / operations.length,
      categories: {
        fast: operations.filter(op => op.duration < this.thresholds.medium).length,
        medium: operations.filter(op => op.duration >= this.thresholds.medium && op.duration < this.thresholds.slow).length,
        slow: operations.filter(op => op.duration >= this.thresholds.slow && op.duration < this.thresholds.verySlow).length,
        verySlow: operations.filter(op => op.duration >= this.thresholds.verySlow).length
      },
      slowestOperations: operations
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map(op => ({
          name: op.operationName,
          duration: op.duration,
          metadata: op.metadata
        }))
    };

    console.log('📊 [PERF] Performance Summary:', summary);
    return summary;
  }

  /**
   * Clear all performance data
   */
  clear() {
    this.timings.clear();
    this.operations.clear();
    console.log('🧹 [PERF] Performance data cleared');
  }
}

// Create singleton instance
const performanceLogger = new PerformanceLogger();

export default performanceLogger;
