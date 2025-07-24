#!/usr/bin/env node

/**
 * Debug Dependency Tool
 * Analyzes dependency graph to identify issues
 */
// Register module aliases for CLI tools
require('module-alias/register');

const { getServiceRegistry } = require('@infrastructure/dependency-injection/ServiceRegistry');
const chalk = require('chalk').default || require('chalk');

class DependencyDebugger {
    constructor() {
        this.serviceRegistry = getServiceRegistry();
    }

    /**
     * Debug dependency issues
     */
    async debugDependencies() {
        console.log(chalk.blue.bold('🔍 Dependency Debug Tool'));
        console.log(chalk.gray('='.repeat(50)));

        try {
            // Get service definitions - handle case where method doesn't exist
            let serviceDefinitions;
            if (typeof this.serviceRegistry.getServiceDefinitions === 'function') {
                serviceDefinitions = this.serviceRegistry.getServiceDefinitions();
            } else {
                // Create service definitions manually for debugging
                serviceDefinitions = this.createServiceDefinitions();
            }
            
            console.log(chalk.yellow('📊 Service Definitions:'));
            for (const [category, services] of Object.entries(serviceDefinitions)) {
                console.log(chalk.cyan(`  ${category}:`));
                for (const service of services) {
                    console.log(chalk.gray(`    - ${service.name} -> [${service.dependencies.join(', ')}]`));
                }
            }

            // Check for missing dependencies
            console.log(chalk.yellow('\n🔍 Checking for missing dependencies...'));
            const missingDeps = this.findMissingDependencies(serviceDefinitions);
            
            if (missingDeps.size > 0) {
                console.log(chalk.red('❌ Missing dependencies found:'));
                for (const [service, missing] of missingDeps.entries()) {
                    console.log(chalk.red(`  ${service}: [${missing.join(', ')}]`));
                }
            } else {
                console.log(chalk.green('✅ No missing dependencies'));
            }

            // Check for circular dependencies
            console.log(chalk.yellow('\n🔄 Checking for circular dependencies...'));
            const cycles = this.findCircularDependencies(serviceDefinitions);
            
            if (cycles.length > 0) {
                console.log(chalk.red('❌ Circular dependencies found:'));
                for (const cycle of cycles) {
                    console.log(chalk.red(`  ${cycle.join(' -> ')} -> ${cycle[0]}`));
                }
            } else {
                console.log(chalk.green('✅ No circular dependencies'));
            }

            // Show dependency graph
            console.log(chalk.yellow('\n📈 Dependency Graph:'));
            this.showDependencyGraph(serviceDefinitions);

        } catch (error) {
            console.error(chalk.red('❌ Debug failed:'), error.message);
        }
    }

    /**
     * Find missing dependencies
     */
    findMissingDependencies(serviceDefinitions) {
        const allServices = new Set();
        const missingDeps = new Map();

        // Collect all service names
        for (const services of Object.values(serviceDefinitions)) {
            for (const service of services) {
                allServices.add(service.name);
            }
        }

        // Check each service's dependencies
        for (const services of Object.values(serviceDefinitions)) {
            for (const service of services) {
                const missing = [];
                for (const dep of service.dependencies) {
                    if (!allServices.has(dep)) {
                        missing.push(dep);
                    }
                }
                if (missing.length > 0) {
                    missingDeps.set(service.name, missing);
                }
            }
        }

        return missingDeps;
    }

    /**
     * Find circular dependencies using DFS
     */
    findCircularDependencies(serviceDefinitions) {
        const graph = new Map();
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];

        // Build graph
        for (const services of Object.values(serviceDefinitions)) {
            for (const service of services) {
                graph.set(service.name, service.dependencies);
            }
        }

        // DFS to find cycles
        const dfs = (node, path = []) => {
            if (recursionStack.has(node)) {
                const cycleStart = path.indexOf(node);
                const cycle = path.slice(cycleStart).concat([node]);
                cycles.push(cycle);
                return;
            }

            if (visited.has(node)) {
                return;
            }

            visited.add(node);
            recursionStack.add(node);

            const dependencies = graph.get(node) || [];
            for (const dep of dependencies) {
                dfs(dep, [...path, node]);
            }

            recursionStack.delete(node);
        };

        // Check all nodes
        for (const node of graph.keys()) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }

        return cycles;
    }

    /**
     * Create service definitions manually for debugging
     */
    createServiceDefinitions() {
        return {
            infrastructure: [
                { name: 'databaseConnection', dependencies: [] },
                { name: 'eventBus', dependencies: [] },
                { name: 'commandBus', dependencies: ['eventBus'] },
                { name: 'queryBus', dependencies: ['eventBus'] },
                { name: 'logger', dependencies: [] },
                { name: 'fileSystemService', dependencies: [] },
                { name: 'browserManager', dependencies: [] },
                { name: 'terminalService', dependencies: [] },
                { name: 'ideManager', dependencies: ['browserManager', 'projectRepository', 'eventBus', 'gitService'] },
                { name: 'idePortManager', dependencies: ['ideManager', 'eventBus'] },
                { name: 'stepRegistry', dependencies: [] }
            ],
            repositories: [
                { name: 'chatRepository', dependencies: [] },
                { name: 'taskRepository', dependencies: ['databaseConnection'] },
                { name: 'taskExecutionRepository', dependencies: [] },
                { name: 'analysisRepository', dependencies: ['databaseConnection'] },
                { name: 'userRepository', dependencies: ['databaseConnection'] },
                { name: 'userSessionRepository', dependencies: ['databaseConnection'] },
                { name: 'projectAnalysisRepository', dependencies: ['databaseConnection'] },
                { name: 'projectRepository', dependencies: ['databaseConnection'] }
            ],
            external: [
                { name: 'aiService', dependencies: [] },
                { name: 'analysisOrchestrator', dependencies: ['stepRegistry', 'eventBus', 'logger', 'analysisRepository'] },
                { name: 'testOrchestrator', dependencies: ['stepRegistry', 'eventBus', 'logger'] },
                { name: 'workflowOrchestrationService', dependencies: ['taskRepository', 'eventBus', 'logger', 'stepRegistry', 'cursorIDEService'] },
                { name: 'projectAnalyzer', dependencies: [] },
                { name: 'gitService', dependencies: ['logger', 'eventBus', 'stepRegistry'] }
            ],
            strategies: [
                { name: 'monorepoStrategy', dependencies: ['logger', 'eventBus', 'fileSystemService'] },
                { name: 'singleRepoStrategy', dependencies: ['logger', 'eventBus', 'fileSystemService'] },
                { name: 'recommendationsService', dependencies: ['logger'] },
                { name: 'optimizationService', dependencies: ['logger'] }
            ],
            domain: [
                { name: 'ideMirrorService', dependencies: ['ideManager', 'browserManager'] },
                { name: 'terminalLogCaptureService', dependencies: ['ideManager', 'browserManager', 'ideMirrorService'] },
                { name: 'terminalLogReader', dependencies: [] },
                { name: 'ideController', dependencies: ['ideManager', 'eventBus', 'cursorIDEService', 'taskRepository', 'terminalLogCaptureService', 'terminalLogReader'] },
                { name: 'projectMappingService', dependencies: ['monorepoStrategy'] },
                { name: 'workspacePathDetector', dependencies: [] },
                { name: 'ideWorkspaceDetectionService', dependencies: ['ideManager', 'projectRepository'] },
                { name: 'subprojectDetector', dependencies: [] },
                { name: 'analysisOutputService', dependencies: [] },
                { name: 'taskAnalysisService', dependencies: ['cursorIDEService', 'eventBus', 'logger', 'aiService', 'projectAnalyzer', 'analysisOrchestrator'] },
                { name: 'taskValidationService', dependencies: ['taskRepository', 'cursorIDEService', 'eventBus', 'fileSystemService'] },
                { name: 'advancedAnalysisService', dependencies: ['layerValidationService', 'logicValidationService', 'taskAnalysisService', 'eventBus', 'logger'] },
                { name: 'layerValidationService', dependencies: ['logger'] },
                { name: 'logicValidationService', dependencies: ['logger'] },
                { name: 'chatSessionService', dependencies: ['browserManager', 'ideManager', 'eventBus', 'logger'] },
                { name: 'ideAutomationService', dependencies: ['browserManager', 'ideManager', 'eventBus', 'logger'] },
                { name: 'workflowExecutionService', dependencies: ['chatSessionService', 'ideAutomationService', 'browserManager', 'ideManager', 'eventBus', 'logger'] },
                { name: 'ideFactory', dependencies: [] },
                { name: 'ideService', dependencies: ['browserManager', 'ideManager', 'eventBus', 'ideFactory'] },
                { name: 'cursorIDEService', dependencies: ['browserManager', 'ideManager', 'eventBus'] },
                { name: 'vscodeIDEService', dependencies: ['browserManager', 'ideManager', 'eventBus'] },
                { name: 'windsurfIDEService', dependencies: ['browserManager', 'ideManager', 'eventBus'] },
                { name: 'authService', dependencies: ['userRepository', 'userSessionRepository'] },
                { name: 'taskService', dependencies: ['taskRepository', 'aiService', 'projectAnalyzer', 'cursorIDEService'] },
                { name: 'docsImportService', dependencies: ['browserManager', 'taskService', 'taskRepository'] }
            ],
            handlers: [
                { name: 'sendMessageHandler', dependencies: ['browserManager', 'ideManager', 'eventBus', 'logger'] }
            ]
        };
    }

    /**
     * Show dependency graph
     */
    showDependencyGraph(serviceDefinitions) {
        for (const [category, services] of Object.entries(serviceDefinitions)) {
            console.log(chalk.cyan(`\n${category.toUpperCase()}:`));
            for (const service of services) {
                const deps = service.dependencies.length > 0 
                    ? chalk.gray(` -> [${service.dependencies.join(', ')}]`)
                    : chalk.gray(' -> []');
                console.log(`  ${service.name}${deps}`);
            }
        }
    }
}

async function main() {
    const dependencyDebugger = new DependencyDebugger();
    await dependencyDebugger.debugDependencies();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DependencyDebugger; 