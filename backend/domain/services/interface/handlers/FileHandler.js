/**
 * File Handler - File System Operations
 * 
 * Handles file system interfaces for file operations.
 * Supports read, write, and file management operations.
 */

const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

class FileHandler {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger('FileHandler');
    this.fileSystem = dependencies.fileSystem;
    this.eventBus = dependencies.eventBus;
    this.serviceRegistry = dependencies.serviceRegistry;
    
    // File state
    this.activeFileSystems = new Map(); // fsId -> file system instance
    this.fileOperations = new Map(); // fsId -> operation history
  }

  /**
   * Create File interface instance
   * @param {Object} config - File configuration
   * @param {string} interfaceId - Interface ID
   * @returns {Promise<Object>} File interface instance
   */
  async createInterface(config, interfaceId) {
    try {
      const { basePath, permissions, maxFileSize, allowedExtensions } = config;
      
      this.logger.info(`Creating File interface: ${interfaceId}`, {
        basePath,
        permissions,
        maxFileSize,
        allowedExtensions: allowedExtensions?.length || 0
      });

      // Initialize file system access
      const fileSystemAccess = await this.initializeFileSystemAccess(config);
      
      // Store active file system
      this.activeFileSystems.set(interfaceId, {
        id: interfaceId,
        basePath,
        permissions,
        maxFileSize,
        allowedExtensions,
        access: fileSystemAccess,
        status: 'active',
        createdAt: new Date()
      });

      return {
        id: interfaceId,
        type: 'file',
        basePath,
        permissions,
        status: 'active',
        createdAt: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to create File interface:', error);
      throw new Error(`Failed to create File interface: ${error.message}`);
    }
  }

  /**
   * Initialize file system access
   * @param {Object} config - File configuration
   * @returns {Promise<Object>} File system access
   */
  async initializeFileSystemAccess(config) {
    try {
      const { basePath, permissions, maxFileSize, allowedExtensions } = config;
      
      this.logger.info(`Initializing file system access for ${basePath}`);

      if (!this.fileSystem) {
        throw new Error('File System not available');
      }

      const access = await this.fileSystem.createAccess({
        basePath,
        permissions,
        maxFileSize,
        allowedExtensions
      });
      
      this.logger.info(`File system access initialized for ${basePath}`);
      
      return access;

    } catch (error) {
      this.logger.error('Failed to initialize file system access:', error);
      throw new Error(`Failed to initialize file system access: ${error.message}`);
    }
  }

  /**
   * Read file
   * @param {string} fsId - File system ID
   * @param {string} filePath - File path
   * @returns {Promise<Object>} File content
   */
  async readFile(fsId, filePath) {
    try {
      const fileSystem = this.activeFileSystems.get(fsId);
      
      if (!fileSystem) {
        throw new Error(`File system ${fsId} not found`);
      }

      this.logger.info(`Reading file: ${filePath}`, { fsId });

      const result = await this.fileSystem.readFile(fileSystem.access, filePath);
      
      // Store operation in history
      this.recordOperation(fsId, 'read', filePath, { size: result.content?.length || 0 });
      
      return result;

    } catch (error) {
      this.logger.error('Failed to read file:', error);
      this.recordOperation(fsId, 'read', filePath, { error: error.message });
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Write file
   * @param {string} fsId - File system ID
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Promise<Object>} Write result
   */
  async writeFile(fsId, filePath, content) {
    try {
      const fileSystem = this.activeFileSystems.get(fsId);
      
      if (!fileSystem) {
        throw new Error(`File system ${fsId} not found`);
      }

      // Check file size limit
      if (content.length > fileSystem.maxFileSize) {
        throw new Error(`File size ${content.length} exceeds limit ${fileSystem.maxFileSize}`);
      }

      // Check file extension
      if (fileSystem.allowedExtensions && fileSystem.allowedExtensions.length > 0) {
        const extension = filePath.split('.').pop();
        if (!fileSystem.allowedExtensions.includes(extension)) {
          throw new Error(`File extension .${extension} not allowed`);
        }
      }

      this.logger.info(`Writing file: ${filePath}`, { fsId, size: content.length });

      const result = await this.fileSystem.writeFile(fileSystem.access, filePath, content);
      
      // Store operation in history
      this.recordOperation(fsId, 'write', filePath, { size: content.length });
      
      return result;

    } catch (error) {
      this.logger.error('Failed to write file:', error);
      this.recordOperation(fsId, 'write', filePath, { error: error.message });
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * List directory
   * @param {string} fsId - File system ID
   * @param {string} dirPath - Directory path
   * @returns {Promise<Object>} Directory listing
   */
  async listDirectory(fsId, dirPath) {
    try {
      const fileSystem = this.activeFileSystems.get(fsId);
      
      if (!fileSystem) {
        throw new Error(`File system ${fsId} not found`);
      }

      this.logger.info(`Listing directory: ${dirPath}`, { fsId });

      const result = await this.fileSystem.listDirectory(fileSystem.access, dirPath);
      
      // Store operation in history
      this.recordOperation(fsId, 'list', dirPath, { count: result.files?.length || 0 });
      
      return result;

    } catch (error) {
      this.logger.error('Failed to list directory:', error);
      this.recordOperation(fsId, 'list', dirPath, { error: error.message });
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  /**
   * Delete file
   * @param {string} fsId - File system ID
   * @param {string} filePath - File path
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(fsId, filePath) {
    try {
      const fileSystem = this.activeFileSystems.get(fsId);
      
      if (!fileSystem) {
        throw new Error(`File system ${fsId} not found`);
      }

      this.logger.info(`Deleting file: ${filePath}`, { fsId });

      const result = await this.fileSystem.deleteFile(fileSystem.access, filePath);
      
      // Store operation in history
      this.recordOperation(fsId, 'delete', filePath, { success: true });
      
      return result;

    } catch (error) {
      this.logger.error('Failed to delete file:', error);
      this.recordOperation(fsId, 'delete', filePath, { error: error.message });
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Record file operation
   * @param {string} fsId - File system ID
   * @param {string} operation - Operation type
   * @param {string} path - File path
   * @param {Object} result - Operation result
   */
  recordOperation(fsId, operation, path, result) {
    if (!this.fileOperations.has(fsId)) {
      this.fileOperations.set(fsId, []);
    }
    
    this.fileOperations.get(fsId).push({
      operation,
      path,
      result,
      timestamp: new Date()
    });
  }

  /**
   * Get operation history
   * @param {string} fsId - File system ID
   * @returns {Array} Operation history
   */
  getOperationHistory(fsId) {
    return this.fileOperations.get(fsId) || [];
  }

  /**
   * Get file system status
   * @param {string} fsId - File system ID
   * @returns {Promise<Object>} File system status
   */
  async getFileSystemStatus(fsId) {
    try {
      const fileSystem = this.activeFileSystems.get(fsId);
      
      if (!fileSystem) {
        throw new Error(`File system ${fsId} not found`);
      }

      const status = await this.fileSystem.getStatus(fileSystem.access);
      
      return {
        fsId,
        status: fileSystem.status,
        basePath: fileSystem.basePath,
        permissions: fileSystem.permissions,
        maxFileSize: fileSystem.maxFileSize,
        allowedExtensions: fileSystem.allowedExtensions,
        uptime: Date.now() - fileSystem.createdAt.getTime(),
        operationCount: this.fileOperations.get(fsId)?.length || 0,
        ...status
      };

    } catch (error) {
      this.logger.error('Failed to get file system status:', error);
      throw new Error(`Failed to get file system status: ${error.message}`);
    }
  }

  /**
   * Get file system statistics
   * @returns {Object} File system statistics
   */
  getFileSystemStats() {
    return {
      activeFileSystems: this.activeFileSystems.size,
      totalOperations: Array.from(this.fileOperations.values()).reduce((total, history) => total + history.length, 0),
      permissions: Array.from(this.activeFileSystems.values()).reduce((perms, fs) => {
        perms[fs.permissions] = (perms[fs.permissions] || 0) + 1;
        return perms;
      }, {}),
      lastActivity: new Date()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Close all active file systems
      for (const [fsId, fileSystem] of this.activeFileSystems) {
        try {
          await this.fileSystem.closeAccess(fileSystem.access);
        } catch (error) {
          this.logger.warn(`Failed to close file system ${fsId}:`, error.message);
        }
      }

      // Clear state
      this.activeFileSystems.clear();
      this.fileOperations.clear();

      this.logger.info('File Handler cleanup completed');

    } catch (error) {
      this.logger.error('Failed to cleanup File Handler:', error);
    }
  }
}

module.exports = FileHandler;
