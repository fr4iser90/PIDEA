#!/usr/bin/env node

/**
 * Dependency Graph Visualization Tool
 * Provides visual representation and analysis of service dependencies
 */
// Register module aliases for CLI tools
require('module-alias/register');

const { getServiceRegistry } = require('@infrastructure/dependency-injection/ServiceRegistry');
const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
const chalk = require('chalk').default || require('chalk');
const fs = require('fs').promises;
const path = require('path');

class DependencyGraphVisualizer {
    constructor() {
        this.serviceRegistry = getServiceRegistry();
        this.serviceContainer = getServiceContainer();
    }

    /**
     * Generate DOT format for Graphviz
     */
    generateDotFormat() {
        const graph = this.serviceContainer.dependencyGraph;
        const nodes = graph.nodes;
        const edges = graph.edges;

        let dot = 'digraph DependencyGraph {\n';
        dot += '  rankdir=TB;\n';
        dot += '  node [shape=box, style=filled, fontname="Arial", fontsize=10];\n';
        dot += '  edge [fontname="Arial", fontsize=8];\n\n';

        // Add nodes with different colors based on category
        for (const [nodeName, nodeData] of nodes.entries()) {
            const category = this.getServiceCategory(nodeName);
            const color = this.getCategoryColor(category);
            const resolved = this.serviceContainer.singletons.has(nodeName);
            const style = resolved ? 'filled' : 'filled,dashed';
            
            dot += `  "${nodeName}" [label="${nodeName}\\n(${category})", fillcolor="${color}", style="${style}"];\n`;
        }

        dot += '\n';

        // Add edges
        for (const [from, toSet] of edges.entries()) {
            for (const to of toSet) {
                dot += `  "${from}" -> "${to}";\n`;
            }
        }

        dot += '}\n';
        return dot;
    }

    /**
     * Get service category
     */
    getServiceCategory(serviceName) {
        // Try to determine category from service name or registry
        const categories = ['infrastructure', 'repository', 'external', 'strategy', 'domain', 'handlers'];
        
        for (const category of categories) {
            if (serviceName.toLowerCase().includes(category)) {
                return category;
            }
        }
        
        return 'unknown';
    }

    /**
     * Get color for category
     */
    getCategoryColor(category) {
        const colors = {
            'infrastructure': '#E8F4FD',
            'repository': '#E8F5E8',
            'external': '#FFF3E0',
            'strategy': '#F3E5F5',
            'domain': '#FFEBEE',
            'handlers': '#E0F2F1',
            'unknown': '#F5F5F5'
        };
        
        return colors[category] || colors.unknown;
    }

    /**
     * Generate ASCII dependency tree
     */
    generateAsciiTree() {
        const graph = this.serviceContainer.dependencyGraph;
        const sortedNodes = graph.topologicalSort();
        
        let tree = chalk.blue.bold('🌳 Dependency Tree (Topological Order)\n');
        tree += chalk.gray('='.repeat(60)) + '\n\n';

        for (let i = 0; i < sortedNodes.length; i++) {
            const node = sortedNodes[i];
            const dependencies = graph.getDependencies(node);
            const category = this.getServiceCategory(node);
            const resolved = this.serviceContainer.singletons.has(node);
            
            const prefix = '  '.repeat(i);
            const status = resolved ? chalk.green('✓') : chalk.yellow('○');
            const categoryColor = this.getCategoryColor(category);
            
            tree += `${prefix}${status} ${chalk.bold(node)} ${chalk.gray(`(${category})`)}\n`;
            
            if (dependencies.length > 0) {
                tree += `${prefix}  ${chalk.gray('└─ depends on:')} ${dependencies.join(', ')}\n`;
            }
            
            tree += '\n';
        }

        return tree;
    }

    /**
     * Generate dependency matrix
     */
    generateDependencyMatrix() {
        const graph = this.serviceContainer.dependencyGraph;
        const nodes = Array.from(graph.nodes.keys()).sort();
        
        let matrix = chalk.blue.bold('📊 Dependency Matrix\n');
        matrix += chalk.gray('='.repeat(80)) + '\n\n';

        // Header
        matrix += chalk.bold('Service'.padEnd(25));
        for (const node of nodes) {
            matrix += chalk.bold(node.padEnd(15));
        }
        matrix += '\n' + chalk.gray('-'.repeat(80)) + '\n';

        // Matrix rows
        for (const from of nodes) {
            matrix += from.padEnd(25);
            
            for (const to of nodes) {
                const hasDependency = graph.hasDependency(from, to);
                const symbol = hasDependency ? chalk.red('●') : chalk.gray('○');
                matrix += symbol.padEnd(15);
            }
            
            matrix += '\n';
        }

        matrix += '\n' + chalk.gray('Legend: ● = depends on, ○ = no dependency') + '\n';
        
        return matrix;
    }

    /**
     * Generate circular dependency analysis
     */
    generateCircularAnalysis() {
        const cycles = this.serviceContainer.dependencyGraph.detectCircularDependencies();
        
        let analysis = chalk.blue.bold('🔄 Circular Dependency Analysis\n');
        analysis += chalk.gray('='.repeat(50)) + '\n\n';

        if (cycles.length === 0) {
            analysis += chalk.green('✅ No circular dependencies detected\n');
        } else {
            analysis += chalk.red(`❌ Found ${cycles.length} circular dependency cycle(s):\n\n`);
            
            cycles.forEach((cycle, index) => {
                analysis += chalk.red.bold(`Cycle ${index + 1}:\n`);
                analysis += chalk.red(`  ${cycle.join(' → ')} → ${cycle[0]}\n\n`);
            });
        }

        return analysis;
    }

    /**
     * Generate dependency statistics
     */
    generateStatistics() {
        const stats = this.serviceContainer.getDependencyStats();
        const lifecycleInfo = this.serviceContainer.getAllLifecycleInfo();
        
        let statistics = chalk.blue.bold('📈 Dependency Statistics\n');
        statistics += chalk.gray('='.repeat(40)) + '\n\n';

        // Basic stats
        statistics += chalk.white(`Total Services: ${chalk.bold(stats.totalNodes)}\n`);
        statistics += chalk.white(`Total Dependencies: ${chalk.bold(stats.totalDependencies)}\n`);
        statistics += chalk.white(`Average Dependencies: ${chalk.bold(stats.averageDependencies.toFixed(2))}\n`);
        statistics += chalk.white(`Max Dependencies: ${chalk.bold(stats.maxDependencies)}\n`);
        statistics += chalk.white(`Min Dependencies: ${chalk.bold(stats.minDependencies)}\n\n`);

        // Category breakdown
        const categoryStats = {};
        for (const [serviceName, info] of Object.entries(lifecycleInfo)) {
            const category = this.getServiceCategory(serviceName);
            if (!categoryStats[category]) {
                categoryStats[category] = { count: 0, dependencies: 0 };
            }
            categoryStats[category].count++;
            categoryStats[category].dependencies += info.dependencies.length;
        }

        statistics += chalk.yellow.bold('Category Breakdown:\n');
        for (const [category, data] of Object.entries(categoryStats)) {
            const avgDeps = (data.dependencies / data.count).toFixed(2);
            statistics += chalk.white(`  ${category}: ${chalk.bold(data.count)} services, avg ${chalk.bold(avgDeps)} deps\n`);
        }

        statistics += '\n';

        // Lifecycle stats
        const lifecycleStats = {
            total: Object.keys(lifecycleInfo).length,
            withLifecycle: Object.values(lifecycleInfo).filter(info => info.hasLifecycleHooks).length,
            resolved: Object.values(lifecycleInfo).filter(info => info.isResolved).length,
            started: Object.values(lifecycleInfo).filter(info => info.state.status === 'started').length,
            failed: Object.values(lifecycleInfo).filter(info => info.state.status === 'failed').length
        };

        statistics += chalk.yellow.bold('Lifecycle Status:\n');
        statistics += chalk.white(`  Total: ${chalk.bold(lifecycleStats.total)}\n`);
        statistics += chalk.white(`  With Lifecycle Hooks: ${chalk.bold(lifecycleStats.withLifecycle)}\n`);
        statistics += chalk.white(`  Resolved: ${chalk.bold(lifecycleStats.resolved)}\n`);
        statistics += chalk.white(`  Started: ${chalk.bold(lifecycleStats.started)}\n`);
        statistics += chalk.white(`  Failed: ${chalk.bold(lifecycleStats.failed)}\n`);

        return statistics;
    }

    /**
     * Save DOT file for Graphviz
     */
    async saveDotFile(outputPath = 'dependency-graph.dot') {
        const dot = this.generateDotFormat();
        await fs.writeFile(outputPath, dot, 'utf8');
        console.log(chalk.green(`✅ DOT file saved to: ${outputPath}`));
        console.log(chalk.gray(`   Run: dot -Tpng ${outputPath} -o dependency-graph.png`));
        return outputPath;
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        let report = '';
        
        report += this.generateStatistics();
        report += '\n' + this.generateCircularAnalysis();
        report += '\n' + this.generateAsciiTree();
        report += '\n' + this.generateDependencyMatrix();
        
        return report;
    }

    /**
     * Interactive dependency explorer
     */
    async exploreDependencies() {
        console.log(chalk.blue.bold('🔍 Interactive Dependency Explorer\n'));
        
        const graph = this.serviceContainer.dependencyGraph;
        const nodes = Array.from(graph.nodes.keys()).sort();
        
        console.log(chalk.yellow('Available services:'));
        nodes.forEach((node, index) => {
            const category = this.getServiceCategory(node);
            const resolved = this.serviceContainer.singletons.has(node);
            const status = resolved ? chalk.green('✓') : chalk.yellow('○');
            console.log(chalk.white(`  ${index + 1}. ${status} ${node} (${category})`));
        });

        console.log(chalk.gray('\nEnter service number to explore (or "q" to quit):'));
        
        // Note: This is a simplified version. In a real implementation,
        // you would use a proper CLI input library like 'inquirer'
        console.log(chalk.yellow('Interactive mode requires additional CLI input library'));
    }
}

// CLI execution
async function main() {
    const visualizer = new DependencyGraphVisualizer();
    const args = process.argv.slice(2);
    
    try {
        if (args.includes('--help') || args.includes('-h')) {
            console.log(chalk.blue.bold('Dependency Graph Visualization Tool'));
            console.log(chalk.gray('\nUsage:'));
            console.log(chalk.white('  node tools/dependency-graph.js                    # Show full report'));
            console.log(chalk.white('  node tools/dependency-graph.js --dot             # Generate DOT file'));
            console.log(chalk.white('  node tools/dependency-graph.js --ascii           # Show ASCII tree'));
            console.log(chalk.white('  node tools/dependency-graph.js --matrix          # Show dependency matrix'));
            console.log(chalk.white('  node tools/dependency-graph.js --stats           # Show statistics only'));
            console.log(chalk.white('  node tools/dependency-graph.js --explore         # Interactive mode'));
            console.log(chalk.white('  node tools/dependency-graph.js --help            # Show this help'));
            return 0;
        }

        if (args.includes('--dot')) {
            const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'dependency-graph.dot';
            await visualizer.saveDotFile(outputPath);
            return 0;
        }

        if (args.includes('--ascii')) {
            console.log(visualizer.generateAsciiTree());
            return 0;
        }

        if (args.includes('--matrix')) {
            console.log(visualizer.generateDependencyMatrix());
            return 0;
        }

        if (args.includes('--stats')) {
            console.log(visualizer.generateStatistics());
            return 0;
        }

        if (args.includes('--explore')) {
            await visualizer.exploreDependencies();
            return 0;
        }

        // Default: show full report
        console.log(visualizer.generateReport());
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

module.exports = DependencyGraphVisualizer; 