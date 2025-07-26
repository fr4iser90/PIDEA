#!/usr/bin/env node

/**
 * Performance Monitor for PIDEA Backend
 * Tracks API response times, duplicate requests, and performance bottlenecks
 */

const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      authCalls: 0,
      gitCalls: 0,
      taskCalls: 0,
      chatCalls: 0,
      slowRequests: [],
      errors: 0,
      duplicateRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.thresholds = {
      slowRequest: 500, // 500ms
      verySlowRequest: 1000, // 1 second
      criticalRequest: 2000 // 2 seconds
    };
    
    this.startTime = Date.now();
  }

  analyzeLogLine(line) {
    if (!line.trim()) return;

    // Count authentication calls
    if (line.includes('[AuthService]') && line.includes('Validating access token')) {
      this.metrics.authCalls++;
    }

    // Count Git operations
    if (line.includes('[GitGetStatusStep]') || line.includes('[GitGetCurrentBranchStep]') || line.includes('[GitGetBranchesStep]')) {
      this.metrics.gitCalls++;
    }

    // Count task operations
    if (line.includes('[TaskController]') || line.includes('getManualTasks')) {
      this.metrics.taskCalls++;
    }

    // Count chat operations
    if (line.includes('[GetChatHistoryStep]') || line.includes('get_chat_history_step')) {
      this.metrics.chatCalls++;
    }

    // Detect cache hits/misses
    if (line.includes('Cache hit:')) {
      this.metrics.cacheHits++;
    }
    if (line.includes('Cache miss:')) {
      this.metrics.cacheMisses++;
    }

    // Detect duplicate requests
    if (line.includes('Duplicate request detected') || line.includes('Duplicate Git info request detected')) {
      this.metrics.duplicateRequests++;
    }

    // Detect slow requests
    if (line.includes('executed successfully in') && line.includes('ms')) {
      const match = line.match(/executed successfully in (\d+)ms/);
      if (match) {
        const duration = parseInt(match[1]);
        if (duration > this.thresholds.slowRequest) {
          this.metrics.slowRequests.push({
            line: line.trim(),
            duration,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Count errors
    if (line.includes('❌') || line.includes('ERROR')) {
      this.metrics.errors++;
    }

    this.metrics.requests++;
  }

  generateReport() {
    const runtime = Date.now() - this.startTime;
    const runtimeMinutes = (runtime / 1000 / 60).toFixed(2);
    
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 
      ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2)
      : 0;

    const duplicateRate = this.metrics.requests > 0 
      ? ((this.metrics.duplicateRequests / this.metrics.requests) * 100).toFixed(2)
      : 0;

    const report = `
🚀 PIDEA Performance Report
==========================
Runtime: ${runtimeMinutes} minutes
Total Requests: ${this.metrics.requests}

📊 API Call Distribution:
- Authentication: ${this.metrics.authCalls}
- Git Operations: ${this.metrics.gitCalls}
- Task Operations: ${this.metrics.taskCalls}
- Chat Operations: ${this.metrics.chatCalls}

🎯 Performance Metrics:
- Cache Hit Rate: ${cacheHitRate}% (${this.metrics.cacheHits} hits, ${this.metrics.cacheMisses} misses)
- Duplicate Request Rate: ${duplicateRate}% (${this.metrics.duplicateRequests} duplicates)
- Errors: ${this.metrics.errors}

🐌 Slow Requests (${this.metrics.slowRequests.length}):
${this.metrics.slowRequests.slice(0, 10).map(req => 
  `- ${req.duration}ms: ${req.line.substring(0, 100)}...`
).join('\n')}

💡 Performance Insights:
${this.generateInsights()}
`;

    return report;
  }

  generateInsights() {
    const insights = [];
    
    if (this.metrics.duplicateRequests > 0) {
      insights.push(`⚠️  ${this.metrics.duplicateRequests} duplicate requests detected - consider implementing request deduplication`);
    }
    
    if (this.metrics.cacheMisses > this.metrics.cacheHits) {
      insights.push(`⚠️  Low cache hit rate (${this.metrics.cacheHits} hits vs ${this.metrics.cacheMisses} misses) - consider increasing cache TTL`);
    }
    
    if (this.metrics.slowRequests.length > 0) {
      const avgSlowRequest = this.metrics.slowRequests.reduce((sum, req) => sum + req.duration, 0) / this.metrics.slowRequests.length;
      insights.push(`🐌 Average slow request time: ${avgSlowRequest.toFixed(0)}ms - consider optimizing database queries or adding caching`);
    }
    
    if (this.metrics.gitCalls > this.metrics.requests * 0.3) {
      insights.push(`🔄 High Git operation frequency (${this.metrics.gitCalls} calls) - consider batching Git operations`);
    }
    
    if (this.metrics.chatCalls > this.metrics.requests * 0.2) {
      insights.push(`💬 High chat operation frequency (${this.metrics.chatCalls} calls) - consider implementing chat caching`);
    }
    
    return insights.length > 0 ? insights.join('\n') : '✅ No significant performance issues detected';
  }

  saveReport(filename = null) {
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `performance-report-${timestamp}.txt`;
    }
    
    const report = this.generateReport();
    const reportPath = path.join(__dirname, '..', 'output', filename);
    
    // Ensure output directory exists
    const outputDir = path.dirname(reportPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Performance report saved to: ${reportPath}`);
    
    return reportPath;
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  if (process.argv.length < 3) {
    console.log('Usage: node performance-monitor.js <log-file> [output-file]');
    console.log('Example: node performance-monitor.js backend.log performance-report.txt');
    process.exit(1);
  }
  
  const logFile = process.argv[2];
  const outputFile = process.argv[3];
  
  if (!fs.existsSync(logFile)) {
    console.error(`❌ Log file not found: ${logFile}`);
    process.exit(1);
  }
  
  console.log(`📖 Analyzing log file: ${logFile}`);
  
  const logContent = fs.readFileSync(logFile, 'utf8');
  const lines = logContent.split('\n');
  
  lines.forEach(line => monitor.analyzeLogLine(line));
  
  console.log(monitor.generateReport());
  
  if (outputFile) {
    monitor.saveReport(outputFile);
  }
}

module.exports = PerformanceMonitor; 