/**
 * VersionDetector - Enhanced CDP-based version detection
 * Provides robust version detection with HTTP fallback and connection management
 */

const http = require('http');
const https = require('https');
const Logger = require('@logging/Logger');
const logger = new Logger('VersionDetector');

class VersionDetector {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 5000,
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 1000,
      host: options.host || '127.0.0.1',
      ...options
    };
    this.logger = options.logger || logger;
  }

  /**
   * Detect IDE version using CDP /json/version endpoint
   * @param {number} port - IDE port
   * @returns {Promise<string>} Detected version
   */
  async detectVersion(port) {
    try {
      // Try CDP endpoint first
      const version = await this.detectVersionCDP(port);
      if (version) {
        return version;
      }

      // Fallback to HTTP endpoint
      this.logger.warn(`CDP detection failed for port ${port}, trying HTTP fallback`);
      return await this.detectVersionHTTP(port);

    } catch (error) {
      this.logger.error(`Version detection failed for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Detect version using CDP /json/version endpoint
   * @param {number} port - IDE port
   * @returns {Promise<string>} Detected version
   */
  async detectVersionCDP(port) {
    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        this.logger.debug(`CDP version detection attempt ${attempt}/${this.options.retries} for port ${port}`);
        
        const versionData = await this.makeHTTPRequest(port, '/json/version');
        
        if (versionData && versionData['User-Agent']) {
          const userAgent = versionData['User-Agent'];
          this.logger.debug(`CDP /json/version User-Agent: ${userAgent}`);
          
          // Extract version from User-Agent
          const match = userAgent.match(/(?:Cursor|VSCode|Windsurf)\/([\d\.]+)/i);
          if (match) {
            const version = match[1];
            this.logger.debug(`✅ Version detected via CDP /json/version: ${version}`);
            return version;
          } else {
            this.logger.warn(`❌ No version found in User-Agent: ${userAgent}`);
          }
        } else {
          this.logger.warn(`❌ No User-Agent in CDP /json/version response`);
        }

        // If we get here, the request succeeded but no version was found
        return null;

      } catch (error) {
        this.logger.warn(`CDP detection attempt ${attempt} failed for port ${port}:`, error.message);
        
        if (attempt === this.options.retries) {
          throw error;
        }
        
        // Wait before retry
        await this.delay(this.options.retryDelay);
      }
    }

    return null;
  }

  /**
   * Detect version using HTTP fallback
   * @param {number} port - IDE port
   * @returns {Promise<string>} Detected version
   */
  async detectVersionHTTP(port) {
    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        this.logger.debug(`HTTP version detection attempt ${attempt}/${this.options.retries} for port ${port}`);
        
        // Try different HTTP endpoints
        const endpoints = ['/json', '/json/list', '/version'];
        
        for (const endpoint of endpoints) {
          try {
            const data = await this.makeHTTPRequest(port, endpoint);
            
            // Handle different response formats
            let versionData = data;
            if (Array.isArray(data) && data.length > 0) {
              versionData = data[0];
            }
            
            if (versionData) {
              // Try to extract version from different fields
              const version = this.extractVersionFromData(versionData);
              if (version) {
                this.logger.info(`✅ Version detected via HTTP ${endpoint}: ${version}`);
                return version;
              }
            }
          } catch (endpointError) {
            this.logger.debug(`HTTP endpoint ${endpoint} failed for port ${port}:`, endpointError.message);
            continue;
          }
        }

        // If we get here, all HTTP endpoints failed
        return null;

      } catch (error) {
        this.logger.warn(`HTTP detection attempt ${attempt} failed for port ${port}:`, error.message);
        
        if (attempt === this.options.retries) {
          throw error;
        }
        
        // Wait before retry
        await this.delay(this.options.retryDelay);
      }
    }

    return null;
  }

  /**
   * Make HTTP request to IDE port
   * @param {number} port - IDE port
   * @param {string} path - Request path
   * @returns {Promise<Object>} Response data
   */
  async makeHTTPRequest(port, path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.options.host,
        port: port,
        path: path,
        method: 'GET',
        timeout: this.options.timeout,
        headers: {
          'User-Agent': 'PIDEA-VersionDetector/1.0',
          'Accept': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const json = JSON.parse(data);
              resolve(json);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse JSON response: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`HTTP request timeout after ${this.options.timeout}ms`));
      });

      req.end();
    });
  }

  /**
   * Extract version from response data
   * @param {Object} data - Response data
   * @returns {string|null} Extracted version
   */
  extractVersionFromData(data) {
    try {
      // Try different fields that might contain version information
      const versionFields = [
        'Browser',
        'User-Agent',
        'version',
        'Version',
        'description',
        'title'
      ];

      for (const field of versionFields) {
        const value = data[field];
        if (value && typeof value === 'string') {
          // Look for version pattern
          const match = value.match(/(?:Cursor|VSCode|Windsurf)\/([\d\.]+)/i);
          if (match) {
            return match[1];
          }
          
          // Look for semantic version pattern
          const semverMatch = value.match(/(\d+\.\d+\.\d+)/);
          if (semverMatch) {
            return semverMatch[1];
          }
        }
      }

      return null;

    } catch (error) {
      this.logger.error('Error extracting version from data:', error.message);
      return null;
    }
  }

  /**
   * Test if IDE is running on port
   * @param {number} port - IDE port
   * @returns {Promise<boolean>} True if IDE is running
   */
  async testPort(port) {
    try {
      await this.makeHTTPRequest(port, '/json/version');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get IDE type from port (basic detection)
   * @param {number} port - IDE port
   * @returns {Promise<string|null>} IDE type
   */
  async detectIDEType(port) {
    try {
      const data = await this.makeHTTPRequest(port, '/json/version');
      
      if (data && data['User-Agent']) {
        const userAgent = data['User-Agent'].toLowerCase();
        
        if (userAgent.includes('cursor')) {
          return 'cursor';
        } else if (userAgent.includes('vscode') || userAgent.includes('code')) {
          return 'vscode';
        } else if (userAgent.includes('windsurf')) {
          return 'windsurf';
        }
      }

      return null;

    } catch (error) {
      this.logger.error(`IDE type detection failed for port ${port}:`, error.message);
      return null;
    }
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get detector statistics
   * @returns {Object} Detector statistics
   */
  getStats() {
    return {
      options: this.options,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = VersionDetector;
