const fs = require('fs').promises;
const path = require('path');
const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('file_snapshot_step');

// Step configuration
const config = {
  name: 'file_snapshot_step',
  type: 'file',
  category: 'file',
  description: 'Creates snapshot of files before workflow starts',
  version: '1.0.0',
  dependencies: [],
  settings: {
    includeTimeout: false,
    includeRetry: false
  },
  validation: {
    required: ['workspacePath'],
    optional: ['snapshotType']
  }
};

/**
 * File Snapshot Step - Creates snapshot of files before workflow starts
 */
class FileSnapshotStep {
  constructor() {
    this.name = 'file_snapshot_step';
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = FileSnapshotStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { workspacePath, snapshotType = 'before_workflow' } = context;
      
      if (!workspacePath) {
        throw new Error('workspacePath is required');
      }

      logger.info(`📸 Creating ${snapshotType} file snapshot for: ${workspacePath}`);

      // Create snapshot of all .md files
      const snapshot = await this.createFileSnapshot(workspacePath);
      
      logger.info(`📸 Snapshot created with ${snapshot.size} files`);

      return {
        success: true,
        data: {
          snapshot,
          snapshotType,
          workspacePath,
          createdAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ Error creating file snapshot:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create snapshot of all .md files in workspace
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Set<string>>} Set of file paths
   */
  async createFileSnapshot(workspacePath) {
    const fileSet = new Set();
    
    const searchDirs = [
      workspacePath,
      path.join(workspacePath, 'docs'),
      path.join(workspacePath, 'tasks'),
      path.join(workspacePath, 'docs/09_roadmap')
    ];
    
    for (const searchDir of searchDirs) {
      try {
        const files = await fs.readdir(searchDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        
        for (const file of mdFiles) {
          const filePath = path.join(searchDir, file);
          fileSet.add(filePath);
        }
      } catch (error) {
        // Skip directories that can't be read
        logger.debug(`Skipping directory: ${searchDir}`);
      }
    }
    
    return fileSet;
  }

  validateContext(context) {
    if (!context.workspacePath) {
      throw new Error('workspacePath is required');
    }
  }
}

// Create instance for execution
const stepInstance = new FileSnapshotStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
