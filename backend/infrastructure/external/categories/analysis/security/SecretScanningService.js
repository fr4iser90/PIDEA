/**
 * SecretScanningService - Infrastructure Layer
 * External integration for secret detection API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Secret detection and scanning via various APIs
 */

const Logger = require('@logging/Logger');
const HttpClient = require('@infrastructure/http/HttpClient');
const fs = require('fs').promises;
const path = require('path');

class SecretScanningService {
  constructor() {
    this.logger = new Logger('SecretScanningService');
    this.httpClient = new HttpClient();
    this.baseUrl = process.env.SECRET_SCAN_API_URL || 'https://api.trufflesecurity.com';
    this.apiKey = process.env.SECRET_SCAN_API_KEY;
    this.timeout = parseInt(process.env.SECRET_SCAN_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting secret scanning analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const scanConfig = {
        ...config,
        includePatterns: config.includePatterns || ['**/*.js', '**/*.py', '**/*.java', '**/*.env*'],
        excludePatterns: config.excludePatterns || ['**/node_modules/**', '**/.git/**'],
        severity: config.severity || 'high,critical'
      };

      const result = await this.scanForSecrets(projectPath, scanConfig);
      
      this.logger.info('Secret scanning completed successfully', { 
        projectId: params.projectId,
        secrets: result.secrets?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'secret-scan',
          timestamp: new Date().toISOString(),
          config: scanConfig
        }
      };
    } catch (error) {
      this.logger.error('Secret scanning failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async scanForSecrets(projectPath, config) {
    // First, scan locally for common patterns
    const localSecrets = await this.scanLocalFiles(projectPath, config);
    
    // Then, use external API for advanced detection
    const externalSecrets = await this.scanWithExternalAPI(projectPath, config);
    
    // Combine and deduplicate results
    const allSecrets = [...localSecrets, ...externalSecrets];
    const uniqueSecrets = this.deduplicateSecrets(allSecrets);
    
    return {
      secrets: uniqueSecrets,
      summary: {
        total: uniqueSecrets.length,
        byType: this.groupSecretsByType(uniqueSecrets),
        bySeverity: this.groupSecretsBySeverity(uniqueSecrets)
      }
    };
  }

  async scanLocalFiles(projectPath, config) {
    const secrets = [];
    const files = await this.getFilesToScan(projectPath, config);
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const fileSecrets = this.detectSecretsInContent(content, file);
        secrets.push(...fileSecrets);
      } catch (error) {
        this.logger.warn('Failed to scan file', { file, error: error.message });
      }
    }
    
    return secrets;
  }

  async scanWithExternalAPI(projectPath, config) {
    if (!this.apiKey) {
      this.logger.warn('No API key provided for external secret scanning');
      return [];
    }

    try {
      const endpoint = `${this.baseUrl}/v1/scan`;
      const payload = {
        path: projectPath,
        config: {
          includePatterns: config.includePatterns,
          excludePatterns: config.excludePatterns,
          severity: config.severity
        }
      };

      const response = await this.httpClient.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: this.timeout
      });

      return response.data.secrets || [];
    } catch (error) {
      this.logger.error('External secret scanning failed', { error: error.message });
      return [];
    }
  }

  async getFilesToScan(projectPath, config) {
    const files = [];
    const includePatterns = config.includePatterns || ['**/*'];
    const excludePatterns = config.excludePatterns || [];
    
    // Simple file discovery (in production, use glob or similar)
    const allFiles = await this.getAllFiles(projectPath);
    
    for (const file of allFiles) {
      const relativePath = path.relative(projectPath, file);
      
      // Check if file matches include patterns
      const matchesInclude = includePatterns.some(pattern => 
        this.matchesPattern(relativePath, pattern)
      );
      
      // Check if file matches exclude patterns
      const matchesExclude = excludePatterns.some(pattern => 
        this.matchesPattern(relativePath, pattern)
      );
      
      if (matchesInclude && !matchesExclude) {
        files.push(file);
      }
    }
    
    return files;
  }

  async getAllFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to read directory', { dir, error: error.message });
    }
    
    return files;
  }

  matchesPattern(filePath, pattern) {
    // Simple pattern matching (in production, use minimatch or similar)
    if (pattern.includes('**')) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  }

  detectSecretsInContent(content, filePath) {
    const secrets = [];
    
    // Common secret patterns
    const patterns = [
      { name: 'API Key', pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"`]?([a-zA-Z0-9]{32,})['"`]?/gi, severity: 'high' },
      { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, severity: 'high' },
      { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, severity: 'critical' },
      { name: 'Database Password', pattern: /(password|pwd)\s*[:=]\s*['"`]?([^\s'"`]+)['"`]?/gi, severity: 'high' },
      { name: 'Access Token', pattern: /(access[_-]?token|token)\s*[:=]\s*['"`]?([a-zA-Z0-9]{32,})['"`]?/gi, severity: 'high' }
    ];
    
    for (const { name, pattern, severity } of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        secrets.push({
          type: name,
          severity: severity,
          line: this.getLineNumber(content, match.index),
          column: match.index - content.lastIndexOf('\n', match.index),
          value: match[0].substring(0, 50) + '...',
          file: filePath,
          confidence: 'high'
        });
      }
    }
    
    return secrets;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  deduplicateSecrets(secrets) {
    const seen = new Set();
    return secrets.filter(secret => {
      const key = `${secret.file}:${secret.line}:${secret.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  groupSecretsByType(secrets) {
    return secrets.reduce((groups, secret) => {
      groups[secret.type] = (groups[secret.type] || 0) + 1;
      return groups;
    }, {});
  }

  groupSecretsBySeverity(secrets) {
    return secrets.reduce((groups, secret) => {
      groups[secret.severity] = (groups[secret.severity] || 0) + 1;
      return groups;
    }, {});
  }

  async getConfiguration() {
    return {
      name: 'Secret Scanning Service',
      version: '1.0.0',
      capabilities: ['secret-detection', 'pattern-matching', 'external-api-integration'],
      configuration: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      if (!this.apiKey) {
        return {
          status: 'limited',
          message: 'Local scanning only - no API key configured',
          timestamp: new Date().toISOString()
        };
      }

      const response = await this.httpClient.get(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });
      
      return {
        status: 'healthy',
        version: response.data?.version || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = SecretScanningService; 