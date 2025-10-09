/**
 * DependencyChangeAnalyzer - Analyzes dependency changes for version bump determination
 * Detects package.json changes, dependency updates, and breaking changes
 */

const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

class DependencyChangeAnalyzer {
  constructor(dependencies = {}) {
    this.logger = new Logger('DependencyChangeAnalyzer');
    this.fileSystemService = dependencies.fileSystemService;
    
    // Configuration
    this.config = {
      packageFiles: [
        'package.json',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'requirements.txt',
        'Pipfile',
        'Pipfile.lock',
        'pyproject.toml',
        'composer.json',
        'composer.lock',
        'Gemfile',
        'Gemfile.lock',
        'Cargo.toml',
        'Cargo.lock',
        'go.mod',
        'go.sum',
        'pom.xml',
        'build.gradle',
        'build.gradle.kts'
      ],
      breakingChangeIndicators: [
        'major',
        'breaking',
        'incompatible',
        'deprecated',
        'removed',
        'changed'
      ],
      ...dependencies.config
    };
  }

  /**
   * Analyze dependency changes for version impact
   * @param {string} projectPath - Project path
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeDependencyChanges(projectPath, context = {}) {
    try {
      this.logger.info('Starting dependency change analysis', { projectPath });

      const analysis = {
        hasBreakingChanges: false,
        hasMajorUpdates: false,
        hasMinorUpdates: false,
        hasPatchUpdates: false,
        hasNewDependencies: false,
        hasRemovedDependencies: false,
        dependencyChanges: [],
        packageFiles: [],
        confidence: 0.5,
        factors: ['dependency-analysis'],
        timestamp: new Date()
      };

      // Find package files
      const packageFiles = await this.findPackageFiles(projectPath);
      analysis.packageFiles = packageFiles;

      if (packageFiles.length === 0) {
        this.logger.warn('No package files found for dependency analysis');
        return analysis;
      }

      // Analyze each package file
      for (const packageFile of packageFiles) {
        const fileAnalysis = await this.analyzePackageFile(packageFile, projectPath, context);
        this.mergeFileAnalysis(analysis, fileAnalysis);
      }

      // Calculate overall confidence
      analysis.confidence = this.calculateConfidence(analysis);

      this.logger.info('Dependency change analysis completed', {
        hasBreakingChanges: analysis.hasBreakingChanges,
        hasMajorUpdates: analysis.hasMajorUpdates,
        dependencyChanges: analysis.dependencyChanges.length
      });

      return analysis;

    } catch (error) {
      this.logger.error('Dependency change analysis failed', { error: error.message });
      return this.getFallbackAnalysis(error);
    }
  }

  /**
   * Find package files in project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Package files
   */
  async findPackageFiles(projectPath) {
    try {
      const packageFiles = [];

      for (const packageFile of this.config.packageFiles) {
        const filePath = path.join(projectPath, packageFile);
        try {
          await fs.access(filePath);
          packageFiles.push(packageFile);
        } catch (error) {
          // File doesn't exist, skip
        }
      }

      return packageFiles;

    } catch (error) {
      this.logger.warn('Failed to find package files', { error: error.message });
      return [];
    }
  }

  /**
   * Analyze individual package file
   * @param {string} packageFile - Package file name
   * @param {string} projectPath - Project path
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} File analysis result
   */
  async analyzePackageFile(packageFile, projectPath, context) {
    try {
      const filePath = path.join(projectPath, packageFile);
      const content = await fs.readFile(filePath, 'utf8');
      
      const analysis = {
        hasBreakingChanges: false,
        hasMajorUpdates: false,
        hasMinorUpdates: false,
        hasPatchUpdates: false,
        hasNewDependencies: false,
        hasRemovedDependencies: false,
        dependencyChanges: []
      };

      // Analyze based on file type
      if (packageFile === 'package.json') {
        this.analyzePackageJson(content, packageFile, analysis);
      } else if (packageFile.endsWith('.lock')) {
        this.analyzeLockFile(content, packageFile, analysis);
      } else if (packageFile === 'requirements.txt') {
        this.analyzeRequirementsTxt(content, packageFile, analysis);
      } else if (packageFile === 'go.mod') {
        this.analyzeGoMod(content, packageFile, analysis);
      } else if (packageFile === 'Cargo.toml') {
        this.analyzeCargoToml(content, packageFile, analysis);
      }

      return analysis;

    } catch (error) {
      this.logger.warn('Failed to analyze package file', { 
        packageFile, 
        error: error.message 
      });
      
      return {
        hasBreakingChanges: false,
        hasMajorUpdates: false,
        hasMinorUpdates: false,
        hasPatchUpdates: false,
        hasNewDependencies: false,
        hasRemovedDependencies: false,
        dependencyChanges: []
      };
    }
  }

  /**
   * Analyze package.json file
   * @param {string} content - File content
   * @param {string} packageFile - File name
   * @param {Object} analysis - Analysis result
   */
  analyzePackageJson(content, packageFile, analysis) {
    try {
      const packageData = JSON.parse(content);
      
      // Analyze dependencies
      const dependencySections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
      
      for (const section of dependencySections) {
        if (packageData[section]) {
          for (const [name, version] of Object.entries(packageData[section])) {
            const change = this.analyzeDependencyVersion(name, version, packageFile);
            if (change) {
              analysis.dependencyChanges.push(change);
              this.updateAnalysisFromChange(analysis, change);
            }
          }
        }
      }

    } catch (error) {
      this.logger.warn('Failed to analyze package.json', { error: error.message });
    }
  }

  /**
   * Analyze lock file
   * @param {string} content - File content
   * @param {string} packageFile - File name
   * @param {Object} analysis - Analysis result
   */
  analyzeLockFile(content, packageFile, analysis) {
    try {
      // Look for version changes in lock file
      const versionPattern = /"version":\s*"([^"]+)"/g;
      let match;
      
      while ((match = versionPattern.exec(content)) !== null) {
        const version = match[1];
        const change = this.analyzeVersionString(version, packageFile);
        if (change) {
          analysis.dependencyChanges.push(change);
          this.updateAnalysisFromChange(analysis, change);
        }
      }

    } catch (error) {
      this.logger.warn('Failed to analyze lock file', { error: error.message });
    }
  }

  /**
   * Analyze requirements.txt file
   * @param {string} content - File content
   * @param {string} packageFile - File name
   * @param {Object} analysis - Analysis result
   */
  analyzeRequirementsTxt(content, packageFile, analysis) {
    try {
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const change = this.analyzePythonDependency(trimmedLine, packageFile);
          if (change) {
            analysis.dependencyChanges.push(change);
            this.updateAnalysisFromChange(analysis, change);
          }
        }
      }

    } catch (error) {
      this.logger.warn('Failed to analyze requirements.txt', { error: error.message });
    }
  }

  /**
   * Analyze go.mod file
   * @param {string} content - File content
   * @param {string} packageFile - File name
   * @param {Object} analysis - Analysis result
   */
  analyzeGoMod(content, packageFile, analysis) {
    try {
      const requirePattern = /require\s+([^\s]+)\s+([^\s]+)/g;
      let match;
      
      while ((match = requirePattern.exec(content)) !== null) {
        const [, module, version] = match;
        const change = this.analyzeGoDependency(module, version, packageFile);
        if (change) {
          analysis.dependencyChanges.push(change);
          this.updateAnalysisFromChange(analysis, change);
        }
      }

    } catch (error) {
      this.logger.warn('Failed to analyze go.mod', { error: error.message });
    }
  }

  /**
   * Analyze Cargo.toml file
   * @param {string} content - File content
   * @param {string} packageFile - File name
   * @param {Object} analysis - Analysis result
   */
  analyzeCargoToml(content, packageFile, analysis) {
    try {
      const dependencyPattern = /(\w+)\s*=\s*"([^"]+)"/g;
      let match;
      
      while ((match = dependencyPattern.exec(content)) !== null) {
        const [, name, version] = match;
        const change = this.analyzeCargoDependency(name, version, packageFile);
        if (change) {
          analysis.dependencyChanges.push(change);
          this.updateAnalysisFromChange(analysis, change);
        }
      }

    } catch (error) {
      this.logger.warn('Failed to analyze Cargo.toml', { error: error.message });
    }
  }

  /**
   * Analyze dependency version
   * @param {string} name - Dependency name
   * @param {string} version - Version string
   * @param {string} packageFile - Package file
   * @returns {Object|null} Dependency change
   */
  analyzeDependencyVersion(name, version, packageFile) {
    try {
      const change = {
        name,
        version,
        packageFile,
        type: 'unknown',
        isBreaking: false,
        isMajor: false,
        isMinor: false,
        isPatch: false
      };

      // Analyze version string
      const versionAnalysis = this.analyzeVersionString(version, packageFile);
      if (versionAnalysis) {
        Object.assign(change, versionAnalysis);
      }

      return change;

    } catch (error) {
      this.logger.warn('Failed to analyze dependency version', { 
        name, 
        version, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Analyze version string
   * @param {string} version - Version string
   * @param {string} packageFile - Package file
   * @returns {Object|null} Version analysis
   */
  analyzeVersionString(version, packageFile) {
    try {
      const analysis = {
        type: 'unknown',
        isBreaking: false,
        isMajor: false,
        isMinor: false,
        isPatch: false
      };

      // Check for breaking change indicators
      for (const indicator of this.config.breakingChangeIndicators) {
        if (version.toLowerCase().includes(indicator)) {
          analysis.isBreaking = true;
          analysis.isMajor = true;
          analysis.type = 'breaking';
          break;
        }
      }

      // Analyze semantic versioning
      const semverMatch = version.match(/^(\d+)\.(\d+)\.(\d+)/);
      if (semverMatch) {
        const [, major, minor, patch] = semverMatch;
        
        // This is a simplified analysis - in reality, we'd need to compare with previous versions
        if (parseInt(major) > 0) {
          analysis.isMajor = true;
          analysis.type = 'major';
        } else if (parseInt(minor) > 0) {
          analysis.isMinor = true;
          analysis.type = 'minor';
        } else {
          analysis.isPatch = true;
          analysis.type = 'patch';
        }
      }

      return analysis;

    } catch (error) {
      this.logger.warn('Failed to analyze version string', { 
        version, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Analyze Python dependency
   * @param {string} line - Requirements line
   * @param {string} packageFile - Package file
   * @returns {Object|null} Dependency change
   */
  analyzePythonDependency(line, packageFile) {
    try {
      const parts = line.split('==');
      if (parts.length === 2) {
        const [name, version] = parts;
        return {
          name: name.trim(),
          version: version.trim(),
          packageFile,
          type: 'python',
          isBreaking: false,
          isMajor: false,
          isMinor: false,
          isPatch: false
        };
      }
      return null;

    } catch (error) {
      this.logger.warn('Failed to analyze Python dependency', { 
        line, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Analyze Go dependency
   * @param {string} module - Module name
   * @param {string} version - Version
   * @param {string} packageFile - Package file
   * @returns {Object|null} Dependency change
   */
  analyzeGoDependency(module, version, packageFile) {
    try {
      return {
        name: module,
        version,
        packageFile,
        type: 'go',
        isBreaking: false,
        isMajor: false,
        isMinor: false,
        isPatch: false
      };

    } catch (error) {
      this.logger.warn('Failed to analyze Go dependency', { 
        module, 
        version, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Analyze Cargo dependency
   * @param {string} name - Dependency name
   * @param {string} version - Version
   * @param {string} packageFile - Package file
   * @returns {Object|null} Dependency change
   */
  analyzeCargoDependency(name, version, packageFile) {
    try {
      return {
        name,
        version,
        packageFile,
        type: 'rust',
        isBreaking: false,
        isMajor: false,
        isMinor: false,
        isPatch: false
      };

    } catch (error) {
      this.logger.warn('Failed to analyze Cargo dependency', { 
        name, 
        version, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Update analysis from dependency change
   * @param {Object} analysis - Analysis result
   * @param {Object} change - Dependency change
   */
  updateAnalysisFromChange(analysis, change) {
    analysis.hasBreakingChanges = analysis.hasBreakingChanges || change.isBreaking;
    analysis.hasMajorUpdates = analysis.hasMajorUpdates || change.isMajor;
    analysis.hasMinorUpdates = analysis.hasMinorUpdates || change.isMinor;
    analysis.hasPatchUpdates = analysis.hasPatchUpdates || change.isPatch;
  }

  /**
   * Merge file analysis into overall analysis
   * @param {Object} analysis - Overall analysis
   * @param {Object} fileAnalysis - File analysis
   */
  mergeFileAnalysis(analysis, fileAnalysis) {
    analysis.hasBreakingChanges = analysis.hasBreakingChanges || fileAnalysis.hasBreakingChanges;
    analysis.hasMajorUpdates = analysis.hasMajorUpdates || fileAnalysis.hasMajorUpdates;
    analysis.hasMinorUpdates = analysis.hasMinorUpdates || fileAnalysis.hasMinorUpdates;
    analysis.hasPatchUpdates = analysis.hasPatchUpdates || fileAnalysis.hasPatchUpdates;
    analysis.hasNewDependencies = analysis.hasNewDependencies || fileAnalysis.hasNewDependencies;
    analysis.hasRemovedDependencies = analysis.hasRemovedDependencies || fileAnalysis.hasRemovedDependencies;

    analysis.dependencyChanges.push(...fileAnalysis.dependencyChanges);
  }

  /**
   * Calculate confidence score for analysis
   * @param {Object} analysis - Analysis result
   * @returns {number} Confidence score
   */
  calculateConfidence(analysis) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on findings
    if (analysis.hasBreakingChanges) confidence += 0.3;
    if (analysis.hasMajorUpdates) confidence += 0.2;
    if (analysis.hasMinorUpdates) confidence += 0.1;
    if (analysis.hasPatchUpdates) confidence += 0.05;

    // Increase confidence based on number of package files
    if (analysis.packageFiles.length > 0) {
      confidence += Math.min(analysis.packageFiles.length * 0.1, 0.2);
    }

    // Increase confidence based on number of dependency changes
    if (analysis.dependencyChanges.length > 0) {
      confidence += Math.min(analysis.dependencyChanges.length * 0.05, 0.2);
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get fallback analysis when analysis fails
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback analysis
   */
  getFallbackAnalysis(error) {
    return {
      hasBreakingChanges: false,
      hasMajorUpdates: false,
      hasMinorUpdates: false,
      hasPatchUpdates: false,
      hasNewDependencies: false,
      hasRemovedDependencies: false,
      dependencyChanges: [],
      packageFiles: [],
      confidence: 0.1,
      factors: ['dependency-analysis-fallback'],
      error: error.message,
      timestamp: new Date()
    };
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      config: {
        packageFiles: this.config.packageFiles.length,
        breakingChangeIndicators: this.config.breakingChangeIndicators.length
      },
      timestamp: new Date()
    };
  }
}

module.exports = DependencyChangeAnalyzer;
