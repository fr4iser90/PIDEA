# Phase 2: Core Implementation - Unified Version Management System

## 📋 Phase Overview
- **Phase Name**: Core Implementation
- **Duration**: 8 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: Phase 1 (Foundation Setup)
- **Deliverables**: UnifiedBranchStrategy, VersionManagementService, SemanticVersioningService, validation system

## 🎯 Phase Objectives
1. Implement UnifiedBranchStrategy as the main strategy class
2. Create VersionManagementService for version control operations
3. Implement SemanticVersioningService for semantic versioning logic
4. Add comprehensive validation and error handling
5. Create changelog generation service

## 📝 Detailed Tasks

### Task 2.1: Implement UnifiedBranchStrategy (2.5 hours)
- [ ] Create `UnifiedBranchStrategy` class
  - [ ] Extend BaseBranchStrategy
  - [ ] Implement strategy determination logic
  - [ ] Add context-aware branch naming
  - [ ] Implement intelligent defaults
- [ ] Add strategy-specific implementations
  - [ ] TaskBranchStrategy for task-based branches
  - [ ] FeatureBranchStrategy for feature branches
  - [ ] ReleaseBranchStrategy for release branches
  - [ ] HotfixBranchStrategy for hotfix branches
- [ ] Implement branch name generation
  - [ ] Context-aware naming based on task type
  - [ ] Priority-based naming for urgent tasks
  - [ ] Category-based naming for different task categories
  - [ ] Automatic sanitization and validation

### Task 2.2: Create VersionManagementService (2 hours)
- [ ] Implement core version management
  - [ ] Current version detection from package.json files
  - [ ] Version bumping logic (major, minor, patch)
  - [ ] Version validation and comparison
  - [ ] Version history tracking
- [ ] Add package.json integration
  - [ ] Multi-package.json support (root, backend, frontend)
  - [ ] Synchronized version updates
  - [ ] Version conflict detection and resolution
- [ ] Implement Git integration
  - [ ] Git tag creation and management
  - [ ] Version-based branch creation
  - [ ] Release branch automation

### Task 2.3: Implement SemanticVersioningService (1.5 hours)
- [ ] Create semantic versioning logic
  - [ ] Version parsing and validation
  - [ ] Version comparison and sorting
  - [ ] Bump type determination
  - [ ] Pre-release and build metadata support
- [ ] Add version analysis
  - [ ] Task impact analysis for version bumping
  - [ ] Breaking change detection
  - [ ] Feature impact assessment
  - [ ] Bug fix impact assessment
- [ ] Implement version constraints
  - [ ] Version range validation
  - [ ] Dependency version checking
  - [ ] Compatibility validation

### Task 2.4: Create ChangelogGeneratorService (1.5 hours)
- [ ] Implement commit analysis
  - [ ] Git commit parsing and analysis
  - [ ] Conventional commit support
  - [ ] Commit categorization (feature, fix, breaking, etc.)
  - [ ] Commit filtering and grouping
- [ ] Add changelog generation
  - [ ] Markdown changelog generation
  - [ ] JSON changelog export
  - [ ] HTML changelog generation
  - [ ] Custom template support
- [ ] Implement changelog management
  - [ ] Changelog versioning
  - [ ] Changelog history tracking
  - [ ] Changelog validation and formatting

### Task 2.5: Add Validation and Error Handling (0.5 hours)
- [ ] Implement comprehensive validation
  - [ ] Branch name validation
  - [ ] Version format validation
  - [ ] Configuration validation
  - [ ] Input sanitization
- [ ] Add error handling
  - [ ] Custom error types for version management
  - [ ] Error recovery mechanisms
  - [ ] Fallback strategies
  - [ ] Error logging and reporting

## 🔧 Technical Implementation

### UnifiedBranchStrategy Class
```javascript
/**
 * UnifiedBranchStrategy - Main strategy class for unified branch naming
 * Provides intelligent, context-aware branch naming for all task types
 */
class UnifiedBranchStrategy extends BaseBranchStrategy {
  constructor(config = {}) {
    super(config);
    this.strategyRegistry = new BranchStrategyRegistry();
    this.contextAnalyzer = new BranchContextAnalyzer();
  }

  /**
   * Generate branch name with intelligent strategy selection
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Generated branch name
   */
  generateBranchName(task, context) {
    try {
      // Analyze context to determine best strategy
      const strategyType = this.determineStrategy(task, context);
      const strategy = this.strategyRegistry.getStrategy(strategyType, this.config);
      
      // Generate branch name using selected strategy
      const branchName = strategy.generateBranchName(task, context);
      
      // Validate and sanitize the result
      const validation = this.validateBranchName(branchName);
      if (!validation.isValid) {
        throw new BranchNamingError(`Invalid branch name: ${validation.errors.join(', ')}`);
      }
      
      this.logger.info('UnifiedBranchStrategy: Generated branch name', {
        taskId: task.id,
        strategyType,
        branchName,
        validation
      });
      
      return branchName;
      
    } catch (error) {
      this.logger.error('UnifiedBranchStrategy: Failed to generate branch name', {
        taskId: task.id,
        error: error.message
      });
      
      // Fallback to simple naming
      return this.generateFallbackBranchName(task);
    }
  }

  /**
   * Determine best strategy based on task and context
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Strategy type
   */
  determineStrategy(task, context) {
    const analysis = this.contextAnalyzer.analyze(task, context);
    
    // Priority-based strategy selection
    if (analysis.isEmergency) return 'hotfix';
    if (analysis.isRelease) return 'release';
    if (analysis.isFeature) return 'feature';
    if (analysis.isBugFix) return 'hotfix';
    if (analysis.isRefactor) return 'refactor';
    
    // Default to task-based strategy
    return 'task';
  }

  /**
   * Generate fallback branch name
   * @param {Object} task - Task object
   * @returns {string} Fallback branch name
   */
  generateFallbackBranchName(task) {
    const taskId = task.id || 'unknown';
    const timestamp = Date.now();
    return `task/${taskId}-${timestamp}`;
  }
}
```

### VersionManagementService Class
```javascript
/**
 * VersionManagementService - Core version management operations
 * Handles version bumping, tracking, and Git integration
 */
class VersionManagementService {
  constructor(dependencies = {}) {
    this.gitService = dependencies.gitService;
    this.versionRepository = dependencies.versionRepository;
    this.semanticVersioning = new SemanticVersioningService();
    this.fileSystemService = dependencies.fileSystemService;
    this.logger = new Logger('VersionManagementService');
  }

  /**
   * Bump version based on task impact
   * @param {Object} task - Task object
   * @param {string} bumpType - Bump type: 'major', 'minor', 'patch'
   * @returns {Promise<Object>} Version bump result
   */
  async bumpVersion(task, bumpType = 'patch') {
    try {
      // Get current version
      const currentVersion = await this.getCurrentVersion();
      
      // Determine bump type if not specified
      const determinedBumpType = bumpType === 'auto' 
        ? await this.determineBumpType(task)
        : bumpType;
      
      // Calculate new version
      const newVersion = this.semanticVersioning.bump(currentVersion, determinedBumpType);
      
      // Update package.json files
      await this.updateVersionFiles(newVersion);
      
      // Create version record
      const versionRecord = await this.createVersionRecord(task, newVersion, currentVersion, determinedBumpType);
      
      // Create Git tag if enabled
      if (this.config.createGitTags) {
        await this.createGitTag(newVersion, task);
      }
      
      this.logger.info('VersionManagementService: Version bumped successfully', {
        taskId: task.id,
        currentVersion,
        newVersion,
        bumpType: determinedBumpType
      });
      
      return {
        success: true,
        currentVersion,
        newVersion,
        bumpType: determinedBumpType,
        versionRecord
      };
      
    } catch (error) {
      this.logger.error('VersionManagementService: Version bump failed', {
        taskId: task.id,
        error: error.message
      });
      throw new VersionManagementError(`Version bump failed: ${error.message}`);
    }
  }

  /**
   * Get current version from package.json files
   * @returns {Promise<string>} Current version
   */
  async getCurrentVersion() {
    const packageFiles = this.config.packageFiles || ['package.json'];
    
    for (const packageFile of packageFiles) {
      try {
        const packageJson = await this.fileSystemService.readJsonFile(packageFile);
        if (packageJson.version) {
          return packageJson.version;
        }
      } catch (error) {
        this.logger.warn(`VersionManagementService: Could not read ${packageFile}`, {
          error: error.message
        });
      }
    }
    
    throw new VersionManagementError('No version found in package.json files');
  }

  /**
   * Update version in all package.json files
   * @param {string} newVersion - New version to set
   * @returns {Promise<void>}
   */
  async updateVersionFiles(newVersion) {
    const packageFiles = this.config.packageFiles || ['package.json'];
    
    for (const packageFile of packageFiles) {
      try {
        const packageJson = await this.fileSystemService.readJsonFile(packageFile);
        packageJson.version = newVersion;
        await this.fileSystemService.writeJsonFile(packageFile, packageJson);
        
        this.logger.info(`VersionManagementService: Updated ${packageFile}`, {
          newVersion
        });
      } catch (error) {
        this.logger.error(`VersionManagementService: Failed to update ${packageFile}`, {
          error: error.message
        });
        throw new VersionManagementError(`Failed to update ${packageFile}: ${error.message}`);
      }
    }
  }
}
```

### SemanticVersioningService Class
```javascript
/**
 * SemanticVersioningService - Semantic versioning implementation
 * Handles version parsing, comparison, and bumping according to SemVer
 */
class SemanticVersioningService {
  constructor() {
    this.versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  }

  /**
   * Parse version string into components
   * @param {string} version - Version string
   * @returns {Object} Parsed version components
   */
  parseVersion(version) {
    const match = version.match(this.versionRegex);
    if (!match) {
      throw new SemanticVersioningError(`Invalid version format: ${version}`);
    }
    
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || null,
      build: match[5] || null,
      version: version
    };
  }

  /**
   * Bump version by specified type
   * @param {string} currentVersion - Current version
   * @param {string} bumpType - Bump type: 'major', 'minor', 'patch'
   * @returns {string} New version
   */
  bump(currentVersion, bumpType) {
    const parsed = this.parseVersion(currentVersion);
    
    switch (bumpType) {
      case 'major':
        return `${parsed.major + 1}.0.0`;
      case 'minor':
        return `${parsed.major}.${parsed.minor + 1}.0`;
      case 'patch':
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
      default:
        throw new SemanticVersioningError(`Invalid bump type: ${bumpType}`);
    }
  }

  /**
   * Compare two versions
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {number} Comparison result (-1, 0, 1)
   */
  compare(version1, version2) {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);
    
    // Compare major version
    if (v1.major !== v2.major) {
      return v1.major > v2.major ? 1 : -1;
    }
    
    // Compare minor version
    if (v1.minor !== v2.minor) {
      return v1.minor > v2.minor ? 1 : -1;
    }
    
    // Compare patch version
    if (v1.patch !== v2.patch) {
      return v1.patch > v2.patch ? 1 : -1;
    }
    
    // Compare prerelease
    if (v1.prerelease !== v2.prerelease) {
      if (!v1.prerelease) return 1;
      if (!v2.prerelease) return -1;
      return v1.prerelease.localeCompare(v2.prerelease);
    }
    
    return 0;
  }
}
```

## ✅ Success Criteria
- [ ] UnifiedBranchStrategy implemented with intelligent strategy selection
- [ ] VersionManagementService created with version bumping capabilities
- [ ] SemanticVersioningService implemented with full SemVer support
- [ ] ChangelogGeneratorService created with commit analysis
- [ ] Comprehensive validation and error handling in place
- [ ] All core services tested and working

## 🚨 Risk Mitigation
- **Risk**: Complex strategy selection logic
- **Mitigation**: Implement fallback mechanisms and extensive testing
- **Risk**: Version conflict in multi-package projects
- **Mitigation**: Implement conflict detection and resolution
- **Risk**: Git integration failures
- **Mitigation**: Add error recovery and rollback procedures

## 📊 Progress Tracking
- **Task 2.1**: 0% - UnifiedBranchStrategy implementation
- **Task 2.2**: 0% - VersionManagementService creation
- **Task 2.3**: 0% - SemanticVersioningService implementation
- **Task 2.4**: 0% - ChangelogGeneratorService creation
- **Task 2.5**: 0% - Validation and error handling

## 🔄 Next Phase Dependencies
- Phase 3 requires completed core services
- Phase 3 requires working version management
- Phase 3 requires changelog generation operational
- Phase 3 requires validation system in place
