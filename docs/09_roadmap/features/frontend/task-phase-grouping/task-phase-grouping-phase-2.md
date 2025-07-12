# Phase 2: Frontend API Integration

## Overview
Extend the frontend API layer to support the new phase grouping and execution endpoints.

## Tasks

### 1. Add getTasksByPhases method to APIChatRepository
**File**: `frontend/src/infrastructure/api/APIChatRepository.jsx`
**Time**: 20 minutes

```javascript
/**
 * Get tasks grouped by phases for a project
 * @param {string} projectId - The project ID
 * @returns {Promise<Object>} Tasks grouped by phases
 */
async getTasksByPhases(projectId) {
  try {
    const response = await this.apiCall(`/api/projects/${projectId}/tasks/phases`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get tasks by phases');
    }

    return response.data.phases;
  } catch (error) {
    console.error('Error fetching tasks by phases:', error);
    throw new Error(`Failed to load phase groups: ${error.message}`);
  }
}
```

### 2. Add executePhase method to APIChatRepository
**File**: `frontend/src/infrastructure/api/APIChatRepository.jsx`
**Time**: 20 minutes

```javascript
/**
 * Execute all tasks in a specific phase
 * @param {string} projectId - The project ID
 * @param {string} phaseName - The phase name to execute
 * @returns {Promise<Object>} Execution results
 */
async executePhase(projectId, phaseName) {
  try {
    const response = await this.apiCall(`/api/projects/${projectId}/phases/${phaseName}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to execute phase');
    }

    return response.data;
  } catch (error) {
    console.error('Error executing phase:', error);
    throw new Error(`Failed to execute phase ${phaseName}: ${error.message}`);
  }
}

/**
 * Execute multiple phases in sequence
 * @param {string} projectId - The project ID
 * @param {Array<string>} phaseNames - Array of phase names to execute
 * @returns {Promise<Object>} Execution results for all phases
 */
async executePhases(projectId, phaseNames) {
  try {
    const response = await this.apiCall(`/api/projects/${projectId}/phases/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ phaseNames })
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to execute phases');
    }

    return response.data;
  } catch (error) {
    console.error('Error executing phases:', error);
    throw new Error(`Failed to execute phases: ${error.message}`);
  }
}
```

### 3. Update API error handling for new endpoints
**File**: `frontend/src/infrastructure/api/APIChatRepository.jsx`
**Time**: 15 minutes

```javascript
/**
 * Enhanced error handler for phase operations
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @returns {Object} Formatted error information
 */
handlePhaseError(error, operation) {
  const errorInfo = {
    message: error.message,
    operation,
    timestamp: new Date().toISOString(),
    retryable: this.isRetryableError(error)
  };

  // Log error for debugging
  console.error(`Phase operation error (${operation}):`, errorInfo);

  // Return user-friendly error message
  return {
    ...errorInfo,
    userMessage: this.getUserFriendlyMessage(error, operation)
  };
}

/**
 * Check if an error is retryable
 * @param {Error} error - The error object
 * @returns {boolean} Whether the error is retryable
 */
isRetryableError(error) {
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  const retryableMessages = ['timeout', 'network', 'connection'];
  
  if (error.status && retryableStatuses.includes(error.status)) {
    return true;
  }
  
  return retryableMessages.some(msg => 
    error.message.toLowerCase().includes(msg)
  );
}

/**
 * Get user-friendly error message
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @returns {string} User-friendly error message
 */
getUserFriendlyMessage(error, operation) {
  const messages = {
    'getTasksByPhases': 'Unable to load task groups. Please try refreshing the page.',
    'executePhase': 'Failed to execute phase. Please check your connection and try again.',
    'executePhases': 'Failed to execute phases. Some operations may have completed successfully.'
  };

  return messages[operation] || 'An unexpected error occurred. Please try again.';
}
```

### 4. Test API integration
**File**: `frontend/tests/integration/APIChatRepository.test.js`
**Time**: 25 minutes

```javascript
describe('APIChatRepository - Phase Operations', () => {
  let apiRepository;
  let mockApiCall;

  beforeEach(() => {
    mockApiCall = jest.fn();
    apiRepository = new APIChatRepository();
    apiRepository.apiCall = mockApiCall;
    apiRepository.getAuthToken = jest.fn().mockReturnValue('mock-token');
  });

  describe('getTasksByPhases', () => {
    it('should fetch tasks grouped by phases successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          phases: {
            setup: {
              name: 'setup',
              tasks: [
                { id: '1', title: 'Setup DB', status: 'completed' }
              ],
              totalTasks: 1,
              completedTasks: 1
            }
          }
        }
      };

      mockApiCall.mockResolvedValue(mockResponse);

      const result = await apiRepository.getTasksByPhases('project1');

      expect(mockApiCall).toHaveBeenCalledWith(
        '/api/projects/project1/tasks/phases',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result).toEqual(mockResponse.data.phases);
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        success: false,
        error: 'Database connection failed'
      };

      mockApiCall.mockResolvedValue(mockResponse);

      await expect(apiRepository.getTasksByPhases('project1'))
        .rejects.toThrow('Failed to get tasks by phases');
    });

    it('should handle network errors', async () => {
      mockApiCall.mockRejectedValue(new Error('Network error'));

      await expect(apiRepository.getTasksByPhases('project1'))
        .rejects.toThrow('Failed to load phase groups: Network error');
    });
  });

  describe('executePhase', () => {
    it('should execute phase successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          phaseName: 'setup',
          totalTasks: 2,
          executedTasks: 2,
          failedTasks: 0
        }
      };

      mockApiCall.mockResolvedValue(mockResponse);

      const result = await apiRepository.executePhase('project1', 'setup');

      expect(mockApiCall).toHaveBeenCalledWith(
        '/api/projects/project1/phases/setup/execute',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle execution errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Phase execution failed'
      };

      mockApiCall.mockResolvedValue(mockResponse);

      await expect(apiRepository.executePhase('project1', 'setup'))
        .rejects.toThrow('Failed to execute phase');
    });
  });

  describe('executePhases', () => {
    it('should execute multiple phases successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          projectId: 'project1',
          totalPhases: 2,
          executedPhases: 2,
          failedPhases: 0
        }
      };

      mockApiCall.mockResolvedValue(mockResponse);

      const result = await apiRepository.executePhases('project1', ['setup', 'implementation']);

      expect(mockApiCall).toHaveBeenCalledWith(
        '/api/projects/project1/phases/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phaseNames: ['setup', 'implementation'] })
        })
      );

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Error handling utilities', () => {
    it('should identify retryable errors correctly', () => {
      const retryableError = { status: 500, message: 'Internal server error' };
      const nonRetryableError = { status: 400, message: 'Bad request' };

      expect(apiRepository.isRetryableError(retryableError)).toBe(true);
      expect(apiRepository.isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should provide user-friendly error messages', () => {
      const error = new Error('Network timeout');
      
      const message = apiRepository.getUserFriendlyMessage(error, 'getTasksByPhases');
      
      expect(message).toBe('Unable to load task groups. Please try refreshing the page.');
    });
  });
});
```

## Success Criteria
- [ ] getTasksByPhases method successfully calls backend API
- [ ] executePhase method successfully calls backend API
- [ ] executePhases method handles multiple phase execution
- [ ] Error handling provides user-friendly messages
- [ ] All API calls include proper authentication headers
- [ ] Integration tests pass with 100% coverage
- [ ] Error scenarios are properly handled and logged

## Dependencies
- Existing APIChatRepository infrastructure
- Authentication token management
- Jest testing framework

## Notes
- Uses existing apiCall method for consistency
- Implements proper error handling with user-friendly messages
- Includes retry logic for transient errors
- Maintains authentication token handling
- Provides comprehensive test coverage for all scenarios 