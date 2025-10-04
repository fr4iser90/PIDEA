/**
 * Central Version Manager
 * Single source of truth for all version information
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CentralVersionManager {
  constructor() {
    this.versionFilePath = path.join(__dirname, 'version.json');
    this.versionData = this.loadVersionData();
  }

  /**
   * Load version data from central file
   */
  loadVersionData() {
    try {
      if (fs.existsSync(this.versionFilePath)) {
        return JSON.parse(fs.readFileSync(this.versionFilePath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load version data:', error.message);
    }
    
    // Default version data
    return {
      version: "1.0.0",
      buildNumber: "00000000-0000",
      releaseDate: new Date().toISOString(),
      changelog: {
        commits: 0,
        sinceVersion: "v1.0.0",
        generated: new Date().toISOString()
      },
      metadata: {
        system: "PIDEA Unified Version Management System",
        branchStrategy: "Unified Branch Strategy",
        gitIntegration: "Automated changelog generation",
        releaseType: "Patch"
      }
    };
  }

  /**
   * Get current version
   */
  getVersion() {
    return this.versionData.version;
  }

  /**
   * Get full version data
   */
  getVersionData() {
    return this.versionData;
  }

  /**
   * Update version and save to central file
   */
  updateVersion(newVersion, metadata = {}) {
    this.versionData.version = newVersion;
    this.versionData.buildNumber = this.generateBuildNumber();
    this.versionData.releaseDate = new Date().toISOString();
    
    if (metadata.commits) {
      this.versionData.changelog.commits = metadata.commits;
    }
    if (metadata.sinceVersion) {
      this.versionData.changelog.sinceVersion = metadata.sinceVersion;
    }
    this.versionData.changelog.generated = new Date().toISOString();
    
    // Save to central file
    fs.writeFileSync(this.versionFilePath, JSON.stringify(this.versionData, null, 2));
    
    // Update all dependent files
    this.updateDependentFiles();
    
    return this.versionData;
  }

  /**
   * Generate build number
   */
  generateBuildNumber() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 5).replace(/:/g, '');
    return `${date}-${time}`;
  }

  /**
   * Update all files that depend on version
   */
  updateDependentFiles() {
    const version = this.versionData.version;
    
    // Update package.json files
    this.updatePackageJson('package.json', version);
    this.updatePackageJson('backend/package.json', version);
    
    // Update service files
    this.updateServiceFiles(version);
  }

  /**
   * Update package.json file
   */
  updatePackageJson(filePath, version) {
    try {
      if (fs.existsSync(filePath)) {
        const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        packageJson.version = version;
        fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));
        console.log(`✅ Updated ${filePath}: ${version}`);
      }
    } catch (error) {
      console.warn(`Failed to update ${filePath}:`, error.message);
    }
  }

  /**
   * Update service files
   */
  updateServiceFiles(version) {
    const serviceFiles = [
      'backend/domain/services/version/SemanticVersioningService.js',
      'backend/domain/services/shared/FileSystemService.js',
      'backend/domain/services/task/TaskService.js'
    ];

    serviceFiles.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf8');
          content = content.replace(/version:\s*['\"][0-9]+\.[0-9]+\.[0-9]+['\"]/g, `version: "${version}"`);
          fs.writeFileSync(filePath, content);
          console.log(`✅ Updated ${filePath}: ${version}`);
        }
      } catch (error) {
        console.warn(`Failed to update ${filePath}:`, error.message);
      }
    });
  }

  /**
   * Get version for display
   */
  getDisplayVersion() {
    return `${this.versionData.version} (${this.versionData.buildNumber})`;
  }

  /**
   * Get changelog info
   */
  getChangelogInfo() {
    return this.versionData.changelog;
  }

  /**
   * Sync commit count with Git reality
   * Updates only the commit count in version.json without changing the version
   */
  syncCommitCount() {
    try {
      const projectRoot = path.join(__dirname, '../../..');
      const sinceVersion = this.versionData.changelog.sinceVersion;
      
      console.log(`🔍 Syncing commit count since ${sinceVersion}...`);
      
      // Get actual commit count from Git
      const gitCommand = `git log --oneline ${sinceVersion}..HEAD | wc -l`;
      const actualCommits = parseInt(execSync(gitCommand, { 
        cwd: projectRoot, 
        encoding: 'utf8' 
      }).trim());
      
      const storedCommits = this.versionData.changelog.commits;
      
      console.log(`📊 Git reality: ${actualCommits} commits`);
      console.log(`📄 Stored in version.json: ${storedCommits} commits`);
      
      if (actualCommits !== storedCommits) {
        console.log(`⚠️  Discrepancy detected! Updating commit count...`);
        
        // Update only the commit count and generation timestamp
        this.versionData.changelog.commits = actualCommits;
        this.versionData.changelog.generated = new Date().toISOString();
        
        // Save updated version.json
        fs.writeFileSync(this.versionFilePath, JSON.stringify(this.versionData, null, 2));
        
        // Update CHANGELOG.md to match the new commit count
        this.updateChangelogFile(actualCommits);
        
        console.log(`✅ Updated version.json: ${storedCommits} → ${actualCommits} commits`);
        console.log(`✅ Updated CHANGELOG.md: ${storedCommits} → ${actualCommits} commits`);
        console.log(`📅 Generated: ${this.versionData.changelog.generated}`);
        
        return {
          success: true,
          previousCommits: storedCommits,
          actualCommits: actualCommits,
          discrepancy: actualCommits - storedCommits,
          updated: true
        };
      } else {
        console.log(`✅ Commit count is already in sync!`);
        return {
          success: true,
          previousCommits: storedCommits,
          actualCommits: actualCommits,
          discrepancy: 0,
          updated: false
        };
      }
      
    } catch (error) {
      console.error(`❌ Error syncing commit count:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update CHANGELOG.md with correct commit count
   */
  updateChangelogFile(actualCommits) {
    try {
      const changelogPath = path.join(__dirname, '../../../CHANGELOG.md');
      
      if (fs.existsSync(changelogPath)) {
        let content = fs.readFileSync(changelogPath, 'utf8');
        
        // Replace the commit count in the changelog
        content = content.replace(
          /- \*\*Commits:\*\* \d+ new changes since/,
          `- **Commits:** ${actualCommits} new changes since`
        );
        
        fs.writeFileSync(changelogPath, content);
        console.log(`📝 Updated CHANGELOG.md commit count: ${actualCommits}`);
      } else {
        console.warn('⚠️  CHANGELOG.md not found, skipping update');
      }
    } catch (error) {
      console.warn('⚠️  Failed to update CHANGELOG.md:', error.message);
    }
  }
}

module.exports = CentralVersionManager;
