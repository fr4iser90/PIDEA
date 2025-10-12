/**
 * ProjectController - Handles project management HTTP requests
 * 
 * LAYER COMPLIANCE FIXED:
 * ✅ Uses ProjectApplicationService (Application layer)
 * ✅ No direct repository or domain service access
 * ✅ Proper DDD layer separation maintained
 */
const Logger = require('@logging/Logger');
const logger = new Logger('ProjectController');

class ProjectController {
  constructor(projectApplicationService) {
    this.projectApplicationService = projectApplicationService;
    this.logger = logger;
    
    if (!this.projectApplicationService) {
      throw new Error('ProjectController requires projectApplicationService dependency');
    }
  }

  /**
   * Create a new project
   * POST /api/projects
   */
  async createProject(req, res) {
    try {
      const { name, workspacePath, description } = req.body;
      
      // Validate input
      const validation = this.validateProjectData({ name, workspacePath, description });
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors });
      }
      
      // Create project via application service
      const project = await this.projectApplicationService.createProject({
        name,
        workspacePath,
        description
      });
      
      this.logger.info('Project created:', { projectId: project.id, name });
      res.status(201).json({ project });
      
    } catch (error) {
      this.logger.error('Failed to create project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get a specific project
   * GET /api/projects/:projectId
   */
  async getProject(req, res) {
    try {
      const { projectId } = req.params;
      const project = await this.projectApplicationService.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json({ project });
      
    } catch (error) {
      this.logger.error('Failed to get project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a project
   * PUT /api/projects/:projectId
   */
  async updateProject(req, res) {
    try {
      const { projectId } = req.params;
      const updates = req.body;
      
      // Validate updates
      const validation = this.validateProjectData(updates, true);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors });
      }
      
      const project = await this.projectApplicationService.updateProject(projectId, updates);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      this.logger.info('Project updated:', { projectId, updates });
      res.json({ project });
      
    } catch (error) {
      this.logger.error('Failed to update project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete a project
   * DELETE /api/projects/:projectId
   */
  async deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      const deleted = await this.projectApplicationService.deleteProject(projectId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      this.logger.info('Project deleted:', { projectId });
      res.status(204).send();
      
    } catch (error) {
      this.logger.error('Failed to delete project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * List all projects
   * GET /api/projects
   */
  async listProjects(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const result = await this.projectApplicationService.listProjects({
        page: parseInt(page),
        limit: parseInt(limit),
        search
      });
      
      res.json({ 
        projects: result.projects, 
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total: result.total 
        } 
      });
      
    } catch (error) {
      this.logger.error('Failed to list projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Validate project data
   * @param {Object} data - Project data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateProjectData(data, isUpdate = false) {
    const errors = [];
    
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Project name is required and must be a non-empty string');
      }
    }
    
    if (!isUpdate || data.workspacePath !== undefined) {
      if (!data.workspacePath || typeof data.workspacePath !== 'string') {
        errors.push('Workspace path is required and must be a string');
      }
    }
    
    if (data.description !== undefined && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ProjectController;
