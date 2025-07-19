const ProjectRepository = require('@repositories/ProjectRepository');
const Logger = require('@logging/Logger');
const logger = new Logger('ProjectController');

class ProjectController {
  constructor() {
    // Get ProjectRepository from DI container or create new instance
    try {
      const { getServiceRegistry } = require('../../../infrastructure/di/ServiceRegistry');
      const serviceRegistry = getServiceRegistry();
      this.projectRepository = serviceRegistry.getService('projectRepository');
    } catch (error) {
      // Fallback: create new instance
      this.projectRepository = new ProjectRepository();
    }
  }

  /**
   * Get all projects
   */
  async list(req, res) {
    try {
      const projects = await this.projectRepository.findAll();
      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      logger.error('Failed to list projects:', error);
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
      const project = await this.projectRepository.findById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      logger.error('Failed to get project by ID:', error);
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
      const project = await this.projectRepository.findByIDEPort(parseInt(idePort));
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found for IDE port'
        });
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      logger.error('Failed to get project by IDE port:', error);
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

      if (!port || !Number.isInteger(parseInt(port))) {
        return res.status(400).json({
          success: false,
          error: 'Valid port number required'
        });
      }

      const project = await this.projectRepository.findById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Update the appropriate port field
      const updateData = { ...project };
      if (portType === 'frontend') {
        updateData.frontendPort = parseInt(port);
      } else if (portType === 'backend') {
        updateData.backendPort = parseInt(port);
      } else if (portType === 'database') {
        updateData.databasePort = parseInt(port);
      }

      const updatedProject = await this.projectRepository.update(updateData);
      
      logger.info(`Port ${port} saved for project ${id} (${portType})`);
      
      res.json({
        success: true,
        data: updatedProject
      });
    } catch (error) {
      logger.error('Failed to save project port:', error);
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

      if (!port || !Number.isInteger(parseInt(port))) {
        return res.status(400).json({
          success: false,
          error: 'Valid port number required'
        });
      }

      const project = await this.projectRepository.findById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Update the appropriate port field
      const updateData = { ...project };
      if (portType === 'frontend') {
        updateData.frontendPort = parseInt(port);
      } else if (portType === 'backend') {
        updateData.backendPort = parseInt(port);
      } else if (portType === 'database') {
        updateData.databasePort = parseInt(port);
      }

      const updatedProject = await this.projectRepository.update(updateData);
      
      logger.info(`Port ${port} updated for project ${id} (${portType})`);
      
      res.json({
        success: true,
        data: updatedProject
      });
    } catch (error) {
      logger.error('Failed to update project port:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update port'
      });
    }
  }
}

module.exports = ProjectController; 