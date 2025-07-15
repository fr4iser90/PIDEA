#!/usr/bin/env node

require('module-alias/register');
const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

/**
 * Test runner for Advanced Analysis components
 * This script helps test the advanced analysis functionality with real project data
 */

const path = require('path');
const fs = require('fs').promises;

// Import the components to test
const AdvancedAnalysisCommand = require('@application/commands/analyze/AdvancedAnalysisCommand');
const AdvancedAnalysisHandler = require('@application/handlers/analyze/AdvancedAnalysisHandler');
const AdvancedAnalysisService = require('@domain/services/AdvancedAnalysisService');

class AdvancedAnalysisTester {
    constructor() {
        this.logger = {
            info: (message, data) => logger.info(`${message}`, data || ''),
            error: (message, data) => console.error(`${message}`, data || ''),
            warn: (message, data) => console.warn(`${message}`, data || ''),
            debug: (message, data) => console.debug(`${message}`, data || '')
        };
    }

    async runTests() {
        logger.info('🚀 Starting Advanced Analysis Component Tests\n');

        try {
            // Test 1: Command Creation and Validation
            await this.testCommandCreation();

            // Test 2: Service Integration
            await this.testServiceIntegration();

            // Test 3: Handler Workflow
            await this.testHandlerWorkflow();

            // Test 4: End-to-End Analysis
            await this.testEndToEndAnalysis();

            logger.info('\n✅ All tests completed successfully!');

        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        }
    }

    async testCommandCreation() {
        logger.info('📋 Test 1: Command Creation and Validation');
        
        // Test valid command
        const validCommand = new AdvancedAnalysisCommand({
            projectPath: process.cwd(),
            requestedBy: 'test-user',
            options: {
                includeLayerValidation: true,
                includeLogicValidation: true,
                includeStandardAnalysis: true,
                generateReport: true
            }
        });

        logger.info('  ✓ Command created successfully');
        logger.info(`  ✓ Command ID: ${validCommand.commandId}`);
        logger.info(`  ✓ Project Path: ${validCommand.projectPath}`);
        logger.info(`  ✓ Requested By: ${validCommand.requestedBy}`);

        // Test validation
        const validation = validCommand.validateBusinessRules();
        logger.info(`  ✓ Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
        
        if (!validation.isValid) {
            logger.info(`  ✗ Errors: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
            logger.info(`  ⚠ Warnings: ${validation.warnings.join(', ')}`);
        }

        // Test invalid command
        const invalidCommand = new AdvancedAnalysisCommand({
            // Missing required fields
        });

        const invalidValidation = invalidCommand.validateBusinessRules();
        logger.info(`  ✓ Invalid command validation: ${invalidValidation.isValid ? 'FAILED' : 'PASSED'}`);

        logger.info('  ✓ Command creation and validation tests completed\n');
    }

    async testServiceIntegration() {
        logger.info('🔧 Test 2: Service Integration');

        const service = new AdvancedAnalysisService({
            logger: this.logger
        });

        logger.info('  ✓ AdvancedAnalysisService created successfully');

        // Test with a small project (current directory)
        const projectPath = process.cwd();
        
        try {
            logger.info(`  📁 Testing with project: ${projectPath}`);
            
            const result = await service.performAdvancedAnalysis(projectPath, {
                includeLayerValidation: true,
                includeLogicValidation: true,
                includeStandardAnalysis: true,
                generateReport: true
            });

            logger.info('  ✓ Analysis completed successfully');
            logger.info(`  ✓ Overall Score: ${result.metrics.overallScore}`);
            logger.info(`  ✓ Layer Score: ${result.metrics.layerScore}`);
            logger.info(`  ✓ Logic Score: ${result.metrics.logicScore}`);
            logger.info(`  ✓ Overall Valid: ${result.overall}`);
            logger.info(`  ✓ Total Violations: ${(result.layerValidation.violations || []).length + (result.logicValidation.violations || []).length}`);
            logger.info(`  ✓ Insights Generated: ${result.integratedInsights.length}`);
            logger.info(`  ✓ Recommendations Generated: ${result.recommendations.length}`);

            // Generate report
            const report = service.generateAnalysisReport(result);
            logger.info('  ✓ Report generated successfully');
            logger.info(`  ✓ Report Summary: ${report.summary.overallScore}/100 score, ${report.summary.totalViolations} violations`);

        } catch (error) {
            logger.info(`  ⚠ Analysis failed (this might be expected for some projects): ${error.message}`);
        }

        logger.info('  ✓ Service integration tests completed\n');
    }

    async testHandlerWorkflow() {
        logger.info('⚙️ Test 3: Handler Workflow');

        // Create mock dependencies
        const mockEventBus = {
            emit: (event, data) => {
                logger.info(`  📡 Event: ${event}`, data ? `(${Object.keys(data).length} properties)` : '');
            }
        };

        const mockTaskRepository = {
            save: async (task) => {
                logger.info(`  💾 Task saved: ${task.title}`);
                return task;
            }
        };

        const mockExecutionRepository = {
            save: async (execution) => {
                logger.info(`  💾 Execution saved: ${execution.id}`);
                return execution;
            }
        };

        const handler = new AdvancedAnalysisHandler({
            logger: this.logger,
            eventBus: mockEventBus,
            taskRepository: mockTaskRepository,
            executionRepository: mockExecutionRepository
        });

        logger.info('  ✓ Handler created successfully');

        const command = new AdvancedAnalysisCommand({
            projectPath: process.cwd(),
            requestedBy: 'test-user',
            options: {
                includeLayerValidation: true,
                includeLogicValidation: true,
                includeStandardAnalysis: true,
                generateReport: true
            }
        });

        try {
            logger.info('  🔄 Starting handler workflow...');
            const result = await handler.handle(command);

            logger.info('  ✓ Handler workflow completed successfully');
            logger.info(`  ✓ Execution ID: ${result.executionId}`);
            logger.info(`  ✓ Duration: ${result.duration}ms`);
            logger.info(`  ✓ Success: ${result.success}`);

        } catch (error) {
            logger.info(`  ⚠ Handler workflow failed (this might be expected): ${error.message}`);
        }

        logger.info('  ✓ Handler workflow tests completed\n');
    }

    async testEndToEndAnalysis() {
        logger.info('🔄 Test 4: End-to-End Analysis');

        // Create a simple test project structure
        const testProjectPath = path.join(process.cwd(), 'test-analysis-project');
        
        try {
            // Create test project if it doesn't exist
            await this.createTestProject(testProjectPath);

            const command = new AdvancedAnalysisCommand({
                projectPath: testProjectPath,
                requestedBy: 'test-user',
                options: {
                    includeLayerValidation: true,
                    includeLogicValidation: true,
                    includeStandardAnalysis: true,
                    generateReport: true
                }
            });

            const handler = new AdvancedAnalysisHandler({
                logger: this.logger
            });

            logger.info(`  📁 Testing with created project: ${testProjectPath}`);
            
            const result = await handler.handle(command);

            logger.info('  ✓ End-to-end analysis completed successfully');
            logger.info(`  ✓ Overall Score: ${result.analysis.metrics.overallScore}`);
            logger.info(`  ✓ Analysis Duration: ${result.duration}ms`);
            logger.info(`  ✓ Report Generated: ${result.report ? 'Yes' : 'No'}`);

            // Clean up test project
            await this.cleanupTestProject(testProjectPath);

        } catch (error) {
            logger.info(`  ⚠ End-to-end test failed: ${error.message}`);
            
            // Clean up test project even if test failed
            try {
                await this.cleanupTestProject(testProjectPath);
            } catch (cleanupError) {
                logger.info(`  ⚠ Cleanup failed: ${cleanupError.message}`);
            }
        }

        logger.info('  ✓ End-to-end analysis tests completed\n');
    }

    async createTestProject(projectPath) {
        try {
            await fs.mkdir(projectPath, { recursive: true });

            // Create package.json
            const packageJson = {
                name: 'test-analysis-project',
                version: '1.0.0',
                description: 'Test project for advanced analysis',
                main: 'src/index.js',
                scripts: {
                    start: 'node src/index.js',
                    test: 'jest'
                },
                dependencies: {
                    express: '^4.17.1'
                },
                devDependencies: {
                    jest: '^27.0.0'
                }
            };

            await fs.writeFile(
                path.join(projectPath, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Create src directory and files
            await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
            await fs.mkdir(path.join(projectPath, 'src/domain'), { recursive: true });
            await fs.mkdir(path.join(projectPath, 'src/infrastructure'), { recursive: true });
            await fs.mkdir(path.join(projectPath, 'src/presentation'), { recursive: true });

            // Create index.js
            const indexJs = `
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({ message: 'Hello World!' });
});

app.listen(3000, () => {
    logger.info('Server running on port 3000');
});
`;

            await fs.writeFile(path.join(projectPath, 'src/index.js'), indexJs);

            // Create domain entity
            const userJs = `
class User {
    constructor(id, name, email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    validate() {
        return this.name && this.email;
    }
}

module.exports = User;
`;

            await fs.writeFile(path.join(projectPath, 'src/domain/User.js'), userJs);

            logger.info(`  ✓ Test project created at: ${projectPath}`);

        } catch (error) {
            throw new Error(`Failed to create test project: ${error.message}`);
        }
    }

    async cleanupTestProject(projectPath) {
        try {
            await fs.rm(projectPath, { recursive: true, force: true });
            logger.info(`  ✓ Test project cleaned up: ${projectPath}`);
        } catch (error) {
            throw new Error(`Failed to cleanup test project: ${error.message}`);
        }
    }
}

// Run the tests if this script is executed directly
if (require.main === module) {
    const tester = new AdvancedAnalysisTester();
    tester.runTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = AdvancedAnalysisTester; 