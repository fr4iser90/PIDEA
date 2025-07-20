#!/usr/bin/env node

/**
 * Performance Analyzer Tool
 * Provides performance monitoring and analysis for dependency injection system
 */
// Register module aliases for CLI tools
require('module-alias/register');

const { getServiceRegistry } = require('@infrastructure/dependency-injection/ServiceRegistry');
const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
const chalk = require('chalk').default || require('chalk');
const fs = require('fs').promises;
const path = require('path');

class PerformanceAnalyzer {
    constructor() {
        this.serviceRegistry = getServiceRegistry();
        this.serviceContainer = getServiceContainer();
        this.performanceMetrics = new Map();
        this.memorySnapshots = [];
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        this.startTime = process.hrtime.bigint();
        this.initialMemory = process.memoryUsage();
        console.log(chalk.blue.bold('🚀 Starting performance monitoring...'));
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        this.endTime = process.hrtime.bigint();
        this.finalMemory = process.memoryUsage();
        console.log(chalk.blue.bold('✅ Performance monitoring completed'));
    }

    /**
     * Measure service resolution performance
     */
    async measureServiceResolution() {
        console.log(chalk.yellow('\n📊 Measuring service resolution performance...'));
        
        const results = {
            totalServices: 0,
            resolutionTimes: [],
            averageTime: 0,
            maxTime: 0,
            minTime: Infinity,
            slowestServices: []
        };

        const services = Array.from(this.serviceContainer.factories.keys());
        results.totalServices = services.length;

        for (const serviceName of services) {
            const startTime = process.hrtime.bigint();
            
            try {
                const service = this.serviceContainer.resolve(serviceName);
                const endTime = process.hrtime.bigint();
                const resolutionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                
                results.resolutionTimes.push({
                    service: serviceName,
                    time: resolutionTime,
                    success: true
                });
                
                if (resolutionTime > results.maxTime) {
                    results.maxTime = resolutionTime;
                }
                if (resolutionTime < results.minTime) {
                    results.minTime = resolutionTime;
                }
                
            } catch (error) {
                const endTime = process.hrtime.bigint();
                const resolutionTime = Number(endTime - startTime) / 1000000;
                
                results.resolutionTimes.push({
                    service: serviceName,
                    time: resolutionTime,
                    success: false,
                    error: error.message
                });
            }
        }

        // Calculate statistics
        const successfulResolutions = results.resolutionTimes.filter(r => r.success);
        if (successfulResolutions.length > 0) {
            results.averageTime = successfulResolutions.reduce((sum, r) => sum + r.time, 0) / successfulResolutions.length;
        }

        // Find slowest services
        results.slowestServices = results.resolutionTimes
            .filter(r => r.success)
            .sort((a, b) => b.time - a.time)
            .slice(0, 5);

        return results;
    }

    /**
     * Measure dependency graph operations
     */
    measureDependencyGraphPerformance() {
        console.log(chalk.yellow('\n🔗 Measuring dependency graph performance...'));
        
        const graph = this.serviceContainer.dependencyGraph;
        const results = {
            topologicalSort: 0,
            circularDetection: 0,
            dependencyValidation: 0,
            graphStats: 0
        };

        // Measure topological sort
        const sortStart = process.hrtime.bigint();
        graph.topologicalSort();
        const sortEnd = process.hrtime.bigint();
        results.topologicalSort = Number(sortEnd - sortStart) / 1000000;

        // Measure circular dependency detection
        const cycleStart = process.hrtime.bigint();
        graph.detectCircularDependencies();
        const cycleEnd = process.hrtime.bigint();
        results.circularDetection = Number(cycleEnd - cycleStart) / 1000000;

        // Measure dependency validation
        const validationStart = process.hrtime.bigint();
        graph.validateDependencies();
        const validationEnd = process.hrtime.bigint();
        results.dependencyValidation = Number(validationEnd - validationStart) / 1000000;

        // Measure graph statistics
        const statsStart = process.hrtime.bigint();
        graph.getStats();
        const statsEnd = process.hrtime.bigint();
        results.graphStats = Number(statsEnd - statsStart) / 1000000;

        return results;
    }

    /**
     * Measure memory usage
     */
    measureMemoryUsage() {
        console.log(chalk.yellow('\n💾 Measuring memory usage...'));
        
        const currentMemory = process.memoryUsage();
        const initialMemory = this.initialMemory || currentMemory;
        
        const results = {
            current: {
                rss: this.formatBytes(currentMemory.rss),
                heapUsed: this.formatBytes(currentMemory.heapUsed),
                heapTotal: this.formatBytes(currentMemory.heapTotal),
                external: this.formatBytes(currentMemory.external),
                arrayBuffers: this.formatBytes(currentMemory.arrayBuffers)
            },
            initial: {
                rss: this.formatBytes(initialMemory.rss),
                heapUsed: this.formatBytes(initialMemory.heapUsed),
                heapTotal: this.formatBytes(initialMemory.heapTotal),
                external: this.formatBytes(initialMemory.external),
                arrayBuffers: this.formatBytes(initialMemory.arrayBuffers)
            },
            difference: {
                rss: this.formatBytes(currentMemory.rss - initialMemory.rss),
                heapUsed: this.formatBytes(currentMemory.heapUsed - initialMemory.heapUsed),
                heapTotal: this.formatBytes(currentMemory.heapTotal - initialMemory.heapTotal),
                external: this.formatBytes(currentMemory.external - initialMemory.external),
                arrayBuffers: this.formatBytes(currentMemory.arrayBuffers - initialMemory.arrayBuffers)
            }
        };

        return results;
    }

    /**
     * Measure lifecycle operations
     */
    async measureLifecyclePerformance() {
        console.log(chalk.yellow('\n⚡ Measuring lifecycle operations...'));
        
        const results = {
            startup: { time: 0, success: false },
            shutdown: { time: 0, success: false }
        };

        // Measure startup
        try {
            const startupStart = process.hrtime.bigint();
            await this.serviceContainer.startAllServices();
            const startupEnd = process.hrtime.bigint();
            results.startup.time = Number(startupEnd - startupStart) / 1000000;
            results.startup.success = true;
        } catch (error) {
            results.startup.error = error.message;
        }

        // Measure shutdown
        try {
            const shutdownStart = process.hrtime.bigint();
            await this.serviceContainer.stopAllServices();
            const shutdownEnd = process.hrtime.bigint();
            results.shutdown.time = Number(shutdownEnd - shutdownStart) / 1000000;
            results.shutdown.success = true;
        } catch (error) {
            results.shutdown.error = error.message;
        }

        return results;
    }

    /**
     * Generate performance report
     */
    async generatePerformanceReport() {
        console.log(chalk.blue.bold('📈 Performance Analysis Report'));
        console.log(chalk.gray('='.repeat(60)));

        this.startMonitoring();

        // Run all performance measurements
        const serviceResolution = await this.measureServiceResolution();
        const graphPerformance = this.measureDependencyGraphPerformance();
        const memoryUsage = this.measureMemoryUsage();
        const lifecyclePerformance = await this.measureLifecyclePerformance();

        this.stopMonitoring();

        // Calculate total time
        const totalTime = Number(this.endTime - this.startTime) / 1000000;

        // Display results
        this.displayServiceResolutionResults(serviceResolution);
        this.displayGraphPerformanceResults(graphPerformance);
        this.displayMemoryUsageResults(memoryUsage);
        this.displayLifecyclePerformanceResults(lifecyclePerformance);
        this.displayOverallPerformance(totalTime);

        return {
            serviceResolution,
            graphPerformance,
            memoryUsage,
            lifecyclePerformance,
            totalTime
        };
    }

    /**
     * Display service resolution results
     */
    displayServiceResolutionResults(results) {
        console.log(chalk.blue.bold('\n🔧 Service Resolution Performance'));
        console.log(chalk.gray('-'.repeat(40)));

        console.log(chalk.white(`Total Services: ${chalk.bold(results.totalServices)}`));
        console.log(chalk.white(`Average Resolution Time: ${chalk.bold(results.averageTime.toFixed(3))}ms`));
        console.log(chalk.white(`Fastest Resolution: ${chalk.bold(results.minTime.toFixed(3))}ms`));
        console.log(chalk.white(`Slowest Resolution: ${chalk.bold(results.maxTime.toFixed(3))}ms`));

        if (results.slowestServices.length > 0) {
            console.log(chalk.yellow('\n🐌 Slowest Services:'));
            results.slowestServices.forEach((service, index) => {
                console.log(chalk.white(`  ${index + 1}. ${service.service}: ${chalk.bold(service.time.toFixed(3))}ms`));
            });
        }

        const failedResolutions = results.resolutionTimes.filter(r => !r.success);
        if (failedResolutions.length > 0) {
            console.log(chalk.red(`\n❌ Failed Resolutions: ${failedResolutions.length}`));
            failedResolutions.forEach(failure => {
                console.log(chalk.red(`  • ${failure.service}: ${failure.error}`));
            });
        }
    }

    /**
     * Display graph performance results
     */
    displayGraphPerformanceResults(results) {
        console.log(chalk.blue.bold('\n🔗 Dependency Graph Performance'));
        console.log(chalk.gray('-'.repeat(40)));

        console.log(chalk.white(`Topological Sort: ${chalk.bold(results.topologicalSort.toFixed(3))}ms`));
        console.log(chalk.white(`Circular Detection: ${chalk.bold(results.circularDetection.toFixed(3))}ms`));
        console.log(chalk.white(`Dependency Validation: ${chalk.bold(results.dependencyValidation.toFixed(3))}ms`));
        console.log(chalk.white(`Graph Statistics: ${chalk.bold(results.graphStats.toFixed(3))}ms`));

        const totalGraphTime = results.topologicalSort + results.circularDetection + 
                              results.dependencyValidation + results.graphStats;
        console.log(chalk.yellow(`Total Graph Operations: ${chalk.bold(totalGraphTime.toFixed(3))}ms`));
    }

    /**
     * Display memory usage results
     */
    displayMemoryUsageResults(results) {
        console.log(chalk.blue.bold('\n💾 Memory Usage'));
        console.log(chalk.gray('-'.repeat(40)));

        console.log(chalk.white('Current Memory:'));
        console.log(chalk.white(`  RSS: ${chalk.bold(results.current.rss)}`));
        console.log(chalk.white(`  Heap Used: ${chalk.bold(results.current.heapUsed)}`));
        console.log(chalk.white(`  Heap Total: ${chalk.bold(results.current.heapTotal)}`));
        console.log(chalk.white(`  External: ${chalk.bold(results.current.external)}`));

        console.log(chalk.yellow('\nMemory Difference:'));
        console.log(chalk.white(`  RSS: ${chalk.bold(results.difference.rss)}`));
        console.log(chalk.white(`  Heap Used: ${chalk.bold(results.difference.heapUsed)}`));
        console.log(chalk.white(`  Heap Total: ${chalk.bold(results.difference.heapTotal)}`));
        console.log(chalk.white(`  External: ${chalk.bold(results.difference.external)}`));
    }

    /**
     * Display lifecycle performance results
     */
    displayLifecyclePerformanceResults(results) {
        console.log(chalk.blue.bold('\n⚡ Lifecycle Performance'));
        console.log(chalk.gray('-'.repeat(40)));

        if (results.startup.success) {
            console.log(chalk.green(`✅ Startup: ${chalk.bold(results.startup.time.toFixed(3))}ms`));
        } else {
            console.log(chalk.red(`❌ Startup Failed: ${results.startup.error}`));
        }

        if (results.shutdown.success) {
            console.log(chalk.green(`✅ Shutdown: ${chalk.bold(results.shutdown.time.toFixed(3))}ms`));
        } else {
            console.log(chalk.red(`❌ Shutdown Failed: ${results.shutdown.error}`));
        }
    }

    /**
     * Display overall performance
     */
    displayOverallPerformance(totalTime) {
        console.log(chalk.blue.bold('\n📊 Overall Performance'));
        console.log(chalk.gray('-'.repeat(40)));

        console.log(chalk.white(`Total Analysis Time: ${chalk.bold(totalTime.toFixed(3))}ms`));
        
        // Performance assessment
        if (totalTime < 100) {
            console.log(chalk.green('🎯 Performance: Excellent'));
        } else if (totalTime < 500) {
            console.log(chalk.yellow('🎯 Performance: Good'));
        } else {
            console.log(chalk.red('🎯 Performance: Needs Optimization'));
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Save performance report to file
     */
    async saveReport(outputPath = 'performance-report.json') {
        const report = await this.generatePerformanceReport();
        const reportData = {
            timestamp: new Date().toISOString(),
            ...report
        };
        
        await fs.writeFile(outputPath, JSON.stringify(reportData, null, 2), 'utf8');
        console.log(chalk.green(`\n✅ Performance report saved to: ${outputPath}`));
        return outputPath;
    }

    /**
     * Run performance benchmarks
     */
    async runBenchmarks(iterations = 10) {
        console.log(chalk.blue.bold(`🏃 Running performance benchmarks (${iterations} iterations)...`));
        
        const benchmarks = {
            serviceResolution: [],
            graphOperations: [],
            memoryUsage: []
        };

        for (let i = 0; i < iterations; i++) {
            console.log(chalk.gray(`  Iteration ${i + 1}/${iterations}...`));
            
            // Service resolution benchmark
            const resolutionStart = process.hrtime.bigint();
            await this.measureServiceResolution();
            const resolutionEnd = process.hrtime.bigint();
            benchmarks.serviceResolution.push(Number(resolutionEnd - resolutionStart) / 1000000);

            // Graph operations benchmark
            const graphStart = process.hrtime.bigint();
            this.measureDependencyGraphPerformance();
            const graphEnd = process.hrtime.bigint();
            benchmarks.graphOperations.push(Number(graphEnd - graphStart) / 1000000);

            // Memory usage benchmark
            const memory = process.memoryUsage();
            benchmarks.memoryUsage.push(memory.heapUsed);
        }

        // Calculate statistics
        const stats = {
            serviceResolution: this.calculateStats(benchmarks.serviceResolution),
            graphOperations: this.calculateStats(benchmarks.graphOperations),
            memoryUsage: this.calculateStats(benchmarks.memoryUsage)
        };

        this.displayBenchmarkResults(stats);
        return stats;
    }

    /**
     * Calculate statistics for benchmark results
     */
    calculateStats(values) {
        const sorted = values.sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return { mean, median, min, max, stdDev, values };
    }

    /**
     * Display benchmark results
     */
    displayBenchmarkResults(stats) {
        console.log(chalk.blue.bold('\n📊 Benchmark Results'));
        console.log(chalk.gray('='.repeat(50)));

        console.log(chalk.yellow.bold('\n🔧 Service Resolution (ms):'));
        console.log(chalk.white(`  Mean: ${chalk.bold(stats.serviceResolution.mean.toFixed(3))}`));
        console.log(chalk.white(`  Median: ${chalk.bold(stats.serviceResolution.median.toFixed(3))}`));
        console.log(chalk.white(`  Min: ${chalk.bold(stats.serviceResolution.min.toFixed(3))}`));
        console.log(chalk.white(`  Max: ${chalk.bold(stats.serviceResolution.max.toFixed(3))}`));
        console.log(chalk.white(`  Std Dev: ${chalk.bold(stats.serviceResolution.stdDev.toFixed(3))}`));

        console.log(chalk.yellow.bold('\n🔗 Graph Operations (ms):'));
        console.log(chalk.white(`  Mean: ${chalk.bold(stats.graphOperations.mean.toFixed(3))}`));
        console.log(chalk.white(`  Median: ${chalk.bold(stats.graphOperations.median.toFixed(3))}`));
        console.log(chalk.white(`  Min: ${chalk.bold(stats.graphOperations.min.toFixed(3))}`));
        console.log(chalk.white(`  Max: ${chalk.bold(stats.graphOperations.max.toFixed(3))}`));
        console.log(chalk.white(`  Std Dev: ${chalk.bold(stats.graphOperations.stdDev.toFixed(3))}`));

        console.log(chalk.yellow.bold('\n💾 Memory Usage (bytes):'));
        console.log(chalk.white(`  Mean: ${chalk.bold(this.formatBytes(stats.memoryUsage.mean))}`));
        console.log(chalk.white(`  Median: ${chalk.bold(this.formatBytes(stats.memoryUsage.median))}`));
        console.log(chalk.white(`  Min: ${chalk.bold(this.formatBytes(stats.memoryUsage.min))}`));
        console.log(chalk.white(`  Max: ${chalk.bold(this.formatBytes(stats.memoryUsage.max))}`));
    }
}

// CLI execution
async function main() {
    const analyzer = new PerformanceAnalyzer();
    const args = process.argv.slice(2);
    
    try {
        if (args.includes('--help') || args.includes('-h')) {
            console.log(chalk.blue.bold('Performance Analyzer Tool'));
            console.log(chalk.gray('\nUsage:'));
            console.log(chalk.white('  node tools/performance-analyzer.js              # Run full analysis'));
            console.log(chalk.white('  node tools/performance-analyzer.js --save      # Save report to file'));
            console.log(chalk.white('  node tools/performance-analyzer.js --benchmark # Run benchmarks'));
            console.log(chalk.white('  node tools/performance-analyzer.js --help      # Show this help'));
            return 0;
        }

        if (args.includes('--benchmark')) {
            const iterations = parseInt(args.find(arg => arg.startsWith('--iterations='))?.split('=')[1]) || 10;
            await analyzer.runBenchmarks(iterations);
            return 0;
        }

        if (args.includes('--save')) {
            const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'performance-report.json';
            await analyzer.saveReport(outputPath);
            return 0;
        }

        // Default: run full analysis
        await analyzer.generatePerformanceReport();
        return 0;

    } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        return 1;
    }
}

// Run if called directly
if (require.main === module) {
    main().then(exitCode => {
        process.exit(exitCode);
    }).catch(error => {
        console.error(chalk.red('Fatal error:'), error.message);
        process.exit(1);
    });
}

module.exports = PerformanceAnalyzer; 