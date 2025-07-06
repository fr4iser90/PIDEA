const fs = require('fs').promises;
const path = require('path');
const LogEncryptionService = require('../../infrastructure/security/LogEncryptionService');
const LogPermissionManager = require('../../infrastructure/security/LogPermissionManager');

/**
 * Terminal Log Reader Service
 * 
 * Reads and decrypts terminal log files with search and filtering capabilities.
 * Provides secure access to encrypted log data.
 */
class TerminalLogReader {
  constructor() {
    this.encryptionService = new LogEncryptionService();
    this.permissionManager = new LogPermissionManager();
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 60000; // 1 minute cache timeout
  }

  /**
   * Get recent log entries for a specific port
   * @param {number} port - IDE port number
   * @param {number} lines - Number of lines to retrieve (default: 50)
   * @param {string} key - Encryption key (optional)
   * @returns {Array} Array of decrypted log entries
   */
  async getRecentLogs(port, lines = 50, key = null) {
    try {
      console.log(`[TerminalLogReader] Getting recent ${lines} logs for port ${port}`);
      
      const encryptedLogPath = this.permissionManager.getSecureFilePath(port, 'encrypted');
      
      // Check if file exists
      try {
        await fs.stat(encryptedLogPath);
      } catch (error) {
        console.log(`[TerminalLogReader] No encrypted log file found for port ${port}`);
        return [];
      }
      
      // Read encrypted log file
      const encryptedContent = await fs.readFile(encryptedLogPath, 'utf8');
      const encryptedLines = encryptedContent.split('\n').filter(line => line.trim());
      
      if (encryptedLines.length === 0) {
        return [];
      }
      
      // Get the last N lines
      const recentEncryptedLines = encryptedLines.slice(-lines);
      
      // Decrypt log entries
      const decryptedEntries = await this.encryptionService.decryptLogEntries(recentEncryptedLines, key);
      
      console.log(`[TerminalLogReader] Retrieved ${decryptedEntries.length} log entries for port ${port}`);
      return decryptedEntries;
      
    } catch (error) {
      console.error(`[TerminalLogReader] Error getting recent logs for port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Search logs for specific text
   * @param {number} port - IDE port number
   * @param {string} searchText - Text to search for
   * @param {Object} options - Search options
   * @param {boolean} options.caseSensitive - Case sensitive search (default: false)
   * @param {boolean} options.useRegex - Use regex search (default: false)
   * @param {number} options.maxResults - Maximum number of results (default: 100)
   * @param {string} key - Encryption key (optional)
   * @returns {Array} Array of matching log entries
   */
  async searchLogs(port, searchText, options = {}, key = null) {
    try {
      console.log(`[TerminalLogReader] Searching logs for port ${port}: "${searchText}"`);
      
      const {
        caseSensitive = false,
        useRegex = false,
        maxResults = 100
      } = options;
      
      const encryptedLogPath = this.permissionManager.getSecureFilePath(port, 'encrypted');
      
      // Check if file exists
      try {
        await fs.stat(encryptedLogPath);
      } catch (error) {
        console.log(`[TerminalLogReader] No encrypted log file found for port ${port}`);
        return [];
      }
      
      // Read all encrypted log entries
      const encryptedContent = await fs.readFile(encryptedLogPath, 'utf8');
      const encryptedLines = encryptedContent.split('\n').filter(line => line.trim());
      
      if (encryptedLines.length === 0) {
        return [];
      }
      
      // Decrypt all entries
      const allEntries = await this.encryptionService.decryptLogEntries(encryptedLines, key);
      
      // Prepare search pattern
      let searchPattern;
      if (useRegex) {
        searchPattern = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
      } else {
        const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchPattern = new RegExp(escapedText, caseSensitive ? 'g' : 'gi');
      }
      
      // Filter matching entries
      const matchingEntries = [];
      for (const entry of allEntries) {
        if (searchPattern.test(entry.text)) {
          matchingEntries.push(entry);
          
          if (matchingEntries.length >= maxResults) {
            break;
          }
        }
      }
      
      console.log(`[TerminalLogReader] Found ${matchingEntries.length} matching entries for port ${port}`);
      return matchingEntries;
      
    } catch (error) {
      console.error(`[TerminalLogReader] Error searching logs for port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Get logs within a time range
   * @param {number} port - IDE port number
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {string} key - Encryption key (optional)
   * @returns {Array} Array of log entries within the time range
   */
  async getLogsInTimeRange(port, startTime, endTime, key = null) {
    try {
      console.log(`[TerminalLogReader] Getting logs in time range for port ${port}: ${startTime} to ${endTime}`);
      
      const encryptedLogPath = this.permissionManager.getSecureFilePath(port, 'encrypted');
      
      // Check if file exists
      try {
        await fs.stat(encryptedLogPath);
      } catch (error) {
        console.log(`[TerminalLogReader] No encrypted log file found for port ${port}`);
        return [];
      }
      
      // Read all encrypted log entries
      const encryptedContent = await fs.readFile(encryptedLogPath, 'utf8');
      const encryptedLines = encryptedContent.split('\n').filter(line => line.trim());
      
      if (encryptedLines.length === 0) {
        return [];
      }
      
      // Decrypt all entries
      const allEntries = await this.encryptionService.decryptLogEntries(encryptedLines, key);
      
      // Filter entries within time range
      const filteredEntries = allEntries.filter(entry => {
        const entryTime = new Date(entry.timestamp);
        return entryTime >= startTime && entryTime <= endTime;
      });
      
      console.log(`[TerminalLogReader] Found ${filteredEntries.length} entries in time range for port ${port}`);
      return filteredEntries;
      
    } catch (error) {
      console.error(`[TerminalLogReader] Error getting logs in time range for port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Export logs in different formats
   * @param {number} port - IDE port number
   * @param {string} format - Export format ('json', 'csv', 'txt')
   * @param {Object} options - Export options
   * @param {number} options.lines - Number of lines to export (default: all)
   * @param {Date} options.startTime - Start time filter (optional)
   * @param {Date} options.endTime - End time filter (optional)
   * @param {string} key - Encryption key (optional)
   * @returns {string} Exported log data
   */
  async exportLogs(port, format = 'json', options = {}, key = null) {
    try {
      console.log(`[TerminalLogReader] Exporting logs for port ${port} in ${format} format`);
      
      const { lines, startTime, endTime } = options;
      
      let logEntries;
      
      if (startTime && endTime) {
        logEntries = await this.getLogsInTimeRange(port, startTime, endTime, key);
      } else if (lines) {
        logEntries = await this.getRecentLogs(port, lines, key);
      } else {
        logEntries = await this.getRecentLogs(port, 1000, key); // Default to 1000 lines
      }
      
      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(logEntries, null, 2);
          
        case 'csv':
          return this.convertToCSV(logEntries);
          
        case 'txt':
          return this.convertToText(logEntries);
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
    } catch (error) {
      console.error(`[TerminalLogReader] Error exporting logs for port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Convert log entries to CSV format
   * @param {Array} logEntries - Array of log entries
   * @returns {string} CSV formatted string
   */
  convertToCSV(logEntries) {
    try {
      if (logEntries.length === 0) {
        return 'timestamp,type,text,level,port\n';
      }
      
      const headers = ['timestamp', 'type', 'text', 'level', 'port'];
      const csvLines = [headers.join(',')];
      
      for (const entry of logEntries) {
        const row = headers.map(header => {
          const value = entry[header] || '';
          // Escape quotes and wrap in quotes if contains comma or quote
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
        });
        csvLines.push(row.join(','));
      }
      
      return csvLines.join('\n');
    } catch (error) {
      console.error('[TerminalLogReader] Error converting to CSV:', error);
      throw error;
    }
  }

  /**
   * Convert log entries to plain text format
   * @param {Array} logEntries - Array of log entries
   * @returns {string} Plain text formatted string
   */
  convertToText(logEntries) {
    try {
      if (logEntries.length === 0) {
        return 'No log entries found.\n';
      }
      
      const textLines = [];
      
      for (const entry of logEntries) {
        const timestamp = new Date(entry.timestamp).toISOString();
        const line = `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.text}`;
        textLines.push(line);
      }
      
      return textLines.join('\n') + '\n';
    } catch (error) {
      console.error('[TerminalLogReader] Error converting to text:', error);
      throw error;
    }
  }

  /**
   * Get log statistics for a port
   * @param {number} port - IDE port number
   * @param {string} key - Encryption key (optional)
   * @returns {Object} Log statistics
   */
  async getLogStatistics(port, key = null) {
    try {
      console.log(`[TerminalLogReader] Getting log statistics for port ${port}`);
      
      const encryptedLogPath = this.permissionManager.getSecureFilePath(port, 'encrypted');
      
      // Check if file exists
      try {
        await fs.stat(encryptedLogPath);
      } catch (error) {
        console.log(`[TerminalLogReader] No encrypted log file found for port ${port}`);
        return {
          port: port,
          totalEntries: 0,
          fileSize: 0,
          firstEntry: null,
          lastEntry: null,
          levels: {}
        };
      }
      
      // Get file stats
      const stats = await fs.stat(encryptedLogPath);
      
      // Read all encrypted log entries
      const encryptedContent = await fs.readFile(encryptedLogPath, 'utf8');
      const encryptedLines = encryptedContent.split('\n').filter(line => line.trim());
      
      if (encryptedLines.length === 0) {
        return {
          port: port,
          totalEntries: 0,
          fileSize: stats.size,
          firstEntry: null,
          lastEntry: null,
          levels: {}
        };
      }
      
      // Decrypt all entries
      const allEntries = await this.encryptionService.decryptLogEntries(encryptedLines, key);
      
      // Calculate statistics
      const levels = {};
      let firstEntry = null;
      let lastEntry = null;
      
      for (const entry of allEntries) {
        // Count levels
        levels[entry.level] = (levels[entry.level] || 0) + 1;
        
        // Track first and last entries
        if (!firstEntry || new Date(entry.timestamp) < new Date(firstEntry.timestamp)) {
          firstEntry = entry;
        }
        if (!lastEntry || new Date(entry.timestamp) > new Date(lastEntry.timestamp)) {
          lastEntry = entry;
        }
      }
      
      const statistics = {
        port: port,
        totalEntries: allEntries.length,
        fileSize: stats.size,
        firstEntry: firstEntry ? {
          timestamp: firstEntry.timestamp,
          text: firstEntry.text.substring(0, 100) + (firstEntry.text.length > 100 ? '...' : '')
        } : null,
        lastEntry: lastEntry ? {
          timestamp: lastEntry.timestamp,
          text: lastEntry.text.substring(0, 100) + (lastEntry.text.length > 100 ? '...' : '')
        } : null,
        levels: levels
      };
      
      console.log(`[TerminalLogReader] Statistics for port ${port}: ${allEntries.length} entries`);
      return statistics;
      
    } catch (error) {
      console.error(`[TerminalLogReader] Error getting log statistics for port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Clear log cache for a port
   * @param {number} port - IDE port number
   */
  clearCache(port = null) {
    try {
      if (port) {
        this.cache.delete(port);
        console.log(`[TerminalLogReader] Cleared cache for port ${port}`);
      } else {
        this.cache.clear();
        console.log('[TerminalLogReader] Cleared all cache');
      }
    } catch (error) {
      console.error('[TerminalLogReader] Error clearing cache:', error);
    }
  }

  /**
   * Get cache information
   * @returns {Object} Cache information
   */
  getCacheInfo() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      entries: Array.from(this.cache.keys())
    };
  }
}

module.exports = TerminalLogReader; 