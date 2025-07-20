#!/usr/bin/env node

/**
 * Dependency Validation CLI Tool
 * Provides comprehensive dependency analysis and validation
 */
// Register module aliases for CLI tools
require('module-alias/register');

const { getServiceRegistry } = require('@infrastructure/dependency-injection/ServiceRegistry');
const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
const chalk = require('chalk').default || require('chalk');

class DependencyValidator {
    constructor() {
        this.serviceRegistry = getServiceRegistry();
        this.serviceContainer = getServiceContainer();
    }

    /**
     * Run comprehensive dependency validation
     */
    async validate() {
        console.log(chalk.blue.bold('🔍 Dependency Validation Tool'));
        console.log(chalk.gray('='.repeat(50)));

        const results = {
            circularDependencies: [],
            missingDependencies: [],
            validationErrors: [],
            warnings: [],
            statistics: {}
        };

        try {
            // 1. Validate dependency graph
            console.log(chalk.yellow('\n📊 Analyzing dependency graph...'));
            const graphValidation = this.validateDependencyGraph();
            results.circularDependencies = graphValidation.circularDependencies;
            results.missingDependencies = graphValidation.missingDependencies;

            // 2. Validate service container
            console.log(chalk.yellow('\n🔧 Validating service container...'));
            const containerValidation = this.validateServiceContainer();
            results.validationErrors = containerValidation.errors;
            results.warnings = containerValidation.warnings;

            // 3. Collect statistics
            console.log(chalk.yellow('\n📈 Collecting statistics...'));
            results.statistics = this.collectStatistics();

            // 4. Display results
            this.displayResults(results);

            // 5. Return exit code
            const hasErrors = results.circularDependencies.length > 0 || 
                            results.missingDependencies.length > 0 || 
                            results.validationErrors.length > 0;

            return hasErrors ? 1 : 0;

        } catch (error) {
            console.error(chalk.red('\n❌ Validation failed:'), error.message);
            return 1;
        }
    }

    /**
     * Validate dependency graph
     */
    validateDependencyGraph() {
        const result = {
            circularDependencies: [],
            missingDependencies: []
        };

        // Check for circular dependencies
        const cycles = this.serviceContainer.dependencyGraph.detectCircularDependencies();
        if (cycles.length > 0) {
            result.circularDependencies = cycles;
            console.log(chalk.red(`❌ Found ${cycles.length} circular dependency cycles`));
        } else {
            console.log(chalk.green('✅ No circular dependencies detected'));
        }

        // Check for missing dependencies
        const validation = this.serviceContainer.dependencyGraph.validateDependencies();
        if (!validation.isValid) {
            result.missingDependencies = validation.missingDependencies;
            console.log(chalk.red(`❌ Found missing dependencies in ${Object.keys(validation.missingDependencies).length} services`));
        } else {
            console.log(chalk.green('✅ All dependencies are properly defined'));
        }

        return result;
    }

    /**
     * Validate service container
     */
    validateServiceContainer() {
        const result = {
            errors: [],
            warnings: []
        };

        // Check if all services can be resolved
        for (const [serviceName, factory] of this.serviceContainer.factories.entries()) {
            try {
                // Try to resolve dependencies
                const dependencies = factory.dependencies;
                for (const dep of dependencies) {
                    if (!this.serviceContainer.factories.has(dep)) {
                        result.errors.push(`Service '${serviceName}' depends on undefined service '${dep}'`);
                    }
                }
            } catch (error) {
                result.errors.push(`Failed to validate service '${serviceName}': ${error.message}`);
            }
        }

        // Check lifecycle hooks
        const lifecycleInfo = this.serviceContainer.getAllLifecycleInfo();
        for (const [serviceName, info] of Object.entries(lifecycleInfo)) {
            if (info.hasLifecycleHooks && !info.isResolved) {
                result.warnings.push(`Service '${serviceName}' has lifecycle hooks but is not instantiated`);
            }
        }

        if (result.errors.length > 0) {
            console.log(chalk.red(`❌ Found ${result.errors.length} validation errors`));
        } else {
            console.log(chalk.green('✅ Service container validation passed'));
        }

        if (result.warnings.length > 0) {
            console.log(chalk.yellow(`⚠️  Found ${result.warnings.length} warnings`));
        }

        return result;
    }

    /**
     * Collect dependency statistics
     */
    collectStatistics() {
        const stats = this.serviceContainer.getDependencyStats();
        const lifecycleInfo = this.serviceContainer.getAllLifecycleInfo();

        const lifecycleStats = {
            totalServices: Object.keys(lifecycleInfo).length,
            servicesWithLifecycle: Object.values(lifecycleInfo).filter(info => info.hasLifecycleHooks).length,
            resolvedServices: Object.values(lifecycleInfo).filter(info => info.isResolved).length,
            startedServices: Object.values(lifecycleInfo).filter(info => info.state.status === 'started').length,
            failedServices: Object.values(lifecycleInfo).filter(info => info.state.status === 'failed').length
        };

        return {
            ...stats,
            lifecycle: lifecycleStats
        };
    }

    /**
     * Display validation results
     */
    displayResults(results) {
        console.log(chalk.blue.bold('\n📋 Validation Results'));
        console.log(chalk.gray('='.repeat(50)));

        // Display circular dependencies
        if (results.circularDependencies.length > 0) {
            console.log(chalk.red.bold('\n🔄 Circular Dependencies:'));
            results.circularDependencies.forEach((cycle, index) => {
                console.log(chalk.red(`  ${index + 1}. ${cycle.join(' → ')}`));
            });
        }

        // Display missing dependencies
        if (results.missingDependencies.length > 0) {
            console.log(chalk.red.bold('\n❌ Missing Dependencies:'));
            Object.entries(results.missingDependencies).forEach(([service, missing]) => {
                console.log(chalk.red(`  ${service}: missing [${missing.join(', ')}]`));
            });
        }

        // Display validation errors
        if (results.validationErrors.length > 0) {
            console.log(chalk.red.bold('\n🚨 Validation Errors:'));
            results.validationErrors.forEach(error => {
                console.log(chalk.red(`  • ${error}`));
            });
        }

        // Display warnings
        if (results.warnings.length > 0) {
            console.log(chalk.yellow.bold('\n⚠️  Warnings:'));
            results.warnings.forEach(warning => {
                console.log(chalk.yellow(`  • ${warning}`));
            });
        }

        // Display statistics
        console.log(chalk.blue.bold('\n📊 Statistics:'));
        const stats = results.statistics;
        console.log(chalk.white(`  Total Services: ${stats.totalNodes}`));
        console.log(chalk.white(`  Total Dependencies: ${stats.totalDependencies}`));
        console.log(chalk.white(`  Average Dependencies: ${stats.averageDependencies.toFixed(2)}`));
        console.log(chalk.white(`  Max Dependencies: ${stats.maxDependencies}`));
        console.log(chalk.white(`  Services with Lifecycle: ${stats.lifecycle.servicesWithLifecycle}`));
        console.log(chalk.white(`  Resolved Services: ${stats.lifecycle.resolvedServices}`));
        console.log(chalk.white(`  Started Services: ${stats.lifecycle.startedServices}`));
        console.log(chalk.white(`  Failed Services: ${stats.lifecycle.failedServices}`));

        // Display summary
        const hasErrors = results.circularDependencies.length > 0 || 
                         results.missingDependencies.length > 0 || 
                         results.validationErrors.length > 0;

        if (hasErrors) {
            console.log(chalk.red.bold('\n❌ Validation Failed'));
            console.log(chalk.red('Please fix the issues above before proceeding.'));
        } else {
            console.log(chalk.green.bold('\n✅ Validation Passed'));
            console.log(chalk.green('All dependencies are properly configured.'));
        }
    }

    /**
     * Generate detailed report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            dependencyGraph: this.serviceContainer.dependencyGraph.toString(),
            lifecycleInfo: this.serviceContainer.getAllLifecycleInfo(),
            statistics: this.serviceContainer.getDependencyStats(),
            validation: {
                circularDependencies: this.serviceContainer.dependencyGraph.detectCircularDependencies(),
                missingDependencies: this.serviceContainer.dependencyGraph.validateDependencies()
            }
        };

        return JSON.stringify(report, null, 2);
    }
}

// CLI execution
async function main() {
    const validator = new DependencyValidator();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--report')) {
        const report = validator.generateReport();
        console.log(report);
        return 0;
    }

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('Dependency Validation Tool'));
        console.log(chalk.gray('\nUsage:'));
        console.log(chalk.white('  node tools/validate-deps.js          # Run validation'));
        console.log(chalk.white('  node tools/validate-deps.js --report # Generate JSON report'));
        console.log(chalk.white('  node tools/validate-deps.js --help   # Show this help'));
        return 0;
    }

    return await validator.validate();
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

module.exports = DependencyValidator; 