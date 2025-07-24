# Git DDD Migration - Commands & Handlers Pattern

## 🎯 Overview

Die Git Steps wurden von direkten `execAsync` Aufrufen auf das **DDD Pattern mit Commands und Handlers** umgestellt. Dies macht die Architektur sauberer, wiederverwendbarer und folgt den Clean Architecture Prinzipien.

## 🔄 Migration Summary

### **Vorher (Legacy Pattern):**
```javascript
// Git Step mit direktem execAsync
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async execute(context = {}) {
  const addCommand = `git add ${files}`;
  const result = await execAsync(addCommand, { cwd: projectPath });
  return { success: true, result: result.stdout };
}
```

### **Nachher (DDD Pattern):**
```javascript
// Git Step mit Command und Handler
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');

async execute(context = {}) {
  // ✅ DDD PATTERN: Create Command and Handler
  const command = CommandRegistry.buildFromCategory('git', 'GitAddFilesCommand', {
    projectPath,
    files
  });

  const handler = HandlerRegistry.buildFromCategory('git', 'GitAddFilesHandler', {
    terminalService: context.terminalService,
    logger: logger
  });

  // Execute command through handler
  const result = await handler.handle(command);
  return { success: result.success, result: result.result };
}
```

## 📁 Neue Struktur

### **Commands (Application Layer)**
```
backend/application/commands/categories/git/
├── GitAddFilesCommand.js
├── GitCommitCommand.js
├── GitPushCommand.js
├── GitPullCommand.js
├── GitCheckoutCommand.js
├── GitCreateBranchCommand.js
├── GitMergeCommand.js
├── GitStatusCommand.js
├── GitCloneCommand.js
├── GitInitCommand.js
├── GitResetCommand.js
├── GitDiffCommand.js
├── GitLogCommand.js
├── GitRemoteCommand.js
├── GitBranchCommand.js
└── GitCreatePullRequestCommand.js
```

### **Handlers (Application Layer)**
```
backend/application/handlers/categories/git/
├── GitAddFilesHandler.js
├── GitCommitHandler.js
├── GitPushHandler.js
├── GitPullHandler.js
├── GitCheckoutHandler.js
├── GitCreateBranchHandler.js
├── GitMergeHandler.js
├── GitStatusHandler.js
├── GitCloneHandler.js
├── GitInitHandler.js
├── GitResetHandler.js
├── GitDiffHandler.js
├── GitLogHandler.js
├── GitRemoteHandler.js
├── GitBranchHandler.js
└── GitCreatePullRequestHandler.js
```

### **Steps (Domain Layer)**
```
backend/domain/steps/categories/git/
├── git_add_files.js (✅ Updated)
├── git_commit.js (✅ Updated)
├── git_push.js (✅ Updated)
├── git_pull_changes.js (✅ Updated)
├── git_checkout_branch.js (✅ Updated)
├── git_create_branch.js (✅ Updated)
├── git_merge_branch.js (✅ Updated)
├── git_get_status.js (✅ Updated)
├── git_clone_repository.js (✅ Updated)
├── git_init_repository.js (✅ Updated)
├── git_reset.js (✅ Updated)
├── git_get_diff.js (✅ Updated)
├── git_get_commit_history.js (✅ Updated)
├── git_add_remote.js (✅ Updated)
├── git_get_branches.js (✅ Updated)
└── git_create_pull_request.js (✅ Updated)
```

## 🏗️ DDD Pattern Benefits

### **1. Separation of Concerns**
- **Commands**: Definieren Business Actions (Was soll gemacht werden?)
- **Handlers**: Orchestrieren Use Cases (Wie wird es gemacht?)
- **Steps**: Wrapper für Wiederverwendbarkeit (Wo wird es verwendet?)

### **2. Reusability**
```javascript
// Command kann in verschiedenen Kontexten verwendet werden
const command = CommandRegistry.buildFromCategory('git', 'GitAddFilesCommand', {
  projectPath: '/path/to/project',
  files: 'src/**/*.js'
});

// Handler kann in Steps, Services, oder direkt verwendet werden
const handler = HandlerRegistry.buildFromCategory('git', 'GitAddFilesHandler', {
  terminalService: context.terminalService,
  logger: logger
});

const result = await handler.handle(command);
```

### **3. Testability**
```javascript
// Commands können einfach getestet werden
const command = new GitAddFilesCommand({ projectPath: '/test', files: 'test.js' });
expect(command.validate()).toBe(true);

// Handlers können mit Mock Dependencies getestet werden
const mockTerminalService = { execute: jest.fn() };
const handler = new GitAddFilesHandler({ 
  terminalService: mockTerminalService,
  logger: mockLogger 
});
```

### **4. Maintainability**
- Änderungen an Git Logic nur in Commands/Handlers
- Steps bleiben unverändert
- Einfache Erweiterung neuer Git Operations

## 🔧 Usage Examples

### **1. Step Usage (Unchanged)**
```javascript
// Steps verwenden weiterhin die gleiche API
const step = require('@steps/categories/git/git_add_files');
const result = await step.execute({
  projectPath: '/path/to/project',
  files: 'src/**/*.js'
});
```

### **2. Direct Command/Handler Usage**
```javascript
// Direkte Verwendung in Services
const GitAddFilesCommand = require('@application/commands/categories/git/GitAddFilesCommand');
const GitAddFilesHandler = require('@application/handlers/categories/git/GitAddFilesHandler');

const command = new GitAddFilesCommand({
  projectPath: '/path/to/project',
  files: 'src/**/*.js'
});

const handler = new GitAddFilesHandler({
  terminalService: this.terminalService,
  logger: this.logger
});

const result = await handler.handle(command);
```

### **3. Registry Usage**
```javascript
// Verwendung über Registry
const command = CommandRegistry.buildFromCategory('git', 'GitAddFilesCommand', {
  projectPath: '/path/to/project',
  files: 'src/**/*.js'
});

const handler = HandlerRegistry.buildFromCategory('git', 'GitAddFilesHandler', {
  terminalService: this.terminalService,
  logger: this.logger
});

const result = await handler.handle(command);
```

## 🚀 Migration Scripts

### **1. Generate Commands & Handlers**
```bash
node scripts/generate-git-commands.js
```
- Generiert alle Git Commands und Handlers
- Verwendet Templates für konsistente Struktur
- Überspringt existierende Dateien

### **2. Update Steps**
```bash
node scripts/update-git-steps.js
```
- Aktualisiert alle Git Steps auf DDD Pattern
- Erstellt Backups der originalen Dateien
- Überspringt bereits aktualisierte Steps

## 📊 Registry Updates

### **CommandRegistry.js**
```javascript
git: {
  GitAddFilesCommand: require('./categories/git/GitAddFilesCommand'),
  GitCommitCommand: require('./categories/git/GitCommitCommand'),
  GitPushCommand: require('./categories/git/GitPushCommand'),
  // ... alle anderen Git Commands
}
```

### **HandlerRegistry.js**
```javascript
git: {
  GitAddFilesHandler: require('./categories/git/GitAddFilesHandler'),
  GitCommitHandler: require('./categories/git/GitCommitHandler'),
  GitPushHandler: require('./categories/git/GitPushHandler'),
  // ... alle anderen Git Handlers
}
```

## 🧪 Testing

### **1. Unit Tests für Commands**
```javascript
describe('GitAddFilesCommand', () => {
  it('should validate required parameters', () => {
    const command = new GitAddFilesCommand({ projectPath: '/test' });
    expect(command.validate()).toBe(true);
  });

  it('should throw error for missing projectPath', () => {
    expect(() => new GitAddFilesCommand({})).toThrow('Project path is required');
  });
});
```

### **2. Unit Tests für Handlers**
```javascript
describe('GitAddFilesHandler', () => {
  it('should execute git add command', async () => {
    const mockTerminalService = { execute: jest.fn() };
    const handler = new GitAddFilesHandler({ 
      terminalService: mockTerminalService,
      logger: mockLogger 
    });

    const command = new GitAddFilesCommand({
      projectPath: '/test',
      files: 'test.js'
    });

    const result = await handler.handle(command);
    expect(result.success).toBe(true);
  });
});
```

### **3. Integration Tests für Steps**
```javascript
describe('GitAddFilesStep', () => {
  it('should execute using DDD pattern', async () => {
    const step = require('@steps/categories/git/git_add_files');
    const result = await step.execute({
      projectPath: '/test',
      files: 'test.js'
    });

    expect(result.success).toBe(true);
  });
});
```

## 🔄 Rollback

Falls ein Rollback nötig ist:
```bash
# Backup Dateien wiederherstellen
find backend/domain/steps/categories/git -name "*.backup" -exec bash -c 'cp "$1" "${1%.backup}"' _ {} \;

# Commands und Handlers entfernen
rm -rf backend/application/commands/categories/git
rm -rf backend/application/handlers/categories/git
```

## 📈 Next Steps

1. **Testing**: Alle Git Steps testen
2. **Documentation**: API Dokumentation aktualisieren
3. **Performance**: Performance Tests durchführen
4. **Monitoring**: Logging und Monitoring anpassen
5. **Training**: Team über neue Pattern informieren

## 🎯 Benefits Achieved

- ✅ **Clean Architecture**: Klare Trennung der Verantwortlichkeiten
- ✅ **Reusability**: Commands und Handlers können überall verwendet werden
- ✅ **Testability**: Einfache Unit Tests für Commands und Handlers
- ✅ **Maintainability**: Änderungen nur an einer Stelle nötig
- ✅ **Extensibility**: Neue Git Operations einfach hinzufügen
- ✅ **Consistency**: Einheitliches Pattern für alle Git Operations 