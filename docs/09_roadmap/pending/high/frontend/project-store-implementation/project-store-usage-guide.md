# Project Store Usage Guide

**Created**: 2024-12-19T11:15:00.000Z  
**Last Updated**: 2024-12-19T11:15:00.000Z

## Overview

This guide provides comprehensive examples and best practices for using the ProjectStore in the PIDEA frontend application.

## Basic Usage

### 1. Using ProjectStore Directly

```javascript
import useProjectStore from '@/infrastructure/stores/ProjectStore.jsx';

function MyComponent() {
  const {
    projects,
    selectedProject,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    setSelectedProject
  } = useProjectStore();

  // Load projects on component mount
  useEffect(() => {
    if (Object.keys(projects).length === 0) {
      loadProjects();
    }
  }, []);

  const handleCreateProject = async (projectData) => {
    try {
      const newProject = await createProject(projectData);
      console.log('Project created:', newProject);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {/* Your component JSX */}
    </div>
  );
}
```

### 2. Using Project Selectors

```javascript
import { 
  useProjects, 
  useSelectedProject, 
  useProjectStats,
  useProjectSearch 
} from '@/infrastructure/stores/selectors/ProjectSelectors';

function ProjectList() {
  const projects = useProjects();
  const selectedProject = useSelectedProject();
  const stats = useProjectStats();
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useProjectSearch(searchQuery);

  return (
    <div>
      <h2>Projects ({stats.total})</h2>
      <input 
        type="text" 
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchResults.map(project => (
        <div key={project.id} className={selectedProject?.id === project.id ? 'active' : ''}>
          {project.name}
        </div>
      ))}
    </div>
  );
}
```

### 3. Using Project Management Hook

```javascript
import { useProjectManagement } from '@/infrastructure/stores/hooks/useProjectStore';

function ProjectManager() {
  const {
    projects,
    selectedProject,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    setSelectedProject,
    refresh,
    clearError
  } = useProjectManagement(true); // autoLoad = true

  const handleCreate = async () => {
    try {
      await createProject({
        name: 'New Project',
        description: 'A new project',
        workspacePath: '/path/to/workspace',
        type: 'development',
        framework: 'React'
      });
    } catch (error) {
      console.error('Creation failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={isLoading}>
        Create Project
      </button>
      <button onClick={refresh} disabled={isLoading}>
        Refresh
      </button>
      {error && (
        <div>
          Error: {error}
          <button onClick={clearError}>Clear</button>
        </div>
      )}
    </div>
  );
}
```

## Advanced Usage

### 1. Project-IDE Integration

```javascript
import { useProjectStoreIntegration } from '@/hooks/useProjectStoreIntegration';

function ProjectIDEIntegration() {
  const {
    selectedProject,
    activeIDE,
    isSynchronized,
    syncProjectWithIDE,
    syncIDEWithProject,
    getSynchronizedData
  } = useProjectStoreIntegration({
    autoSync: true,
    syncInterval: 30000,
    enableWorkspaceDetection: true
  });

  const handleSyncProject = async () => {
    if (selectedProject) {
      await syncProjectWithIDE(selectedProject.id);
    }
  };

  const handleSyncIDE = async () => {
    if (activeIDE) {
      await syncIDEWithProject(activeIDE.port);
    }
  };

  return (
    <div>
      <div className={`sync-status ${isSynchronized ? 'synced' : 'unsynced'}`}>
        {isSynchronized ? 'Synchronized' : 'Not Synchronized'}
      </div>
      <button onClick={handleSyncProject} disabled={!selectedProject}>
        Sync Project → IDE
      </button>
      <button onClick={handleSyncIDE} disabled={!activeIDE}>
        Sync IDE → Project
      </button>
    </div>
  );
}
```

### 2. Using Project Context

```javascript
import { ProjectStoreProvider, useProjectStoreContext } from '@/presentation/contexts/ProjectStoreContext';

// Wrap your app with the provider
function App() {
  return (
    <ProjectStoreProvider 
      autoInitialize={true}
      autoSync={true}
      syncInterval={30000}
    >
      <MyAppContent />
    </ProjectStoreProvider>
  );
}

// Use the context in components
function MyComponent() {
  const {
    selectedProject,
    activeIDE,
    isSynchronized,
    createProject,
    updateProject,
    deleteProject,
    getProjectStats
  } = useProjectStoreContext();

  const stats = getProjectStats();

  return (
    <div>
      <h2>Project Statistics</h2>
      <p>Total Projects: {stats.total}</p>
      <p>Active Projects: {stats.active}</p>
      <p>Current Project: {selectedProject?.name || 'None'}</p>
      <p>Current IDE: {activeIDE?.name || 'None'}</p>
      <p>Status: {isSynchronized ? 'Synchronized' : 'Not Synchronized'}</p>
    </div>
  );
}
```

### 3. Project Workspace Management

```javascript
import { useProjectWorkspace } from '@/hooks/useProjectStoreIntegration';

function WorkspaceManager({ workspacePath }) {
  const {
    project,
    ide,
    isActive,
    activateWorkspace,
    hasProject,
    hasIDE
  } = useProjectWorkspace(workspacePath);

  return (
    <div className={`workspace-item ${isActive ? 'active' : ''}`}>
      <h3>{workspacePath}</h3>
      <div className="workspace-status">
        {hasProject && <span className="badge project">Project</span>}
        {hasIDE && <span className="badge ide">IDE</span>}
        {isActive && <span className="badge active">Active</span>}
      </div>
      <button onClick={activateWorkspace} disabled={!hasProject && !hasIDE}>
        Activate
      </button>
    </div>
  );
}
```

### 4. Project Creation from Workspace

```javascript
import { useProjectCreation } from '@/hooks/useProjectStoreIntegration';

function ProjectCreator() {
  const { createProjectFromWorkspace, createProjectFromIDE } = useProjectCreation();

  const handleCreateFromWorkspace = async () => {
    try {
      const project = await createProjectFromWorkspace('/path/to/workspace', {
        name: 'My Project',
        description: 'A project created from workspace',
        type: 'development',
        framework: 'React',
        language: 'TypeScript',
        packageManager: 'npm'
      });
      console.log('Project created:', project);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCreateFromIDE = async () => {
    try {
      const project = await createProjectFromIDE(3000, {
        name: 'IDE Project',
        description: 'A project created from IDE',
        type: 'development'
      });
      console.log('Project created:', project);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div>
      <button onClick={handleCreateFromWorkspace}>
        Create from Workspace
      </button>
      <button onClick={handleCreateFromIDE}>
        Create from IDE (Port 3000)
      </button>
    </div>
  );
}
```

## Best Practices

### 1. Error Handling

```javascript
function ProjectComponent() {
  const { createProject, error, clearError } = useProjectManagement();

  const handleCreate = async (projectData) => {
    try {
      clearError(); // Clear any existing errors
      await createProject(projectData);
      // Success handling
    } catch (error) {
      // Error is automatically set in store
      console.error('Project creation failed:', error);
    }
  };

  return (
    <div>
      {error && (
        <div className="error-message">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
      {/* Component content */}
    </div>
  );
}
```

### 2. Loading States

```javascript
function ProjectList() {
  const { projects, isLoading, loadProjects } = useProjectManagement();

  useEffect(() => {
    if (Object.keys(projects).length === 0 && !isLoading) {
      loadProjects();
    }
  }, [projects, isLoading, loadProjects]);

  if (isLoading) {
    return <div className="loading">Loading projects...</div>;
  }

  return (
    <div>
      {Object.values(projects).map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### 3. Performance Optimization

```javascript
import { useMemo } from 'react';
import { useProjects, useProjectSearch } from '@/infrastructure/stores/selectors/ProjectSelectors';

function OptimizedProjectList({ searchQuery, filterType }) {
  const projects = useProjects();
  const searchResults = useProjectSearch(searchQuery);

  // Memoize filtered results
  const filteredProjects = useMemo(() => {
    return searchResults.filter(project => 
      !filterType || project.type === filterType
    );
  }, [searchResults, filterType]);

  return (
    <div>
      {filteredProjects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### 4. Validation

```javascript
import { useProjectValidation } from '@/infrastructure/stores/hooks/useProjectStore';

function ProjectForm() {
  const { validateForCreation } = useProjectValidation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workspacePath: ''
  });
  const [errors, setErrors] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validation = validateForCreation(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Proceed with creation
    setErrors([]);
    // ... create project
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors.map((error, index) => (
        <div key={index} className="error">{error}</div>
      ))}
      {/* Form fields */}
    </form>
  );
}
```

## Integration Patterns

### 1. With Existing Components

```javascript
// Existing component using IDEStore
function ExistingComponent() {
  const { activePort, availableIDEs } = useIDEStore();
  
  // Add ProjectStore integration
  const { selectedProject, syncProjectWithIDE } = useProjectStoreIntegration();
  
  const handlePortChange = async (port) => {
    // Existing logic
    await setActivePort(port);
    
    // New integration logic
    if (selectedProject) {
      await syncProjectWithIDE(selectedProject.id);
    }
  };

  return (
    <div>
      {/* Existing component JSX */}
    </div>
  );
}
```

### 2. Migration from IDEStore

```javascript
// Before: Using IDEStore for project data
function OldComponent() {
  const { projectData } = useIDEStore();
  const gitData = projectData.git[workspacePath];
  const analysisData = projectData.analysis[workspacePath];
  
  // ... component logic
}

// After: Using ProjectStore
function NewComponent() {
  const { getProjectByWorkspace } = useProjectStore();
  const project = getProjectByWorkspace(workspacePath);
  
  // Project data is now centralized in ProjectStore
  // Git and analysis data can be accessed through project metadata
  // or separate stores as needed
  
  // ... component logic
}
```

## Troubleshooting

### Common Issues

1. **Store not initialized**: Ensure ProjectStoreProvider wraps your app
2. **Projects not loading**: Check network connection and API endpoints
3. **Sync issues**: Verify IDEStore and ProjectStore are both initialized
4. **Performance**: Use selectors and memoization for large project lists

### Debug Tools

```javascript
// Enable debug logging
import { logger } from '@/infrastructure/logging/Logger';
logger.setLevel('debug');

// Check store state
const projectStore = useProjectStore.getState();
console.log('ProjectStore state:', projectStore);

// Check integration status
const { getSynchronizedData } = useProjectStoreIntegration();
const syncData = getSynchronizedData();
console.log('Sync data:', syncData);
```

## API Reference

### ProjectStore Methods

- `loadProjects()`: Load all projects from backend
- `createProject(data)`: Create a new project
- `updateProject(id, updates)`: Update an existing project
- `deleteProject(id)`: Delete a project
- `setSelectedProject(id)`: Set the selected project
- `getProject(id)`: Get project by ID
- `getProjectByWorkspace(path)`: Get project by workspace path
- `searchProjects(query)`: Search projects
- `refresh()`: Refresh project data
- `clearError()`: Clear error state

### Selectors

- `useProjects()`: Get all projects
- `useSelectedProject()`: Get selected project
- `useProject(id)`: Get specific project
- `useProjectByWorkspace(path)`: Get project by workspace
- `useProjectStats()`: Get project statistics
- `useProjectSearch(query)`: Search projects
- `useProjectLoading()`: Get loading state
- `useProjectError()`: Get error state

### Integration Hooks

- `useProjectStoreIntegration(options)`: Main integration hook
- `useProjectWorkspace(path)`: Workspace management
- `useProjectCreation()`: Project creation utilities
- `useProjectSyncStatus()`: Synchronization status

This guide provides comprehensive examples for using the ProjectStore in various scenarios. For more specific use cases, refer to the component implementations and test files.
