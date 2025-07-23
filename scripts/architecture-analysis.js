#!/usr/bin/env node

/**
 * Architecture Analysis Script - PIDEA Project Structure Analysis
 * Provides comprehensive overview of current architecture state and refactoring needs
 */

const fs = require('fs').promises;
const path = require('path');

class ArchitectureAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.backendPath = path.join(this.projectRoot, 'backend');
    this.analysis = {
      layers: {},
      commands: {},
      handlers: {},
      services: {},
      violations: [],
      recommendations: []
    };
  }

  async analyze() {
    console.log('🏗️  PIDEA Architecture Analysis Starting...\n');
    
    await this.analyzeLayers();
    await this.analyzeCommands();
    await this.analyzeHandlers();
    await this.analyzeServices();
    await this.generateRecommendations();
    
    this.printReport();
  }

  async analyzeLayers() {
    console.log('📊 Analyzing Layer Structure...');
    
    const layers = ['presentation', 'application', 'domain', 'infrastructure'];
    
    for (const layer of layers) {
      const layerPath = path.join(this.backendPath, layer);
      try {
        const stats = await fs.stat(layerPath);
        if (stats.isDirectory()) {
          const files = await this.getFilesRecursively(layerPath);
          this.analysis.layers[layer] = {
            path: layerPath,
            fileCount: files.length,
            files: files.map(f => path.relative(this.backendPath, f)),
            categories: await this.getCategories(layerPath)
          };
        }
      } catch (error) {
        this.analysis.layers[layer] = { error: error.message };
      }
    }
  }

  async analyzeCommands() {
    console.log('📝 Analyzing Commands...');
    
    const commandsPath = path.join(this.backendPath, 'application/commands/categories');
    try {
      const categories = await this.getDirectories(commandsPath);
      for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);
        const files = await this.getFilesRecursively(categoryPath, '.js');
        this.analysis.commands[category] = {
          path: categoryPath,
          fileCount: files.length,
          files: files.map(f => path.basename(f, '.js'))
        };
      }
    } catch (error) {
      this.analysis.commands.error = error.message;
    }
  }

  async analyzeHandlers() {
    console.log('🔧 Analyzing Handlers...');
    
    const handlersPath = path.join(this.backendPath, 'application/handlers/categories');
    try {
      const categories = await this.getDirectories(handlersPath);
      for (const category of categories) {
        const categoryPath = path.join(handlersPath, category);
        const files = await this.getFilesRecursively(categoryPath, '.js');
        this.analysis.handlers[category] = {
          path: categoryPath,
          fileCount: files.length,
          files: files.map(f => path.basename(f, '.js'))
        };
      }
    } catch (error) {
      this.analysis.handlers.error = error.message;
    }
  }

  async analyzeServices() {
    console.log('⚙️  Analyzing Services...');
    
    // Application Services
    const appServicesPath = path.join(this.backendPath, 'application/services');
    try {
      const files = await this.getFilesRecursively(appServicesPath, '.js');
      this.analysis.services.application = {
        path: appServicesPath,
        fileCount: files.length,
        files: files.map(f => path.basename(f, '.js'))
      };
    } catch (error) {
      this.analysis.services.application = { error: error.message };
    }

    // Domain Services
    const domainServicesPath = path.join(this.backendPath, 'domain/services');
    try {
      const categories = await this.getDirectories(domainServicesPath);
      this.analysis.services.domain = {};
      for (const category of categories) {
        const categoryPath = path.join(domainServicesPath, category);
        const files = await this.getFilesRecursively(categoryPath, '.js');
        this.analysis.services.domain[category] = {
          path: categoryPath,
          fileCount: files.length,
          files: files.map(f => path.basename(f, '.js'))
        };
      }
    } catch (error) {
      this.analysis.services.domain = { error: error.message };
    }
  }

  async generateRecommendations() {
    console.log('💡 Generating Recommendations...');
    
    // Layer Balance Analysis
    const layerCounts = Object.values(this.analysis.layers)
      .filter(l => l.fileCount)
      .map(l => ({ layer: l.path.split('/').pop(), count: l.fileCount }));
    
    const avgFiles = layerCounts.reduce((sum, l) => sum + l.count, 0) / layerCounts.length;
    
    layerCounts.forEach(layer => {
      if (layer.count < avgFiles * 0.5) {
        this.analysis.recommendations.push({
          type: 'layer-imbalance',
          severity: 'medium',
          message: `${layer.layer} layer has only ${layer.count} files (below average of ${Math.round(avgFiles)})`,
          action: `Consider moving some logic to ${layer.layer} layer or review layer responsibilities`
        });
      }
    });

    // Command-Handler Mapping
    const commandCategories = Object.keys(this.analysis.commands).filter(k => k !== 'error');
    const handlerCategories = Object.keys(this.analysis.handlers).filter(k => k !== 'error');
    
    commandCategories.forEach(category => {
      if (!handlerCategories.includes(category)) {
        this.analysis.recommendations.push({
          type: 'missing-handler-category',
          severity: 'high',
          message: `Commands category '${category}' has no corresponding handlers category`,
          action: `Create handlers/categories/${category}/ directory and implement handlers`
        });
      }
    });

    // Duplicate Categories
    if (this.analysis.commands.generate && this.analysis.commands.generation) {
      this.analysis.recommendations.push({
        type: 'duplicate-category',
        severity: 'medium',
        message: 'Both "generate" and "generation" categories exist in commands',
        action: 'Consolidate into single category (recommend "generation")'
      });
    }
  }

  async getFilesRecursively(dir, extension = '') {
    const files = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...await this.getFilesRecursively(fullPath, extension));
      } else if (stat.isFile() && (!extension || item.endsWith(extension))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async getDirectories(dir) {
    const items = await fs.readdir(dir);
    const directories = [];
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        directories.push(item);
      }
    }
    
    return directories;
  }

  async getCategories(dir) {
    try {
      return await this.getDirectories(dir);
    } catch (error) {
      return [];
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🏗️  PIDEA ARCHITECTURE ANALYSIS REPORT');
    console.log('='.repeat(80));

    // Layer Analysis
    console.log('\n📊 LAYER STRUCTURE:');
    console.log('-'.repeat(40));
    Object.entries(this.analysis.layers).forEach(([layer, data]) => {
      if (data.error) {
        console.log(`❌ ${layer.toUpperCase()}: ${data.error}`);
      } else {
        console.log(`✅ ${layer.toUpperCase()}: ${data.fileCount} files`);
        if (data.categories && data.categories.length > 0) {
          console.log(`   Categories: ${data.categories.join(', ')}`);
        }
      }
    });

    // Commands Analysis
    console.log('\n📝 COMMANDS ANALYSIS:');
    console.log('-'.repeat(40));
    Object.entries(this.analysis.commands).forEach(([category, data]) => {
      if (data.error) {
        console.log(`❌ ${category}: ${data.error}`);
      } else {
        console.log(`✅ ${category}: ${data.fileCount} commands`);
        if (data.files.length > 0) {
          console.log(`   Files: ${data.files.slice(0, 5).join(', ')}${data.files.length > 5 ? '...' : ''}`);
        }
      }
    });

    // Handlers Analysis
    console.log('\n🔧 HANDLERS ANALYSIS:');
    console.log('-'.repeat(40));
    Object.entries(this.analysis.handlers).forEach(([category, data]) => {
      if (data.error) {
        console.log(`❌ ${category}: ${data.error}`);
      } else {
        console.log(`✅ ${category}: ${data.fileCount} handlers`);
        if (data.files.length > 0) {
          console.log(`   Files: ${data.files.slice(0, 5).join(', ')}${data.files.length > 5 ? '...' : ''}`);
        }
      }
    });

    // Services Analysis
    console.log('\n⚙️  SERVICES ANALYSIS:');
    console.log('-'.repeat(40));
    if (this.analysis.services.application) {
      const app = this.analysis.services.application;
      if (app.error) {
        console.log(`❌ Application Services: ${app.error}`);
      } else {
        console.log(`✅ Application Services: ${app.fileCount} services`);
      }
    }
    
    if (this.analysis.services.domain) {
      Object.entries(this.analysis.services.domain).forEach(([category, data]) => {
        if (data.error) {
          console.log(`❌ Domain ${category}: ${data.error}`);
        } else {
          console.log(`✅ Domain ${category}: ${data.fileCount} services`);
        }
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(40));
    if (this.analysis.recommendations.length === 0) {
      console.log('✅ No immediate issues found!');
    } else {
      this.analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
        console.log(`   Action: ${rec.action}`);
        console.log('');
      });
    }

    // Next Steps
    console.log('\n🚀 NEXT STEPS:');
    console.log('-'.repeat(40));
    console.log('1. Run layer validation: cd backend && node -e "const Application = require(\'./Application\'); ..."');
    console.log('2. Fix boundary violations in controllers');
    console.log('3. Ensure all commands have corresponding handlers');
    console.log('4. Validate layer responsibilities');
    console.log('5. Run tests after each refactoring phase');

    console.log('\n' + '='.repeat(80));
  }
}

// Run analysis
if (require.main === module) {
  const analyzer = new ArchitectureAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = ArchitectureAnalyzer; 