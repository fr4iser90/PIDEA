/**
 * Complete Unified System Cleanup Script
 * Removes ALL Categories system references from the entire codebase
 */

const fs = require('fs-extra');
const path = require('path');

class CompleteUnifiedCleanup {
    constructor() {
        this.rootDir = path.join(__dirname, '../..');
        this.removedReferences = [];
        this.errors = [];
    }

    async cleanupAllUnifiedReferences() {
        console.log('🧹 Starting complete unified system cleanup...');
        
        try {
            // 1. Remove Categories system files
            await this.removeUnifiedFiles();
            
            // 2. Clean up service files
            await this.cleanupServiceFiles();
            
            // 3. Clean up controller files
            await this.cleanupControllerFiles();
            
            // 4. Clean up migration scripts
            await this.cleanupMigrationScripts();
            
            // 5. Clean up task organization scripts
            await this.cleanupTaskScripts();
            
            // 6. Clean up IDE scripts
            await this.cleanupIDEScripts();
            
            // 7. Clean up documentation
            await this.cleanupDocumentation();
            // Clean up backup and rollback scripts
            await this.cleanupBackupAndRollbackScripts();
            
            // 8. Clean up package.json files
            await this.cleanupPackageFiles();
            
            console.log('✅ Complete unified system cleanup finished!');
            console.log(`📊 Removed ${this.removedReferences.length} references`);
            
            if (this.errors.length > 0) {
                console.log(`⚠️  ${this.errors.length} errors encountered`);
                this.errors.forEach(error => console.log(`   - ${error}`));
            }
            
        } catch (error) {
            console.error('❌ Complete unified cleanup failed:', error.message);
            throw error;
        }
    }

    async removeUnifiedFiles() {
        console.log('🗑️  Removing Categories system files...');
        
        const filesToRemove = [
            'backend/domain/services/CategoriesService.js',
            'backend/application/handlers/workflow/CategoriesHandler.js',
            'backend/application/handlers/CategoriesRegistry.js',
            'backend/application/handlers/workflow/index.js',
            'backend/tests/unit/domain/workflows/CategoriesFoundation.test.js',
            'backend/tests/unit/workflows/handlers/CategoriesHandler.test.js',
            'backend/examples/CategoriesFoundationExample.js',
            'backend/docs/CategoriesFoundation1B.md',
            'scripts/migration/start-unified-workflow-migration.js',
            'scripts/migration/complete-unified-workflow-migration.js'
        ];

        for (const file of filesToRemove) {
            const filePath = path.join(this.rootDir, file);
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                console.log(`   ✅ Removed: ${file}`);
                this.removedReferences.push(file);
            }
        }
    }

    async cleanupServiceFiles() {
        console.log('🔧 Cleaning up service files...');
        
        const serviceFiles = [
            'backend/domain/services/TaskService.js',
            'backend/domain/services/WorkflowOrchestrationService.js'
        ];

        for (const file of serviceFiles) {
            await this.cleanupFile(file, [
                // Remove unified handler method calls
                { pattern: /\/\/ this\.Categories\. - REMOVEDhandle\(request, response, options\);/g, replacement: '' },
                { pattern: /\/\/ Execute using unified handler/g, replacement: '// Execute using Categories system' },
                { pattern: /\/\/ Unified handler removed - using Categories system instead/g, replacement: '// Using Categories system' },
                
                // Remove unified handler method definitions
                { pattern: /async executeTaskWithCategories[\s\S]*?}/g, replacement: '' },
                { pattern: /async executeWorkflowWithCategories[\s\S]*?}/g, replacement: '' },
                { pattern: /async getCategoriesStatistics[\s\S]*?}/g, replacement: '' },
                { pattern: /getCategoriesInformation[\s\S]*?}/g, replacement: '' },
                { pattern: /registerCategories[\s\S]*?}/g, replacement: '' },
                { pattern: /getCategoriesByType[\s\S]*?}/g, replacement: '' },
                { pattern: /async initializeCategories[\s\S]*?}/g, replacement: '' },
                { pattern: /async cleanupCategories[\s\S]*?}/g, replacement: '' },
                
                // Remove unified handler comments
                { pattern: /\* Execute a task using Categories system system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Execute a task using unified handler system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Get unified handler statistics[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Get unified handler information[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Register handler with unified handler system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Get handler by type from unified handler system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Initialize unified handler system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Cleanup unified handler system[\s\S]*?\*/g, replacement: '' },
                
                // Remove unified handler logging
                { pattern: /console\.log\('🔍 \[TaskService\] executeTaskWithCategories[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.log\('✅ \[TaskService\] Unified handler task execution completed[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.error\('❌ \[TaskService\] Unified handler task execution failed[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.error\('❌ \[TaskService\] Failed to get unified handler statistics[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.error\('❌ \[TaskService\] Failed to get unified handler information[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.log\('✅ \[TaskService\] Unified handler registration skipped[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.error\('❌ \[TaskService\] Failed to register unified handler[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.error\('❌ \[TaskService\] Failed to get unified handler by type[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.log\('✅ \[TaskService\] Unified handler system initialization skipped[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.error\('❌ \[TaskService\] Failed to initialize unified handler system[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.log\('✅ \[TaskService\] Unified handler system cleanup skipped[\s\S]*?\);/g, replacement: '' },
                { pattern: /console\.error\('❌ \[TaskService\] Failed to cleanup unified handler system[\s\S]*?\);/g, replacement: '' },
                
                // Remove unified handler logging from WorkflowOrchestrationService
                { pattern: /this\.logger\.info\('WorkflowOrchestrationService: Starting workflow execution with unified handler[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.info\('WorkflowOrchestrationService: Unified handler workflow execution completed[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.error\('WorkflowOrchestrationService: Unified handler workflow execution failed[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.error\('WorkflowOrchestrationService: Failed to get unified handler statistics[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.error\('WorkflowOrchestrationService: Failed to get unified handler information[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.info\('WorkflowOrchestrationService: Unified handler registration skipped[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.error\('WorkflowOrchestrationService: Failed to register unified handler[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.error\('WorkflowOrchestrationService: Failed to get unified handler by type[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.info\('WorkflowOrchestrationService: Unified handler system initialization skipped[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.error\('WorkflowOrchestrationService: Failed to initialize unified handler system[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.info\('WorkflowOrchestrationService: Unified handler system cleanup skipped[\s\S]*?\);/g, replacement: '' },
                { pattern: /this\.logger\.error\('WorkflowOrchestrationService: Failed to cleanup unified handler system[\s\S]*?\);/g, replacement: '' },
                
                // Remove unified handler comments from WorkflowOrchestrationService
                { pattern: /\* Enhanced with GitWorkflowManager integration, Core Execution Engine, and Unified Handler System/g, replacement: '* Enhanced with GitWorkflowManager integration and Core Execution Engine' },
                { pattern: /\* Execute workflow using unified handler system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Get unified handler statistics[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Get unified handler information[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Register handler with unified handler system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Get handler by type from unified handler system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Initialize unified handler system[\s\S]*?\*/g, replacement: '' },
                { pattern: /\* Cleanup unified handler system[\s\S]*?\*/g, replacement: '' }
            ]);
        }
    }

    async cleanupControllerFiles() {
        console.log('🎮 Cleaning up controller files...');
        
        const controllerFiles = [
            'backend/presentation/api/AutoModeController.js',
            'backend/presentation/api/TaskController.js'
        ];

        for (const file of controllerFiles) {
            await this.cleanupFile(file, [
                { pattern: /Categories system/g, replacement: 'Categories system' },
                { pattern: /Categories/g, replacement: 'Categories' },
                { pattern: /unified handler/g, replacement: 'Categories system' },
                { pattern: /Categories/g, replacement: 'Categories' }
            ]);
        }
    }

    async cleanupMigrationScripts() {
        console.log('📦 Cleaning up migration scripts...');
        
        const migrationFiles = [
            'scripts/migration/start-unified-workflow-migration.js',
            'scripts/migration/complete-unified-workflow-migration.js'
        ];

        for (const file of migrationFiles) {
            const filePath = path.join(this.rootDir, file);
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                console.log(`   ✅ Removed: ${file}`);
                this.removedReferences.push(file);
            }
        }
    }

    async cleanupTaskScripts() {
        console.log('📋 Cleaning up task organization scripts...');
        
        const taskScripts = [
            'scripts/task-category-migration.js',
            'scripts/task-organizer.js'
        ];

        for (const file of taskScripts) {
            await this.cleanupFile(file, [
                { pattern: /'unified-workflow': 'Categories system system'/g, replacement: '' },
                { pattern: /'unified-workflow': \['unified', 'workflow', 'unified-workflow'\]/g, replacement: '' }
            ]);
        }
    }

    async cleanupIDEScripts() {
        console.log('💻 Cleaning up IDE scripts...');
        
        const ideScripts = [
            'scripts/ide/auto-dom-collector.js'
        ];

        for (const file of ideScripts) {
            await this.cleanupFile(file, [
                { pattern: /\* Unified IDE DOM Collector/g, replacement: '* IDE DOM Collector' },
                { pattern: /class UnifiedDOMCollector/g, replacement: 'class DOMCollector' },
                { pattern: /console\.log\('\[DOMCollector\] Starting unified DOM collection/g, replacement: "console.log('[DOMCollector] Starting DOM collection" },
                { pattern: /const collector = new UnifiedDOMCollector\(\);/g, replacement: 'const collector = new DOMCollector();' },
                { pattern: /module\.exports = UnifiedDOMCollector;/g, replacement: 'module.exports = DOMCollector;' }
            ]);
        }
    }

    async cleanupDocumentation() {
        console.log('📚 Cleaning up documentation...');
        // Remove Categories system documentation folder
        const docsFolder = path.join(this.rootDir, 'docs/09_roadmap/features/backend/unified-workflow-system');
        if (await fs.pathExists(docsFolder)) {
            await fs.remove(docsFolder);
            console.log('   ✅ Removed: docs/09_roadmap/features/backend/unified-workflow-system/');
            this.removedReferences.push('docs/09_roadmap/features/backend/unified-workflow-system/');
        }
        // Clean up all markdown files in docs/09_roadmap/features/backend/unified-system-cleanup/
        const cleanupDocsDir = path.join(this.rootDir, 'docs/09_roadmap/features/backend/unified-system-cleanup');
        if (await fs.pathExists(cleanupDocsDir)) {
            const files = await fs.readdir(cleanupDocsDir);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    await this.cleanupFile(
                        path.join('docs/09_roadmap/features/backend/unified-system-cleanup', file),
                        [
                            { pattern: /Categories system/gi, replacement: 'Categories system' },
                            { pattern: /Categories/gi, replacement: 'Categories' },
                            { pattern: /Categories/gi, replacement: 'Categories' }
                        ]
                    );
                }
            }
        }
    }

    async cleanupBackupAndRollbackScripts() {
        console.log('🗄️  Cleaning up backup and rollback scripts...');
        const cleanupDir = path.join(this.rootDir, 'scripts/cleanup');
        if (await fs.pathExists(cleanupDir)) {
            const files = await fs.readdir(cleanupDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    await this.cleanupFile(
                        path.join('scripts/cleanup', file),
                        [
                            { pattern: /Categories system/gi, replacement: 'Categories system' },
                            { pattern: /Categories/gi, replacement: 'Categories' },
                            { pattern: /Categories/gi, replacement: 'Categories' }
                        ]
                    );
                }
            }
        }
    }

    async cleanupPackageFiles() {
        console.log('📦 Cleaning up package.json files...');
        
        const packageFiles = [
            'package.json',
            'backend/package.json'
        ];

        for (const file of packageFiles) {
            const filePath = path.join(this.rootDir, file);
            if (await fs.pathExists(filePath)) {
                const content = await fs.readFile(filePath, 'utf8');
                const packageJson = JSON.parse(content);
                
                // Remove any Categories system dependencies
                if (packageJson.dependencies) {
                    Object.keys(packageJson.dependencies).forEach(dep => {
                        if (dep.includes('unified') || dep.includes('Unified')) {
                            delete packageJson.dependencies[dep];
                            console.log(`   ✅ Removed dependency: ${dep}`);
                            this.removedReferences.push(`dependency: ${dep}`);
                        }
                    });
                }
                
                if (packageJson.devDependencies) {
                    Object.keys(packageJson.devDependencies).forEach(dep => {
                        if (dep.includes('unified') || dep.includes('Unified')) {
                            delete packageJson.devDependencies[dep];
                            console.log(`   ✅ Removed devDependency: ${dep}`);
                            this.removedReferences.push(`devDependency: ${dep}`);
                        }
                    });
                }
                
                await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2));
            }
        }
    }

    async cleanupFile(filePath, replacements) {
        const fullPath = path.join(this.rootDir, filePath);
        
        if (!await fs.pathExists(fullPath)) {
            return;
        }

        try {
            let content = await fs.readFile(fullPath, 'utf8');
            let originalContent = content;
            
            for (const replacement of replacements) {
                content = content.replace(replacement.pattern, replacement.replacement);
            }
            
            if (content !== originalContent) {
                await fs.writeFile(fullPath, content);
                console.log(`   ✅ Cleaned: ${filePath}`);
                this.removedReferences.push(filePath);
            }
        } catch (error) {
            this.errors.push(`Failed to clean ${filePath}: ${error.message}`);
        }
    }
}

// CLI interface
async function main() {
    const cleanup = new CompleteUnifiedCleanup();
    
    if (process.argv.includes('--dry-run')) {
        console.log('🔍 Dry run mode - no files will be modified');
        return;
    }
    
    await cleanup.cleanupAllUnifiedReferences();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = CompleteUnifiedCleanup; 