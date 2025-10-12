# Migration Guide: Legacy IDE-Centric to Project-Centric API

## Overview

This guide helps you migrate from the legacy IDE-centric API to the new project-centric API structure. The new API provides better organization, improved RESTful design, and enhanced functionality.

## Key Changes

### API Structure Changes

#### Legacy API Structure
```
/api/ide/*                    # IDE-centric endpoints
/api/ide/start               # Start IDE
/api/ide/stop                # Stop IDE
/api/ide/status              # Get IDE status
/api/ide/config              # IDE configuration
```

#### New Project-Centric API Structure
```
/api/projects/*              # Project management endpoints
/api/projects/:projectId/interfaces/*  # Interface management within projects
```

### Endpoint Mapping

| Legacy Endpoint | New Endpoint | Description |
|----------------|--------------|-------------|
| `POST /api/ide/start` | `POST /api/projects/:projectId/interfaces` | Create interface within project |
| `GET /api/ide/status` | `GET /api/projects/:projectId/interfaces/:interfaceId/status` | Get interface status |
| `POST /api/ide/stop` | `POST /api/projects/:projectId/interfaces/:interfaceId/stop` | Stop interface |
| `GET /api/ide/config` | `GET /api/projects/:projectId/interfaces/:interfaceId` | Get interface configuration |

## Migration Steps

### Step 1: Update Project Management

#### Before (Legacy)
```javascript
// No project concept - direct IDE management
const response = await fetch('/api/ide/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspacePath: '/path/to/project',
    port: 3000
  })
});
```

#### After (New)
```javascript
// First create a project
const projectResponse = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Project',
    workspacePath: '/path/to/project',
    description: 'My development project',
    type: 'web',
    framework: 'react'
  })
});

const project = await projectResponse.json();
const projectId = project.project.id;

// Then create an interface within the project
const interfaceResponse = await fetch(`/api/projects/${projectId}/interfaces`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'VS Code Interface',
    type: 'ide',
    configuration: {
      port: 3000,
      workspacePath: '/path/to/project'
    }
  })
});
```

### Step 2: Update Interface Management

#### Before (Legacy)
```javascript
// Direct IDE operations
const startResponse = await fetch('/api/ide/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ workspacePath: '/path/to/project' })
});

const statusResponse = await fetch('/api/ide/status');
const status = await statusResponse.json();

const stopResponse = await fetch('/api/ide/stop', {
  method: 'POST'
});
```

#### After (New)
```javascript
// Project-centric interface operations
const projectId = 'proj_1234567890';
const interfaceId = 'iface_1234567890';

// Start interface
const startResponse = await fetch(`/api/projects/${projectId}/interfaces/${interfaceId}/start`, {
  method: 'POST'
});

// Get interface status
const statusResponse = await fetch(`/api/projects/${projectId}/interfaces/${interfaceId}/status`);
const status = await statusResponse.json();

// Stop interface
const stopResponse = await fetch(`/api/projects/${projectId}/interfaces/${interfaceId}/stop`, {
  method: 'POST'
});
```

### Step 3: Update Data Models

#### Before (Legacy)
```javascript
// IDE-centric data model
const ideData = {
  id: 'ide_123',
  workspacePath: '/path/to/project',
  port: 3000,
  status: 'running',
  config: {
    theme: 'dark',
    extensions: ['javascript', 'typescript']
  }
};
```

#### After (New)
```javascript
// Project-centric data model
const projectData = {
  id: 'proj_1234567890',
  name: 'My Project',
  workspacePath: '/path/to/project',
  description: 'My development project',
  type: 'web',
  framework: 'react',
  createdAt: '2025-10-11T02:20:03.000Z',
  updatedAt: '2025-10-11T02:20:03.000Z'
};

const interfaceData = {
  id: 'iface_1234567890',
  name: 'VS Code Interface',
  type: 'ide',
  projectId: 'proj_1234567890',
  configuration: {
    port: 3000,
    workspacePath: '/path/to/project',
    theme: 'dark',
    extensions: ['javascript', 'typescript']
  },
  status: 'running',
  createdAt: '2025-10-11T02:20:03.000Z',
  updatedAt: '2025-10-11T02:20:03.000Z'
};
```

## Breaking Changes

### 1. API Endpoint Structure
- **Breaking**: All IDE-centric endpoints (`/api/ide/*`) are removed
- **New**: Project-centric endpoints (`/api/projects/*`) are required
- **Impact**: All existing API calls need to be updated

### 2. Request/Response Format
- **Breaking**: Request format changed from IDE-centric to project-centric
- **New**: Project ID and Interface ID are required in all requests
- **Impact**: All request bodies and response handling need updates

### 3. Data Models
- **Breaking**: IDE data model is replaced with Project + Interface models
- **New**: Separate Project and Interface entities with relationships
- **Impact**: All data handling code needs to be rewritten

### 4. Authentication
- **Breaking**: Authentication context changed from IDE-based to project-based
- **New**: Project-level permissions and access control
- **Impact**: Authentication and authorization logic needs updates

## Compatibility Considerations

### Backward Compatibility
- **Not Supported**: Legacy API endpoints are completely removed
- **Migration Required**: All clients must migrate to new API structure
- **Timeline**: Legacy API will be removed immediately after deployment

### Data Migration
- **Projects**: Existing IDE configurations need to be converted to projects
- **Interfaces**: IDE instances need to be converted to interfaces within projects
- **Relationships**: Project-interface relationships need to be established

### Frontend Integration
- **Components**: All frontend components need to be updated
- **State Management**: State management needs to handle project-centric data
- **UI/UX**: User interface needs to reflect project-centric workflow

## Migration Checklist

### Pre-Migration
- [ ] Review current API usage and identify all endpoints used
- [ ] Identify all data models and their usage patterns
- [ ] Plan project structure for existing IDE configurations
- [ ] Prepare test data for migration validation

### During Migration
- [ ] Update all API endpoint calls to use new structure
- [ ] Update data models to use Project + Interface structure
- [ ] Update authentication and authorization logic
- [ ] Update frontend components and state management
- [ ] Test all functionality with new API structure

### Post-Migration
- [ ] Validate all functionality works correctly
- [ ] Update documentation and user guides
- [ ] Monitor API usage and performance
- [ ] Remove legacy code and dependencies
- [ ] Update deployment and monitoring configurations

## Common Migration Patterns

### Pattern 1: Simple IDE Replacement
```javascript
// Legacy: Direct IDE management
const ide = await startIDE('/path/to/project');

// New: Project + Interface management
const project = await createProject({
  name: 'My Project',
  workspacePath: '/path/to/project'
});
const interface = await createInterface(project.id, {
  name: 'VS Code',
  type: 'ide'
});
```

### Pattern 2: Multiple IDE Support
```javascript
// Legacy: Single IDE instance
const ide = await startIDE('/path/to/project');

// New: Multiple interfaces within project
const project = await createProject({
  name: 'My Project',
  workspacePath: '/path/to/project'
});

const vscode = await createInterface(project.id, {
  name: 'VS Code',
  type: 'ide'
});

const terminal = await createInterface(project.id, {
  name: 'Terminal',
  type: 'terminal'
});
```

### Pattern 3: Configuration Management
```javascript
// Legacy: IDE configuration
const config = await getIDEConfig();
await updateIDEConfig({ theme: 'dark' });

// New: Interface configuration within project
const interface = await getInterface(projectId, interfaceId);
await updateInterface(projectId, interfaceId, {
  configuration: { theme: 'dark' }
});
```

## Troubleshooting

### Common Issues

#### Issue: Project ID Not Found
**Error**: `Project not found`
**Solution**: Ensure project is created before creating interfaces
```javascript
// Wrong: Using non-existent project ID
const response = await fetch('/api/projects/nonexistent/interfaces');

// Correct: Create project first
const project = await createProject({ name: 'My Project' });
const response = await fetch(`/api/projects/${project.id}/interfaces`);
```

#### Issue: Interface ID Not Found
**Error**: `Interface not found`
**Solution**: Ensure interface is created before performing operations
```javascript
// Wrong: Using non-existent interface ID
const response = await fetch('/api/projects/proj_123/interfaces/nonexistent/start');

// Correct: Create interface first
const interface = await createInterface(projectId, { name: 'VS Code', type: 'ide' });
const response = await fetch(`/api/projects/${projectId}/interfaces/${interface.id}/start`);
```

#### Issue: Invalid Request Format
**Error**: `ValidationError: Invalid request format`
**Solution**: Ensure request body matches new API specification
```javascript
// Wrong: Legacy request format
const response = await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({ workspacePath: '/path/to/project' })
});

// Correct: New request format
const response = await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({
    name: 'My Project',
    workspacePath: '/path/to/project',
    description: 'My development project'
  })
});
```

## Support and Resources

### Documentation
- [API Reference](../openapi.yaml) - Complete API specification
- [Project Management Guide](../../user/project-management.md) - Project management workflow
- [Interface Management Guide](../../user/interface-management.md) - Interface management workflow

### Examples
- [Project CRUD Examples](../examples/project-crud.md) - Project management examples
- [Interface Management Examples](../examples/interface-management.md) - Interface management examples
- [Error Handling Examples](../examples/error-handling.md) - Error handling examples

### Support
- **GitHub Issues**: Report migration issues and bugs
- **Documentation**: Check documentation for detailed information
- **Community**: Join community discussions for help and support

## Conclusion

The migration from legacy IDE-centric API to project-centric API provides better organization, improved functionality, and enhanced user experience. While the migration requires significant changes, the new structure offers better scalability, maintainability, and extensibility.

Follow this guide step-by-step to ensure a smooth migration process. Test thoroughly and validate all functionality before deploying to production.
