#!/usr/bin/env node

/**
 * Layer Violation Fix Script - PIDEA Architecture Cleanup
 * Identifies and provides guidance for fixing layer boundary violations
 */

const fs = require('fs').promises;
const path = require('path');

class LayerViolationFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.backendPath = path.join(this.projectRoot, 'backend');
    this.violations = [];
    this.fixes = [];
    this.outputDir = path.join(this.projectRoot, 'output/fix-plans');
  }

  async analyzeViolations() {
    console.log('🔍 Analyzing Layer Violations...\n');
    
    await this.scanControllers();
    await this.scanHandlers();
    await this.scanServices();
    
    this.generateFixes();
    await this.generateFixPlans();
    this.printReport();
  }

  async scanControllers() {
    console.log('📊 Scanning Controllers for violations...');
    
    const controllersPath = path.join(this.backendPath, 'presentation/api');
    try {
      const files = await this.getFilesRecursively(controllersPath, '.js');
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const violations = this.findControllerViolations(content, file);
        this.violations.push(...violations);
      }
    } catch (error) {
      console.log(`❌ Error scanning controllers: ${error.message}`);
    }
  }

  async scanHandlers() {
    console.log('🔧 Scanning Handlers for violations...');
    
    const handlersPath = path.join(this.backendPath, 'application/handlers/categories');
    try {
      const categories = await this.getDirectories(handlersPath);
      
      for (const category of categories) {
        const categoryPath = path.join(handlersPath, category);
        const files = await this.getFilesRecursively(categoryPath, '.js');
        
        for (const file of files) {
          const content = await fs.readFile(file, 'utf8');
          const violations = this.findHandlerViolations(content, file);
          this.violations.push(...violations);
        }
      }
    } catch (error) {
      console.log(`❌ Error scanning handlers: ${error.message}`);
    }
  }

  async scanServices() {
    console.log('⚙️  Scanning Services for violations...');
    
    // Scan Application Services
    const appServicesPath = path.join(this.backendPath, 'application/services');
    try {
      const files = await this.getFilesRecursively(appServicesPath, '.js');
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const violations = this.findServiceViolations(content, file, 'application');
        this.violations.push(...violations);
      }
    } catch (error) {
      console.log(`❌ Error scanning application services: ${error.message}`);
    }
  }

  findControllerViolations(content, filePath) {
    const violations = [];
    const relativePath = path.relative(this.backendPath, filePath);
    
    // Check for direct domain imports
    const domainImports = content.match(/require\(['"]\.\.\/\.\.\/domain/g);
    if (domainImports) {
      violations.push({
        file: relativePath,
        type: 'boundary-violation',
        severity: 'critical',
        message: 'Controller directly imports from domain layer',
        details: `Found ${domainImports.length} direct domain imports`,
        fix: 'Use Application Services instead of direct domain access'
      });
    }

    // Check for direct infrastructure imports
    const infraImports = content.match(/require\(['"]\.\.\/\.\.\/infrastructure/g);
    if (infraImports) {
      violations.push({
        file: relativePath,
        type: 'boundary-violation',
        severity: 'critical',
        message: 'Controller directly imports from infrastructure layer',
        details: `Found ${infraImports.length} direct infrastructure imports`,
        fix: 'Use Application Services instead of direct infrastructure access'
      });
    }

    // Check for direct repository usage
    const repoUsage = content.match(/this\.\w*Repository/g);
    if (repoUsage) {
      violations.push({
        file: relativePath,
        type: 'boundary-violation',
        severity: 'high',
        message: 'Controller directly uses repository',
        details: `Found repository usage: ${repoUsage.join(', ')}`,
        fix: 'Inject and use Application Service instead of repository'
      });
    }

    return violations;
  }

  findHandlerViolations(content, filePath) {
    const violations = [];
    const relativePath = path.relative(this.backendPath, filePath);
    
    // Check for direct infrastructure imports
    const infraImports = content.match(/require\(['"]\.\.\/\.\.\/\.\.\/infrastructure/g);
    if (infraImports) {
      violations.push({
        file: relativePath,
        type: 'boundary-violation',
        severity: 'high',
        message: 'Handler directly imports from infrastructure layer',
        details: `Found ${infraImports.length} direct infrastructure imports`,
        fix: 'Use dependency injection for infrastructure services'
      });
    }

    return violations;
  }

  findServiceViolations(content, filePath, layer) {
    const violations = [];
    const relativePath = path.relative(this.backendPath, filePath);
    
    if (layer === 'application') {
      // Application services should not import from presentation
      const presentationImports = content.match(/require\(['"]\.\.\/\.\.\/presentation/g);
      if (presentationImports) {
        violations.push({
          file: relativePath,
          type: 'boundary-violation',
          severity: 'critical',
          message: 'Application service imports from presentation layer',
          details: `Found ${presentationImports.length} presentation imports`,
          fix: 'Remove presentation layer dependencies'
        });
      }
    }

    return violations;
  }

  generateFixes() {
    console.log('🔧 Generating fix recommendations...');
    
    // Group violations by file
    const violationsByFile = {};
    this.violations.forEach(v => {
      if (!violationsByFile[v.file]) {
        violationsByFile[v.file] = [];
      }
      violationsByFile[v.file].push(v);
    });

    // Generate fixes for each file
    Object.entries(violationsByFile).forEach(([file, violations]) => {
      const fix = this.generateFileFix(file, violations);
      if (fix) {
        this.fixes.push(fix);
      }
    });
  }

  generateFileFix(file, violations) {
    const fileName = path.basename(file, '.js');
    const isController = file.includes('presentation/api');
    const isHandler = file.includes('application/handlers');
    const isService = file.includes('application/services');

    if (isController) {
      return {
        file,
        type: 'controller-refactor',
        priority: 'critical',
        steps: [
          `1. Create ${fileName.replace('Controller', 'ApplicationService')} if not exists`,
          `2. Move business logic from ${fileName} to Application Service`,
          `3. Update ${fileName} constructor to inject Application Service only`,
          `4. Remove direct domain/infrastructure imports from ${fileName}`,
          `5. Ensure ${fileName} only handles HTTP concerns`
        ],
        example: this.generateControllerExample(fileName)
      };
    }

    if (isHandler) {
      return {
        file,
        type: 'handler-refactor',
        priority: 'high',
        steps: [
          `1. Use dependency injection for infrastructure services`,
          `2. Remove direct infrastructure imports from ${fileName}`,
          `3. Ensure ${fileName} only orchestrates domain services`
        ]
      };
    }

    if (isService) {
      return {
        file,
        type: 'service-refactor',
        priority: 'medium',
        steps: [
          `1. Remove presentation layer dependencies from ${fileName}`,
          `2. Ensure ${fileName} only depends on domain and infrastructure layers`
        ]
      };
    }

    return null;
  }

  generateControllerExample(controllerName) {
    const serviceName = controllerName.replace('Controller', 'ApplicationService');
    
    return `// ❌ BEFORE (Violation):
class ${controllerName} {
  constructor(taskRepository, taskService, domainEntity) {
    this.taskRepository = taskRepository; // ❌ Direct repository
    this.taskService = taskService;       // ❌ Direct domain service
    this.domainEntity = domainEntity;     // ❌ Direct domain entity
  }
}

// ✅ AFTER (Correct):
class ${controllerName} {
  constructor(${serviceName.toLowerCase()}) {
    this.${serviceName.toLowerCase()} = ${serviceName.toLowerCase()}; // ✅ Only Application Service
  }
  
  async createTask(req, res) {
    try {
      const result = await this.${serviceName.toLowerCase()}.createTask(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}`;
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

  async generateFixPlans() {
    console.log('📝 Generating Fix Plans...');
    
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // Generate individual fix plans
    for (const fix of this.fixes) {
      await this.generateIndividualFixPlan(fix);
    }
    
    // Generate master plan
    await this.generateMasterPlan();
    
    console.log(`✅ Fix plans generated in: ${this.outputDir}`);
  }

  async generateIndividualFixPlan(fix) {
    const fileName = path.basename(fix.file, '.js');
    const planFileName = `${fileName}-fix-plan.md`;
    const planPath = path.join(this.outputDir, planFileName);
    
    let planContent = `# Fix Plan: ${fileName}\n\n`;
    planContent += `**File:** \`${fix.file}\`\n`;
    planContent += `**Type:** ${fix.type}\n`;
    planContent += `**Priority:** ${fix.priority.toUpperCase()}\n\n`;
    
    planContent += `## Steps to Fix:\n\n`;
    fix.steps.forEach((step, index) => {
      planContent += `${index + 1}. ${step}\n`;
    });
    
    if (fix.example) {
      planContent += `\n## Code Example:\n\n`;
      planContent += `\`\`\`javascript\n`;
      planContent += fix.example;
      planContent += `\n\`\`\`\n`;
    }
    
    planContent += `\n## Validation:\n\n`;
    planContent += `After making changes, run:\n`;
    planContent += `\`\`\`bash\n`;
    planContent += `cd backend && node -e "const Application = require('./Application'); (async () => { const app = new Application(); await app.initialize(); const service = app.serviceRegistry.getService('advancedAnalysisService'); const result = await service.layerValidationService.validateLayers(process.cwd()); console.log('Boundary Violations:', result.violations.filter(v => v.type === 'boundary-violation').length); })();"\n`;
    planContent += `\`\`\`\n`;
    
    planContent += `\n## Status:\n\n`;
    planContent += `- [ ] Not started\n`;
    planContent += `- [ ] In progress\n`;
    planContent += `- [ ] Completed\n`;
    planContent += `- [ ] Validated\n`;
    
    await fs.writeFile(planPath, planContent);
  }

  async generateMasterPlan() {
    const masterPlanPath = path.join(this.outputDir, 'MASTER-FIX-PLAN.md');
    
    let content = `# Master Fix Plan - PIDEA Layer Violations\n\n`;
    content += `**Generated:** ${new Date().toISOString()}\n`;
    content += `**Total Violations:** ${this.violations.length}\n`;
    content += `**Total Fixes:** ${this.fixes.length}\n\n`;
    
    // Summary
    const criticalViolations = this.violations.filter(v => v.severity === 'critical');
    const highViolations = this.violations.filter(v => v.severity === 'high');
    const mediumViolations = this.violations.filter(v => v.severity === 'medium');
    
    content += `## Violation Summary:\n\n`;
    content += `- Critical: ${criticalViolations.length}\n`;
    content += `- High: ${highViolations.length}\n`;
    content += `- Medium: ${mediumViolations.length}\n\n`;
    
    // Critical Fixes
    const criticalFixes = this.fixes.filter(f => f.priority === 'critical');
    if (criticalFixes.length > 0) {
      content += `## 🚨 Critical Fixes (Start Here):\n\n`;
      criticalFixes.forEach((fix, index) => {
        const fileName = path.basename(fix.file, '.js');
        content += `### ${index + 1}. ${fileName}\n`;
        content += `- **File:** \`${fix.file}\`\n`;
        content += `- **Plan:** [${fileName}-fix-plan.md](./${fileName}-fix-plan.md)\n`;
        content += `- **Status:** ⏳ Pending\n\n`;
      });
    }
    
    // High Priority Fixes
    const highFixes = this.fixes.filter(f => f.priority === 'high');
    if (highFixes.length > 0) {
      content += `## ⚠️ High Priority Fixes:\n\n`;
      highFixes.forEach((fix, index) => {
        const fileName = path.basename(fix.file, '.js');
        content += `### ${index + 1}. ${fileName}\n`;
        content += `- **File:** \`${fix.file}\`\n`;
        content += `- **Plan:** [${fileName}-fix-plan.md](./${fileName}-fix-plan.md)\n`;
        content += `- **Status:** ⏳ Pending\n\n`;
      });
    }
    
    // Workflow
    content += `## 🚀 Workflow:\n\n`;
    content += `1. **Start with Critical Fixes** (Controller refactoring)\n`;
    content += `2. **Follow individual fix plans** step by step\n`;
    content += `3. **Validate after each fix** using layer validation\n`;
    content += `4. **Update tests** for new architecture\n`;
    content += `5. **Mark as completed** in individual plans\n\n`;
    
    // Validation Commands
    content += `## 🔍 Validation Commands:\n\n`;
    content += `### Layer Validation:\n`;
    content += `\`\`\`bash\n`;
    content += `cd backend && node -e "const Application = require('./Application'); (async () => { const app = new Application(); await app.initialize(); const service = app.serviceRegistry.getService('advancedAnalysisService'); const result = await service.layerValidationService.validateLayers(process.cwd()); console.log('🎯 PROGRESS:'); console.log('Overall Valid:', result.overall); console.log('Boundary Violations:', result.violations.filter(v => v.type === 'boundary-violation').length); console.log('Import Violations:', result.violations.filter(v => v.type === 'import-violation').length); console.log('Logic Violations:', result.violations.filter(v => v.type === 'logic-violation').length); })();"\n`;
    content += `\`\`\`\n\n`;
    
    content += `### Architecture Analysis:\n`;
    content += `\`\`\`bash\n`;
    content += `node scripts/architecture-analysis.js\n`;
    content += `\`\`\`\n\n`;
    
    content += `### Layer Violation Analysis:\n`;
    content += `\`\`\`bash\n`;
    content += `node scripts/fix-layer-violations.js\n`;
    content += `\`\`\`\n\n`;
    
    // Progress Tracking
    content += `## 📊 Progress Tracking:\n\n`;
    content += `| Fix | Status | Started | Completed | Validated |\n`;
    content += `|-----|--------|---------|-----------|-----------|\n`;
    
    this.fixes.forEach(fix => {
      const fileName = path.basename(fix.file, '.js');
      content += `| ${fileName} | ⏳ Pending | - | - | - |\n`;
    });
    
    await fs.writeFile(masterPlanPath, content);
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 LAYER VIOLATION ANALYSIS REPORT');
    console.log('='.repeat(80));

    // Summary
    const criticalViolations = this.violations.filter(v => v.severity === 'critical');
    const highViolations = this.violations.filter(v => v.severity === 'high');
    const mediumViolations = this.violations.filter(v => v.severity === 'medium');

    console.log(`\n📊 VIOLATION SUMMARY:`);
    console.log(`- Critical: ${criticalViolations.length}`);
    console.log(`- High: ${highViolations.length}`);
    console.log(`- Medium: ${mediumViolations.length}`);
    console.log(`- Total: ${this.violations.length}`);

    // Critical Violations
    if (criticalViolations.length > 0) {
      console.log('\n🚨 CRITICAL VIOLATIONS:');
      console.log('-'.repeat(40));
      criticalViolations.forEach((v, index) => {
        console.log(`${index + 1}. ${v.file}`);
        console.log(`   ${v.message}`);
        console.log(`   Fix: ${v.fix}\n`);
      });
    }

    // High Violations
    if (highViolations.length > 0) {
      console.log('\n⚠️  HIGH PRIORITY VIOLATIONS:');
      console.log('-'.repeat(40));
      highViolations.forEach((v, index) => {
        console.log(`${index + 1}. ${v.file}`);
        console.log(`   ${v.message}`);
        console.log(`   Fix: ${v.fix}\n`);
      });
    }

    // Fix Recommendations
    if (this.fixes.length > 0) {
      console.log('\n🔧 FIX RECOMMENDATIONS:');
      console.log('-'.repeat(40));
      
      const criticalFixes = this.fixes.filter(f => f.priority === 'critical');
      const highFixes = this.fixes.filter(f => f.priority === 'high');
      const mediumFixes = this.fixes.filter(f => f.priority === 'medium');

      if (criticalFixes.length > 0) {
        console.log('\n🚨 CRITICAL FIXES:');
        criticalFixes.forEach((fix, index) => {
          console.log(`\n${index + 1}. ${fix.file} (${fix.type})`);
          fix.steps.forEach(step => console.log(`   ${step}`));
          if (fix.example) {
            console.log(`\n   Example:`);
            console.log(`   ${fix.example.split('\n').join('\n   ')}`);
          }
        });
      }

      if (highFixes.length > 0) {
        console.log('\n⚠️  HIGH PRIORITY FIXES:');
        highFixes.forEach((fix, index) => {
          console.log(`\n${index + 1}. ${fix.file} (${fix.type})`);
          fix.steps.forEach(step => console.log(`   ${step}`));
        });
      }
    }

    // Next Steps
    console.log('\n🚀 IMMEDIATE ACTION PLAN:');
    console.log('-'.repeat(40));
    console.log('1. Start with CRITICAL violations (Controller refactoring)');
    console.log('2. Create missing Application Services');
    console.log('3. Update Controller constructors to use Application Services only');
    console.log('4. Remove direct domain/infrastructure imports from Controllers');
    console.log('5. Run layer validation after each fix');
    console.log('6. Update tests for new architecture');

    console.log('\n' + '='.repeat(80));
  }
}

// Run analysis
if (require.main === module) {
  const fixer = new LayerViolationFixer();
  fixer.analyzeViolations().catch(console.error);
}

module.exports = LayerViolationFixer; 