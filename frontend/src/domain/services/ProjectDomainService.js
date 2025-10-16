/**
 * Project Domain Service
 * Contains business logic that doesn't naturally belong to Project entity
 */
import { Project } from '../entities/Project.js';
import { ProjectId } from '../value-objects/ProjectId.js';

export class ProjectDomainService {
  constructor(projectRepository) {
    this._projectRepository = projectRepository;
  }

  /**
   * Creates a new project with validation and business rules
   */
  async createProject(name, workspacePath, options = {}) {
    // Check if project with same name already exists
    const existingProject = await this._projectRepository.findByName(name);
    if (existingProject) {
      throw new Error(`Project with name "${name}" already exists`);
    }

    // Check if workspace path is already in use
    const existingByPath = await this._projectRepository.findByWorkspacePath(workspacePath);
    if (existingByPath) {
      throw new Error(`Project with workspace path "${workspacePath}" already exists`);
    }

    // Generate unique project ID
    const projectId = ProjectId.generate();

    // Create project with business rules
    const project = new Project(projectId, name, workspacePath, {
      ...options,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return project;
  }

  /**
   * Validates if a project can be deleted
   */
  async canDeleteProject(projectId) {
    const project = await this._projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if project has active tasks
    const hasActiveTasks = await this._projectRepository.hasActiveTasks(projectId);
    if (hasActiveTasks) {
      throw new Error('Cannot delete project with active tasks');
    }

    // Check if project has active analysis
    const hasActiveAnalysis = await this._projectRepository.hasActiveAnalysis(projectId);
    if (hasActiveAnalysis) {
      throw new Error('Cannot delete project with active analysis');
    }

    return true;
  }

  /**
   * Validates if a project can be updated
   */
  async canUpdateProject(projectId, updates) {
    const project = await this._projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // If updating name, check for duplicates
    if (updates.name && updates.name !== project.name) {
      const existingProject = await this._projectRepository.findByName(updates.name);
      if (existingProject && !existingProject.id.equals(projectId)) {
        throw new Error(`Project with name "${updates.name}" already exists`);
      }
    }

    // If updating workspace path, check for duplicates
    if (updates.workspacePath && updates.workspacePath !== project.workspacePath) {
      const existingByPath = await this._projectRepository.findByWorkspacePath(updates.workspacePath);
      if (existingByPath && !existingByPath.id.equals(projectId)) {
        throw new Error(`Project with workspace path "${updates.workspacePath}" already exists`);
      }
    }

    return true;
  }

  /**
   * Gets project statistics
   */
  async getProjectStatistics(projectId) {
    const project = await this._projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const taskCount = await this._projectRepository.getTaskCount(projectId);
    const analysisCount = await this._projectRepository.getAnalysisCount(projectId);
    const chatSessionCount = await this._projectRepository.getChatSessionCount(projectId);

    return {
      projectId: projectId.value,
      taskCount,
      analysisCount,
      chatSessionCount,
      lastActivity: project.updatedAt
    };
  }

  /**
   * Validates project configuration
   */
  validateProjectConfiguration(config) {
    const errors = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Project name is required');
    }

    if (!config.workspacePath || config.workspacePath.trim().length === 0) {
      errors.push('Workspace path is required');
    }

    if (config.framework && !this.isValidFramework(config.framework)) {
      errors.push('Invalid framework specified');
    }

    if (config.language && !this.isValidLanguage(config.language)) {
      errors.push('Invalid language specified');
    }

    if (config.packageManager && !this.isValidPackageManager(config.packageManager)) {
      errors.push('Invalid package manager specified');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidFramework(framework) {
    const validFrameworks = [
      'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'gatsby',
      'express', 'fastify', 'koa', 'nest', 'django', 'flask', 'fastapi',
      'spring', 'quarkus', 'micronaut', 'laravel', 'symfony', 'rails'
    ];
    return validFrameworks.includes(framework.toLowerCase());
  }

  isValidLanguage(language) {
    const validLanguages = [
      'javascript', 'typescript', 'python', 'java', 'csharp', 'php',
      'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'clojure'
    ];
    return validLanguages.includes(language.toLowerCase());
  }

  isValidPackageManager(packageManager) {
    const validPackageManagers = [
      'npm', 'yarn', 'pnpm', 'bun', 'pip', 'poetry', 'composer',
      'maven', 'gradle', 'nuget', 'gem', 'cargo', 'go mod'
    ];
    return validPackageManagers.includes(packageManager.toLowerCase());
  }
}
