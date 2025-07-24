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
   * Get all projects
   */
  async list(req, res) {
    try {
      const projects = await this.projectApplicationService.getAllProjects();
      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      this.logger.error('Failed to list projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list projects'
      });
    }
  }

  /**
   * Get project by ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const project = await this.projectApplicationService.getProject(id);
      
      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      this.logger.error('Failed to get project by ID:', error);
      
      if (error.message.includes('Project not found')) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to get project'
      });
    }
  }

  /**
   * Get project by IDE port
   */
  async getByIDEPort(req, res) {
    try {
      const { idePort } = req.params;
      const project = await this.projectApplicationService.getProjectByIDEPort(idePort);
      
      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      this.logger.error('Failed to get project by IDE port:', error);
      
      if (error.message.includes('Project not found')) {
        return res.status(404).json({
          success: false,
          error: 'Project not found for IDE port'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to get project'
      });
    }
  }

  /**
   * Save project port
   */
  async savePort(req, res) {
    try {
      const { id } = req.params;
      const { port, portType = 'frontend' } = req.body;

      const updatedProject = await this.projectApplicationService.saveProjectPort(id, port, portType);
      
      res.json({
        success: true,
        data: updatedProject
      });
    } catch (error) {
      this.logger.error('Failed to save project port:', error);
      
      if (error.message.includes('Valid port number required')) {
        return res.status(400).json({
          success: false,
          error: 'Valid port number required'
        });
      }
      
      if (error.message.includes('Project not found')) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      if (error.message.includes('Invalid port type')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port type'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to save port'
      });
    }
  }

  /**
   * Update project port
   */
  async updatePort(req, res) {
    try {
      const { id } = req.params;
      const { port, portType = 'frontend' } = req.body;

      const updatedProject = await this.projectApplicationService.updateProjectPort(id, port, portType);
      
      res.json({
        success: true,
        data: updatedProject
      });
    } catch (error) {
      this.logger.error('Failed to update project port:', error);
      
      if (error.message.includes('Valid port number required')) {
        return res.status(400).json({
          success: false,
          error: 'Valid port number required'
        });
      }
      
      if (error.message.includes('Project not found')) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      if (error.message.includes('Invalid port type')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid port type'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update port'
      });
    }
  }
}

module.exports = ProjectController; 