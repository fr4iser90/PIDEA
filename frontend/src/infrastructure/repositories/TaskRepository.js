/**
 * TaskRepository
 * Infrastructure implementation of task repository
 */
import { ITaskRepository } from '../../domain/repositories/ITaskRepository.js';
import { Task } from '../../domain/entities/Task.js';
import { TaskType } from '../../domain/value-objects/TaskType.js';

export class TaskRepository extends ITaskRepository {
  constructor(apiService, cacheService) {
    super();
    this._apiService = apiService;
    this._cacheService = cacheService;
    this._cacheKey = 'tasks';
    this._cacheExpiry = 2 * 60 * 1000; // 2 minutes
  }

  async findById(taskId) {
    try {
      // Check cache first
      const cached = await this._cacheService.get(`${this._cacheKey}:${taskId}`);
      if (cached) {
        return Task.fromJSON(cached);
      }

      // Fetch from API
      const response = await this._apiService.get(`/tasks/${taskId}`);
      if (!response.success) {
        return null;
      }

      const task = Task.fromJSON(response.data);
      
      // Cache the result
      await this._cacheService.set(`${this._cacheKey}:${taskId}`, response.data, this._cacheExpiry);
      
      return task;
    } catch (error) {
      console.error('Error finding task by ID:', error);
      return null;
    }
  }

  async findByProjectId(projectId, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.status) queryParams.append('status', options.status);
      if (options.type) queryParams.append('type', options.type);
      if (options.priority) queryParams.append('priority', options.priority);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);

      const response = await this._apiService.get(`/projects/${projectId}/tasks?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => Task.fromJSON(data));
    } catch (error) {
      console.error('Error finding tasks by project ID:', error);
      return [];
    }
  }

  async findByStatus(status, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', status);
      
      if (options.type) queryParams.append('type', options.type);
      if (options.priority) queryParams.append('priority', options.priority);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);

      const response = await this._apiService.get(`/tasks?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => Task.fromJSON(data));
    } catch (error) {
      console.error('Error finding tasks by status:', error);
      return [];
    }
  }

  async findByType(type, options = {}) {
    try {
      const typeValue = type instanceof TaskType ? type.value : type;
      const queryParams = new URLSearchParams();
      queryParams.append('type', typeValue);
      
      if (options.status) queryParams.append('status', options.status);
      if (options.priority) queryParams.append('priority', options.priority);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);

      const response = await this._apiService.get(`/tasks?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => Task.fromJSON(data));
    } catch (error) {
      console.error('Error finding tasks by type:', error);
      return [];
    }
  }

  async findActiveByProject(projectId) {
    try {
      const response = await this._apiService.get(`/projects/${projectId}/tasks?status=running`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => Task.fromJSON(data));
    } catch (error) {
      console.error('Error finding active tasks by project:', error);
      return [];
    }
  }

  async findProjectById(projectId) {
    try {
      const response = await this._apiService.get(`/projects/${projectId}`);
      if (!response.success) {
        return null;
      }

      // Import Project here to avoid circular dependency
      const { Project } = await import('../../domain/entities/Project.js');
      return Project.fromJSON(response.data);
    } catch (error) {
      console.error('Error finding project by ID:', error);
      return null;
    }
  }

  async save(task) {
    try {
      const response = await this._apiService.post('/tasks', task.toJSON());
      if (!response.success) {
        throw new Error(response.error || 'Failed to save task');
      }

      const savedTask = Task.fromJSON(response.data);
      
      // Update cache
      await this._cacheService.set(`${this._cacheKey}:${savedTask.id}`, response.data, this._cacheExpiry);
      
      // Invalidate list cache
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return savedTask;
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  }

  async update(task) {
    try {
      const response = await this._apiService.put(`/tasks/${task.id}`, task.toJSON());
      if (!response.success) {
        throw new Error(response.error || 'Failed to update task');
      }

      const updatedTask = Task.fromJSON(response.data);
      
      // Update cache
      await this._cacheService.set(`${this._cacheKey}:${updatedTask.id}`, response.data, this._cacheExpiry);
      
      // Invalidate list cache
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async delete(taskId) {
    try {
      const response = await this._apiService.delete(`/tasks/${taskId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete task');
      }

      // Remove from cache
      await this._cacheService.delete(`${this._cacheKey}:${taskId}`);
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async countByProject(projectId) {
    try {
      const response = await this._apiService.get(`/projects/${projectId}/tasks/count`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting task count by project:', error);
      return 0;
    }
  }

  async countByStatus(status) {
    try {
      const response = await this._apiService.get(`/tasks/count?status=${status}`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting task count by status:', error);
      return 0;
    }
  }

  async getStatistics(projectId) {
    try {
      const response = await this._apiService.get(`/projects/${projectId}/tasks/statistics`);
      return response.success ? response.data : {};
    } catch (error) {
      console.error('Error getting task statistics:', error);
      return {};
    }
  }

  async search(query, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);

      const response = await this._apiService.get(`/tasks/search?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => Task.fromJSON(data));
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
  }
}
