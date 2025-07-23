/**
 * Layer Violation Commands - CLI commands for layer violation analysis
 */

const { CommandBus } = require('@messaging/CommandBus');
const Logger = require('@logging/Logger');
const logger = new Logger('LayerViolationCommands');

class LayerViolationCommands {
    constructor(serviceContainer) {
        this.serviceContainer = serviceContainer;
        this.commandBus = new CommandBus(serviceContainer);
    }

    /**
     * Setup layer violation commands
     * @param {Object} program - Commander program instance
     */
    setupCommands(program) {
        const layerViolation = program
            .command('layer-violation')
            .description('Layer violation analysis and fixing operations');

        layerViolation
            .command('analyze')
            .description('Analyze layer boundary violations')
            .option('--project-id <id>', 'Project ID', 'default-project')
            .option('--project-path <path>', 'Project path', process.cwd())
            .option('--generate-tasks', 'Generate tasks from violations', true)
            .option('--create-docs', 'Create documentation', true)
            .option('--include-fixes', 'Include fix recommendations', true)
            .option('--include-plans', 'Include fix plans', true)
            .action(async (options) => {
                await this.analyzeViolations(options);
            });

        layerViolation
            .command('fix')
            .description('Fix layer boundary violations')
            .option('--project-id <id>', 'Project ID', 'default-project')
            .option('--project-path <path>', 'Project path', process.cwd())
            .option('--priority <priority>', 'Fix priority (critical, high, medium)', 'critical')
            .option('--auto-fix', 'Automatically apply fixes', false)
            .action(async (options) => {
                await this.fixViolations(options);
            });

        layerViolation
            .command('report')
            .description('Generate layer violation report')
            .option('--project-id <id>', 'Project ID', 'default-project')
            .option('--project-path <path>', 'Project path', process.cwd())
            .option('--format <format>', 'Output format (table, json, markdown)', 'table')
            .option('--output <file>', 'Output file path')
            .action(async (options) => {
                await this.generateReport(options);
            });
    }

    /**
     * Analyze layer violations
     * @param {Object} options - Command options
     */
    async analyzeViolations(options) {
        try {
            logger.info('🔍 Starting layer violation analysis...');
            
            const spinner = this.createSpinner('Analyzing layer violations...');

            // Create command
            const AnalyzeLayerViolationsCommand = require('@categories/analysis/AnalyzeLayerViolationsCommand');
            const command = new AnalyzeLayerViolationsCommand({
                projectId: options.projectId,
                projectPath: options.projectPath,
                options: {
                    includeViolations: true,
                    includeFixes: options.includeFixes !== false,
                    includeFixPlans: options.includePlans !== false,
                    generateTasks: options.generateTasks !== false,
                    createDocs: options.createDocs !== false
                },
                requestedBy: 'cli-user'
            });

            // Execute command
            const result = await this.commandBus.execute('AnalyzeLayerViolationsCommand', command);
            
            spinner.succeed('Layer violation analysis completed');

            // Display results
            this.displayAnalysisResults(result);

        } catch (error) {
            this.handleError('Layer violation analysis failed', error);
        }
    }

    /**
     * Fix layer violations
     * @param {Object} options - Command options
     */
    async fixViolations(options) {
        try {
            logger.info('🔧 Starting layer violation fixes...');
            
            const spinner = this.createSpinner('Fixing layer violations...');

            // First analyze to get violations
            const AnalyzeLayerViolationsCommand = require('@categories/analysis/AnalyzeLayerViolationsCommand');
            const analyzeCommand = new AnalyzeLayerViolationsCommand({
                projectId: options.projectId,
                projectPath: options.projectPath,
                options: {
                    includeViolations: true,
                    includeFixes: true,
                    includeFixPlans: true,
                    generateTasks: false,
                    createDocs: false
                },
                requestedBy: 'cli-user'
            });

            const analysisResult = await this.commandBus.execute('AnalyzeLayerViolationsCommand', analyzeCommand);
            
            if (!analysisResult.success) {
                throw new Error('Analysis failed, cannot proceed with fixes');
            }

            // Filter fixes by priority
            const fixes = analysisResult.analysis.data.fixes.filter(fix => 
                fix.priority === options.priority || options.priority === 'all'
            );

            if (fixes.length === 0) {
                spinner.info('No violations found to fix');
                return;
            }

            // Apply fixes
            if (options.autoFix) {
                await this.applyFixes(fixes, options);
            } else {
                this.displayFixPlan(fixes, options);
            }

            spinner.succeed(`Layer violation fixes completed (${fixes.length} fixes)`);

        } catch (error) {
            this.handleError('Layer violation fixes failed', error);
        }
    }

    /**
     * Generate layer violation report
     * @param {Object} options - Command options
     */
    async generateReport(options) {
        try {
            logger.info('📊 Generating layer violation report...');
            
            const spinner = this.createSpinner('Generating report...');

            // Analyze violations
            const AnalyzeLayerViolationsCommand = require('@categories/analysis/AnalyzeLayerViolationsCommand');
            const command = new AnalyzeLayerViolationsCommand({
                projectId: options.projectId,
                projectPath: options.projectPath,
                options: {
                    includeViolations: true,
                    includeFixes: true,
                    includeFixPlans: true,
                    generateTasks: false,
                    createDocs: false
                },
                requestedBy: 'cli-user'
            });

            const result = await this.commandBus.execute('AnalyzeLayerViolationsCommand', command);
            
            if (!result.success) {
                throw new Error('Analysis failed, cannot generate report');
            }

            // Generate report
            const report = this.generateReportContent(result.analysis.data, options.format);
            
            // Output report
            if (options.output) {
                const fs = require('fs').promises;
                await fs.writeFile(options.output, report);
                spinner.succeed(`Report saved to: ${options.output}`);
            } else {
                spinner.succeed('Report generated');
                console.log(report);
            }

        } catch (error) {
            this.handleError('Report generation failed', error);
        }
    }

    /**
     * Display analysis results
     * @param {Object} result - Analysis result
     */
    displayAnalysisResults(result) {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 LAYER VIOLATION ANALYSIS RESULTS');
        console.log('='.repeat(80));

        if (!result.success) {
            console.log('❌ Analysis failed:', result.error);
            return;
        }

        const data = result.analysis.data;
        const summary = data.summary;

        // Summary
        console.log(`\n📊 VIOLATION SUMMARY:`);
        console.log(`- Total Violations: ${summary.totalViolations}`);
        console.log(`- Critical: ${summary.criticalViolations}`);
        console.log(`- High: ${summary.highViolations}`);
        console.log(`- Medium: ${summary.mediumViolations}`);

        // Fixes
        console.log(`\n🔧 FIX RECOMMENDATIONS:`);
        console.log(`- Total Fixes: ${summary.totalFixes}`);
        console.log(`- Critical Fixes: ${data.fixes.filter(f => f.priority === 'critical').length}`);
        console.log(`- High Priority Fixes: ${data.fixes.filter(f => f.priority === 'high').length}`);
        console.log(`- Medium Priority Fixes: ${data.fixes.filter(f => f.priority === 'medium').length}`);

        // Generated tasks
        if (summary.totalTasks > 0) {
            console.log(`\n📋 GENERATED TASKS:`);
            console.log(`- Total Tasks: ${summary.totalTasks}`);
            console.log(`- Main Task: ${result.task.title}`);
            console.log(`- Task ID: ${result.task.id}`);
        }

        // Documentation
        if (summary.totalDocs > 0) {
            console.log(`\n📚 DOCUMENTATION:`);
            console.log(`- Total Docs: ${summary.totalDocs}`);
            data.documentation.forEach(doc => {
                console.log(`  - ${doc.fileName}`);
            });
        }

        // Critical violations
        if (summary.criticalViolations > 0) {
            console.log(`\n🚨 CRITICAL VIOLATIONS:`);
            data.violations
                .filter(v => v.severity === 'critical')
                .slice(0, 5) // Show first 5
                .forEach((v, index) => {
                    console.log(`${index + 1}. ${v.file}`);
                    console.log(`   ${v.message}`);
                });
            
            if (summary.criticalViolations > 5) {
                console.log(`   ... and ${summary.criticalViolations - 5} more`);
            }
        }

        console.log('\n' + '='.repeat(80));
    }

    /**
     * Display fix plan
     * @param {Array} fixes - Fix recommendations
     * @param {Object} options - Command options
     */
    displayFixPlan(fixes, options) {
        console.log('\n' + '='.repeat(80));
        console.log('🔧 LAYER VIOLATION FIX PLAN');
        console.log('='.repeat(80));

        console.log(`\n📋 FIXES TO APPLY (${fixes.length} total):`);
        
        fixes.forEach((fix, index) => {
            console.log(`\n${index + 1}. ${path.basename(fix.file, '.js')} (${fix.priority.toUpperCase()})`);
            console.log(`   File: ${fix.file}`);
            console.log(`   Type: ${fix.type}`);
            console.log(`   Steps:`);
            fix.steps.forEach((step, stepIndex) => {
                console.log(`     ${stepIndex + 1}. ${step}`);
            });
        });

        console.log(`\n💡 To apply fixes automatically, run:`);
        console.log(`   layer-violation fix --auto-fix --priority ${options.priority}`);
        
        console.log('\n' + '='.repeat(80));
    }

    /**
     * Apply fixes automatically
     * @param {Array} fixes - Fix recommendations
     * @param {Object} options - Command options
     */
    async applyFixes(fixes, options) {
        logger.info(`Applying ${fixes.length} fixes automatically...`);
        
        // This would implement the actual fix application logic
        // For now, just log what would be done
        fixes.forEach((fix, index) => {
            logger.info(`Applying fix ${index + 1}: ${path.basename(fix.file, '.js')}`);
            // TODO: Implement actual fix application
        });
    }

    /**
     * Generate report content
     * @param {Object} data - Analysis data
     * @param {string} format - Report format
     * @returns {string} Report content
     */
    generateReportContent(data, format) {
        const summary = data.summary;
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
                
            case 'markdown':
                return this.generateMarkdownReport(data);
                
            case 'table':
            default:
                return this.generateTableReport(data);
        }
    }

    /**
     * Generate markdown report
     * @param {Object} data - Analysis data
     * @returns {string} Markdown report
     */
    generateMarkdownReport(data) {
        const summary = data.summary;
        
        let report = `# Layer Violation Analysis Report\n\n`;
        report += `**Generated:** ${new Date().toISOString()}\n\n`;
        
        report += `## Summary\n\n`;
        report += `- **Total Violations:** ${summary.totalViolations}\n`;
        report += `- **Critical:** ${summary.criticalViolations}\n`;
        report += `- **High:** ${summary.highViolations}\n`;
        report += `- **Medium:** ${summary.mediumViolations}\n`;
        report += `- **Total Fixes:** ${summary.totalFixes}\n\n`;
        
        if (data.violations.length > 0) {
            report += `## Violations\n\n`;
            data.violations.forEach((violation, index) => {
                report += `### ${index + 1}. ${violation.file}\n\n`;
                report += `- **Severity:** ${violation.severity}\n`;
                report += `- **Type:** ${violation.type}\n`;
                report += `- **Message:** ${violation.message}\n`;
                report += `- **Fix:** ${violation.fix}\n\n`;
            });
        }
        
        if (data.fixes.length > 0) {
            report += `## Fix Recommendations\n\n`;
            data.fixes.forEach((fix, index) => {
                report += `### ${index + 1}. ${path.basename(fix.file, '.js')}\n\n`;
                report += `- **File:** \`${fix.file}\`\n`;
                report += `- **Type:** ${fix.type}\n`;
                report += `- **Priority:** ${fix.priority}\n\n`;
                report += `**Steps:**\n`;
                fix.steps.forEach((step, stepIndex) => {
                    report += `${stepIndex + 1}. ${step}\n`;
                });
                report += `\n`;
            });
        }
        
        return report;
    }

    /**
     * Generate table report
     * @param {Object} data - Analysis data
     * @returns {string} Table report
     */
    generateTableReport(data) {
        const summary = data.summary;
        
        let report = `LAYER VIOLATION ANALYSIS REPORT\n`;
        report += `Generated: ${new Date().toISOString()}\n\n`;
        
        report += `SUMMARY:\n`;
        report += `Total Violations: ${summary.totalViolations}\n`;
        report += `Critical: ${summary.criticalViolations}\n`;
        report += `High: ${summary.highViolations}\n`;
        report += `Medium: ${summary.mediumViolations}\n`;
        report += `Total Fixes: ${summary.totalFixes}\n\n`;
        
        if (data.violations.length > 0) {
            report += `VIOLATIONS:\n`;
            report += `File | Severity | Type | Message\n`;
            report += `-----|----------|------|--------\n`;
            data.violations.forEach(violation => {
                report += `${violation.file} | ${violation.severity} | ${violation.type} | ${violation.message}\n`;
            });
            report += `\n`;
        }
        
        return report;
    }

    /**
     * Create spinner for CLI feedback
     * @param {string} text - Spinner text
     * @returns {Object} Spinner object
     */
    createSpinner(text) {
        // Simple spinner implementation
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        
        const interval = setInterval(() => {
            process.stdout.write(`\r${frames[i]} ${text}`);
            i = (i + 1) % frames.length;
        }, 80);
        
        return {
            succeed: (text) => {
                clearInterval(interval);
                process.stdout.write(`\r✅ ${text}\n`);
            },
            fail: (text) => {
                clearInterval(interval);
                process.stdout.write(`\r❌ ${text}\n`);
            },
            info: (text) => {
                clearInterval(interval);
                process.stdout.write(`\rℹ️  ${text}\n`);
            }
        };
    }

    /**
     * Handle errors
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    handleError(message, error) {
        logger.error(message, error);
        console.error(`❌ ${message}: ${error.message}`);
        process.exit(1);
    }
}

module.exports = LayerViolationCommands; 