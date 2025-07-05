# Script Templates Modules

This directory contains the refactored modular structure for the ScriptTemplates system.

## Overview

The original `ScriptTemplates.js` file (1575 lines) has been refactored into smaller, more maintainable modules for better organization and maintainability.

## Module Structure

### Core Modules

- **`constants.js`** - Template categories, validation rules, and default variables
- **`validation.js`** - Template validation logic
- **`generator.js`** - Script generation and custom template creation
- **`search.js`** - Template search and retrieval functionality

### Template Category Modules

- **`buildTemplates.js`** - Build-related script templates (Webpack, Vite, Rollup, Docker)
- **`testTemplates.js`** - Test-related script templates (Unit, Integration, E2E, Performance)
- **`deployTemplates.js`** - Deployment script templates (Docker, Kubernetes)
- **`maintenanceTemplates.js`** - Maintenance script templates (Dependencies, Cleanup, Backup)
- **`developmentTemplates.js`** - Development script templates (Setup, Code Generation)
- **`databaseTemplates.js`** - Database script templates (Migrations, Backup)
- **`securityTemplates.js`** - Security script templates (Audit, Vulnerability Scan)
- **`monitoringTemplates.js`** - Monitoring script templates (Health Check, Performance)
- **`automationTemplates.js`** - Automation script templates (CI/CD, Auto Deploy)
- **`utilityTemplates.js`** - Utility script templates (Log Analysis, File Cleaner)

### Index File

- **`index.js`** - Exports all modules for easy importing

## Benefits of Refactoring

1. **Maintainability** - Each module has a single responsibility
2. **Readability** - Smaller files are easier to understand
3. **Testability** - Individual modules can be tested in isolation
4. **Reusability** - Modules can be imported and used independently
5. **Scalability** - New template categories can be added easily

## Usage

### Importing Modules

```javascript
const {
    BuildTemplates,
    TestTemplates,
    TemplateValidator,
    TemplateGenerator,
    TEMPLATE_CATEGORIES
} = require('./modules');
```

### Using Individual Modules

```javascript
// Get build templates
const buildTemplates = BuildTemplates.getTemplates();

// Validate a template
const validation = TemplateValidator.validateTemplate(template);

// Generate a script
const script = TemplateGenerator.generateScript(template, variables);
```

### Using the Main ScriptTemplates Class

```javascript
const ScriptTemplates = require('./ScriptTemplates');

const scriptTemplates = new ScriptTemplates({
    logger: console,
    eventBus: eventBus
});

// Get all templates
const allTemplates = scriptTemplates.getAllTemplates();

// Generate a script
const script = scriptTemplates.generateScript('build', 'webpackBuild', {
    NODE_ENV: 'production'
});
```

## Migration Notes

- The original `ScriptTemplates.js` file has been backed up as `ScriptTemplates.js.backup`
- All existing functionality has been preserved
- The public API of the main `ScriptTemplates` class remains unchanged
- Template content and business logic have not been modified

## Future Enhancements

1. **Template Versioning** - Add version control for templates
2. **Template Inheritance** - Allow templates to inherit from base templates
3. **Dynamic Template Loading** - Load templates from external sources
4. **Template Validation Rules** - Add more sophisticated validation
5. **Template Caching** - Implement caching for better performance 