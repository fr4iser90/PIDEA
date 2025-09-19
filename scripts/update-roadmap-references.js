/**
 * Roadmap Reference Update Script
 * Updates all hardcoded path references to use dynamic path resolution
 * Created: 2025-09-19T19:22:57.000Z
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('../backend/infrastructure/logging/Logger');

class RoadmapReferenceUpdater {
  constructor() {
    this.logger = new Logger('RoadmapReferenceUpdater');
    this.filesToUpdate = [
      'content-library/prompts/task-management/task-analyze.md',
      'content-library/prompts/task-management/task-execute.md',
      'content-library/prompts/task-management/task-review.md',
      'content-library/prompts/task-management_nodb/task-review.md',
      'backend/domain/services/task/TaskService.js',
      'backend/domain/steps/categories/generate/task_prompt_generation_step.js',
      'backend/domain/steps/categories/analysis/todo.md',
      'backend/domain/steps/categories/analysis/security/ZapSecurityStep.js',
      'backend/domain/steps/categories/analysis/security/TrivySecurityStep.js',
      'backend/domain/steps/categories/analysis/security/SnykSecurityStep.js',
      'backend/domain/steps/categories/analysis/security/SemgrepSecurityStep.js',
      'backend/domain/steps/categories/analysis/security/SecretScanningStep.js',
      'backend/domain/steps/categories/analysis/security/ComplianceSecurityStep.js',
      'backend/domain/steps/categories/analysis/performance/NetworkAnalysisStep.js',
      'backend/domain/steps/categories/analysis/performance/MemoryAnalysisStep.js',
      'backend/domain/steps/categories/analysis/performance/DatabaseAnalysisStep.js',
      'backend/domain/steps/categories/analysis/performance/CpuAnalysisStep.js',
      'backend/domain/steps/categories/analysis/architecture/StructureAnalysisStep.js',
      'backend/domain/steps/categories/analysis/architecture/PatternAnalysisStep.js',
      'backend/domain/steps/categories/analysis/architecture/LayerAnalysisStep.js',
      'backend/domain/steps/categories/analysis/architecture/CouplingAnalysisStep.js',
      'scripts/task-organizer.js',
      'scripts/task-category-migration.js',
      'backend/framework/workflows/task-workflows.json',
      'backend/framework/workflows/task-creation-workflows.json'
    ];
    
    this.hardcodedPatterns = [
      {
        pattern: /docs\/09_roadmap\/tasks\//g,
        replacement: '{{taskDocumentationPath}}',
        description: 'Hardcoded roadmap tasks path'
      },
      {
        pattern: /content-library\/prompts\/task-management\/task-([a-z-]+)\.md/g,
        replacement: '{{promptPath("task-$1")}}',
        description: 'Hardcoded prompt paths'
      },
      {
        pattern: /backend\/framework\/workflows\/([a-z-]+)-workflows\.json/g,
        replacement: '{{workflowPath("$1")}}',
        description: 'Hardcoded workflow paths'
      }
    ];
    
    this.processedFiles = 0;
    this.failedFiles = 0;
    this.totalFiles = 0;
  }

  /**
   * Main update method
   */
  async updateAllReferences() {
    try {
      this.logger.info('🔄 Starting roadmap reference updates...');
      
      this.totalFiles = this.filesToUpdate.length;
      this.logger.info(`📁 Found ${this.totalFiles} files to update`);

      // Process each file
      for (const filePath of this.filesToUpdate) {
        await this.updateFileReferences(filePath);
      }

      // Generate update report
      await this.generateUpdateReport();

      this.logger.info(`✅ Reference updates completed: ${this.processedFiles} processed, ${this.failedFiles} failed`);
      
    } catch (error) {
      this.logger.error('❌ Reference updates failed:', error);
      throw error;
    }
  }

  /**
   * Update references in a single file
   */
  async updateFileReferences(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch (error) {
        this.logger.warn(`⚠️ File not found: ${filePath}`);
        return;
      }
      
      this.logger.info(`📄 Processing: ${filePath}`);
      
      // Read file content
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Create backup
      const backupPath = `${fullPath}.backup`;
      await fs.writeFile(backupPath, content);
      
      // Update content
      const updatedContent = this.updateFileContent(content, filePath);
      
      // Write updated content
      await fs.writeFile(fullPath, updatedContent);
      
      // Remove backup after successful update
      await fs.unlink(backupPath);
      
      this.processedFiles++;
      this.logger.info(`✅ Updated: ${filePath}`);
      
    } catch (error) {
      this.failedFiles++;
      this.logger.error(`❌ Failed to update ${filePath}:`, error);
    }
  }

  /**
   * Update file content with dynamic path resolution
   */
  updateFileContent(content, filePath) {
    let updatedContent = content;
    
    // Apply pattern replacements
    for (const pattern of this.hardcodedPatterns) {
      const matches = updatedContent.match(pattern.pattern);
      if (matches) {
        this.logger.info(`🔍 Found ${pattern.description} in ${filePath}: ${matches.length} matches`);
        updatedContent = updatedContent.replace(pattern.pattern, pattern.replacement);
      }
    }
    
    // Add dynamic path resolution functions if needed
    if (this.needsDynamicPathResolution(filePath)) {
      updatedContent = this.addDynamicPathResolution(updatedContent, filePath);
    }
    
    return updatedContent;
  }

  /**
   * Check if file needs dynamic path resolution functions
   */
  needsDynamicPathResolution(filePath) {
    const needsResolution = [
      'TaskService.js',
      'task_prompt_generation_step.js',
      'task-organizer.js',
      'task-category-migration.js'
    ];
    
    return needsResolution.some(file => filePath.includes(file));
  }

  /**
   * Add dynamic path resolution functions
   */
  addDynamicPathResolution(content, filePath) {
    const dynamicPathFunctions = `
// Dynamic path resolution functions
function getTaskDocumentationPath(task) {
  const { status, priority, category, completedAt } = task;
  
  if (status === 'completed') {
    const quarter = getCompletionQuarter(completedAt);
    return \`docs/09_roadmap/completed/\${quarter}/\${category}/\`;
  } else if (status === 'in_progress') {
    return \`docs/09_roadmap/in-progress/\${category}/\`;
  } else if (status === 'pending') {
    return \`docs/09_roadmap/pending/\${priority}/\${category}/\`;
  } else if (status === 'blocked') {
    return \`docs/09_roadmap/blocked/\${category}/\`;
  } else if (status === 'cancelled') {
    return \`docs/09_roadmap/cancelled/\${category}/\`;
  }
  
  return \`docs/09_roadmap/pending/\${priority}/\${category}/\`;
}

function getCompletionQuarter(completedAt) {
  if (!completedAt) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    if (month <= 3) return \`\${year}-q1\`;
    if (month <= 6) return \`\${year}-q2\`;
    if (month <= 9) return \`\${year}-q3\`;
    return \`\${year}-q4\`;
  }
  
  const date = new Date(completedAt);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month <= 3) return \`\${year}-q1\`;
  if (month <= 6) return \`\${year}-q2\`;
  if (month <= 9) return \`\${year}-q3\`;
  return \`\${year}-q4\`;
}

function getPromptPath(promptType) {
  const promptPaths = {
    'task-create': 'content-library/prompts/task-management/task-create.md',
    'task-execute': 'content-library/prompts/task-management/task-execute.md',
    'task-analyze': 'content-library/prompts/task-management/task-analyze.md',
    'task-review': 'content-library/prompts/task-management/task-review.md'
  };
  
  return promptPaths[promptType] || promptPaths['task-create'];
}

function getWorkflowPath(workflowType) {
  return \`backend/framework/workflows/\${workflowType}-workflows.json\`;
}
`;

    // Add functions at the beginning of the file
    if (content.includes('// Dynamic path resolution functions')) {
      return content; // Already has the functions
    }
    
    return dynamicPathFunctions + '\n' + content;
  }

  /**
   * Update prompt templates
   */
  async updatePromptTemplates() {
    try {
      this.logger.info('📝 Updating prompt templates...');
      
      const promptFiles = [
        'content-library/prompts/task-management/task-analyze.md',
        'content-library/prompts/task-management/task-execute.md',
        'content-library/prompts/task-management/task-review.md'
      ];
      
      for (const promptFile of promptFiles) {
        await this.updatePromptTemplate(promptFile);
      }
      
      this.logger.info('✅ Prompt templates updated');
      
    } catch (error) {
      this.logger.error('Error updating prompt templates:', error);
      throw error;
    }
  }

  /**
   * Update individual prompt template
   */
  async updatePromptTemplate(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Replace hardcoded paths with template variables
      let updatedContent = content
        .replace(/docs\/09_roadmap\/tasks\//g, '{{taskDocumentationPath}}')
        .replace(/content-library\/prompts\/task-management\/task-([a-z-]+)\.md/g, '{{promptPath("task-$1")}}');
      
      // Add template variable documentation
      const templateDoc = `
<!-- Template Variables:
- {{taskDocumentationPath}}: Dynamic path to task documentation based on status
- {{promptPath(type)}}: Dynamic path to prompt templates
- {{workflowPath(type)}}: Dynamic path to workflow files
-->
`;
      
      if (!updatedContent.includes('Template Variables:')) {
        updatedContent = templateDoc + updatedContent;
      }
      
      await fs.writeFile(fullPath, updatedContent);
      this.logger.info(`✅ Updated prompt template: ${filePath}`);
      
    } catch (error) {
      this.logger.error(`Error updating prompt template ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Update service files
   */
  async updateServiceFiles() {
    try {
      this.logger.info('🔧 Updating service files...');
      
      const serviceFiles = [
        'backend/domain/services/task/TaskService.js',
        'backend/domain/steps/categories/generate/task_prompt_generation_step.js'
      ];
      
      for (const serviceFile of serviceFiles) {
        await this.updateServiceFile(serviceFile);
      }
      
      this.logger.info('✅ Service files updated');
      
    } catch (error) {
      this.logger.error('Error updating service files:', error);
      throw error;
    }
  }

  /**
   * Update individual service file
   */
  async updateServiceFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Update hardcoded paths
      let updatedContent = content
        .replace(/docs\/09_roadmap\/tasks\//g, 'getTaskDocumentationPath(task)')
        .replace(/content-library\/prompts\/task-management\/task-([a-z-]+)\.md/g, 'getPromptPath("task-$1")')
        .replace(/backend\/framework\/workflows\/([a-z-]+)-workflows\.json/g, 'getWorkflowPath("$1")');
      
      await fs.writeFile(fullPath, updatedContent);
      this.logger.info(`✅ Updated service file: ${filePath}`);
      
    } catch (error) {
      this.logger.error(`Error updating service file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Generate update report
   */
  async generateUpdateReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        totalFiles: this.totalFiles,
        processedFiles: this.processedFiles,
        failedFiles: this.failedFiles,
        successRate: this.totalFiles > 0 ? (this.processedFiles / this.totalFiles * 100).toFixed(2) : 0,
        patternsUpdated: this.hardcodedPatterns.length
      };
      
      const reportPath = path.join(process.cwd(), 'logs', 'reference-update-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      this.logger.info(`📊 Update report saved to: ${reportPath}`);
      
    } catch (error) {
      this.logger.error('Error generating update report:', error);
    }
  }
}

// CLI execution
if (require.main === module) {
  const updater = new RoadmapReferenceUpdater();
  
  const command = process.argv[2] || 'all';
  
  switch (command) {
    case 'all':
      updater.updateAllReferences()
        .then(() => {
          console.log('✅ All references updated');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Reference update failed:', error);
          process.exit(1);
        });
      break;
      
    case 'prompts':
      updater.updatePromptTemplates()
        .then(() => {
          console.log('✅ Prompt templates updated');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Prompt update failed:', error);
          process.exit(1);
        });
      break;
      
    case 'services':
      updater.updateServiceFiles()
        .then(() => {
          console.log('✅ Service files updated');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Service update failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node update-roadmap-references.js [all|prompts|services]');
      process.exit(1);
  }
}

module.exports = RoadmapReferenceUpdater;
