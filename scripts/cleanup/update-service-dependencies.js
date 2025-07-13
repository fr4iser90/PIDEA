/**
 * Service Dependency Updater
 * Updates service dependencies to remove Categories system system and use Categories only
 * Part of Phase 2: Core System Removal
 */

const fs = require('fs-extra');
const path = require('path');

class ServiceDependencyUpdater {
  constructor() {
    this.filesToUpdate = [
      'backend/domain/services/WorkflowOrchestrationService.js',
      'backend/domain/services/TaskService.js',
      'backend/infrastructure/di/ServiceRegistry.js'
    ];
  }

  async updateServiceDependencies() {
    console.log('🔧 Starting service dependency updates...');
    
    const updates = [];
    const errors = [];

    for (const file of this.filesToUpdate) {
      try {
        const filePath = path.join(__dirname, '../../', file);
        const content = await fs.readFile(filePath, 'utf8');
        
        const updatedContent = this.updateFileContent(content, file);
        
        if (updatedContent !== content) {
          await fs.writeFile(filePath, updatedContent);
          updates.push(file);
          console.log(`✅ Updated: ${file}`);
        } else {
          console.log(`ℹ️  No changes needed: ${file}`);
        }
      } catch (error) {
        errors.push({ file, error: error.message });
        console.error(`❌ Failed to update ${file}:`, error.message);
      }
    }

    console.log(`\n📊 Update Summary:`);
    console.log(`   Files updated: ${updates.length}`);
    console.log(`   Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach(({ file, error }) => {
        console.log(`   - ${file}: ${error}`);
      });
    }

    return { updates, errors };
  }

  updateFileContent(content, filename) {
    let updatedContent = content;

    // Remove Categories system imports
    updatedContent = updatedContent.replace(
      /const\s*{\s*CategoriesHandler[^}]*}\s*=\s*require\([^)]+\);/g,
      ''
    );

    updatedContent = updatedContent.replace(
      /const\s*CategoriesHandler\s*=\s*require\([^)]+\);/g,
      ''
    );

    updatedContent = updatedContent.replace(
      /const\s*CategoriesService\s*=\s*require\([^)]+\);/g,
      ''
    );

    // Remove Categories system service registrations from ServiceRegistry
    if (filename.includes('ServiceRegistry')) {
      updatedContent = this.updateServiceRegistry(updatedContent);
    }

    // Update WorkflowOrchestrationService
    if (filename.includes('WorkflowOrchestrationService')) {
      updatedContent = this.updateWorkflowOrchestrationService(updatedContent);
    }

    // Update TaskService
    if (filename.includes('TaskService')) {
      updatedContent = this.updateTaskService(updatedContent);
    }

    return updatedContent;
  }

  updateServiceRegistry(content) {
    // Remove Categories system service registration
    content = content.replace(
      /\/\/ Categories system Service[\s\S]*?this\.container\.register\('CategoriesService'[^}]+},?\s*{.*?}\);?\s*/gs,
      ''
    );

    // Remove Categories system service from registered services
    content = content.replace(
      /this\.registeredServices\.add\('CategoriesService'\);/g,
      ''
    );

    return content;
  }

  updateWorkflowOrchestrationService(content) {
    // Remove unified handler initialization
    content = content.replace(
      /\/\/ Initialize Categories system handler system[\s\S]*?this\.Categories\s*=\s*new\s*CategoriesHandler\([^)]+\);/g,
      ''
    );

    // Remove unified handler methods
    content = content.replace(
      /async\s+executeWorkflowWithCategories[\s\S]*?}/g,
      ''
    );

    // Remove unified handler references
    content = content.replace(
      /this\.Categories\./g,
      '// this.Categories. - REMOVED'
    );

    // Add Categories-based imports if not present
    if (!content.includes('StepRegistry')) {
      content = content.replace(
        /const\s*{\s*SequentialExecutionEngine\s*}\s*=\s*require\([^)]+\);/g,
        `const { SequentialExecutionEngine } = require('../workflows/execution');
const StepRegistry = require('../steps/StepRegistry');
const FrameworkRegistry = require('../frameworks/FrameworkRegistry');`
      );
    }

    // Add Categories-based initialization if not present
    if (!content.includes('this.stepRegistry')) {
      content = content.replace(
        /this\.executionEngine\s*=\s*new\s*SequentialExecutionEngine\([^)]+\);/g,
        `this.executionEngine = new SequentialExecutionEngine({
            logger: this.logger,
            enablePriority: true,
            enableRetry: true,
            enableResourceManagement: true,
            enableDependencyResolution: true,
            enablePriorityScheduling: true
        });

        // Initialize Categories-based registries
        this.stepRegistry = new StepRegistry();
        this.frameworkRegistry = new FrameworkRegistry();`
      );
    }

    return content;
  }

  updateTaskService(content) {
    // Remove unified handler initialization
    content = content.replace(
      /\/\/ Initialize Categories system handler system[\s\S]*?this\.Categories\s*=\s*new\s*CategoriesHandler\([^)]+\);/g,
      ''
    );

    // Remove unified handler methods
    content = content.replace(
      /async\s+executeTaskWithCategories[\s\S]*?}/g,
      ''
    );

    content = content.replace(
      /async\s+executeTaskWithCategories[\s\S]*?}/g,
      ''
    );

    // Remove unified handler references
    content = content.replace(
      /this\.Categories\./g,
      '// this.Categories. - REMOVED'
    );

    // Add Categories-based imports if not present
    if (!content.includes('StepRegistry')) {
      content = content.replace(
        /const\s*{\s*SequentialExecutionEngine\s*}\s*=\s*require\([^)]+\);/g,
        `const { SequentialExecutionEngine } = require('../workflows/execution');
const StepRegistry = require('../steps/StepRegistry');
const FrameworkRegistry = require('../frameworks/FrameworkRegistry');`
      );
    }

    // Add Categories-based initialization if not present
    if (!content.includes('this.stepRegistry')) {
      content = content.replace(
        /this\.executionEngine\s*=\s*new\s*SequentialExecutionEngine\([^)]+\);/g,
        `this.executionEngine = new SequentialExecutionEngine({
            logger: console,
            enablePriority: true,
            enableRetry: true,
            enableResourceManagement: true,
            enableDependencyResolution: true,
            enablePriorityScheduling: true
        });

        // Initialize Categories-based registries
        this.stepRegistry = new StepRegistry();
        this.frameworkRegistry = new FrameworkRegistry();`
      );
    }

    return content;
  }

  async validateUpdates() {
    console.log('\n🔍 Validating service updates...');
    
    const issues = [];
    
    for (const file of this.filesToUpdate) {
      const filePath = path.join(__dirname, '../../', file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for remaining Categories system references
      if (content.includes('CategoriesHandler') || 
          content.includes('CategoriesService') ||
          content.includes('CategoriesService')) {
        issues.push(`${file}: Still contains Categories system references`);
      }
    }

    if (issues.length === 0) {
      console.log('✅ All service dependencies successfully updated');
      return true;
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    }
  }
}

// CLI interface
async function main() {
  const updater = new ServiceDependencyUpdater();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'update':
        const result = await updater.updateServiceDependencies();
        const validation = await updater.validateUpdates();
        
        if (validation && result.errors.length === 0) {
          console.log('\n✅ Service dependency updates completed successfully');
          process.exit(0);
        } else {
          console.log('\n⚠️  Service dependency updates completed with issues');
          process.exit(1);
        }
        break;
        
      case 'validate':
        const isValid = await updater.validateUpdates();
        process.exit(isValid ? 0 : 1);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node update-service-dependencies.js update - Update service dependencies');
        console.log('  node update-service-dependencies.js validate - Validate updates');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ServiceDependencyUpdater; 