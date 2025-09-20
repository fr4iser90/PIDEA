# Phase 2: Class Naming Conventions

## 📋 **Phase Overview**
- **Duration**: 6 hours
- **Priority**: High
- **Status**: Planning
- **Dependencies**: Phase 1 completed

## 🎯 **Goals**
- Standardize all class names to PascalCase
- Remove inconsistent prefixes/suffixes
- Update constructor calls and instantiations
- Fix inheritance and interface implementations

## 📊 **Critical Class Renames**

### **Domain Steps Classes**
```javascript
// ❌ CURRENT (snake_case classes)
class ide_send_message {
  constructor() { }
  async execute() { }
}

class git_commit {
  constructor() { }
  async execute() { }
}

class project_analysis_step {
  constructor() { }
  async execute() { }
}

// ✅ TARGET (PascalCase classes)
class IDESendMessageStep {
  constructor() { }
  async execute() { }
}

class GitCommitStep {
  constructor() { }
  async execute() { }
}

class ProjectAnalysisStep {
  constructor() { }
  async execute() { }
}
```

### **Infrastructure Services Classes**
```javascript
// ❌ CURRENT (inconsistent naming)
class VSCodeIDEService {
  constructor() { }
}

class PostgreSQLChatRepository {
  constructor() { }
}

class SQLiteTaskRepository {
  constructor() { }
}

// ✅ TARGET (consistent naming)
class VSCodeService {
  constructor() { }
}

class ChatRepository {  // Interface style
  constructor() { }
}

class TaskRepository {  // Interface style
  constructor() { }
}
```

## 🔄 **Step-by-Step Tasks**

### **Task 2.1: Domain Layer Class Updates (2 hours)**
- [ ] Update `ide_send_message` class → `IDESendMessageStep`
- [ ] Update `git_commit` class → `GitCommitStep`  
- [ ] Update `project_analysis_step` class → `ProjectAnalysisStep`
- [ ] Fix constructor names and method references
- [ ] Update module.exports to match new class names

### **Task 2.2: Infrastructure Layer Class Updates (2 hours)**
- [ ] Update `VSCodeIDEService` class → `VSCodeService`
- [ ] Review repository class naming for consistency
- [ ] Update service class names following conventions
- [ ] Fix orchestrator class references
- [ ] Update external service implementations

### **Task 2.3: Constructor & Instantiation Updates (1 hour)**
- [ ] Find all `new ide_send_message()` calls
- [ ] Update to `new IDESendMessageStep()`
- [ ] Find all `new git_commit()` calls
- [ ] Update to `new GitCommitStep()`
- [ ] Update workflow instantiation patterns

### **Task 2.4: Inheritance & Interface Updates (0.5 hours)**
- [ ] Update class extends statements
- [ ] Fix interface implementation references
- [ ] Update abstract class inheritance
- [ ] Verify polymorphic usage patterns

### **Task 2.5: Documentation & JSDoc Updates (0.5 hours)**
- [ ] Update JSDoc class name references
- [ ] Fix inline documentation
- [ ] Update code comments referencing old names
- [ ] Verify API documentation consistency

## 🎯 **Specific Code Transformations**

### **Step Class Updates**
```javascript
// ❌ BEFORE
class ide_send_message {
  constructor(ideService) {
    this.ideService = ideService;
  }
  
  async execute(context) {
    // Implementation
  }
}

module.exports = ide_send_message;

// ✅ AFTER
class IDESendMessageStep {
  constructor(ideService) {
    this.ideService = ideService;
  }
  
  async execute(context) {
    // Implementation
  }
}

module.exports = IDESendMessageStep;
```

### **Service Class Updates**
```javascript
// ❌ BEFORE
class VSCodeIDEService {
  constructor() {
    this.name = 'VSCodeIDEService';
  }
}

module.exports = VSCodeIDEService;

// ✅ AFTER
class VSCodeService {
  constructor() {
    this.name = 'VSCodeService';
  }
}

module.exports = VSCodeService;
```

### **Constructor Call Updates**
```javascript
// ❌ BEFORE
const ide_send_message = require('./IDESendMessageStep');
const step = new ide_send_message(ideService);

// ✅ AFTER
const IDESendMessageStep = require('./IDESendMessageStep');
const step = new IDESendMessageStep(ideService);
```

## 🔄 **Registry & Factory Updates**

### **Step Registry Updates**
```javascript
// ❌ BEFORE
const stepRegistry = {
  'ide_send_message': require('./categories/ide/IDESendMessageStep'),
  'git_commit': require('./categories/git/GitCommitStep'),
  'project_analysis_step': require('./categories/analysis/ProjectAnalysisStep')
};

// ✅ AFTER
const stepRegistry = {
  'IDESendMessageStep': require('./categories/ide/IDESendMessageStep'),
  'GitCommitStep': require('./categories/git/GitCommitStep'),
  'ProjectAnalysisStep': require('./categories/analysis/ProjectAnalysisStep')
};
```

### **Factory Pattern Updates**
```javascript
// ❌ BEFORE
createStep(type) {
  switch(type) {
    case 'ide_send_message':
      return new ide_send_message();
    case 'git_commit':
      return new git_commit();
  }
}

// ✅ AFTER
createStep(type) {
  switch(type) {
    case 'IDESendMessageStep':
      return new IDESendMessageStep();
    case 'GitCommitStep':
      return new GitCommitStep();
  }
}
```

## ✅ **Success Criteria**
- [ ] All class names use PascalCase convention
- [ ] No snake_case class names remain
- [ ] All constructor calls use new class names
- [ ] Inheritance patterns work correctly
- [ ] Module exports match class names
- [ ] Factory patterns updated
- [ ] Registry mappings updated
- [ ] JSDoc references updated

## 🔍 **Validation Script**
```javascript
// scripts/validate-classes-phase2.js
const fs = require('fs');
const path = require('path');

function validateClassNames(file) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check for snake_case class definitions
  const snakeCaseClasses = content.match(/class\s+[a-z_]+\s*{/g);
  if (snakeCaseClasses) {
    console.error(`❌ Snake case classes in ${file}:`, snakeCaseClasses);
  }
  
  // Check for snake_case constructor calls
  const snakeCaseConstructors = content.match(/new\s+[a-z_]+\s*\(/g);
  if (snakeCaseConstructors) {
    console.error(`❌ Snake case constructors in ${file}:`, snakeCaseConstructors);
  }
  
  // Check for proper PascalCase
  const pascalCaseClasses = content.match(/class\s+[A-Z][a-zA-Z]*\s*{/g);
  if (pascalCaseClasses) {
    console.log(`✅ PascalCase classes in ${file}:`, pascalCaseClasses);
  }
}

function scanFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    if (file.isDirectory()) {
      scanFiles(path.join(dir, file.name));
    } else if (file.name.endsWith('.js')) {
      validateClassNames(path.join(dir, file.name));
    }
  });
}

scanFiles('./backend');
```

## 📝 **Test Updates Required**
```javascript
// Update test files to use new class names
// tests/unit/domain/steps/IDESendMessageStep.test.js

// ❌ BEFORE
const ide_send_message = require('../../../../backend/domain/steps/categories/ide/IDESendMessageStep');

describe('ide_send_message', () => {
  test('should execute successfully', () => {
    const step = new ide_send_message();
    // Test implementation
  });
});

// ✅ AFTER
const IDESendMessageStep = require('../../../../backend/domain/steps/categories/ide/IDESendMessageStep');

describe('IDESendMessageStep', () => {
  test('should execute successfully', () => {
    const step = new IDESendMessageStep();
    // Test implementation
  });
});
```

## 🚀 **Next Phase**
After Phase 2 completion, proceed to **Phase 3: Layer Structure Organization** to ensure proper architectural layer separation and dependencies. 