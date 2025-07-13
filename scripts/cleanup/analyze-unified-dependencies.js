/**
 * Unified System Dependency Analyzer
 * Analyzes all Categories system dependencies and usage patterns
 */

const fs = require('fs-extra');
const path = require('path');

class UnifiedDependencyAnalyzer {
  constructor() {
    this.dependencies = new Map();
    this.imports = new Map();
    this.services = new Map();
    this.controllers = new Map();
    this.registries = new Map();
    this.usagePatterns = new Map();
  }

  /**
   * Analyze all Categories system dependencies
   */
  async analyzeDependencies() {
    try {
      console.log('🔍 Starting Categories system dependency analysis...');
      
      // Analyze different areas
      await this.analyzeServiceRegistry();
      await this.analyzeImports();
      await this.analyzeControllers();
      await this.analyzeRegistries();
      await this.analyzeUsagePatterns();
      
      // Generate comprehensive report
      const report = this.generateReport();
      
      console.log('✅ Dependency analysis completed');
      return report;
      
    } catch (error) {
      console.error('❌ Dependency analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze service registry for Categories system registrations
   */
  async analyzeServiceRegistry() {
    try {
      const serviceRegistryPath = path.join(__dirname, '../../backend/infrastructure/di/ServiceRegistry.js');
      
      if (await fs.pathExists(serviceRegistryPath)) {
        const content = await fs.readFile(serviceRegistryPath, 'utf8');
        
        // Find Categories system service registrations
        const unifiedMatches = content.match(/CategoriesService|CategoriesService|Categories|Categories/g);
        if (unifiedMatches) {
          this.services.set('ServiceRegistry', {
            file: serviceRegistryPath,
            matches: unifiedMatches,
            lines: this.findMatchingLines(content, unifiedMatches)
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to analyze service registry:', error.message);
    }
  }

  /**
   * Analyze imports in key files
   */
  async analyzeImports() {
    const filesToAnalyze = [
      'backend/domain/services/WorkflowOrchestrationService.js',
      'backend/domain/services/TaskService.js',
      'backend/presentation/api/AutoModeController.js',
      'backend/presentation/api/TaskController.js',
      'backend/Application.js',
      'backend/application/handlers/index.js'
    ];

    for (const file of filesToAnalyze) {
      try {
        const filePath = path.join(__dirname, '../../..', file);
        
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf8');
          
          // Find Categories system imports
          const unifiedImports = content.match(/Categories|Categories|Categories|Categories/g);
          if (unifiedImports) {
            this.imports.set(file, {
              file: filePath,
              matches: unifiedImports,
              lines: this.findMatchingLines(content, unifiedImports),
              importStatements: this.extractImportStatements(content)
            });
          }
        }
      } catch (error) {
        console.error(`❌ Failed to analyze imports in ${file}:`, error.message);
      }
    }
  }

  /**
   * Analyze API controllers for Categories system usage
   */
  async analyzeControllers() {
    const controllerFiles = [
      'backend/presentation/api/AutoModeController.js',
      'backend/presentation/api/TaskController.js'
    ];

    for (const file of controllerFiles) {
      try {
        const filePath = path.join(__dirname, '../../..', file);
        
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf8');
          
          // Find Categories system usage in controllers
          const unifiedUsage = content.match(/Categories|Categories|Categories|Categories/g);
          if (unifiedUsage) {
            this.controllers.set(file, {
              file: filePath,
              matches: unifiedUsage,
              lines: this.findMatchingLines(content, unifiedUsage),
              methods: this.extractMethodsWithUnifiedUsage(content)
            });
          }
        }
      } catch (error) {
        console.error(`❌ Failed to analyze controller ${file}:`, error.message);
      }
    }
  }

  /**
   * Analyze registry files for Categories system patterns
   */
  async analyzeRegistries() {
    const registryFiles = [
      'backend/application/handlers/index.js',
      'backend/domain/workflows/index.js'
    ];

    for (const file of registryFiles) {
      try {
        const filePath = path.join(__dirname, '../../..', file);
        
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf8');
          
          // Find Categories system exports and registrations
          const unifiedExports = content.match(/Categories|Categories|Categories|Categories/g);
          if (unifiedExports) {
            this.registries.set(file, {
              file: filePath,
              matches: unifiedExports,
              lines: this.findMatchingLines(content, unifiedExports),
              exports: this.extractExports(content)
            });
          }
        }
      } catch (error) {
        console.error(`❌ Failed to analyze registry ${file}:`, error.message);
      }
    }
  }

  /**
   * Analyze usage patterns across the codebase
   */
  async analyzeUsagePatterns() {
    const patterns = [
      { name: 'CategoriesService', pattern: /CategoriesService/g },
      { name: 'CategoriesHandler', pattern: /CategoriesHandler/g },
      { name: 'CategoriesRegistry', pattern: /CategoriesRegistry/g },
      { name: 'Categories', pattern: /Categories/g },
      { name: 'Categories', pattern: /Categories/g }
    ];

    const searchDirs = [
      'backend/domain/services',
      'backend/application/handlers',
      'backend/presentation/api',
      'backend/infrastructure/di'
    ];

    for (const dir of searchDirs) {
      try {
        const dirPath = path.join(__dirname, '../../..', dir);
        
        if (await fs.pathExists(dirPath)) {
          const files = await this.getJsFiles(dirPath);
          
          for (const file of files) {
            const content = await fs.readFile(file, 'utf8');
            const relativePath = path.relative(path.join(__dirname, '../../../..'), file);
            
            for (const pattern of patterns) {
              const matches = content.match(pattern.pattern);
              if (matches) {
                if (!this.usagePatterns.has(pattern.name)) {
                  this.usagePatterns.set(pattern.name, []);
                }
                
                this.usagePatterns.get(pattern.name).push({
                  file: relativePath,
                  matches: matches.length,
                  lines: this.findMatchingLines(content, matches)
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`❌ Failed to analyze usage patterns in ${dir}:`, error.message);
      }
    }
  }

  /**
   * Find lines containing specific matches
   */
  findMatchingLines(content, matches) {
    const lines = content.split('\n');
    const matchingLines = [];
    
    lines.forEach((line, index) => {
      for (const match of matches) {
        if (line.includes(match)) {
          matchingLines.push({
            lineNumber: index + 1,
            content: line.trim(),
            match: match
          });
        }
      }
    });
    
    return matchingLines;
  }

  /**
   * Extract import statements from content
   */
  extractImportStatements(content) {
    const importRegex = /import.*Unified|require.*Unified/g;
    const matches = content.match(importRegex);
    return matches || [];
  }

  /**
   * Extract methods that use Categories system
   */
  extractMethodsWithUnifiedUsage(content) {
    const methodRegex = /(\w+)\s*\([^)]*\)\s*{[^}]*unified[^}]*}/gi;
    const matches = content.match(methodRegex);
    return matches || [];
  }

  /**
   * Extract exports from content
   */
  extractExports(content) {
    const exportRegex = /module\.exports.*Unified|export.*Unified/g;
    const matches = content.match(exportRegex);
    return matches || [];
  }

  /**
   * Get all JavaScript files in a directory recursively
   */
  async getJsFiles(dirPath) {
    const files = [];
    
    async function scanDir(currentPath) {
      const items = await fs.readdir(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await scanDir(itemPath);
        } else if (item.endsWith('.js')) {
          files.push(itemPath);
        }
      }
    }
    
    await scanDir(dirPath);
    return files;
  }

  /**
   * Generate comprehensive analysis report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDependencies: 0,
        filesWithDependencies: 0,
        criticalDependencies: 0
      },
      dependencies: {
        services: Object.fromEntries(this.services),
        imports: Object.fromEntries(this.imports),
        controllers: Object.fromEntries(this.controllers),
        registries: Object.fromEntries(this.registries),
        usagePatterns: Object.fromEntries(this.usagePatterns)
      },
      recommendations: this.generateRecommendations(),
      riskAssessment: this.assessRisks()
    };

    // Calculate summary statistics
    report.summary.totalDependencies = 
      this.services.size + 
      this.imports.size + 
      this.controllers.size + 
      this.registries.size;
    
    report.summary.filesWithDependencies = 
      new Set([
        ...this.services.keys(),
        ...this.imports.keys(),
        ...this.controllers.keys(),
        ...this.registries.keys()
      ]).size;

    return report;
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations() {
    const recommendations = [];

    // Service registry recommendations
    if (this.services.has('ServiceRegistry')) {
      recommendations.push({
        priority: 'high',
        category: 'service_registry',
        action: 'Remove Categories system service registration from ServiceRegistry.js',
        impact: 'Required for cleanup',
        files: ['backend/infrastructure/di/ServiceRegistry.js']
      });
    }

    // Import recommendations
    for (const [file, data] of this.imports) {
      recommendations.push({
        priority: 'high',
        category: 'imports',
        action: `Remove Categories system imports from ${file}`,
        impact: 'Required for cleanup',
        files: [file],
        details: data.importStatements
      });
    }

    // Controller recommendations
    for (const [file, data] of this.controllers) {
      recommendations.push({
        priority: 'medium',
        category: 'controllers',
        action: `Update ${file} to use Categories-based patterns`,
        impact: 'Required for functionality',
        files: [file],
        details: data.methods
      });
    }

    // Registry recommendations
    for (const [file, data] of this.registries) {
      recommendations.push({
        priority: 'high',
        category: 'registries',
        action: `Remove Categories system exports from ${file}`,
        impact: 'Required for cleanup',
        files: [file],
        details: data.exports
      });
    }

    return recommendations;
  }

  /**
   * Assess risks of removing Categories system system
   */
  assessRisks() {
    const risks = [];

    // High risk if many files depend on Categories system
    if (this.summary?.filesWithDependencies > 10) {
      risks.push({
        level: 'high',
        category: 'dependency_count',
        description: 'Many files depend on Categories system system',
        mitigation: 'Gradual removal with comprehensive testing'
      });
    }

    // High risk if controllers use Categories system
    if (this.controllers.size > 0) {
      risks.push({
        level: 'high',
        category: 'api_controllers',
        description: 'API controllers use Categories system patterns',
        mitigation: 'Update controllers to use Categories-based patterns before removal'
      });
    }

    // Medium risk if service registry has Categories system
    if (this.services.has('ServiceRegistry')) {
      risks.push({
        level: 'medium',
        category: 'service_registry',
        description: 'Service registry contains Categories system registrations',
        mitigation: 'Remove registrations and update dependency injection'
      });
    }

    return risks;
  }
}

// CLI interface
async function main() {
  const analyzer = new UnifiedDependencyAnalyzer();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'analyze':
        const report = await analyzer.analyzeDependencies();
        
        // Save report to file
        const reportPath = path.join(__dirname, '../../docs/cleanup/unified-system-analysis-report.md');
        await fs.ensureDir(path.dirname(reportPath));
        
        const reportContent = generateMarkdownReport(report);
        await fs.writeFile(reportPath, reportContent);
        
        console.log('\n📊 Analysis Summary:');
        console.log(`   Total dependencies: ${report.summary.totalDependencies}`);
        console.log(`   Files with dependencies: ${report.summary.filesWithDependencies}`);
        console.log(`   Recommendations: ${report.recommendations.length}`);
        console.log(`   Risks identified: ${report.riskAssessment.length}`);
        console.log(`   Report saved to: ${reportPath}`);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node analyze-unified-dependencies.js analyze - Analyze dependencies');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Generate markdown report from analysis results
 */
function generateMarkdownReport(report) {
  return `# Categories system System Dependency Analysis Report

## Executive Summary

**Analysis Date**: ${report.timestamp}
**Total Dependencies**: ${report.summary.totalDependencies}
**Files with Dependencies**: ${report.summary.filesWithDependencies}
**Critical Dependencies**: ${report.summary.criticalDependencies}

## Dependencies Found

### Service Registry Dependencies
${Object.entries(report.dependencies.services).map(([key, data]) => `
#### ${key}
- **File**: ${data.file}
- **Matches**: ${data.matches.join(', ')}
- **Lines**: ${data.lines.length}
`).join('')}

### Import Dependencies
${Object.entries(report.dependencies.imports).map(([key, data]) => `
#### ${key}
- **File**: ${data.file}
- **Matches**: ${data.matches.join(', ')}
- **Import Statements**: ${data.importStatements.join(', ')}
`).join('')}

### Controller Dependencies
${Object.entries(report.dependencies.controllers).map(([key, data]) => `
#### ${key}
- **File**: ${data.file}
- **Matches**: ${data.matches.join(', ')}
- **Methods**: ${data.methods.join(', ')}
`).join('')}

### Registry Dependencies
${Object.entries(report.dependencies.registries).map(([key, data]) => `
#### ${key}
- **File**: ${data.file}
- **Matches**: ${data.matches.join(', ')}
- **Exports**: ${data.exports.join(', ')}
`).join('')}

## Usage Patterns

${Object.entries(report.dependencies.usagePatterns).map(([pattern, usages]) => `
### ${pattern}
${usages.map(usage => `
- **File**: ${usage.file}
- **Matches**: ${usage.matches}
- **Lines**: ${usage.lines.length}
`).join('')}
`).join('')}

## Recommendations

${report.recommendations.map(rec => `
### ${rec.priority.toUpperCase()}: ${rec.action}
- **Category**: ${rec.category}
- **Impact**: ${rec.impact}
- **Files**: ${rec.files.join(', ')}
${rec.details ? `- **Details**: ${rec.details.join(', ')}` : ''}
`).join('')}

## Risk Assessment

${report.riskAssessment.map(risk => `
### ${risk.level.toUpperCase()}: ${risk.description}
- **Category**: ${risk.category}
- **Mitigation**: ${risk.mitigation}
`).join('')}

## Next Steps

1. **High Priority**: Remove service registry dependencies
2. **High Priority**: Remove import dependencies
3. **Medium Priority**: Update controller dependencies
4. **Medium Priority**: Remove registry dependencies
5. **Low Priority**: Clean up usage patterns

## Conclusion

The Categories system system has ${report.summary.totalDependencies} dependencies across ${report.summary.filesWithDependencies} files. 
${report.recommendations.length} recommendations have been identified for safe removal.
${report.riskAssessment.length} risks have been assessed and mitigation strategies provided.
`;
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = UnifiedDependencyAnalyzer; 