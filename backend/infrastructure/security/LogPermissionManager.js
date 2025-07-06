const fs = require('fs').promises;
const path = require('path');

/**
 * Log Permission Manager
 * 
 * Handles secure file permissions and path validation for log files.
 * Prevents path traversal attacks and ensures proper file security.
 */
class LogPermissionManager {
  constructor() {
    this.baseLogDir = '/tmp/IDEWEB';
    this.allowedPaths = new Set();
  }

  /**
   * Set secure permissions for a file or directory
   * @param {string} filePath - Path to the file or directory
   * @param {string} type - Type of item ('log', 'directory', 'key', 'metadata')
   */
  async setSecurePermissions(filePath, type = 'log') {
    try {
      const normalizedPath = this.validateLogPath(filePath);
      
      let permissions;
      switch (type) {
        case 'directory':
          permissions = 0o700; // Owner read/write/execute only
          break;
        case 'log':
          permissions = 0o600; // Owner read/write only
          break;
        case 'key':
          permissions = 0o600; // Owner read/write only
          break;
        case 'metadata':
          permissions = 0o644; // Owner read/write, others read
          break;
        default:
          permissions = 0o600; // Default to secure
      }
      
      await fs.chmod(normalizedPath, permissions);
      
      console.log(`[LogPermissionManager] Set permissions ${permissions.toString(8)} for: ${normalizedPath}`);
    } catch (error) {
      console.error('[LogPermissionManager] Error setting permissions:', error);
      throw error;
    }
  }

  /**
   * Create secure log directory with proper permissions
   * @param {string} logDir - Log directory path
   */
  async createSecureLogDirectory(logDir) {
    try {
      const normalizedPath = this.validateLogPath(logDir);
      
      // Create directory recursively
      await fs.mkdir(normalizedPath, { recursive: true });
      
      // Set secure directory permissions
      await this.setSecurePermissions(normalizedPath, 'directory');
      
      // Create subdirectories with proper permissions
      const subDirs = ['keys', 'backups'];
      for (const subDir of subDirs) {
        const subDirPath = path.join(normalizedPath, subDir);
        await fs.mkdir(subDirPath, { recursive: true });
        await this.setSecurePermissions(subDirPath, 'directory');
      }
      
      console.log(`[LogPermissionManager] Created secure log directory: ${normalizedPath}`);
      return normalizedPath;
    } catch (error) {
      console.error('[LogPermissionManager] Error creating secure log directory:', error);
      throw error;
    }
  }

  /**
   * Validate log path to prevent path traversal attacks
   * @param {string} filePath - Path to validate
   * @returns {string} Normalized and validated path
   */
  validateLogPath(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }
      
      // Normalize path
      const normalized = path.normalize(filePath);
      
      // Check for path traversal attempts
      if (normalized.includes('..') || 
          normalized.includes('~') || 
          normalized.startsWith('/') && !normalized.startsWith(this.baseLogDir) ||
          normalized.includes('\\')) {
        throw new Error('Path traversal detected or invalid path');
      }
      
      // Ensure path is within allowed base directory
      const resolvedPath = path.resolve(normalized);
      if (!resolvedPath.startsWith(this.baseLogDir)) {
        throw new Error('Path outside allowed base directory');
      }
      
      return resolvedPath;
    } catch (error) {
      console.error('[LogPermissionManager] Path validation failed:', error);
      throw error;
    }
  }

  /**
   * Check if a path is within the allowed base directory
   * @param {string} filePath - Path to check
   * @returns {boolean} True if path is allowed
   */
  isPathAllowed(filePath) {
    try {
      const normalized = this.validateLogPath(filePath);
      return normalized.startsWith(this.baseLogDir);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get secure file path for a specific port and file type
   * @param {number} port - IDE port number
   * @param {string} fileType - Type of file ('log', 'encrypted', 'metadata', 'key')
   * @param {string} sessionId - Session identifier (optional)
   * @returns {string} Secure file path
   */
  getSecureFilePath(port, fileType, sessionId = null) {
    try {
      let fileName;
      switch (fileType) {
        case 'log':
          fileName = 'terminal.log';
          break;
        case 'encrypted':
          fileName = 'terminal.encrypted.log';
          break;
        case 'metadata':
          fileName = 'terminal.log.meta';
          break;
        case 'key':
          if (!sessionId) {
            throw new Error('Session ID required for key files');
          }
          fileName = `session-${sessionId}.key`;
          break;
        case 'index':
          fileName = 'terminal.log.index';
          break;
        default:
          throw new Error(`Unknown file type: ${fileType}`);
      }
      
      let filePath;
      if (fileType === 'key') {
        filePath = path.join(this.baseLogDir, port.toString(), 'logs', 'keys', fileName);
      } else {
        filePath = path.join(this.baseLogDir, port.toString(), 'logs', fileName);
      }
      
      return this.validateLogPath(filePath);
    } catch (error) {
      console.error('[LogPermissionManager] Error getting secure file path:', error);
      throw error;
    }
  }

  /**
   * Ensure file has secure permissions
   * @param {string} filePath - Path to the file
   * @param {string} expectedType - Expected file type for permission validation
   */
  async ensureSecurePermissions(filePath, expectedType = 'log') {
    try {
      const normalizedPath = this.validateLogPath(filePath);
      
      // Check current permissions
      const stats = await fs.stat(normalizedPath);
      const currentMode = stats.mode & 0o777;
      
      let expectedMode;
      switch (expectedType) {
        case 'directory':
          expectedMode = 0o700;
          break;
        case 'log':
        case 'key':
          expectedMode = 0o600;
          break;
        case 'metadata':
          expectedMode = 0o644;
          break;
        default:
          expectedMode = 0o600;
      }
      
      // Fix permissions if they don't match
      if (currentMode !== expectedMode) {
        await this.setSecurePermissions(normalizedPath, expectedType);
        console.log(`[LogPermissionManager] Fixed permissions for: ${normalizedPath}`);
      }
    } catch (error) {
      console.error('[LogPermissionManager] Error ensuring secure permissions:', error);
      throw error;
    }
  }

  /**
   * Clean up old log files with secure deletion
   * @param {number} port - IDE port number
   * @param {number} maxAge - Maximum age in hours (default: 24)
   */
  async cleanupOldLogs(port, maxAge = 24) {
    try {
      const logDir = path.join(this.baseLogDir, port.toString(), 'logs');
      const normalizedLogDir = this.validateLogPath(logDir);
      
      const files = await fs.readdir(normalizedLogDir);
      const cutoffTime = Date.now() - (maxAge * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(normalizedLogDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          // Skip directories and recent files
          if (stats.isDirectory() || stats.mtime.getTime() > cutoffTime) {
            continue;
          }
          
          // Securely delete old file
          await this.secureDelete(filePath);
          console.log(`[LogPermissionManager] Deleted old log file: ${filePath}`);
        } catch (error) {
          console.warn(`[LogPermissionManager] Could not process file ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[LogPermissionManager] Error cleaning up old logs:', error);
      throw error;
    }
  }

  /**
   * Securely delete a file by overwriting with random data
   * @param {string} filePath - Path to the file to delete
   */
  async secureDelete(filePath) {
    try {
      const normalizedPath = this.validateLogPath(filePath);
      
      // Get file size
      const stats = await fs.stat(normalizedPath);
      const fileSize = stats.size;
      
      if (fileSize > 0) {
        // Overwrite with random data
        const crypto = require('crypto');
        const randomData = crypto.randomBytes(fileSize);
        await fs.writeFile(normalizedPath, randomData);
      }
      
      // Delete the file
      await fs.unlink(normalizedPath);
      
      console.log(`[LogPermissionManager] Securely deleted: ${normalizedPath}`);
    } catch (error) {
      console.error('[LogPermissionManager] Error in secure delete:', error);
      throw error;
    }
  }

  /**
   * Get directory structure for a port
   * @param {number} port - IDE port number
   * @returns {Object} Directory structure information
   */
  async getDirectoryStructure(port) {
    try {
      const logDir = path.join(this.baseLogDir, port.toString(), 'logs');
      const normalizedLogDir = this.validateLogPath(logDir);
      
      const structure = {
        port: port,
        baseDir: normalizedLogDir,
        exists: false,
        subdirectories: [],
        files: []
      };
      
      try {
        const stats = await fs.stat(normalizedLogDir);
        structure.exists = true;
        structure.permissions = (stats.mode & 0o777).toString(8);
        
        const items = await fs.readdir(normalizedLogDir);
        
        for (const item of items) {
          const itemPath = path.join(normalizedLogDir, item);
          const itemStats = await fs.stat(itemPath);
          
          if (itemStats.isDirectory()) {
            structure.subdirectories.push({
              name: item,
              permissions: (itemStats.mode & 0o777).toString(8)
            });
          } else {
            structure.files.push({
              name: item,
              size: itemStats.size,
              permissions: (itemStats.mode & 0o777).toString(8),
              modified: itemStats.mtime
            });
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
      
      return structure;
    } catch (error) {
      console.error('[LogPermissionManager] Error getting directory structure:', error);
      throw error;
    }
  }

  /**
   * Validate and fix permissions for entire log directory
   * @param {number} port - IDE port number
   */
  async validateAndFixPermissions(port) {
    try {
      const logDir = path.join(this.baseLogDir, port.toString(), 'logs');
      const normalizedLogDir = this.validateLogPath(logDir);
      
      // Ensure base directory has correct permissions
      await this.ensureSecurePermissions(normalizedLogDir, 'directory');
      
      // Check all files and subdirectories
      const items = await fs.readdir(normalizedLogDir);
      
      for (const item of items) {
        const itemPath = path.join(normalizedLogDir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await this.ensureSecurePermissions(itemPath, 'directory');
        } else if (item.endsWith('.key')) {
          await this.ensureSecurePermissions(itemPath, 'key');
        } else if (item.endsWith('.meta')) {
          await this.ensureSecurePermissions(itemPath, 'metadata');
        } else {
          await this.ensureSecurePermissions(itemPath, 'log');
        }
      }
      
      console.log(`[LogPermissionManager] Validated and fixed permissions for port ${port}`);
    } catch (error) {
      console.error('[LogPermissionManager] Error validating permissions:', error);
      throw error;
    }
  }
}

module.exports = LogPermissionManager; 