/**
 * ProjectRepository
 * Infrastructure implementation of project repository
 */
import { IProjectRepository } from '../../domain/repositories/IProjectRepository.js';
import { Project } from '../../domain/entities/Project.js';
import { ProjectId } from '../../domain/value-objects/ProjectId.js';

export class ProjectRepository extends IProjectRepository {
  constructor(apiService, cacheService) {
    super();
    this._apiService = apiService;
    this._cacheService = cacheService;
    this._cacheKey = 'projects';
    this._cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async findById(projectId) {
    try {
      const id = projectId instanceof ProjectId ? projectId.value : projectId;
      
      // Check cache first
      const cached = await this._cacheService.get(`${this._cacheKey}:${id}`);
      if (cached) {
        return Project.fromJSON(cached);
      }

      // Fetch from API
      const response = await this._apiService.get(`/projects/${id}`);
      if (!response.success) {
        return null;
      }

      const project = Project.fromJSON(response.data);
      
      // Cache the result
      await this._cacheService.set(`${this._cacheKey}:${id}`, response.data, this._cacheExpiry);
      
      return project;
    } catch (error) {
      console.error('Error finding project by ID:', error);
      return null;
    }
  }

  async findByName(name) {
    try {
      const response = await this._apiService.get(`/projects/search?name=${encodeURIComponent(name)}`);
      if (!response.success || !response.data.length) {
        return null;
      }

      return Project.fromJSON(response.data[0]);
    } catch (error) {
      console.error('Error finding project by name:', error);
      return null;
    }
  }

  async findByWorkspacePath(workspacePath) {
    try {
      const response = await this._apiService.get(`/projects/search?workspacePath=${encodeURIComponent(workspacePath)}`);
      if (!response.success || !response.data.length) {
        return null;
      }

      return Project.fromJSON(response.data[0]);
    } catch (error) {
      console.error('Error finding project by workspace path:', error);
      return null;
    }
  }

  async findAll(options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.status) queryParams.append('status', options.status);
      if (options.type) queryParams.append('type', options.type);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);

      const response = await this._apiService.get(`/projects?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => Project.fromJSON(data));
    } catch (error) {
      console.error('Error finding all projects:', error);
      return [];
    }
  }

  async findActive() {
    try {
      const response = await this._apiService.get('/projects?status=active');
      if (!response.success) {
        return [];
      }

      return response.data.map(data => Project.fromJSON(data));
    } catch (error) {
      console.error('Error finding active projects:', error);
      return [];
    }
  }

  async save(project) {
    try {
      const response = await this._apiService.post('/projects', project.toJSON());
      if (!response.success) {
        throw new Error(response.error || 'Failed to save project');
      }

      const savedProject = Project.fromJSON(response.data);
      
      // Update cache
      await this._cacheService.set(`${this._cacheKey}:${savedProject.id.value}`, response.data, this._cacheExpiry);
      
      // Invalidate list cache
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return savedProject;
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }

  async update(project) {
    try {
      const response = await this._apiService.put(`/projects/${project.id.value}`, project.toJSON());
      if (!response.success) {
        throw new Error(response.error || 'Failed to update project');
      }

      const updatedProject = Project.fromJSON(response.data);
      
      // Update cache
      await this._cacheService.set(`${this._cacheKey}:${updatedProject.id.value}`, response.data, this._cacheExpiry);
      
      // Invalidate list cache
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async delete(projectId) {
    try {
      const id = projectId instanceof ProjectId ? projectId.value : projectId;
      
      const response = await this._apiService.delete(`/projects/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete project');
      }

      // Remove from cache
      await this._cacheService.delete(`${this._cacheKey}:${id}`);
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async hasActiveTasks(projectId) {
    try {
      const id = projectId instanceof ProjectId ? projectId.value : projectId;
      const response = await this._apiService.get(`/projects/${id}/tasks?status=running`);
      return response.success && response.data.length > 0;
    } catch (error) {
      console.error('Error checking active tasks:', error);
      return false;
    }
  }

  async hasActiveAnalysis(projectId) {
    try {
      const id = projectId instanceof ProjectId ? projectId.value : projectId;
      const response = await this._apiService.get(`/projects/${id}/analysis?status=running`);
      return response.success && response.data.length > 0;
    } catch (error) {
      console.error('Error checking active analysis:', error);
      return false;
    }
  }

  async getTaskCount(projectId) {
    try {
      const id = projectId instanceof ProjectId ? projectId.value : projectId;
      const response = await this._apiService.get(`/projects/${id}/tasks/count`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting task count:', error);
      return 0;
    }
  }

  async getAnalysisCount(projectId) {
    try {
      const id = projectId instanceof ProjectId ? projectId.value : projectId;
      const response = await this._apiService.get(`/projects/${id}/analysis/count`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting analysis count:', error);
      return 0;
    }
  }

  async getChatSessionCount(projectId) {
    try {
      const id = projectId instanceof ProjectId ? projectId.value : projectId;
      const response = await this._apiService.get(`/projects/${id}/chat-sessions/count`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting chat session count:', error);
      return 0;
    }
  }

  async search(query, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);

      const response = await this._apiService.get(`/projects/search?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => Project.fromJSON(data));
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  }

  async getStatistics(projectId) {
    try {
      const id = projectId instanceof ProjectId ? projectId.value : projectId;
      const response = await this._apiService.get(`/projects/${id}/statistics`);
      return response.success ? response.data : {};
    } catch (error) {
      console.error('Error getting project statistics:', error);
      return {};
    }
  }
}
