/**
 * Performance Dashboard
 * Provides console commands for analyzing performance data
 */

import performanceLogger from './PerformanceLogger.js';

class PerformanceDashboard {
  constructor() {
    this.setupConsoleCommands();
  }

  /**
   * Setup console commands for performance analysis
   */
  setupConsoleCommands() {
    // Make performance logger available globally for debugging
    window.performanceLogger = performanceLogger;
    window.perf = {
      // Get performance summary
      summary: () => performanceLogger.getSummary(),
      
      // Clear performance data
      clear: () => performanceLogger.clear(),
      
      // Get slowest operations
      slowest: (count = 5) => {
        const summary = performanceLogger.getSummary();
        console.table(summary.slowestOperations.slice(0, count));
        return summary.slowestOperations.slice(0, count);
      },
      
      // Get operations by category
      byCategory: (category) => {
        const summary = performanceLogger.getSummary();
        const operations = Array.from(performanceLogger.operations.values());
        const filtered = operations.filter(op => {
          let opCategory = 'fast';
          if (op.duration >= 2000) opCategory = 'verySlow';
          else if (op.duration >= 1000) opCategory = 'slow';
          else if (op.duration >= 500) opCategory = 'medium';
          return opCategory === category;
        });
        
        console.log(`📊 Operations in category "${category}":`, filtered.length);
        console.table(filtered.map(op => ({
          name: op.operationName,
          duration: `${op.duration.toFixed(2)}ms`,
          metadata: JSON.stringify(op.metadata)
        })));
        return filtered;
      },
      
      // Analyze refresh performance
      analyzeRefresh: () => {
        const operations = Array.from(performanceLogger.operations.values());
        const refreshOps = operations.filter(op => 
          op.operationName.toLowerCase().includes('refresh') ||
          op.operationName.toLowerCase().includes('load') ||
          op.operationName.toLowerCase().includes('ide')
        );
        
        console.log('🔄 Refresh/Load Operations Analysis:');
        console.table(refreshOps.map(op => ({
          operation: op.operationName,
          duration: `${op.duration.toFixed(2)}ms`,
          source: op.result?.source || 'unknown',
          apiDuration: op.result?.apiDuration ? `${op.result.apiDuration.toFixed(2)}ms` : 'N/A',
          cacheDuration: op.result?.cacheDuration ? `${op.result.cacheDuration.toFixed(2)}ms` : 'N/A',
          timestamp: new Date(op.metadata?.timestamp).toLocaleTimeString()
        })));
        
        // Calculate averages
        const apiOps = refreshOps.filter(op => op.result?.source === 'api');
        const cacheOps = refreshOps.filter(op => op.result?.source === 'cache');
        
        if (apiOps.length > 0) {
          const avgApiDuration = apiOps.reduce((sum, op) => sum + op.duration, 0) / apiOps.length;
          console.log(`📈 Average API operation duration: ${avgApiDuration.toFixed(2)}ms`);
        }
        
        if (cacheOps.length > 0) {
          const avgCacheDuration = cacheOps.reduce((sum, op) => sum + op.duration, 0) / cacheOps.length;
          console.log(`⚡ Average cache operation duration: ${avgCacheDuration.toFixed(2)}ms`);
        }
        
        return refreshOps;
      },
      
      // Monitor real-time performance
      monitor: (interval = 5000) => {
        console.log(`🔍 Starting performance monitoring (every ${interval}ms)...`);
        const intervalId = setInterval(() => {
          const summary = performanceLogger.getSummary();
          if (summary.totalOperations > 0) {
            console.log(`📊 Performance Update:`, {
              totalOps: summary.totalOperations,
              avgDuration: `${summary.averageDuration.toFixed(2)}ms`,
              slowOps: summary.categories.slow + summary.categories.verySlow,
              fastOps: summary.categories.fast
            });
          }
        }, interval);
        
        // Return function to stop monitoring
        return () => {
          clearInterval(intervalId);
          console.log('🛑 Performance monitoring stopped');
        };
      },
      
      // Export performance data
      export: () => {
        const summary = performanceLogger.getSummary();
        const data = {
          timestamp: new Date().toISOString(),
          summary,
          operations: Array.from(performanceLogger.operations.values())
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📁 Performance data exported');
        return data;
      }
    };
    
    console.log(`
🚀 Performance Dashboard loaded! Available commands:

📊 perf.summary()           - Get performance summary
🧹 perf.clear()             - Clear performance data  
🐌 perf.slowest(n)          - Get n slowest operations
📈 perf.byCategory(cat)     - Get operations by category (fast/medium/slow/verySlow)
🔄 perf.analyzeRefresh()    - Analyze refresh/load operations
🔍 perf.monitor(ms)         - Monitor performance in real-time
📁 perf.export()            - Export performance data

Examples:
- perf.analyzeRefresh()     // See what's slow during refresh
- perf.slowest(10)          // Top 10 slowest operations
- perf.monitor(3000)        // Monitor every 3 seconds
    `);
  }
}

// Create and initialize dashboard
const performanceDashboard = new PerformanceDashboard();

export default performanceDashboard;
