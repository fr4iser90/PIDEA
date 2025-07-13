#!/usr/bin/env node

require('module-alias/register');

/**
 * Categories System Integration Validation
 * Validates that the system works correctly with Categories-only patterns
 */

const fs = require('fs');
const path = require('path');

class CategoriesIntegrationValidator {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async validateAll() {
        console.log('🔍 Validating Categories System Integration...\n');

        await this.validateImports();
        await this.validateServices();
        await this.validateControllers();
        await this.validateRegistries();
        await this.validateNoUnifiedReferences();

        this.printResults();
    }

    async validateImports() {
        console.log('📦 Validating imports...');

        try {
            // Test basic imports using aliases
            const StepRegistry = require('@steps/StepRegistry');
            const FrameworkRegistry = require('@frameworks/FrameworkRegistry');
            const TaskService = require('@services/TaskService');
            const WorkflowOrchestrationService = require('@services/WorkflowOrchestrationService');

            console.log('  ✅ All core imports successful');
            this.results.passed++;
        } catch (error) {
            console.log(`  ❌ Import validation failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`Import validation: ${error.message}`);
        }
    }

    async validateServices() {
        console.log('🔧 Validating services...');

        try {
            // Test service instantiation
            const TaskService = require('@services/TaskService');
            const taskService = new TaskService();

            // Check for Categories system dependencies
            if (taskService.Categories) {
                throw new Error('TaskService still has Categories dependency');
            }

            if (!taskService.stepRegistry) {
                throw new Error('TaskService missing stepRegistry');
            }

            if (!taskService.frameworkRegistry) {
                throw new Error('TaskService missing frameworkRegistry');
            }

            console.log('  ✅ TaskService validation passed');
            this.results.passed++;

            // Test WorkflowOrchestrationService
            const WorkflowOrchestrationService = require('@services/WorkflowOrchestrationService');
            const workflowService = new WorkflowOrchestrationService();

            if (workflowService.Categories) {
                throw new Error('WorkflowOrchestrationService still has Categories dependency');
            }

            console.log('  ✅ WorkflowOrchestrationService validation passed');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Service validation failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`Service validation: ${error.message}`);
        }
    }

    async validateControllers() {
        console.log('🎮 Validating controllers...');

        try {
            // Test controller imports
            const AutoModeController = require('@api/AutoModeController');
            const TaskController = require('@api/TaskController');

            // Check for Categories system references in controller files
            const autoModeContent = fs.readFileSync(require.resolve('@api/AutoModeController'), 'utf8');
            const taskControllerContent = fs.readFileSync(require.resolve('@api/TaskController'), 'utf8');

            if (autoModeContent.includes('Categories system') || autoModeContent.includes('Categories')) {
                throw new Error('AutoModeController still contains Categories system references');
            }

            if (taskControllerContent.includes('Categories system') || taskControllerContent.includes('Categories')) {
                throw new Error('TaskController still contains Categories system references');
            }

            if (!autoModeContent.includes('Categories system') || !autoModeContent.includes("executionMethod: 'categories'")) {
                throw new Error('AutoModeController missing Categories system references');
            }

            if (!taskControllerContent.includes('Categories system') || !taskControllerContent.includes("executionMethod: 'categories'")) {
                throw new Error('TaskController missing Categories system references');
            }

            console.log('  ✅ Controller validation passed');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Controller validation failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`Controller validation: ${error.message}`);
        }
    }

    async validateRegistries() {
        console.log('📋 Validating registries...');

        try {
            const StepRegistry = require('@steps/StepRegistry');
            const FrameworkRegistry = require('@frameworks/FrameworkRegistry');

            const stepRegistry = new StepRegistry();
            const frameworkRegistry = new FrameworkRegistry();

            // Test registry functionality
            await stepRegistry.loadStepsFromCategories();
            const steps = stepRegistry.getAllSteps();
            
            if (steps.length === 0) {
                throw new Error('StepRegistry has no steps loaded');
            }

            const frameworks = frameworkRegistry.getAllFrameworks();
            if (!Array.isArray(frameworks)) {
                throw new Error('FrameworkRegistry getAllFrameworks() should return array');
            }

            console.log(`  ✅ StepRegistry has ${steps.length} steps loaded`);
            console.log(`  ✅ FrameworkRegistry has ${frameworks.length} frameworks`);
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Registry validation failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`Registry validation: ${error.message}`);
        }
    }

    async validateNoUnifiedReferences() {
        console.log('🚫 Validating no Categories system references...');

        try {
            const filesToCheck = [
                path.resolve(__dirname, '../../backend/Application.js'),
                require.resolve('@infrastructure/di/ServiceRegistry'),
                require.resolve('@api/AutoModeController'),
                require.resolve('@api/TaskController')
            ];

            for (const file of filesToCheck) {
                const content = fs.readFileSync(file, 'utf8');
                
                // Check for Categories system service registrations
                if (content.includes('CategoriesService') || content.includes('CategoriesService')) {
                    throw new Error(`${file} still contains Categories system service references`);
                }

                // Check for Categories system imports
                if (content.includes('require.*Categories') || content.includes('import.*Categories')) {
                    throw new Error(`${file} still contains Categories system imports`);
                }
            }

            console.log('  ✅ No Categories system references found');
            this.results.passed++;

        } catch (error) {
            console.log(`  ❌ Categories system reference validation failed: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`Categories system reference validation: ${error.message}`);
        }
    }

    printResults() {
        console.log('\n📊 Validation Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        if (this.results.failed === 0) {
            console.log('\n🎉 All validations passed! Categories system integration is complete.');
        } else {
            console.log('\n⚠️  Some validations failed. Please review the errors above.');
        }
    }
}

// Run validation
async function main() {
    const validator = new CategoriesIntegrationValidator();
    await validator.validateAll();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = CategoriesIntegrationValidator; 