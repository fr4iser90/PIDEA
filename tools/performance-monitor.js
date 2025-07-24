#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      slowRequests: [],
      authCalls: 0,
      gitCalls: 0,
      taskCalls: 0,
      startTime: Date.now()
    };
    
    this.thresholds = {
      slowRequest: 1000, // 1 second
      errorRate: 0.05, // 5%
      authCallRate: 10, // 10 per minute
      gitCallRate: 5, // 5 per minute
    };
  }

  start() {
    console.log('🔍 Starting PIDEA Performance Monitor...');
    console.log('📊 Monitoring backend performance metrics...\n');

    // Monitor backend logs
    this.monitorBackendLogs();
    
    // Monitor system resources
    this.monitorSystemResources();
    
    // Generate reports
    setInterval(() => this.generateReport(), 60000); // Every minute
  }

  monitorBackendLogs() {
    const logFile = path.join(__dirname, '../backend/logs/app.log');
    
    if (!fs.existsSync(logFile)) {
      console.log('⚠️  Log file not found, creating...');
      fs.writeFileSync(logFile, '');
    }

    // Watch log file for changes
    fs.watch(logFile, (eventType, filename) => {
      if (eventType === 'change') {
        this.analyzeLogFile(logFile);
      }
    });
  }

  analyzeLogFile(logFile) {
    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').slice(-100); // Last 100 lines
      
      lines.forEach(line => {
        this.analyzeLogLine(line);
      });
    } catch (error) {
      console.error('Error reading log file:', error.message);
    }
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

  monitorSystemResources() {
    // Monitor CPU and memory usage
    setInterval(() => {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      console.log(`📈 Memory: ${Math.round(usage.heapUsed / 1024 / 1024)}MB | CPU: ${Math.round(cpuUsage.user / 1000)}ms`);
    }, 30000); // Every 30 seconds
  }

  generateReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const minutes = Math.floor(uptime / 60000);
    
    console.log('\n📊 Performance Report:');
    console.log(`⏱️  Uptime: ${minutes} minutes`);
    console.log(`📡 Total Requests: ${this.metrics.requests}`);
    console.log(`❌ Errors: ${this.metrics.errors}`);
    console.log(`🔐 Auth Calls: ${this.metrics.authCalls}`);
    console.log(`📝 Git Calls: ${this.metrics.gitCalls}`);
    console.log(`📋 Task Calls: ${this.metrics.taskCalls}`);
    
    if (this.metrics.slowRequests.length > 0) {
      console.log('\n🐌 Slow Requests:');
      this.metrics.slowRequests.slice(-5).forEach(req => {
        console.log(`  ${req.duration}ms - ${req.line.substring(0, 100)}...`);
      });
    }

    // Calculate rates
    const authRate = this.metrics.authCalls / minutes;
    const gitRate = this.metrics.gitCalls / minutes;
    const errorRate = this.metrics.requests > 0 ? this.metrics.errors / this.metrics.requests : 0;

    console.log('\n📈 Rates (per minute):');
    console.log(`🔐 Auth Calls: ${authRate.toFixed(2)}`);
    console.log(`📝 Git Calls: ${gitRate.toFixed(2)}`);
    console.log(`❌ Error Rate: ${(errorRate * 100).toFixed(2)}%`);

    // Performance warnings
    if (authRate > this.thresholds.authCallRate) {
      console.log('⚠️  WARNING: High authentication call rate detected!');
    }
    
    if (gitRate > this.thresholds.gitCallRate) {
      console.log('⚠️  WARNING: High Git operation rate detected!');
    }
    
    if (errorRate > this.thresholds.errorRate) {
      console.log('⚠️  WARNING: High error rate detected!');
    }

    console.log('\n' + '='.repeat(50));
  }

  getRecommendations() {
    const recommendations = [];
    
    if (this.metrics.authCalls > 100) {
      recommendations.push('🔐 Implement authentication caching');
    }
    
    if (this.metrics.gitCalls > 50) {
      recommendations.push('📝 Implement Git operation caching');
    }
    
    if (this.metrics.slowRequests.length > 10) {
      recommendations.push('🐌 Optimize slow database queries');
    }
    
    if (this.metrics.errors > 20) {
      recommendations.push('❌ Review error handling and logging');
    }

    return recommendations;
  }
}

// Start monitoring
const monitor = new PerformanceMonitor();
monitor.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📊 Final Performance Report:');
  monitor.generateReport();
  
  console.log('\n💡 Recommendations:');
  monitor.getRecommendations().forEach(rec => console.log(rec));
  
  process.exit(0);
}); 