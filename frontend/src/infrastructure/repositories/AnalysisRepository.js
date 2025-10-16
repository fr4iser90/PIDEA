/**
 * AnalysisRepository
 * Infrastructure implementation of analysis repository
 */
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository.js';
import { AnalysisResult } from '../../domain/entities/AnalysisResult.js';
import { AnalysisCategory } from '../../domain/value-objects/AnalysisCategory.js';

export class AnalysisRepository extends IAnalysisRepository {
  constructor(apiService, cacheService) {
    super();
    this._apiService = apiService;
    this._cacheService = cacheService;
    this._cacheKey = 'analysis';
    this._cacheExpiry = 3 * 60 * 1000; // 3 minutes
  }

  async findById(analysisId) {
    try {
      // Check cache first
      const cached = await this._cacheService.get(`${this._cacheKey}:${analysisId}`);
      if (cached) {
        return AnalysisResult.fromJSON(cached);
      }

      // Fetch from API
      const response = await this._apiService.get(`/analysis/${analysisId}`);
      if (!response.success) {
        return null;
      }

      const analysis = AnalysisResult.fromJSON(response.data);
      
      // Cache the result
      await this._cacheService.set(`${this._cacheKey}:${analysisId}`, response.data, this._cacheExpiry);
      
      return analysis;
    } catch (error) {
      console.error('Error finding analysis by ID:', error);
      return null;
    }
  }

  async findByProjectId(projectId, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.category) queryParams.append('category', options.category);
      if (options.status) queryParams.append('status', options.status);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
      if (options.includeResults) queryParams.append('includeResults', options.includeResults);

      const response = await this._apiService.get(`/projects/${projectId}/analysis?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => AnalysisResult.fromJSON(data));
    } catch (error) {
      console.error('Error finding analysis by project ID:', error);
      return [];
    }
  }

  async findByCategory(category, options = {}) {
    try {
      const categoryValue = category instanceof AnalysisCategory ? category.value : category;
      const queryParams = new URLSearchParams();
      queryParams.append('category', categoryValue);
      
      if (options.status) queryParams.append('status', options.status);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
      if (options.includeResults) queryParams.append('includeResults', options.includeResults);

      const response = await this._apiService.get(`/analysis?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => AnalysisResult.fromJSON(data));
    } catch (error) {
      console.error('Error finding analysis by category:', error);
      return [];
    }
  }

  async findByStatus(status, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', status);
      
      if (options.category) queryParams.append('category', options.category);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
      if (options.includeResults) queryParams.append('includeResults', options.includeResults);

      const response = await this._apiService.get(`/analysis?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => AnalysisResult.fromJSON(data));
    } catch (error) {
      console.error('Error finding analysis by status:', error);
      return [];
    }
  }

  async findRunningByProjectAndCategory(projectId, category) {
    try {
      const categoryValue = category instanceof AnalysisCategory ? category.value : category;
      const response = await this._apiService.get(`/projects/${projectId}/analysis?category=${categoryValue}&status=running`);
      
      if (!response.success || !response.data.length) {
        return null;
      }

      return AnalysisResult.fromJSON(response.data[0]);
    } catch (error) {
      console.error('Error finding running analysis by project and category:', error);
      return null;
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

  async save(analysis) {
    try {
      const response = await this._apiService.post('/analysis', analysis.toJSON());
      if (!response.success) {
        throw new Error(response.error || 'Failed to save analysis');
      }

      const savedAnalysis = AnalysisResult.fromJSON(response.data);
      
      // Update cache
      await this._cacheService.set(`${this._cacheKey}:${savedAnalysis.id}`, response.data, this._cacheExpiry);
      
      // Invalidate list cache
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return savedAnalysis;
    } catch (error) {
      console.error('Error saving analysis:', error);
      throw error;
    }
  }

  async update(analysis) {
    try {
      const response = await this._apiService.put(`/analysis/${analysis.id}`, analysis.toJSON());
      if (!response.success) {
        throw new Error(response.error || 'Failed to update analysis');
      }

      const updatedAnalysis = AnalysisResult.fromJSON(response.data);
      
      // Update cache
      await this._cacheService.set(`${this._cacheKey}:${updatedAnalysis.id}`, response.data, this._cacheExpiry);
      
      // Invalidate list cache
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return updatedAnalysis;
    } catch (error) {
      console.error('Error updating analysis:', error);
      throw error;
    }
  }

  async delete(analysisId) {
    try {
      const response = await this._apiService.delete(`/analysis/${analysisId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete analysis');
      }

      // Remove from cache
      await this._cacheService.delete(`${this._cacheKey}:${analysisId}`);
      await this._cacheService.delete(`${this._cacheKey}:list`);
      
      return true;
    } catch (error) {
      console.error('Error deleting analysis:', error);
      throw error;
    }
  }

  async countByProject(projectId) {
    try {
      const response = await this._apiService.get(`/projects/${projectId}/analysis/count`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting analysis count by project:', error);
      return 0;
    }
  }

  async countByCategory(category) {
    try {
      const categoryValue = category instanceof AnalysisCategory ? category.value : category;
      const response = await this._apiService.get(`/analysis/count?category=${categoryValue}`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting analysis count by category:', error);
      return 0;
    }
  }

  async countByStatus(status) {
    try {
      const response = await this._apiService.get(`/analysis/count?status=${status}`);
      return response.success ? response.data.count : 0;
    } catch (error) {
      console.error('Error getting analysis count by status:', error);
      return 0;
    }
  }

  async getStatistics(projectId) {
    try {
      const response = await this._apiService.get(`/projects/${projectId}/analysis/statistics`);
      return response.success ? response.data : {};
    } catch (error) {
      console.error('Error getting analysis statistics:', error);
      return {};
    }
  }

  async getLatestByProjectAndCategory(projectId, category) {
    try {
      const categoryValue = category instanceof AnalysisCategory ? category.value : category;
      const response = await this._apiService.get(`/projects/${projectId}/analysis/latest?category=${categoryValue}`);
      
      if (!response.success || !response.data) {
        return null;
      }

      return AnalysisResult.fromJSON(response.data);
    } catch (error) {
      console.error('Error getting latest analysis by project and category:', error);
      return null;
    }
  }

  async search(query, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);

      const response = await this._apiService.get(`/analysis/search?${queryParams.toString()}`);
      if (!response.success) {
        return [];
      }

      return response.data.map(data => AnalysisResult.fromJSON(data));
    } catch (error) {
      console.error('Error searching analysis:', error);
      return [];
    }
  }
}
