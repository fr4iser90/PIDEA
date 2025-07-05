# Dependency Injection System

## Übersicht

Das neue Dependency Injection System zentralisiert die Service-Registrierung und Projekt-Kontext-Verwaltung. Es eliminiert Inkonsistenzen bei der Projekt-Pfad-Abfrage und standardisiert die Dependency Injection.

## 🏗️ **Architektur**

### ServiceContainer
- **Zentrale Service-Registrierung** mit Factory-Pattern
- **Singleton-Management** für Services
- **Automatische Dependency-Resolution**
- **Projekt-Kontext-Verwaltung**

### ProjectContextService
- **Einheitliche Projekt-Pfad-Abfrage**
- **Auto-Detection** von Projekt-Roots
- **Validierung** von Projekt-Kontexten
- **Fallback-Mechanismen**

### ServiceRegistry
- **Zentrale Service-Konfiguration**
- **Kategorisierte Service-Registrierung**
- **Dependency-Graph-Management**

## 📋 **Verwendung**

### 1. Service Container verwenden

```javascript
const { getServiceContainer } = require('./infrastructure/di/ServiceContainer');

// Service registrieren
const container = getServiceContainer();
container.register('myService', (dependency1, dependency2) => {
    return new MyService(dependency1, dependency2);
}, { singleton: true, dependencies: ['dependency1', 'dependency2'] });

// Service abrufen
const myService = container.resolve('myService');
```

### 2. Projekt-Kontext verwenden

```javascript
const { getProjectContextService } = require('./infrastructure/di/ProjectContextService');

const projectContext = getProjectContextService();

// Projekt-Kontext setzen
projectContext.setProjectContext({
    projectPath: '/path/to/project',
    projectId: 'my-project',
    workspacePath: '/path/to/workspace'
});

// Projekt-Pfad abrufen (mit Auto-Detection)
const projectPath = await projectContext.getProjectPath();

// Projekt-ID abrufen (mit Auto-Generierung)
const projectId = projectContext.getProjectId();
```

### 3. Service Registry verwenden

```javascript
const { getServiceRegistry } = require('./infrastructure/di/ServiceRegistry');

const registry = getServiceRegistry();

// Alle Services registrieren
registry.registerAllServices();

// Service abrufen
const taskService = registry.getService('taskService');
const projectPath = registry.getProjectContextService().getProjectPath();
```

## 🔄 **Migration von bestehendem Code**

### Vorher (Inkonsistent):
```javascript
// Verschiedene Wege, Projekt-Pfad zu bekommen
const projectPath = task.projectPath || options.projectPath;
const projectPath = await this.autoDetectProject();
const projectPath = this.workspacePathDetector.extractProjectRoot(filePath);

// Manuelle Dependency Injection
const taskService = new TaskService(
    this.taskRepository,
    this.aiService,
    this.projectAnalyzer,
    this.cursorIDEService
);
```

### Nachher (Konsistent):
```javascript
// Einheitlicher Weg, Projekt-Pfad zu bekommen
const { getProjectContextService } = require('./infrastructure/di/ProjectContextService');
const projectContext = getProjectContextService();
const projectPath = await projectContext.getProjectPath();

// Automatische Dependency Injection
const { getServiceRegistry } = require('./infrastructure/di/ServiceRegistry');
const registry = getServiceRegistry();
const taskService = registry.getService('taskService');
```

## 🎯 **Vorteile**

### ✅ **Konsistenz**
- Einheitliche Projekt-Pfad-Abfrage
- Standardisierte Service-Registrierung
- Zentrale Konfiguration

### ✅ **Wartbarkeit**
- Weniger Code-Duplikation
- Klare Dependency-Graphen
- Einfache Service-Erweiterung

### ✅ **Testbarkeit**
- Einfache Mock-Erstellung
- Isolierte Service-Tests
- Dependency-Override-Möglichkeiten

### ✅ **Flexibilität**
- Konfigurierbare Service-Lebenszyklen
- Runtime Service-Austausch
- Plugin-Architektur-Unterstützung

## 🔧 **Konfiguration**

### Service-Optionen
```javascript
container.register('serviceName', factory, {
    singleton: true,           // Singleton-Instanz
    dependencies: ['dep1', 'dep2']  // Abhängigkeiten
});
```

### Projekt-Kontext-Optionen
```javascript
projectContext.setProjectContext({
    projectPath: '/path/to/project',    // Projekt-Pfad
    projectId: 'my-project',            // Projekt-ID
    workspacePath: '/path/to/workspace' // Workspace-Pfad
});
```

## 🚀 **Integration in Application.js**

```javascript
// In Application.js
const { getServiceRegistry } = require('./infrastructure/di/ServiceRegistry');

class Application {
    async initialize() {
        // Service Registry initialisieren
        this.serviceRegistry = getServiceRegistry();
        this.serviceRegistry.registerAllServices();
        
        // Services über Registry abrufen
        this.taskService = this.serviceRegistry.getService('taskService');
        this.projectContext = this.serviceRegistry.getProjectContextService();
        
        // Projekt-Kontext setzen
        await this.projectContext.setProjectContext({
            projectPath: process.env.PROJECT_PATH || await this.projectContext.autoDetectProjectPath()
        });
    }
}
```

## 🧪 **Testing**

### Service Mocking
```javascript
const { getServiceContainer } = require('./infrastructure/di/ServiceContainer');

// Test Setup
const container = getServiceContainer();
container.register('aiService', () => ({
    analyze: jest.fn().mockResolvedValue({ result: 'test' })
}), { singleton: true });

// Test
const aiService = container.resolve('aiService');
expect(aiService.analyze).toHaveBeenCalled();
```

### Projekt-Kontext Testing
```javascript
const { getProjectContextService } = require('./infrastructure/di/ProjectContextService');

// Test Setup
const projectContext = getProjectContextService();
projectContext.setProjectContext({
    projectPath: '/test/project',
    projectId: 'test-project'
});

// Test
const projectPath = await projectContext.getProjectPath();
expect(projectPath).toBe('/test/project');
```

## 📊 **Monitoring**

### Service Registry Status
```javascript
const registry = getServiceRegistry();
const status = registry.getRegistry();

console.log('Registered Services:', status.factories);
console.log('Active Singletons:', status.singletons);
console.log('Project Context:', status.projectContext);
```

### Projekt-Kontext Validierung
```javascript
const projectContext = getProjectContextService();
const validation = await projectContext.validateProjectContext();

if (!validation.isValid) {
    console.error('Project context errors:', validation.errors);
}
console.log('Project context warnings:', validation.warnings);
```

## 🔄 **Migration Guide**

### Schritt 1: Services registrieren
```javascript
// Neue Services in ServiceRegistry.js registrieren
registerNewServices() {
    this.container.register('newService', (dependency1) => {
        return new NewService(dependency1);
    }, { singleton: true, dependencies: ['dependency1'] });
}
```

### Schritt 2: Code migrieren
```javascript
// Alte Dependency Injection ersetzen
// Vorher:
const service = new Service(dep1, dep2);

// Nachher:
const service = registry.getService('service');
```

### Schritt 3: Projekt-Pfad-Abfrage vereinheitlichen
```javascript
// Alte Projekt-Pfad-Abfrage ersetzen
// Vorher:
const projectPath = task.projectPath || options.projectPath;

// Nachher:
const projectPath = await projectContext.getProjectPath();
```

## 🎯 **Best Practices**

1. **Immer Service Registry verwenden** für neue Services
2. **Projekt-Kontext Service** für alle Projekt-Pfad-Abfragen
3. **Singleton Services** für teure Ressourcen
4. **Dependency-Graphen** minimal halten
5. **Service-Namen** konsistent benennen
6. **Error Handling** in Factory-Funktionen
7. **Logging** für Service-Lifecycle
8. **Testing** mit Mock-Container

## 🔍 **Debugging**

### Service Resolution Debugging
```javascript
const container = getServiceContainer();
console.log('Service Registry:', container.getRegistry());
```

### Dependency Graph Debugging
```javascript
// In ServiceRegistry.js
register('service', factory, { 
    dependencies: ['dep1', 'dep2'],
    debug: true  // Debug-Informationen aktivieren
});
```

### Projekt-Kontext Debugging
```javascript
const projectContext = getProjectContextService();
console.log('Project Context:', projectContext.getProjectContext());
``` 