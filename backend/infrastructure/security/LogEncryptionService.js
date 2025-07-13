const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('@infrastructure/logging/Logger');


/**
 * Log Encryption Service
 * 
 * Handles encryption and decryption of log entries with secure key management.
 * Uses AES-256-CBC encryption with random IVs for each entry.
 */
class LogEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32;
    this.ivLength = 16;
    // Ensure default key is exactly 32 bytes for AES-256-CBC
    const defaultKey = 'default-key-32-chars-long!!';
    this.defaultKey = process.env.LOG_ENCRYPTION_KEY || defaultKey;
    // Pad or truncate to exactly 32 bytes
    if (this.defaultKey.length < 32) {
      this.defaultKey = this.defaultKey.padEnd(32, '0');
    } else if (this.defaultKey.length > 32) {
      this.defaultKey = this.defaultKey.slice(0, 32);
    }
  }

  /**
   * Generate a new encryption key
   * @returns {string} Base64 encoded encryption key
   */
  generateKey() {
    try {
      const key = crypto.randomBytes(this.keyLength);
      return key.toString('base64');
    } catch (error) {
      logger.error('[LogEncryptionService] Error generating key:', error);
      throw error;
    }
  }

  /**
   * Encrypt a log entry
   * @param {Object} logEntry - Log entry to encrypt
   * @param {string} key - Encryption key (optional, uses default if not provided)
   * @returns {string} Base64 encoded encrypted data
   */
  async encryptLogEntry(logEntry, key = null) {
    try {
      const encryptionKey = key || this.defaultKey;
      
      // Convert log entry to JSON string
      const data = JSON.stringify(logEntry);
      
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Ensure key is exactly 32 bytes
      const keyBuffer = Buffer.from(encryptionKey.slice(0, 32));
      // Create cipher using createCipheriv (modern approach)
      const cipher = crypto.createCipheriv(this.algorithm, keyBuffer, iv);
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);
      
      // Combine IV and encrypted data
      const result = Buffer.concat([iv, encrypted]);
      
      return result.toString('base64');
    } catch (error) {
      logger.error('[LogEncryptionService] Error encrypting log entry:', error);
      throw error;
    }
  }

  /**
   * Decrypt a log entry
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} key - Encryption key (optional, uses default if not provided)
   * @returns {Object} Decrypted log entry
   */
  async decryptLogEntry(encryptedData, key = null) {
    try {
      const encryptionKey = key || this.defaultKey;
      
      // Convert from base64
      const data = Buffer.from(encryptedData, 'base64');
      
      // Extract IV and encrypted data
      const iv = data.slice(0, this.ivLength);
      const encrypted = data.slice(this.ivLength);
      
      // Ensure key is exactly 32 bytes
      const keyBuffer = Buffer.from(encryptionKey.slice(0, 32));
      // Create decipher using createDecipheriv (modern approach)
      const decipher = crypto.createDecipheriv(this.algorithm, keyBuffer, iv);
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      // Parse JSON
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      logger.error('[LogEncryptionService] Error decrypting log entry:', error);
      throw error;
    }
  }

  /**
   * Encrypt multiple log entries
   * @param {Array} logEntries - Array of log entries to encrypt
   * @param {string} key - Encryption key (optional)
   * @returns {Array} Array of encrypted data strings
   */
  async encryptLogEntries(logEntries, key = null) {
    try {
      const encryptedEntries = [];
      
      for (const entry of logEntries) {
        const encrypted = await this.encryptLogEntry(entry, key);
        encryptedEntries.push(encrypted);
      }
      
      return encryptedEntries;
    } catch (error) {
      logger.error('[LogEncryptionService] Error encrypting log entries:', error);
      throw error;
    }
  }

  /**
   * Decrypt multiple log entries
   * @param {Array} encryptedDataArray - Array of base64 encoded encrypted data
   * @param {string} key - Encryption key (optional)
   * @returns {Array} Array of decrypted log entries
   */
  async decryptLogEntries(encryptedDataArray, key = null) {
    try {
      const decryptedEntries = [];
      
      for (const encryptedData of encryptedDataArray) {
        try {
          const decrypted = await this.decryptLogEntry(encryptedData, key);
          decryptedEntries.push(decrypted);
        } catch (error) {
          logger.warn('[LogEncryptionService] Failed to decrypt entry, skipping:', error.message);
          // Continue with other entries
        }
      }
      
      return decryptedEntries;
    } catch (error) {
      logger.error('[LogEncryptionService] Error decrypting log entries:', error);
      throw error;
    }
  }

  /**
   * Save encryption key to file
   * @param {string} key - Encryption key to save
   * @param {string} filePath - Path to save the key
   */
  async saveKey(key, filePath) {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Save key
      await fs.writeFile(filePath, key);
      
      // Set secure permissions (600 - owner read/write only)
      await fs.chmod(filePath, 0o600);
      
      logger.log(`[LogEncryptionService] Key saved to: ${filePath}`);
    } catch (error) {
      logger.error('[LogEncryptionService] Error saving key:', error);
      throw error;
    }
  }

  /**
   * Load encryption key from file
   * @param {string} filePath - Path to the key file
   * @returns {string} Encryption key
   */
  async loadKey(filePath) {
    try {
      const key = await fs.readFile(filePath, 'utf8');
      return key.trim();
    } catch (error) {
      logger.error('[LogEncryptionService] Error loading key:', error);
      throw error;
    }
  }

  /**
   * Generate and save a new key for a session
   * @param {string} sessionId - Session identifier
   * @param {string} baseDir - Base directory for key storage
   * @returns {string} Generated encryption key
   */
  async generateSessionKey(sessionId, baseDir) {
    try {
      const key = this.generateKey();
      const keyPath = path.join(baseDir, 'keys', `session-${sessionId}.key`);
      
      await this.saveKey(key, keyPath);
      
      logger.log(`[LogEncryptionService] Generated session key for: ${sessionId}`);
      return key;
    } catch (error) {
      logger.error('[LogEncryptionService] Error generating session key:', error);
      throw error;
    }
  }

  /**
   * Load session key
   * @param {string} sessionId - Session identifier
   * @param {string} baseDir - Base directory for key storage
   * @returns {string} Session encryption key
   */
  async loadSessionKey(sessionId, baseDir) {
    try {
      const keyPath = path.join(baseDir, 'keys', `session-${sessionId}.key`);
      return await this.loadKey(keyPath);
    } catch (error) {
      logger.error('[LogEncryptionService] Error loading session key:', error);
      throw error;
    }
  }

  /**
   * Validate encryption key format
   * @param {string} key - Key to validate
   * @returns {boolean} True if key is valid
   */
  validateKey(key) {
    try {
      if (!key || typeof key !== 'string') {
        return false;
      }
      
      // Check if key is base64 encoded and has correct length
      const decoded = Buffer.from(key, 'base64');
      return decoded.length === this.keyLength;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get key information (length, algorithm)
   * @returns {Object} Key information
   */
  getKeyInfo() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      defaultKeyLength: this.defaultKey.length
    };
  }
}

module.exports = LogEncryptionService; 