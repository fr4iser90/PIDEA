# Phase 1: File Naming Standardization

## 📋 **Phase Overview**
- **Duration**: 6 hours
- **Priority**: Critical
- **Status**: Planning
- **Dependencies**: None

## 🎯 **Goals**
- Standardize all file names to PascalCase conventions
- Fix snake_case and inconsistent naming patterns
- Update all import/require statements
- Ensure no broken references

## 📊 **Critical File Renames**

### **Domain Layer - Steps**
```javascript
// ❌ CURRENT (snake_case)
backend/domain/steps/categories/ide/ide_send_message.js
backend/domain/steps/categories/git/git_commit.js
backend/domain/steps/categories/analysis/project_analysis_step.js

// ✅ TARGET (PascalCase)
backend/domain/steps/categories/ide/IDESendMessageStep.js
backend/domain/steps/categories/git/GitCommitStep.js
backend/domain/steps/categories/analysis/ProjectAnalysisStep.js
```

### **Infrastructure Layer - Services**
```javascript
// ❌ CURRENT (inconsistent prefixes)
backend/infrastructure/external/VSCodeIDEService.js

// ✅ TARGET (clean naming)
backend/infrastructure/external/VSCodeService.js
```

## 🔄 **Step-by-Step Tasks**

### **Task 1.1: Analysis & Mapping (1 hour)**
- [ ] Scan entire backend directory for naming inconsistencies
- [ ] Create complete mapping of old → new file names
- [ ] Identify all files with import references
- [ ] Document dependencies and import chains

### **Task 1.2: Domain Steps Renaming (2 hours)**
- [ ] Rename `ide_send_message.js` → `IDESendMessageStep.js`
- [ ] Rename `git_commit.js` → `GitCommitStep.js`
- [ ] Rename `project_analysis_step.js` → `ProjectAnalysisStep.js`
- [ ] Update module.exports names in renamed files
- [ ] Verify file content consistency

### **Task 1.3: Infrastructure Services Renaming (1 hour)**
- [ ] Rename `VSCodeIDEService.js` → `VSCodeService.js`
- [ ] Update any other infrastructure files with inconsistent naming
- [ ] Check for repository naming inconsistencies
- [ ] Verify external service references

### **Task 1.4: Import Statement Updates (1.5 hours)**
- [ ] Find all require() statements referencing old names
- [ ] Update import paths in workflow files
- [ ] Update import paths in orchestrator files
- [ ] Update import paths in test files
- [ ] Verify all module resolution works

### **Task 1.5: Validation & Testing (0.5 hours)**
- [ ] Run `node -c` syntax check on all modified files
- [ ] Test require() resolution for renamed modules
- [ ] Check for any remaining broken references
- [ ] Verify no runtime import errors

## 🎯 **Specific Commands**

### **File Rename Operations**
```bash
# Domain Steps
mv backend/domain/steps/categories/ide/ide_send_message.js backend/domain/steps/categories/ide/IDESendMessageStep.js
mv backend/domain/steps/categories/git/git_commit.js backend/domain/steps/categories/git/GitCommitStep.js
mv backend/domain/steps/categories/analysis/project_analysis_step.js backend/domain/steps/categories/analysis/ProjectAnalysisStep.js

# Infrastructure Services
mv backend/infrastructure/external/VSCodeIDEService.js backend/infrastructure/external/VSCodeService.js
```

### **Import Update Pattern**
```javascript
// FROM
const ide_send_message = require('./categories/ide/ide_send_message');
const git_commit = require('./categories/git/git_commit');

// TO
const IDESendMessageStep = require('./categories/ide/IDESendMessageStep');
const GitCommitStep = require('./categories/git/GitCommitStep');
```

## ✅ **Success Criteria**
- [ ] All files use PascalCase naming convention
- [ ] No snake_case file names remain
- [ ] All imports resolve correctly
- [ ] No broken require() statements
- [ ] Syntax check passes for all files
- [ ] No runtime module resolution errors

## 🔍 **Validation Script**
```javascript
// scripts/validate-naming-phase1.js
const fs = require('fs');
const path = require('path');

function validateFileNaming(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    if (file.isDirectory()) {
      validateFileNaming(path.join(dir, file.name));
    } else if (file.name.endsWith('.js')) {
      // Check for snake_case patterns
      if (file.name.includes('_')) {
        console.error(`❌ Snake case file: ${path.join(dir, file.name)}`);
      } else {
        console.log(`✅ Correct naming: ${path.join(dir, file.name)}`);
      }
    }
  });
}

validateFileNaming('./backend');
```

## 📝 **Notes & Considerations**
- **Git History**: Use `git mv` to preserve file history
- **Case Sensitivity**: Ensure consistent PascalCase across all platforms
- **Import Cache**: Clear Node.js require cache during testing
- **Backup**: Keep backup of original structure until validation complete

## 🚀 **Next Phase**
After Phase 1 completion, proceed to **Phase 2: Class Naming Conventions** to update internal class names and constructor calls. 