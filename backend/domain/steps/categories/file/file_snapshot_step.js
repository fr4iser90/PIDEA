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
      logger.info(`📸 [FileSnapshotStep] Context received:`, {
        hasWorkspacePath: !!context.workspacePath,
        workspacePath: context.workspacePath,
        hasSnapshotType: !!context.snapshotType,
        snapshotType: context.snapshotType
      });
      
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

      const result = {
        success: true,
        data: {
          snapshot,
          snapshotType,
          workspacePath,
          createdAt: new Date().toISOString()
        }
      };
      
      logger.info('📸 [FileSnapshotStep] Returning result:', {
        success: result.success,
        hasData: !!result.data,
        hasSnapshot: !!result.data?.snapshot,
        snapshotSize: result.data?.snapshot?.size,
        resultKeys: Object.keys(result),
        dataKeys: result.data ? Object.keys(result.data) : 'no data'
      });

      return result;

    } catch (error) {
      logger.error('❌ Error creating file snapshot:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create snapshot of all .md files in workspace (recursive search)
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
        await this.searchDirectoryRecursively(searchDir, fileSet);
      } catch (error) {
        logger.debug(`Skipping directory: ${searchDir} - ${error.message}`);
      }
    }
    
    return fileSet;
  }

  /**
   * Recursively search directory for .md files
   * @param {string} dirPath - Directory path to search
   * @param {Set<string>} fileSet - Set to add files to
   */
  async searchDirectoryRecursively(dirPath, fileSet) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await this.searchDirectoryRecursively(fullPath, fileSet);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Add .md files to the set
          fileSet.add(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
      logger.debug(`Cannot read directory ${dirPath}: ${error.message}`);
    }
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
