// Mock fetch globally for Node.js test environment
// This must be the very first line
// eslint-disable-next-line no-undef
global.fetch = jest.fn();

// Mock the AuthStore
jest.mock('@/infrastructure/stores/AuthStore.jsx', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => ({
      getAuthHeaders: jest.fn(() => ({ 'Authorization': 'Bearer mock-token' }))
    }))
  }
}));

import * as APIChatRepoModule from '@/infrastructure/repositories/APIChatRepository.jsx';
const { default: APIChatRepository } = APIChatRepoModule;

describe('APIChatRepository - Phase Operations', () => {
  let apiRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock global fetch to return proper Response objects
    global.fetch.mockImplementation((url, options) => {
      // Default successful response
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true, data: {} })
      };
      
      return Promise.resolve(mockResponse);
    });
    
    apiRepository = new APIChatRepository();
    apiRepository.getCurrentProjectId = jest.fn().mockResolvedValue('test-project');
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
            },
            implementation: {
              name: 'implementation',
              tasks: [
                { id: '2', title: 'Create API', status: 'pending' }
              ],
              totalTasks: 1,
              completedTasks: 0
            }
          }
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiRepository.getTasksByPhases('project1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/api\/projects\/project1\/tasks\/phases/),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result).toEqual(mockResponse.data.phases);
    });

    it('should use current project ID when no projectId is provided', async () => {
      const mockResponse = {
        success: true,
        data: { phases: {} }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await apiRepository.getTasksByPhases();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/api\/projects\/test-project\/tasks\/phases/),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        success: false,
        error: 'Database connection failed'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await expect(apiRepository.getTasksByPhases('project1'))
        .rejects.toThrow('Failed to load phase groups: Database connection failed');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiRepository.getTasksByPhases('project1'))
        .rejects.toThrow('Failed to load phase groups: Network error');
    });

    it('should handle missing response data', async () => {
      const mockResponse = {
        success: true,
        data: null
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await expect(apiRepository.getTasksByPhases('project1'))
        .rejects.toThrow('Failed to load phase groups: Cannot read properties of null (reading \'phases\')');
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
          failedTasks: 0,
          results: [
            { taskId: '1', status: 'completed', output: 'Task 1 completed' },
            { taskId: '2', status: 'completed', output: 'Task 2 completed' }
          ]
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiRepository.executePhase('project1', 'setup');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/api\/projects\/project1\/phases\/setup\/execute/),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should use current project ID when no projectId is provided', async () => {
      const mockResponse = {
        success: true,
        data: { phaseName: 'setup', totalTasks: 1, executedTasks: 1, failedTasks: 0 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await apiRepository.executePhase(null, 'setup');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/api\/projects\/test-project\/phases\/setup\/execute/),
        expect.any(Object)
      );
    });

    it('should handle execution errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Phase execution failed'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await expect(apiRepository.executePhase('project1', 'setup'))
        .rejects.toThrow('Failed to execute phase');
    });

    it('should handle network errors during execution', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(apiRepository.executePhase('project1', 'setup'))
        .rejects.toThrow('Failed to execute phase setup: Connection timeout');
    });

    it('should handle missing phase name', async () => {
      // Mock a 404 response for null phase name
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ error: 'Phase not found' })
      });

      await expect(apiRepository.executePhase('project1', null))
        .rejects.toThrow('Failed to execute phase null: HTTP 404: Not Found');
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
          failedPhases: 0,
          phaseResults: [
            {
              phaseName: 'setup',
              totalTasks: 1,
              executedTasks: 1,
              failedTasks: 0
            },
            {
              phaseName: 'implementation',
              totalTasks: 2,
              executedTasks: 2,
              failedTasks: 0
            }
          ]
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiRepository.executePhases('project1', ['setup', 'implementation']);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/api\/projects\/project1\/phases\/execute/),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }),
          body: JSON.stringify({ phaseNames: ['setup', 'implementation'] })
        })
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should use current project ID when no projectId is provided', async () => {
      const mockResponse = {
        success: true,
        data: { projectId: 'test-project', totalPhases: 1, executedPhases: 1, failedPhases: 0 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await apiRepository.executePhases(null, ['setup']);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/api\/projects\/test-project\/phases\/execute/),
        expect.objectContaining({
          body: JSON.stringify({ phaseNames: ['setup'] })
        })
      );
    });

    it('should handle execution errors for multiple phases', async () => {
      const mockResponse = {
        success: false,
        error: 'Failed to execute phases'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await expect(apiRepository.executePhases('project1', ['setup', 'implementation']))
        .rejects.toThrow('Failed to execute phases');
    });

    it('should handle empty phase names array', async () => {
      const mockResponse = {
        success: true,
        data: { projectId: 'project1', totalPhases: 0, executedPhases: 0, failedPhases: 0 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiRepository.executePhases('project1', []);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/api\/projects\/project1\/phases\/execute/),
        expect.objectContaining({
          body: JSON.stringify({ phaseNames: [] })
        })
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle network errors during multiple phase execution', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Server unavailable'));

      await expect(apiRepository.executePhases('project1', ['setup', 'implementation']))
        .rejects.toThrow('Failed to execute phases: Server unavailable');
    });
  });

  describe('Error handling utilities', () => {
    describe('isRetryableError', () => {
      it('should identify retryable HTTP status codes', () => {
        const retryableErrors = [
          { status: 408, message: 'Request timeout' },
          { status: 429, message: 'Too many requests' },
          { status: 500, message: 'Internal server error' },
          { status: 502, message: 'Bad gateway' },
          { status: 503, message: 'Service unavailable' },
          { status: 504, message: 'Gateway timeout' }
        ];

        retryableErrors.forEach(error => {
          expect(apiRepository.isRetryableError(error)).toBe(true);
        });
      });

      it('should identify retryable error messages', () => {
        const retryableErrors = [
          { message: 'Network timeout occurred' },
          { message: 'Connection lost' },
          { message: 'Network error' }
        ];

        retryableErrors.forEach(error => {
          expect(apiRepository.isRetryableError(error)).toBe(true);
        });
      });

      it('should identify non-retryable errors', () => {
        const nonRetryableErrors = [
          { status: 400, message: 'Bad request' },
          { status: 401, message: 'Unauthorized' },
          { status: 403, message: 'Forbidden' },
          { status: 404, message: 'Not found' },
          { message: 'Invalid input' },
          { message: 'Validation failed' }
        ];

        nonRetryableErrors.forEach(error => {
          expect(apiRepository.isRetryableError(error)).toBe(false);
        });
      });
    });

    describe('getUserFriendlyMessage', () => {
      it('should provide user-friendly error messages for known operations', () => {
        const error = new Error('Network timeout');
        
        const getTasksMessage = apiRepository.getUserFriendlyMessage(error, 'getTasksByPhases');
        const executePhaseMessage = apiRepository.getUserFriendlyMessage(error, 'executePhase');
        const executePhasesMessage = apiRepository.getUserFriendlyMessage(error, 'executePhases');
        
        expect(getTasksMessage).toBe('Unable to load task groups. Please try refreshing the page.');
        expect(executePhaseMessage).toBe('Failed to execute phase. Please check your connection and try again.');
        expect(executePhasesMessage).toBe('Failed to execute phases. Some operations may have completed successfully.');
      });

      it('should provide default message for unknown operations', () => {
        const error = new Error('Unknown error');
        const message = apiRepository.getUserFriendlyMessage(error, 'unknownOperation');
        
        expect(message).toBe('An unexpected error occurred. Please try again.');
      });
    });

    describe('handlePhaseError', () => {
      it('should format error information correctly', () => {
        const error = new Error('Test error');
        const operation = 'getTasksByPhases';
        
        const result = apiRepository.handlePhaseError(error, operation);
        
        expect(result).toMatchObject({
          message: 'Test error',
          operation: 'getTasksByPhases',
          timestamp: expect.any(String),
          retryable: expect.any(Boolean),
          userMessage: expect.any(String)
        });
        
        expect(new Date(result.timestamp)).toBeInstanceOf(Date);
      });

      it('should identify retryable errors correctly', () => {
        const retryableError = new Error('Network timeout');
        retryableError.status = 500;
        
        const result = apiRepository.handlePhaseError(retryableError, 'executePhase');
        
        expect(result.retryable).toBe(true);
      });

      it('should identify non-retryable errors correctly', () => {
        const nonRetryableError = new Error('Invalid input');
        nonRetryableError.status = 400;
        
        const result = apiRepository.handlePhaseError(nonRetryableError, 'executePhase');
        
        expect(result.retryable).toBe(false);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete phase workflow', async () => {
      // Mock getTasksByPhases
      const phasesResponse = {
        success: true,
        data: {
          phases: {
            setup: { name: 'setup', tasks: [{ id: '1', title: 'Setup', status: 'pending' }] },
            implementation: { name: 'implementation', tasks: [{ id: '2', title: 'Implement', status: 'pending' }] }
          }
        }
      };

      // Mock executePhase for setup
      const setupResponse = {
        success: true,
        data: { phaseName: 'setup', totalTasks: 1, executedTasks: 1, failedTasks: 0 }
      };

      // Mock executePhase for implementation
      const implementationResponse = {
        success: true,
        data: { phaseName: 'implementation', totalTasks: 1, executedTasks: 1, failedTasks: 0 }
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(phasesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(setupResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(implementationResponse)
        });

      // Test the complete workflow
      const phases = await apiRepository.getTasksByPhases('project1');
      const setupResult = await apiRepository.executePhase('project1', 'setup');
      const implementationResult = await apiRepository.executePhase('project1', 'implementation');

      expect(phases).toEqual(phasesResponse.data.phases);
      expect(setupResult).toEqual(setupResponse.data);
      expect(implementationResult).toEqual(implementationResponse.data);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial phase execution failure', async () => {
      // Mock successful phase execution
      const successResponse = {
        success: true,
        data: { phaseName: 'setup', totalTasks: 1, executedTasks: 1, failedTasks: 0 }
      };

      // Mock failed phase execution
      const failureResponse = {
        success: false,
        error: 'Phase execution failed'
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(successResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(failureResponse)
        });

      // First phase should succeed
      const setupResult = await apiRepository.executePhase('project1', 'setup');
      expect(setupResult).toEqual(successResponse.data);

      // Second phase should fail
      await expect(apiRepository.executePhase('project1', 'implementation'))
        .rejects.toThrow('Failed to execute phase');
    });
  });
}); 