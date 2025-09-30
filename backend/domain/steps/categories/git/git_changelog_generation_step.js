/**
 * Git Changelog Generation Step
 * Generates changelog entries based on commits and changes
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('GitChangelogGenerationStep');

// Step configuration
const config = {
  name: 'GitChangelogGenerationStep',
  type: 'git',
  description: 'Generates changelog entries based on commits and changes',
  category: 'git',
  version: '1.0.0',
  dependencies: ['gitService', 'fileSystemService'],
  settings: {
    timeout: 30000,
    conventionalCommits: true,
    groupByType: true,
    includeUnreleased: true,
    formats: ['markdown', 'json']
  },
  validation: {
    required: ['projectPath'],
    optional: ['sinceVersion', 'toVersion', 'outputPath', 'format', 'task']
  }
};

class GitChangelogGenerationStep {
  constructor() {
    this.name = 'GitChangelogGenerationStep';
    this.description = 'Generates changelog entries based on commits and changes';
    this.category = 'git';
    this.dependencies = ['gitService', 'fileSystemService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = GitChangelogGenerationStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, sinceVersion, toVersion, outputPath, format, task, ...otherParams } = context;
      
      logger.info('Executing Git Changelog Generation step', {
        projectPath,
        sinceVersion: sinceVersion || 'latest',
        toVersion: toVersion || 'HEAD',
        outputPath,
        format: format || 'markdown',
        taskId: task?.id,
        ...otherParams
      });

      // Generate changelog
      const changelogResult = await this.generateChangelog(
        projectPath,
        sinceVersion,
        toVersion,
        format,
        task,
        context
      );

      // Write changelog to file if output path is provided
      if (outputPath && changelogResult.content) {
        await this.writeChangelog(outputPath, changelogResult.content, format, context);
      }

      logger.info('Git Changelog Generation step completed successfully', {
        entriesGenerated: changelogResult.entries?.length || 0,
        format,
        outputPath: outputPath || 'not specified'
      });

      return {
        success: true,
        result: {
          changelog: changelogResult.content,
          entries: changelogResult.entries,
          metadata: changelogResult.metadata,
          format,
          outputPath: outputPath || null
        },
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`${this.name} failed`, {
        error: error.message,
        context: {
          projectPath: context.projectPath,
          sinceVersion: context.sinceVersion,
          toVersion: context.toVersion
        }
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async generateChangelog(projectPath, sinceVersion, toVersion, format, task, context) {
    try {
      // Get commits for the specified range
      const commits = await this.getCommitsInRange(projectPath, sinceVersion, toVersion, context);
      
      // Parse commits into changelog entries
      const entries = await this.parseCommitsToEntries(commits, context);
      
      // Generate changelog content based on format
      const content = await this.formatChangelog(entries, format, {
        sinceVersion,
        toVersion,
        task,
        ...context
      });

      // Generate metadata
      const metadata = this.generateMetadata(entries, sinceVersion, toVersion);

      return {
        content,
        entries,
        metadata
      };

    } catch (error) {
      logger.error('Error generating changelog', { error: error.message });
      return {
        content: '',
        entries: [],
        metadata: {}
      };
    }
  }

  async getCommitsInRange(projectPath, sinceVersion, toVersion, context) {
    try {
      if (!context.gitService) {
        logger.warn('No git service available, returning empty commits');
        return [];
      }

      const options = {
        since: sinceVersion === 'latest' ? 'HEAD~10' : sinceVersion,
        limit: 100
      };

      const commits = await context.gitService.getCommitHistory(projectPath, options);
      
      logger.info(`Retrieved ${commits.length} commits for changelog generation`);
      return commits;

    } catch (error) {
      logger.warn('Error getting commits', { error: error.message });
      return [];
    }
  }

  async parseCommitsToEntries(commits, context) {
    const entries = [];

    for (const commit of commits) {
      try {
        const entry = this.parseCommitToEntry(commit, context);
        if (entry) {
          entries.push(entry);
        }
      } catch (error) {
        logger.warn('Error parsing commit', { 
          commitHash: commit.hash, 
          error: error.message 
        });
      }
    }

    return entries;
  }

  parseCommitToEntry(commit, context) {
    const message = commit.message || '';
    const hash = commit.hash || '';
    const author = commit.author || 'Unknown';
    const date = commit.date || new Date().toISOString();

    // Parse conventional commit format
    const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);
    
    if (conventionalMatch) {
      const [, type, scope, description] = conventionalMatch;
      
      return {
        type: this.normalizeCommitType(type),
        scope: scope || null,
        description: description.trim(),
        hash: hash.substring(0, 8),
        author,
        date,
        breaking: message.includes('BREAKING CHANGE') || message.includes('!'),
        originalMessage: message
      };
    }

    // Fallback for non-conventional commits
    return {
      type: 'other',
      scope: null,
      description: message,
      hash: hash.substring(0, 8),
      author,
      date,
      breaking: false,
      originalMessage: message
    };
  }

  normalizeCommitType(type) {
    const typeMap = {
      'feat': 'feature',
      'feature': 'feature',
      'fix': 'fix',
      'bug': 'fix',
      'hotfix': 'fix',
      'docs': 'documentation',
      'doc': 'documentation',
      'style': 'style',
      'refactor': 'refactor',
      'perf': 'performance',
      'performance': 'performance',
      'test': 'test',
      'tests': 'test',
      'chore': 'chore',
      'ci': 'ci',
      'build': 'build'
    };

    return typeMap[type.toLowerCase()] || 'other';
  }

  async formatChangelog(entries, format, options) {
    switch (format.toLowerCase()) {
      case 'markdown':
        return this.formatMarkdownChangelog(entries, options);
      case 'json':
        return this.formatJsonChangelog(entries, options);
      case 'html':
        return this.formatHtmlChangelog(entries, options);
      default:
        return this.formatMarkdownChangelog(entries, options);
    }
  }

  formatMarkdownChangelog(entries, options) {
    const { sinceVersion, toVersion, task } = options;
    const version = toVersion === 'HEAD' ? 'Unreleased' : toVersion;
    
    let changelog = `# Changelog\n\n`;
    
    if (sinceVersion && toVersion) {
      changelog += `## [${version}] - ${new Date().toISOString().split('T')[0]}\n\n`;
    }

    // Group entries by type if enabled
    if (options.groupByType !== false) {
      const groupedEntries = this.groupEntriesByType(entries);
      
      for (const [type, typeEntries] of Object.entries(groupedEntries)) {
        if (typeEntries.length > 0) {
          changelog += `### ${this.capitalizeFirst(type)}\n\n`;
          
          for (const entry of typeEntries) {
            const breakingIndicator = entry.breaking ? ' **BREAKING CHANGE**' : '';
            const scopeIndicator = entry.scope ? ` **${entry.scope}**:` : '';
            changelog += `-${scopeIndicator} ${entry.description}${breakingIndicator} (${entry.hash})\n`;
          }
          
          changelog += '\n';
        }
      }
    } else {
      // List all entries chronologically
      for (const entry of entries) {
        const breakingIndicator = entry.breaking ? ' **BREAKING CHANGE**' : '';
        const scopeIndicator = entry.scope ? ` **${entry.scope}**:` : '';
        changelog += `-${scopeIndicator} ${entry.description}${breakingIndicator} (${entry.hash})\n`;
      }
    }

    // Add task information if provided
    if (task) {
      changelog += `\n---\n\n`;
      changelog += `**Task Information:**\n`;
      changelog += `- Task ID: ${task.id}\n`;
      changelog += `- Type: ${task.type?.value || task.type || 'Unknown'}\n`;
      changelog += `- Priority: ${task.priority?.value || task.priority || 'Unknown'}\n`;
      if (task.description) {
        changelog += `- Description: ${task.description}\n`;
      }
    }

    return changelog;
  }

  formatJsonChangelog(entries, options) {
    const { sinceVersion, toVersion, task } = options;
    const version = toVersion === 'HEAD' ? 'unreleased' : toVersion;
    
    const changelog = {
      version,
      date: new Date().toISOString().split('T')[0],
      entries: entries.map(entry => ({
        type: entry.type,
        scope: entry.scope,
        description: entry.description,
        hash: entry.hash,
        author: entry.author,
        date: entry.date,
        breaking: entry.breaking
      })),
      metadata: {
        totalEntries: entries.length,
        breakingChanges: entries.filter(e => e.breaking).length,
        task: task ? {
          id: task.id,
          type: task.type?.value || task.type,
          priority: task.priority?.value || task.priority,
          description: task.description
        } : null
      }
    };

    return JSON.stringify(changelog, null, 2);
  }

  formatHtmlChangelog(entries, options) {
    const { sinceVersion, toVersion, task } = options;
    const version = toVersion === 'HEAD' ? 'Unreleased' : toVersion;
    
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>Changelog - ${version}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .changelog { max-width: 800px; }
        .version { color: #2c3e50; border-bottom: 2px solid #3498db; }
        .entry { margin: 10px 0; padding: 5px; }
        .breaking { background-color: #e74c3c; color: white; padding: 2px 5px; border-radius: 3px; }
        .type { font-weight: bold; color: #27ae60; }
        .hash { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="changelog">
        <h1 class="version">Changelog - ${version}</h1>
        <p>Generated on ${new Date().toISOString().split('T')[0]}</p>
`;

    // Group entries by type
    const groupedEntries = this.groupEntriesByType(entries);
    
    for (const [type, typeEntries] of Object.entries(groupedEntries)) {
      if (typeEntries.length > 0) {
        html += `        <h2 class="type">${this.capitalizeFirst(type)}</h2>\n`;
        
        for (const entry of typeEntries) {
          const breakingClass = entry.breaking ? 'breaking' : '';
          const scopeText = entry.scope ? ` <strong>${entry.scope}:</strong>` : '';
          html += `        <div class="entry">
            ${scopeText} ${entry.description}
            ${entry.breaking ? '<span class="breaking">BREAKING CHANGE</span>' : ''}
            <span class="hash">(${entry.hash})</span>
        </div>\n`;
        }
      }
    }

    html += `    </div>
</body>
</html>`;

    return html;
  }

  groupEntriesByType(entries) {
    const grouped = {};
    
    for (const entry of entries) {
      if (!grouped[entry.type]) {
        grouped[entry.type] = [];
      }
      grouped[entry.type].push(entry);
    }
    
    return grouped;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  generateMetadata(entries, sinceVersion, toVersion) {
    const breakingChanges = entries.filter(e => e.breaking).length;
    const types = [...new Set(entries.map(e => e.type))];
    
    return {
      totalEntries: entries.length,
      breakingChanges,
      types,
      sinceVersion,
      toVersion,
      generatedAt: new Date().toISOString()
    };
  }

  async writeChangelog(outputPath, content, format, context) {
    try {
      if (!context.fileSystemService) {
        logger.warn('No file system service available, skipping file write');
        return;
      }

      const extension = format === 'json' ? '.json' : format === 'html' ? '.html' : '.md';
      const fullPath = outputPath.endsWith(extension) ? outputPath : `${outputPath}${extension}`;
      
      await context.fileSystemService.writeFile(fullPath, content);
      
      logger.info(`Changelog written to ${fullPath}`);

    } catch (error) {
      logger.error('Error writing changelog file', { 
        outputPath, 
        error: error.message 
      });
    }
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }
}

// Create instance for execution
const stepInstance = new GitChangelogGenerationStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
