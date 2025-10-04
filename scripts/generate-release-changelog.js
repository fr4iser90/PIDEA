#!/usr/bin/env node

/**
 * Compact Release Changelog Generator
 * Generates a concise changelog for GitHub releases (max 5 items per category)
 */

const { execSync } = require('child_process');
const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

class CompactReleaseGenerator {
  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Generate compact release changelog
   */
  async generateReleaseChangelog(fromVersion, toVersion) {
    try {
      console.log(colors.bold(colors.blue('\n📋 Generating Compact Release Changelog')));
      console.log(colors.gray('==========================================\n'));
      console.log(colors.blue(`📋 From: v${fromVersion}`));
      console.log(colors.blue(`📋 To: v${toVersion}\n`));

      // Get commits between versions
      const commits = await this.getCommitsBetween(fromVersion, toVersion);

      if (commits.length === 0) {
        console.log(colors.yellow('⚠️  No commits found between these versions.'));
        return { success: true, features: [] };
      }

      // Analyze for compact features
      const features = this.analyzeCompactFeatures(commits);

      console.log(colors.bold(colors.green('\n✅ Compact Release Changelog Generated!')));
      console.log(colors.green(`Total Commits: ${commits.length}`));
      console.log(colors.green(`Key Features: ${Object.keys(features).length} categories\n`));

      // Output compact changelog
      console.log(colors.bold('📋 RELEASE CHANGELOG:'));
      console.log(colors.gray('==================\n'));

      console.log(`## What's New in v${toVersion}\n`);

      for (const category in features) {
        if (features[category].length > 0) {
          console.log(colors.bold(`### ${category}\n`));
          features[category].forEach(commit => {
            console.log(`- ${commit.message}`);
          });
          console.log('');
        }
      }

      console.log(colors.gray('---'));
      console.log(colors.gray(`*Generated from ${commits.length} commits*`));

      return {
        success: true,
        features,
        totalCommits: commits.length
      };

    } catch (error) {
      console.error(colors.bold(colors.red('\n❌ Release changelog generation failed!')));
      console.error(colors.red(`Error: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * Get commits between two versions
   */
  async getCommitsBetween(fromVersion, toVersion) {
    try {
      // Check if tags exist, otherwise use HEAD
      let toRef = `v${toVersion}`;
      try {
        execSync(`git rev-parse v${toVersion}`, { cwd: this.projectRoot });
      } catch (error) {
        console.log(colors.yellow(`⚠️  Tag v${toVersion} not found, using HEAD`));
        toRef = 'HEAD';
      }
      
      let fromRef = `v${fromVersion}`;
      try {
        execSync(`git rev-parse v${fromVersion}`, { cwd: this.projectRoot });
      } catch (error) {
        console.log(colors.yellow(`⚠️  Tag v${fromVersion} not found, using last 30 days`));
        fromRef = '--since="30 days ago"';
      }
      
      const command = `git log --oneline --pretty=format:"%h|%s" ${fromRef}..${toRef}`;
      const output = execSync(command, { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      });
      
      return output.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, message] = line.split('|');
          return { hash, message };
        });
    } catch (error) {
      console.log(colors.yellow(`⚠️  Could not get commits: ${error.message}`));
      return [];
    }
  }

  /**
   * Analyze commits for compact release features (max 5 per category)
   */
  analyzeCompactFeatures(commits) {
    const features = {
      '🚀 Major Features': [],
      '⚡ Performance & Caching': [],
      '🔒 Security & Authentication': [],
      '🎨 User Interface': [],
      '🐛 Bug Fixes': []
    };

    commits.forEach(commit => {
      const message = commit.message.toLowerCase();
      
      // Major Features - only significant new functionality
      if ((message.includes('implement') && (message.includes('system') || message.includes('service') || message.includes('management'))) ||
          (message.includes('add') && (message.includes('feature') || message.includes('functionality')))) {
        if (features['🚀 Major Features'].length < 5) {
          features['🚀 Major Features'].push(commit);
        }
      }
      // Performance & Caching
      else if ((message.includes('performance') || message.includes('optimize') || message.includes('cache') || 
               message.includes('memory') || message.includes('speed') || message.includes('efficient')) &&
               features['⚡ Performance & Caching'].length < 5) {
        features['⚡ Performance & Caching'].push(commit);
      }
      // Security
      else if ((message.includes('security') || message.includes('auth') || message.includes('token') ||
               message.includes('validation') || message.includes('secure') || message.includes('session')) &&
               features['🔒 Security & Authentication'].length < 5) {
        features['🔒 Security & Authentication'].push(commit);
      }
      // UI/UX
      else if ((message.includes('ui') || message.includes('ux') || message.includes('interface') ||
               message.includes('modal') || message.includes('panel') || message.includes('frontend')) &&
               features['🎨 User Interface'].length < 5) {
        features['🎨 User Interface'].push(commit);
      }
      // Bug Fixes
      else if ((message.includes('fix') || message.includes('bug') || message.includes('error') ||
               message.includes('issue') || message.includes('problem')) &&
               features['🐛 Bug Fixes'].length < 5) {
        features['🐛 Bug Fixes'].push(commit);
      }
    });

    // Remove empty categories
    Object.keys(features).forEach(category => {
      if (features[category].length === 0) {
        delete features[category];
      }
    });

    return features;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(colors.blue.bold('📋 PIDEA Compact Release Changelog Generator'));
    console.log(colors.gray('Usage: node generate-release-changelog.js <start-version> <end-version>'));
    console.log(colors.gray('Example: node generate-release-changelog.js 1.0.2 1.0.3'));
    process.exit(1);
  }

  const fromVersion = args[0];
  const toVersion = args[1];

  const generator = new CompactReleaseGenerator();
  await generator.generateReleaseChangelog(fromVersion, toVersion);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(colors.bold(colors.red('❌ Release changelog generation failed:')), error.message);
    process.exit(1);
  });
}

module.exports = CompactReleaseGenerator;
