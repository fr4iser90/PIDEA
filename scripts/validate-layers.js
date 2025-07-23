#!/usr/bin/env node

/**
 * Layer Validation Script - PIDEA Architecture Validation
 * Standalone script to validate layer boundaries without Application.js dependencies
 */

require('module-alias/register');
const path = require('path');
const fs = require('fs').promises;

class LayerValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.backendPath = path.join(this.projectRoot, 'backend');
    this.violations = [];
  }

  async validateLayers() {
    console.log('🔍 Validating Layer Boundaries...\n');
    
    try {
      // Load the Application class
      const Application = require('./backend/Application');
      const app = new Application();
      
      console.log('🚀 Initializing Application...');
      await app.initialize();
      
      console.log('🔍 Running Layer Validation...');
      const service = app.serviceRegistry.getService('advancedAnalysisService');
      const result = await service.layerValidationService.validateLayers(process.cwd());
      
      // Print results
      console.log('\n' + '='.repeat(80));
      console.log('🎯 LAYER VALIDATION RESULTS');
      console.log('='.repeat(80));
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`- Overall Valid: ${result.overall ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`- Total Violations: ${result.violations.length}`);
      console.log(`- Boundary Violations: ${result.violations.filter(v => v.type === 'boundary-violation').length}`);
      console.log(`- Import Violations: ${result.violations.filter(v => v.type === 'import-violation').length}`);
      console.log(`- Logic Violations: ${result.violations.filter(v => v.type === 'logic-violation').length}`);
      
      // Show progress
      const totalViolations = result.violations.length;
      const boundaryViolations = result.violations.filter(v => v.type === 'boundary-violation').length;
      
      if (totalViolations > 0) {
        console.log(`\n📈 PROGRESS:`);
        console.log(`- Current: ${totalViolations} violations`);
        console.log(`- Target: 0 violations`);
        console.log(`- Remaining: ${totalViolations} violations`);
        
        if (boundaryViolations > 0) {
          console.log(`\n🚨 CRITICAL: ${boundaryViolations} boundary violations need immediate attention`);
        }
      } else {
        console.log(`\n🎉 SUCCESS: All layer validations passed!`);
      }
      
      // Show top violations
      if (result.violations.length > 0) {
        console.log(`\n⚠️  TOP VIOLATIONS:`);
        result.violations.slice(0, 5).forEach((violation, index) => {
          console.log(`${index + 1}. ${violation.file || violation.message}`);
        });
        
        if (result.violations.length > 5) {
          console.log(`   ... and ${result.violations.length - 5} more`);
        }
      }
      
      console.log('\n' + '='.repeat(80));
      
      // Cleanup
      if (typeof app.shutdown === 'function') {
        await app.shutdown();
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async quickValidate() {
    console.log('🔍 Quick Layer Validation...\n');
    
    try {
      // Simple validation without full Application initialization
      const violations = await this.scanForViolations();
      
      console.log('\n' + '='.repeat(60));
      console.log('🔍 QUICK VALIDATION RESULTS');
      console.log('='.repeat(60));
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`- Total Violations: ${violations.length}`);
      console.log(`- Boundary Violations: ${violations.filter(v => v.type === 'boundary-violation').length}`);
      console.log(`- Import Violations: ${violations.filter(v => v.type === 'import-violation').length}`);
      
      if (violations.length > 0) {
        console.log(`\n⚠️  VIOLATIONS FOUND:`);
        violations.slice(0, 3).forEach((violation, index) => {
          console.log(`${index + 1}. ${violation.file}: ${violation.message}`);
        });
      } else {
        console.log(`\n✅ No obvious violations found`);
      }
      
      console.log('\n' + '='.repeat(60));
      
      return violations;
      
    } catch (error) {
      console.error('❌ Quick validation failed:', error.message);
      throw error;
    }
  }

  async scanForViolations() {
    const violations = [];
    
    // Scan controllers for direct repository usage
    const controllersPath = path.join(this.backendPath, 'presentation/api');
    try {
      const files = await this.getFilesRecursively(controllersPath, '.js');
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const relativePath = path.relative(this.backendPath, file);
        
        // Check for direct repository usage
        const repoUsage = content.match(/this\.\w*Repository/g);
        if (repoUsage) {
          violations.push({
            file: relativePath,
            type: 'boundary-violation',
            message: `Direct repository usage: ${repoUsage.join(', ')}`
          });
        }
        
        // Check for direct domain imports
        const domainImports = content.match(/require\(['"]\.\.\/\.\.\/domain/g);
        if (domainImports) {
          violations.push({
            file: relativePath,
            type: 'boundary-violation',
            message: `Direct domain imports: ${domainImports.length} found`
          });
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not scan controllers: ${error.message}`);
    }
    
    return violations;
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
}

// CLI Interface
async function main() {
  const validator = new LayerValidator();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'full';
  
  try {
    switch (command) {
      case 'quick':
        await validator.quickValidate();
        break;
      case 'full':
      default:
        await validator.validateLayers();
        break;
    }
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LayerValidator; 