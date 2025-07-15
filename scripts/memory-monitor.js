#!/usr/bin/env node

/**
 * Memory Monitor - Tracks memory usage during analysis to identify OOM causes
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MemoryMonitor {
    constructor(options = {}) {
        this.interval = options.interval || 1000; // 1 second
        this.maxMemoryUsage = options.maxMemoryUsage || 1024; // 1GB
        this.logFile = options.logFile || 'memory-usage.log';
        this.alertThreshold = options.alertThreshold || 0.8; // 80%
        
        this.monitoring = false;
        this.memoryHistory = [];
        this.startTime = null;
        this.peakMemory = 0;
        this.peakTime = null;
    }

    /**
     * Start monitoring memory usage
     */
    start() {
        console.log('🔍 Starting memory monitoring...');
        this.monitoring = true;
        this.startTime = Date.now();
        
        this.monitorInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, this.interval);
        
        // Log start
        this.logMemoryEvent('MONITOR_START', {
            maxMemoryUsage: this.maxMemoryUsage,
            interval: this.interval
        });
    }

    /**
     * Stop monitoring memory usage
     */
    stop() {
        console.log('🛑 Stopping memory monitoring...');
        this.monitoring = false;
        
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
        // Log final statistics
        this.logMemoryEvent('MONITOR_STOP', {
            duration: Date.now() - this.startTime,
            peakMemory: this.peakMemory,
            peakTime: this.peakTime,
            totalSamples: this.memoryHistory.length
        });
        
        this.generateReport();
    }

    /**
     * Check current memory usage
     */
    checkMemoryUsage() {
        const usage = process.memoryUsage();
        const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
        const timestamp = Date.now();
        
        // Track peak memory
        if (currentUsage > this.peakMemory) {
            this.peakMemory = currentUsage;
            this.peakTime = timestamp;
        }
        
        // Store in history
        this.memoryHistory.push({
            timestamp,
            heapUsed: currentUsage,
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            rss: Math.round(usage.rss / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024)
        });
        
        // Check for alerts
        if (currentUsage > this.maxMemoryUsage * this.alertThreshold) {
            this.alertHighMemory(currentUsage);
        }
        
        // Log every 10 seconds
        if (this.memoryHistory.length % 10 === 0) {
            this.logMemoryEvent('MEMORY_CHECK', {
                heapUsed: currentUsage,
                heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
                rss: Math.round(usage.rss / 1024 / 1024)
            });
        }
    }

    /**
     * Alert on high memory usage
     */
    alertHighMemory(currentUsage) {
        const alert = {
            type: 'HIGH_MEMORY',
            timestamp: Date.now(),
            currentUsage,
            threshold: this.maxMemoryUsage * this.alertThreshold,
            percentage: Math.round((currentUsage / this.maxMemoryUsage) * 100)
        };
        
        console.warn(`⚠️  HIGH MEMORY USAGE: ${currentUsage}MB (${alert.percentage}% of limit)`);
        this.logMemoryEvent('HIGH_MEMORY_ALERT', alert);
    }

    /**
     * Log memory event
     */
    logMemoryEvent(event, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            data
        };
        
        fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    }

    /**
     * Generate memory usage report
     */
    generateReport() {
        if (this.memoryHistory.length === 0) {
            console.log('No memory data collected');
            return;
        }
        
        const report = {
            summary: {
                duration: Date.now() - this.startTime,
                totalSamples: this.memoryHistory.length,
                peakMemory: this.peakMemory,
                peakTime: this.peakTime,
                averageMemory: Math.round(
                    this.memoryHistory.reduce((sum, sample) => sum + sample.heapUsed, 0) / this.memoryHistory.length
                )
            },
            analysis: this.analyzeMemoryPatterns(),
            recommendations: this.generateRecommendations()
        };
        
        // Save report
        const reportFile = 'memory-analysis-report.json';
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log('\n📊 Memory Analysis Report:');
        console.log(`   Duration: ${Math.round(report.summary.duration / 1000)}s`);
        console.log(`   Peak Memory: ${report.summary.peakMemory}MB`);
        console.log(`   Average Memory: ${report.summary.averageMemory}MB`);
        console.log(`   Total Samples: ${report.summary.totalSamples}`);
        console.log(`   Report saved to: ${reportFile}`);
        
        // Print recommendations
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach((rec, i) => {
                console.log(`   ${i + 1}. ${rec.title}: ${rec.description}`);
            });
        }
    }

    /**
     * Analyze memory patterns
     */
    analyzeMemoryPatterns() {
        const analysis = {
            growthRate: 0,
            memoryLeaks: [],
            spikes: [],
            trends: []
        };
        
        if (this.memoryHistory.length < 2) return analysis;
        
        // Calculate growth rate
        const firstSample = this.memoryHistory[0];
        const lastSample = this.memoryHistory[this.memoryHistory.length - 1];
        const timeDiff = (lastSample.timestamp - firstSample.timestamp) / 1000; // seconds
        analysis.growthRate = Math.round((lastSample.heapUsed - firstSample.heapUsed) / timeDiff);
        
        // Detect memory spikes
        for (let i = 1; i < this.memoryHistory.length; i++) {
            const current = this.memoryHistory[i];
            const previous = this.memoryHistory[i - 1];
            const increase = current.heapUsed - previous.heapUsed;
            
            if (increase > 50) { // 50MB spike
                analysis.spikes.push({
                    timestamp: current.timestamp,
                    increase,
                    from: previous.heapUsed,
                    to: current.heapUsed
                });
            }
        }
        
        // Detect potential memory leaks (consistent growth)
        if (analysis.growthRate > 10) { // 10MB per second growth
            analysis.memoryLeaks.push({
                type: 'consistent_growth',
                rate: analysis.growthRate,
                description: 'Memory usage growing consistently, potential memory leak'
            });
        }
        
        return analysis;
    }

    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.peakMemory > this.maxMemoryUsage * 0.9) {
            recommendations.push({
                title: 'Reduce Memory Usage',
                description: 'Peak memory usage was very high. Consider reducing batch sizes or implementing streaming.',
                priority: 'high'
            });
        }
        
        if (this.memoryHistory.length > 0) {
            const avgMemory = this.memoryHistory.reduce((sum, sample) => sum + sample.heapUsed, 0) / this.memoryHistory.length;
            if (avgMemory > this.maxMemoryUsage * 0.7) {
                recommendations.push({
                    title: 'Optimize Memory Management',
                    description: 'Average memory usage is high. Implement memory cleanup and garbage collection.',
                    priority: 'medium'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * Monitor a specific script execution
     */
    static monitorScript(scriptPath, options = {}) {
        const monitor = new MemoryMonitor(options);
        
        console.log(`🚀 Starting memory monitoring for: ${scriptPath}`);
        monitor.start();
        
        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            env: { ...process.env, NODE_OPTIONS: '--expose-gc' }
        });
        
        child.on('close', (code) => {
            monitor.stop();
            console.log(`\n📋 Script finished with code: ${code}`);
        });
        
        child.on('error', (error) => {
            monitor.stop();
            console.error(`\n❌ Script error: ${error.message}`);
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
            console.log('\n🛑 Received SIGINT, stopping monitoring...');
            monitor.stop();
            child.kill('SIGINT');
            process.exit(0);
        });
        
        return { monitor, child };
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node memory-monitor.js <script-path> [options]');
        console.log('Options:');
        console.log('  --interval <ms>     Memory check interval (default: 1000ms)');
        console.log('  --max-memory <mb>   Maximum memory limit (default: 1024MB)');
        console.log('  --log-file <path>   Log file path (default: memory-usage.log)');
        console.log('  --alert-threshold <0-1> Alert threshold (default: 0.8)');
        process.exit(1);
    }
    
    const scriptPath = args[0];
    const options = {};
    
    // Parse options
    for (let i = 1; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];
        
        switch (key) {
            case '--interval':
                options.interval = parseInt(value);
                break;
            case '--max-memory':
                options.maxMemoryUsage = parseInt(value);
                break;
            case '--log-file':
                options.logFile = value;
                break;
            case '--alert-threshold':
                options.alertThreshold = parseFloat(value);
                break;
        }
    }
    
    // Validate script exists
    if (!fs.existsSync(scriptPath)) {
        console.error(`❌ Script not found: ${scriptPath}`);
        process.exit(1);
    }
    
    // Start monitoring
    MemoryMonitor.monitorScript(scriptPath, options);
}

module.exports = MemoryMonitor; 