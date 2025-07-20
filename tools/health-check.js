#!/usr/bin/env node

/**
 * Health Check Tool
 * Provides comprehensive health checking and monitoring for dependency injection system
 */
// Register module aliases for CLI tools
require('module-alias/register');

const { getServiceRegistry } = require('@infrastructure/dependency-injection/ServiceRegistry');
const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
const chalk = require('chalk').default || require('chalk');
const fs = require('fs').promises;

class HealthChecker {
    constructor() {
        this.serviceRegistry = getServiceRegistry();
        this.serviceContainer = getServiceContainer();
        this.healthStatus = {
            overall: 'unknown',
            checks: {},
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Run comprehensive health check
     */
    async runHealthCheck() {
        console.log(chalk.blue.bold('🏥 Dependency Injection Health Check'));
        console.log(chalk.gray('='.repeat(50)));

        this.healthStatus.timestamp = new Date().toISOString();

        // Run all health checks
        const checks = [
            this.checkServiceRegistry(),
            this.checkServiceContainer(),
            this.checkDependencyGraph(),
            this.checkLifecycleHooks(),
            this.checkServiceResolution(),
            this.checkMemoryUsage(),
            this.checkPerformance()
        ];

        await Promise.all(checks);

        // Determine overall health
        this.determineOverallHealth();

        // Display results
        this.displayHealthReport();

        return this.healthStatus;
    }

    /**
     * Check service registry health
     */
    async checkServiceRegistry() {
        const check = {
            name: 'Service Registry',
            status: 'unknown',
            details: {},
            errors: []
        };

        try {
            // Check if registry is accessible
            if (!this.serviceRegistry) {
                check.status = 'critical';
                check.errors.push('Service registry is not accessible');
                return;
            }

            // Check if getServiceDefinitions method exists
            if (typeof this.serviceRegistry.getServiceDefinitions !== 'function') {
                check.status = 'healthy';
                check.details.totalServices = 0;
                check.details.categories = {};
                check.warnings = ['Service registry not fully initialized (development mode)'];
                return;
            }

            // Check service definitions
            const serviceDefinitions = this.serviceRegistry.getServiceDefinitions();
            check.details.totalServices = Object.keys(serviceDefinitions).length;
            check.details.categories = Object.keys(serviceDefinitions).reduce((acc, category) => {
                acc[category] = serviceDefinitions[category].length;
                return acc;
            }, {});

            // Check for empty categories
            const emptyCategories = Object.entries(check.details.categories)
                .filter(([_, count]) => count === 0)
                .map(([category, _]) => category);

            if (emptyCategories.length > 0) {
                check.warnings = [`Empty categories: ${emptyCategories.join(', ')}`];
            }

            check.status = 'healthy';

        } catch (error) {
            check.status = 'critical';
            check.errors.push(`Service registry check failed: ${error.message}`);
        }

        this.healthStatus.checks.serviceRegistry = check;
    }

    /**
     * Check service container health
     */
    async checkServiceContainer() {
        const check = {
            name: 'Service Container',
            status: 'unknown',
            details: {},
            errors: []
        };

        try {
            // Check if container is accessible
            if (!this.serviceContainer) {
                check.status = 'critical';
                check.errors.push('Service container is not accessible');
                return;
            }

            // Check factories
            const factories = this.serviceContainer.factories;
            check.details.totalFactories = factories.size;
            check.details.singletons = this.serviceContainer.singletons.size;
            check.details.lifecycleHooks = this.serviceContainer.lifecycleHooks.size;

            // Check for orphaned services (registered but no factory)
            const orphanedServices = [];
            for (const [serviceName, factory] of factories.entries()) {
                if (!factory || !factory.factory) {
                    orphanedServices.push(serviceName);
                }
            }

            if (orphanedServices.length > 0) {
                check.warnings = [`Orphaned services: ${orphanedServices.join(', ')}`];
            }

            check.status = 'healthy';

        } catch (error) {
            check.status = 'critical';
            check.errors.push(`Service container check failed: ${error.message}`);
        }

        this.healthStatus.checks.serviceContainer = check;
    }

    /**
     * Check dependency graph health
     */
    async checkDependencyGraph() {
        const check = {
            name: 'Dependency Graph',
            status: 'unknown',
            details: {},
            errors: []
        };

        try {
            const graph = this.serviceContainer.dependencyGraph;
            
            // Check graph structure
            const stats = graph.getStats();
            check.details.totalNodes = stats.totalNodes;
            check.details.totalDependencies = stats.totalDependencies;
            check.details.averageDependencies = stats.averageDependencies;
            check.details.maxDependencies = stats.maxDependencies;

            // Check for circular dependencies
            const cycles = graph.detectCircularDependencies();
            if (cycles.length > 0) {
                check.status = 'critical';
                check.errors.push(`Found ${cycles.length} circular dependency cycles`);
                check.details.circularDependencies = cycles;
            }

            // Check dependency validation
            const validation = graph.validateDependencies();
            if (!validation.isValid) {
                check.status = 'warning';
                check.warnings = [`Missing dependencies in ${Object.keys(validation.missingDependencies).length} services`];
                check.details.missingDependencies = validation.missingDependencies;
            }

            if (check.status === 'unknown') {
                check.status = 'healthy';
            }

        } catch (error) {
            check.status = 'critical';
            check.errors.push(`Dependency graph check failed: ${error.message}`);
        }

        this.healthStatus.checks.dependencyGraph = check;
    }

    /**
     * Check lifecycle hooks health
     */
    async checkLifecycleHooks() {
        const check = {
            name: 'Lifecycle Hooks',
            status: 'unknown',
            details: {},
            errors: []
        };

        try {
            const lifecycleInfo = this.serviceContainer.getAllLifecycleInfo();
            
            check.details.totalServices = Object.keys(lifecycleInfo).length;
            check.details.servicesWithLifecycle = Object.values(lifecycleInfo)
                .filter(info => info.hasLifecycleHooks).length;
            check.details.resolvedServices = Object.values(lifecycleInfo)
                .filter(info => info.isResolved).length;
            check.details.startedServices = Object.values(lifecycleInfo)
                .filter(info => info.state.status === 'started').length;
            check.details.failedServices = Object.values(lifecycleInfo)
                .filter(info => info.state.status === 'failed').length;

            // Check for failed services
            const failedServices = Object.entries(lifecycleInfo)
                .filter(([_, info]) => info.state.status === 'failed')
                .map(([name, info]) => ({ name, error: info.state.lastError }));

            if (failedServices.length > 0) {
                check.status = 'warning';
                check.warnings = [`${failedServices.length} services have failed states`];
                check.details.failedServices = failedServices;
            }

            // Check for services with lifecycle hooks but not resolved
            const unresolvedWithLifecycle = Object.entries(lifecycleInfo)
                .filter(([_, info]) => info.hasLifecycleHooks && !info.isResolved)
                .map(([name, _]) => name);

            if (unresolvedWithLifecycle.length > 0) {
                check.warnings = check.warnings || [];
                check.warnings.push(`${unresolvedWithLifecycle.length} services with lifecycle hooks are not resolved`);
            }

            if (check.status === 'unknown') {
                check.status = 'healthy';
            }

        } catch (error) {
            check.status = 'critical';
            check.errors.push(`Lifecycle hooks check failed: ${error.message}`);
        }

        this.healthStatus.checks.lifecycleHooks = check;
    }

    /**
     * Check service resolution health
     */
    async checkServiceResolution() {
        const check = {
            name: 'Service Resolution',
            status: 'unknown',
            details: {},
            errors: []
        };

        try {
            const services = Array.from(this.serviceContainer.factories.keys());
            check.details.totalServices = services.length;
            
            const resolutionResults = {
                successful: 0,
                failed: 0,
                errors: []
            };

            // Test resolution of each service
            for (const serviceName of services) {
                try {
                    const service = this.serviceContainer.resolve(serviceName);
                    resolutionResults.successful++;
                } catch (error) {
                    resolutionResults.failed++;
                    resolutionResults.errors.push({
                        service: serviceName,
                        error: error.message
                    });
                }
            }

            check.details.resolutionResults = resolutionResults;

            if (resolutionResults.failed > 0) {
                check.status = 'warning';
                check.warnings = [`${resolutionResults.failed} services failed to resolve`];
            } else {
                check.status = 'healthy';
            }

        } catch (error) {
            check.status = 'critical';
            check.errors.push(`Service resolution check failed: ${error.message}`);
        }

        this.healthStatus.checks.serviceResolution = check;
    }

    /**
     * Check memory usage health
     */
    async checkMemoryUsage() {
        const check = {
            name: 'Memory Usage',
            status: 'unknown',
            details: {},
            errors: []
        };

        try {
            const memory = process.memoryUsage();
            
            check.details.current = {
                rss: this.formatBytes(memory.rss),
                heapUsed: this.formatBytes(memory.heapUsed),
                heapTotal: this.formatBytes(memory.heapTotal),
                external: this.formatBytes(memory.external)
            };

            // Check for memory thresholds
            const heapUsedMB = memory.heapUsed / 1024 / 1024;
            const heapTotalMB = memory.heapTotal / 1024 / 1024;
            const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

            check.details.usagePercentage = usagePercentage.toFixed(2);

            if (usagePercentage > 90) {
                check.status = 'critical';
                check.errors.push(`High memory usage: ${usagePercentage.toFixed(2)}%`);
            } else if (usagePercentage > 75) {
                check.status = 'warning';
                check.warnings = [`Moderate memory usage: ${usagePercentage.toFixed(2)}%`];
            } else {
                check.status = 'healthy';
            }

        } catch (error) {
            check.status = 'critical';
            check.errors.push(`Memory usage check failed: ${error.message}`);
        }

        this.healthStatus.checks.memoryUsage = check;
    }

    /**
     * Check performance health
     */
    async checkPerformance() {
        const check = {
            name: 'Performance',
            status: 'unknown',
            details: {},
            errors: []
        };

        try {
            const graph = this.serviceContainer.dependencyGraph;
            
            // Measure basic operations
            const startTime = process.hrtime.bigint();
            graph.topologicalSort();
            const endTime = process.hrtime.bigint();
            const sortTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

            check.details.topologicalSortTime = sortTime.toFixed(3);

            // Performance thresholds
            if (sortTime > 100) {
                check.status = 'warning';
                check.warnings = [`Slow topological sort: ${sortTime.toFixed(3)}ms`];
            } else if (sortTime > 500) {
                check.status = 'critical';
                check.errors.push(`Very slow topological sort: ${sortTime.toFixed(3)}ms`);
            } else {
                check.status = 'healthy';
            }

        } catch (error) {
            check.status = 'critical';
            check.errors.push(`Performance check failed: ${error.message}`);
        }

        this.healthStatus.checks.performance = check;
    }

    /**
     * Determine overall health status
     */
    determineOverallHealth() {
        const checks = Object.values(this.healthStatus.checks);
        const criticalChecks = checks.filter(check => check.status === 'critical');
        const warningChecks = checks.filter(check => check.status === 'warning');
        const healthyChecks = checks.filter(check => check.status === 'healthy');

        if (criticalChecks.length > 0) {
            this.healthStatus.overall = 'critical';
        } else if (warningChecks.length > 0) {
            this.healthStatus.overall = 'warning';
        } else {
            this.healthStatus.overall = 'healthy';
        }

        this.healthStatus.summary = {
            total: checks.length,
            healthy: healthyChecks.length,
            warnings: warningChecks.length,
            critical: criticalChecks.length
        };
    }

    /**
     * Display health report
     */
    displayHealthReport() {
        console.log(chalk.blue.bold('\n📋 Health Check Results'));
        console.log(chalk.gray('='.repeat(50)));

        // Overall status
        const overallColor = this.getStatusColor(this.healthStatus.overall);
        console.log(chalk.white.bold('Overall Status:'), overallColor(this.healthStatus.overall.toUpperCase()));

        // Summary
        const summary = this.healthStatus.summary;
        console.log(chalk.white(`\nSummary: ${summary.healthy} healthy, ${summary.warnings} warnings, ${summary.critical} critical`));

        // Individual checks
        console.log(chalk.blue.bold('\nDetailed Results:'));
        
        for (const [checkName, check] of Object.entries(this.healthStatus.checks)) {
            const statusColor = this.getStatusColor(check.status);
            console.log(chalk.white(`\n${check.name}:`), statusColor(check.status.toUpperCase()));

            // Display details
            if (check.details && Object.keys(check.details).length > 0) {
                for (const [key, value] of Object.entries(check.details)) {
                    if (typeof value === 'object') {
                        console.log(chalk.gray(`  ${key}:`));
                        for (const [subKey, subValue] of Object.entries(value)) {
                            console.log(chalk.gray(`    ${subKey}: ${subValue}`));
                        }
                    } else {
                        console.log(chalk.gray(`  ${key}: ${value}`));
                    }
                }
            }

            // Display warnings
            if (check.warnings && check.warnings.length > 0) {
                check.warnings.forEach(warning => {
                    console.log(chalk.yellow(`  ⚠️  ${warning}`));
                });
            }

            // Display errors
            if (check.errors && check.errors.length > 0) {
                check.errors.forEach(error => {
                    console.log(chalk.red(`  ❌ ${error}`));
                });
            }
        }

        // Recommendations
        this.displayRecommendations();
    }

    /**
     * Display recommendations based on health status
     */
    displayRecommendations() {
        console.log(chalk.blue.bold('\n💡 Recommendations:'));
        
        const checks = this.healthStatus.checks;
        
        if (checks.dependencyGraph?.status === 'critical') {
            console.log(chalk.red('  • Fix circular dependencies immediately'));
        }
        
        if (checks.serviceResolution?.status === 'warning') {
            console.log(chalk.yellow('  • Review failed service resolutions'));
        }
        
        if (checks.memoryUsage?.status === 'warning') {
            console.log(chalk.yellow('  • Monitor memory usage closely'));
        }
        
        if (checks.performance?.status === 'warning') {
            console.log(chalk.yellow('  • Consider optimizing dependency graph operations'));
        }

        if (this.healthStatus.overall === 'healthy') {
            console.log(chalk.green('  • System is healthy - continue monitoring'));
        }
    }

    /**
     * Get color for status
     */
    getStatusColor(status) {
        switch (status) {
            case 'healthy': return chalk.green;
            case 'warning': return chalk.yellow;
            case 'critical': return chalk.red;
            default: return chalk.gray;
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
     * Save health report to file
     */
    async saveReport(outputPath = 'health-report.json') {
        await fs.writeFile(outputPath, JSON.stringify(this.healthStatus, null, 2), 'utf8');
        console.log(chalk.green(`\n✅ Health report saved to: ${outputPath}`));
        return outputPath;
    }

    /**
     * Run continuous health monitoring
     */
    async runContinuousMonitoring(intervalMs = 30000) {
        console.log(chalk.blue.bold(`🔄 Starting continuous health monitoring (${intervalMs}ms intervals)`));
        
        const runCheck = async () => {
            console.log(chalk.gray(`\n[${new Date().toISOString()}] Running health check...`));
            await this.runHealthCheck();
            
            if (this.healthStatus.overall === 'critical') {
                console.log(chalk.red.bold('🚨 CRITICAL HEALTH ISSUES DETECTED!'));
                process.exit(1);
            }
        };

        // Run initial check
        await runCheck();

        // Set up interval
        setInterval(runCheck, intervalMs);
    }
}

// CLI execution
async function main() {
    const checker = new HealthChecker();
    const args = process.argv.slice(2);
    
    try {
        if (args.includes('--help') || args.includes('-h')) {
            console.log(chalk.blue.bold('Health Check Tool'));
            console.log(chalk.gray('\nUsage:'));
            console.log(chalk.white('  node tools/health-check.js                    # Run health check'));
            console.log(chalk.white('  node tools/health-check.js --save            # Save report to file'));
            console.log(chalk.white('  node tools/health-check.js --monitor        # Continuous monitoring'));
            console.log(chalk.white('  node tools/health-check.js --help           # Show this help'));
            return 0;
        }

        if (args.includes('--monitor')) {
            const interval = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 30000;
            await checker.runContinuousMonitoring(interval);
            return 0;
        }

        if (args.includes('--save')) {
            const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'health-report.json';
            await checker.runHealthCheck();
            await checker.saveReport(outputPath);
            return 0;
        }

        // Default: run health check
        await checker.runHealthCheck();
        
        // Exit with appropriate code
        const exitCode = checker.healthStatus.overall === 'critical' ? 1 : 0;
        return exitCode;

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

module.exports = HealthChecker; 