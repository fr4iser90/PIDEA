# Project Management Guide

## Overview

The PIDEA Project Management system provides a comprehensive solution for managing development projects and their associated interfaces. This guide covers all aspects of project management, from creation to deletion, and everything in between.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Creation](#project-creation)
3. [Project Management](#project-management)
4. [Project Configuration](#project-configuration)
5. [Project Interfaces](#project-interfaces)
6. [Project Collaboration](#project-collaboration)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### What is a Project?

A project in PIDEA represents a development workspace that contains:
- **Code**: Your application source code
- **Configuration**: Project-specific settings and configurations
- **Interfaces**: Development tools and environments (IDEs, editors, terminals, etc.)
- **Metadata**: Project information, description, and categorization

### Project Types

PIDEA supports various project types:

| Type | Description | Use Cases |
|------|-------------|-----------|
| `web` | Web applications | React, Vue, Angular projects |
| `mobile` | Mobile applications | React Native, Flutter projects |
| `desktop` | Desktop applications | Electron, Tauri projects |
| `api` | API services | REST APIs, GraphQL services |
| `library` | Code libraries | NPM packages, Python libraries |

### Project Frameworks

Supported frameworks include:
- **Frontend**: React, Vue, Angular, Svelte
- **Backend**: Node.js, Python, Java, Go
- **Mobile**: React Native, Flutter, Ionic
- **Desktop**: Electron, Tauri, Qt

## Project Creation

### Creating a New Project

#### Using the API

```javascript
const createProject = async (projectData) => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(projectData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`);
  }

  return await response.json();
};

// Example usage
const project = await createProject({
  name: 'My Web App',
  workspacePath: '/path/to/my-web-app',
  description: 'A modern web application built with React',
  type: 'web',
  framework: 'react'
});
```

#### Required Fields

- **name**: Project name (1-100 characters)
- **workspacePath**: Path to the project workspace

#### Optional Fields

- **description**: Project description (max 1000 characters)
- **type**: Project type (web, mobile, desktop, api, library)
- **framework**: Project framework (react, vue, angular, etc.)

### Project Validation

The system validates projects before creation:

```javascript
// Valid project data
const validProject = {
  name: 'My Project',
  workspacePath: '/path/to/project',
  description: 'Project description',
  type: 'web',
  framework: 'react'
};

// Invalid project data (will be rejected)
const invalidProject = {
  name: '', // Empty name
  workspacePath: '', // Empty workspace path
  type: 'invalid-type' // Invalid type
};
```

## Project Management

### Listing Projects

#### Get All Projects

```javascript
const getProjects = async (options = {}) => {
  const params = new URLSearchParams();
  
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.search) params.append('search', options.search);

  const response = await fetch(`/api/projects?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};

// Example usage
const projects = await getProjects({
  page: 1,
  limit: 10,
  search: 'web'
});
```

#### Get Project by ID

```javascript
const getProject = async (projectId) => {
  const response = await fetch(`/api/projects/${projectId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Project not found: ${response.statusText}`);
  }

  return await response.json();
};
```

### Updating Projects

#### Update Project Information

```javascript
const updateProject = async (projectId, updateData) => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    throw new Error(`Failed to update project: ${response.statusText}`);
  }

  return await response.json();
};

// Example usage
const updatedProject = await updateProject('proj_1234567890', {
  name: 'Updated Project Name',
  description: 'Updated project description'
});
```

#### Partial Updates

You can update only specific fields:

```javascript
// Update only the description
await updateProject('proj_1234567890', {
  description: 'New description'
});

// Update only the framework
await updateProject('proj_1234567890', {
  framework: 'vue'
});
```

### Deleting Projects

#### Delete Project

```javascript
const deleteProject = async (projectId) => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to delete project: ${response.statusText}`);
  }

  return await response.json();
};

// Example usage
await deleteProject('proj_1234567890');
```

**Warning**: Deleting a project will also delete all associated interfaces and their data.

## Project Configuration

### Project Settings

#### Workspace Configuration

```javascript
const updateWorkspaceConfig = async (projectId, config) => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      workspacePath: config.workspacePath,
      framework: config.framework
    })
  });

  return await response.json();
};
```

#### Project Metadata

```javascript
const updateProjectMetadata = async (projectId, metadata) => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: metadata.name,
      description: metadata.description,
      type: metadata.type
    })
  });

  return await response.json();
};
```

### Project Categories

#### Organizing Projects

```javascript
// Group projects by type
const projectsByType = projects.reduce((acc, project) => {
  if (!acc[project.type]) {
    acc[project.type] = [];
  }
  acc[project.type].push(project);
  return acc;
}, {});

// Group projects by framework
const projectsByFramework = projects.reduce((acc, project) => {
  if (!acc[project.framework]) {
    acc[project.framework] = [];
  }
  acc[project.framework].push(project);
  return acc;
}, {});
```

## Project Interfaces

### Understanding Interfaces

Interfaces are development tools and environments associated with a project:
- **IDEs**: Visual Studio Code, IntelliJ IDEA, etc.
- **Editors**: Vim, Emacs, Sublime Text, etc.
- **Terminals**: Command line interfaces
- **Browsers**: Development browsers for testing
- **File Systems**: File management interfaces

### Managing Interfaces

#### Create Interface

```javascript
const createInterface = async (projectId, interfaceData) => {
  const response = await fetch(`/api/projects/${projectId}/interfaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(interfaceData)
  });

  return await response.json();
};

// Example usage
const interface = await createInterface('proj_1234567890', {
  name: 'VS Code Interface',
  type: 'ide',
  configuration: {
    port: 3000,
    workspacePath: '/workspace',
    theme: 'dark',
    extensions: ['javascript', 'typescript']
  }
});
```

#### List Interfaces

```javascript
const getInterfaces = async (projectId) => {
  const response = await fetch(`/api/projects/${projectId}/interfaces`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

#### Control Interfaces

```javascript
// Start interface
const startInterface = async (projectId, interfaceId) => {
  const response = await fetch(`/api/projects/${projectId}/interfaces/${interfaceId}/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};

// Stop interface
const stopInterface = async (projectId, interfaceId) => {
  const response = await fetch(`/api/projects/${projectId}/interfaces/${interfaceId}/stop`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};

// Restart interface
const restartInterface = async (projectId, interfaceId) => {
  const response = await fetch(`/api/projects/${projectId}/interfaces/${interfaceId}/restart`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

#### Get Interface Status

```javascript
const getInterfaceStatus = async (projectId, interfaceId) => {
  const response = await fetch(`/api/projects/${projectId}/interfaces/${interfaceId}/status`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

#### Get Interface Logs

```javascript
const getInterfaceLogs = async (projectId, interfaceId, options = {}) => {
  const params = new URLSearchParams();
  
  if (options.limit) params.append('limit', options.limit);
  if (options.level) params.append('level', options.level);

  const response = await fetch(`/api/projects/${projectId}/interfaces/${interfaceId}/logs?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

## Project Collaboration

### Team Projects

#### Project Sharing

```javascript
// Note: This is a conceptual example - actual implementation depends on your collaboration features
const shareProject = async (projectId, userEmail, permissions) => {
  // Implementation depends on your collaboration system
  console.log(`Sharing project ${projectId} with ${userEmail} with permissions: ${permissions}`);
};
```

#### Project Permissions

- **Owner**: Full access to project and interfaces
- **Editor**: Can modify project and interfaces
- **Viewer**: Can view project and interface status
- **Guest**: Limited access to specific interfaces

### Project Templates

#### Creating Templates

```javascript
const createProjectTemplate = async (templateData) => {
  // Implementation depends on your template system
  console.log('Creating project template:', templateData);
};
```

#### Using Templates

```javascript
const createProjectFromTemplate = async (templateId, projectData) => {
  // Implementation depends on your template system
  console.log('Creating project from template:', templateId, projectData);
};
```

## Best Practices

### Project Organization

#### Naming Conventions

- Use descriptive, meaningful names
- Include project type in the name when helpful
- Use consistent naming patterns across projects

```javascript
// Good naming examples
const goodProjectNames = [
  'E-commerce Web App',
  'Mobile Banking App',
  'API Gateway Service',
  'UI Component Library'
];

// Bad naming examples
const badProjectNames = [
  'Project 1',
  'Test',
  'My App',
  'New Project'
];
```

#### Workspace Structure

- Keep projects in organized directories
- Use consistent folder structures
- Separate different types of projects

```
/workspace/
├── web-projects/
│   ├── ecommerce-app/
│   ├── blog-platform/
│   └── portfolio-site/
├── mobile-projects/
│   ├── banking-app/
│   └── social-media-app/
└── api-projects/
    ├── user-service/
    └── payment-gateway/
```

### Interface Management

#### Interface Configuration

- Use consistent configuration patterns
- Document interface configurations
- Test interface configurations before deployment

```javascript
// Good interface configuration
const goodInterfaceConfig = {
  name: 'VS Code Interface',
  type: 'ide',
  configuration: {
    port: 3000,
    workspacePath: '/workspace',
    theme: 'dark',
    extensions: ['javascript', 'typescript', 'prettier'],
    settings: {
      'editor.formatOnSave': true,
      'editor.codeActionsOnSave': {
        'source.fixAll': true
      }
    }
  }
};
```

#### Interface Lifecycle

- Start interfaces when needed
- Stop interfaces when not in use
- Monitor interface status and logs
- Clean up unused interfaces

### Performance Optimization

#### Project Loading

- Use pagination for large project lists
- Implement search functionality
- Cache frequently accessed projects

```javascript
// Efficient project loading
const loadProjects = async (page = 1, limit = 10, search = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search) {
    params.append('search', search);
  }

  const response = await fetch(`/api/projects?${params}`);
  return await response.json();
};
```

#### Interface Management

- Monitor interface resource usage
- Implement interface pooling for frequently used interfaces
- Use appropriate interface types for different tasks

## Troubleshooting

### Common Issues

#### Project Creation Issues

**Issue**: Project creation fails with validation error
**Solution**: Check required fields and data format

```javascript
// Check project data before creation
const validateProjectData = (projectData) => {
  const errors = [];
  
  if (!projectData.name || projectData.name.trim() === '') {
    errors.push('Project name is required');
  }
  
  if (!projectData.workspacePath || projectData.workspacePath.trim() === '') {
    errors.push('Workspace path is required');
  }
  
  if (projectData.name && projectData.name.length > 100) {
    errors.push('Project name must be 100 characters or less');
  }
  
  return errors;
};

// Use validation before API call
const errors = validateProjectData(projectData);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
  return;
}

// Proceed with project creation
const project = await createProject(projectData);
```

#### Interface Management Issues

**Issue**: Interface fails to start
**Solution**: Check interface configuration and project status

```javascript
// Check interface before starting
const checkInterfaceBeforeStart = async (projectId, interfaceId) => {
  try {
    // Check if project exists
    const project = await getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Check if interface exists
    const interface = await getInterface(projectId, interfaceId);
    if (!interface) {
      throw new Error('Interface not found');
    }
    
    // Check interface status
    const status = await getInterfaceStatus(projectId, interfaceId);
    if (status.status === 'running') {
      console.log('Interface is already running');
      return;
    }
    
    // Start interface
    const result = await startInterface(projectId, interfaceId);
    console.log('Interface started successfully:', result);
    
  } catch (error) {
    console.error('Failed to start interface:', error.message);
  }
};
```

#### Performance Issues

**Issue**: Slow project loading
**Solution**: Implement pagination and caching

```javascript
// Implement project caching
const projectCache = new Map();

const getCachedProject = async (projectId) => {
  if (projectCache.has(projectId)) {
    return projectCache.get(projectId);
  }
  
  const project = await getProject(projectId);
  projectCache.set(projectId, project);
  
  // Cache for 5 minutes
  setTimeout(() => {
    projectCache.delete(projectId);
  }, 5 * 60 * 1000);
  
  return project;
};
```

### Error Handling

#### API Error Handling

```javascript
const handleApiError = (error, context) => {
  console.error(`API Error in ${context}:`, error);
  
  if (error.status === 400) {
    console.error('Bad Request:', error.message);
  } else if (error.status === 401) {
    console.error('Unauthorized:', error.message);
  } else if (error.status === 404) {
    console.error('Not Found:', error.message);
  } else if (error.status === 500) {
    console.error('Internal Server Error:', error.message);
  } else {
    console.error('Unknown Error:', error.message);
  }
};

// Use error handling in API calls
const safeApiCall = async (apiCall, context) => {
  try {
    return await apiCall();
  } catch (error) {
    handleApiError(error, context);
    throw error;
  }
};
```

#### Retry Logic

```javascript
const retryApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};
```

### Debugging

#### Enable Debug Logging

```javascript
const enableDebugLogging = () => {
  // Enable detailed logging for debugging
  console.log('Debug logging enabled');
  
  // Log all API calls
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    console.log('API Call:', args[0], args[1]);
    const response = await originalFetch(...args);
    console.log('API Response:', response.status, response.statusText);
    return response;
  };
};
```

#### Project State Inspection

```javascript
const inspectProjectState = async (projectId) => {
  try {
    const project = await getProject(projectId);
    console.log('Project State:', project);
    
    const interfaces = await getInterfaces(projectId);
    console.log('Interfaces:', interfaces);
    
    // Check interface statuses
    for (const interface of interfaces.interfaces) {
      const status = await getInterfaceStatus(projectId, interface.id);
      console.log(`Interface ${interface.id} Status:`, status);
    }
    
  } catch (error) {
    console.error('Failed to inspect project state:', error);
  }
};
```

## Conclusion

The PIDEA Project Management system provides a comprehensive solution for managing development projects and their associated interfaces. By following this guide, you can effectively create, manage, and collaborate on projects while maintaining best practices for performance and reliability.

For additional information, refer to the [API Reference](../../api/openapi.yaml) and [Interface Management Guide](./interface-management.md).
