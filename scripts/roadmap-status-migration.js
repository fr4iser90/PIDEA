/**
 * Roadmap Status Migration Script
 * Migrates all roadmap files to status-based organization structure
 * Created: 2025-09-19T19:22:57.000Z
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('../backend/infrastructure/logging/Logger');

class RoadmapStatusMigration {
  constructor() {
    this.sourcePath = 'docs/09_roadmap/tasks';
    this.targetBasePath = 'docs/09_roadmap';
    this.logger = new Logger('RoadmapStatusMigration');
    this.processedFiles = 0;
    this.failedFiles = 0;
    this.totalFiles = 0;
  }

  /**
   * Main migration method
   */
  async migrateAllTasks() {
    try {
      this.logger.info('🚀 Starting roadmap status migration...');
      
      // 1. Discover all task files
      const taskFiles = await this.discoverTaskFiles();
      this.totalFiles = taskFiles.length;
      this.logger.info(`📁 Found ${this.totalFiles} task files to migrate`);

      // 2. Process each file
      for (const filePath of taskFiles) {
        await this.migrateTaskFile(filePath);
      }

      // 3. Generate migration report
      await this.generateMigrationReport();

      this.logger.info(`✅ Migration completed: ${this.processedFiles} processed, ${this.failedFiles} failed`);
      
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Discover all task files in the roadmap directory
   */
  async discoverTaskFiles() {
    const taskFiles = [];
    
    try {
      const tasksDir = path.join(process.cwd(), this.sourcePath);
      await this.scanDirectory(tasksDir, taskFiles);
      
      return taskFiles;
    } catch (error) {
      this.logger.error('Error discovering task files:', error);
      throw error;
    }
  }

  /**
   * Recursively scan directory for markdown files
   */
  async scanDirectory(dirPath, taskFiles) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, taskFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          taskFiles.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.error(`Error scanning directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Migrate a single task file
   */
  async migrateTaskFile(filePath) {
    try {
      this.logger.info(`📄 Processing: ${path.relative(process.cwd(), filePath)}`);
      
      // 1. Parse task metadata
      const taskMetadata = await this.parseTaskMetadata(filePath);
      
      // 2. Determine target path
      const targetPath = this.determineTargetPath(taskMetadata);
      
      // 3. Create target directory structure
      await this.createTargetDirectory(targetPath);
      
      // 4. Move file to new location
      await this.moveTaskFile(filePath, targetPath, taskMetadata);
      
      // 5. Update database record (if exists)
      await this.updateDatabaseRecord(taskMetadata, targetPath);
      
      this.processedFiles++;
      this.logger.info(`✅ Migrated: ${path.basename(filePath)}`);
      
    } catch (error) {
      this.failedFiles++;
      this.logger.error(`❌ Failed to migrate ${filePath}:`, error);
    }
  }

  /**
   * Parse task metadata from markdown file
   */
  async parseTaskMetadata(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract metadata from markdown frontmatter or content
      const metadata = {
        filePath: filePath,
        fileName: path.basename(filePath),
        category: this.extractCategory(filePath),
        name: this.extractTaskName(filePath),
        status: this.extractStatus(content),
        priority: this.extractPriority(content),
        completedAt: this.extractCompletedAt(content),
        createdAt: this.extractCreatedAt(content)
      };
      
      return metadata;
    } catch (error) {
      this.logger.error(`Error parsing metadata for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Extract category from file path
   */
  extractCategory(filePath) {
    const relativePath = path.relative(path.join(process.cwd(), this.sourcePath), filePath);
    const pathParts = relativePath.split(path.sep);
    return pathParts[0] || 'uncategorized';
  }

  /**
   * Extract task name from file path
   */
  extractTaskName(filePath) {
    const fileName = path.basename(filePath, '.md');
    return fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Extract status from markdown content
   */
  extractStatus(content) {
    // Look for status in frontmatter or content
    const statusMatch = content.match(/- \*\*Status\*\*:\s*(\w+)/i);
    if (statusMatch) {
      return statusMatch[1].toLowerCase();
    }
    
    // Default status based on content analysis
    if (content.includes('✅') || content.includes('Completed')) {
      return 'completed';
    } else if (content.includes('🔄') || content.includes('In Progress')) {
      return 'in_progress';
    } else if (content.includes('❌') || content.includes('Failed')) {
      return 'failed';
    } else if (content.includes('🚫') || content.includes('Blocked')) {
      return 'blocked';
    } else if (content.includes('❌') || content.includes('Cancelled')) {
      return 'cancelled';
    }
    
    return 'pending';
  }

  /**
   * Extract priority from markdown content
   */
  extractPriority(content) {
    const priorityMatch = content.match(/- \*\*Priority\*\*:\s*(\w+)/i);
    if (priorityMatch) {
      return priorityMatch[1].toLowerCase();
    }
    
    // Default priority based on content analysis
    if (content.includes('Critical') || content.includes('High')) {
      return 'high';
    } else if (content.includes('Medium')) {
      return 'medium';
    } else if (content.includes('Low')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Extract completion date from content
   */
  extractCompletedAt(content) {
    const completedMatch = content.match(/- \*\*Completed\*\*:\s*([\d-]+)/i);
    if (completedMatch) {
      return completedMatch[1];
    }
    return null;
  }

  /**
   * Extract creation date from content
   */
  extractCreatedAt(content) {
    const createdMatch = content.match(/- \*\*Created\*\*:\s*([\d-]+)/i);
    if (createdMatch) {
      return createdMatch[1];
    }
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Determine target path based on task metadata
   */
  determineTargetPath(taskMetadata) {
    const { status, priority, category, completedAt } = taskMetadata;
    
    if (status === 'completed') {
      const quarter = this.getCompletionQuarter(completedAt);
      return path.join(this.targetBasePath, 'completed', quarter, category);
    } else if (status === 'in_progress') {
      return path.join(this.targetBasePath, 'in-progress', category);
    } else if (status === 'pending') {
      return path.join(this.targetBasePath, 'pending', priority, category);
    } else if (status === 'blocked') {
      return path.join(this.targetBasePath, 'blocked', category);
    } else if (status === 'cancelled') {
      return path.join(this.targetBasePath, 'cancelled', category);
    } else if (status === 'failed') {
      return path.join(this.targetBasePath, 'failed', category);
    }
    
    return path.join(this.targetBasePath, 'pending', priority, category);
  }

  /**
   * Get completion quarter from date
   */
  getCompletionQuarter(completedAt) {
    if (!completedAt) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      if (month <= 3) return `${year}-q1`;
      if (month <= 6) return `${year}-q2`;
      if (month <= 9) return `${year}-q3`;
      return `${year}-q4`;
    }
    
    const date = new Date(completedAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month <= 3) return `${year}-q1`;
    if (month <= 6) return `${year}-q2`;
    if (month <= 9) return `${year}-q3`;
    return `${year}-q4`;
  }

  /**
   * Create target directory structure
   */
  async createTargetDirectory(targetPath) {
    try {
      const fullTargetPath = path.join(process.cwd(), targetPath);
      await fs.mkdir(fullTargetPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating target directory ${targetPath}:`, error);
      throw error;
    }
  }

  /**
   * Move task file to new location
   */
  async moveTaskFile(sourcePath, targetPath, taskMetadata) {
    try {
      const fileName = taskMetadata.fileName;
      const fullTargetPath = path.join(process.cwd(), targetPath, fileName);
      
      // Create backup before moving
      const backupPath = `${sourcePath}.backup`;
      await fs.copyFile(sourcePath, backupPath);
      
      // Move file
      await fs.rename(sourcePath, fullTargetPath);
      
      // Remove backup after successful move
      await fs.unlink(backupPath);
      
    } catch (error) {
      this.logger.error(`Error moving file ${sourcePath} to ${targetPath}:`, error);
      throw error;
    }
  }

  /**
   * Update database record with new path information
   */
  async updateDatabaseRecord(taskMetadata, targetPath) {
    try {
      // This would update the database record with new path information
      // For now, we'll log the update that would be made
      this.logger.info(`📊 Would update database record for ${taskMetadata.fileName} with target path: ${targetPath}`);
      
      // TODO: Implement actual database update
      // await this.databaseService.updateTaskPath(taskMetadata.id, targetPath);
      
    } catch (error) {
      this.logger.error(`Error updating database record for ${taskMetadata.fileName}:`, error);
      throw error;
    }
  }

  /**
   * Generate migration report
   */
  async generateMigrationReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        totalFiles: this.totalFiles,
        processedFiles: this.processedFiles,
        failedFiles: this.failedFiles,
        successRate: this.totalFiles > 0 ? (this.processedFiles / this.totalFiles * 100).toFixed(2) : 0
      };
      
      const reportPath = path.join(process.cwd(), 'logs', 'roadmap-migration-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      this.logger.info(`📊 Migration report saved to: ${reportPath}`);
      
    } catch (error) {
      this.logger.error('Error generating migration report:', error);
    }
  }
}

// CLI execution
if (require.main === module) {
  const migration = new RoadmapStatusMigration();
  
  migration.migrateAllTasks()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = RoadmapStatusMigration;
