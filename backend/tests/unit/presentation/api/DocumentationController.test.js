const DocumentationController = require('@/presentation/api/DocumentationController');
const path = require('path');
const fs = require('fs');

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('DocumentationController', () => {
  let controller;
  let mockTaskService;
  let mockCursorIDEService;
  let mockLogger;
  let mockIDEManager;
  let mockChatRepository;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Create mock services
    mockTaskService = {
      createTask: jest.fn(),
      getTasks: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn()
    };

    mockCursorIDEService = {
      sendMessage: jest.fn(),
      switchToPort: jest.fn(),
      getActivePort: jest.fn().mockReturnValue(3000),
      chatMessageHandler: {
        waitForAIResponse: jest.fn()
      }
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockIDEManager = {
      getAvailableIDEs: jest.fn(),
      getWorkspacePath: jest.fn()
    };

    mockChatRepository = {
      getMessagesByPort: jest.fn(),
      saveMessage: jest.fn()
    };

    // Create controller instance
    controller = new DocumentationController(
      mockTaskService,
      mockCursorIDEService,
      mockLogger,
      mockIDEManager,
      mockChatRepository
    );

    // Mock request and response objects
    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Mock path.join
    path.join.mockImplementation((...args) => args.join('/'));

    // Mock fs.existsSync and fs.readFileSync
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('Mock prompt template content');

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(controller.taskService).toBe(mockTaskService);
      expect(controller.cursorIDEService).toBe(mockCursorIDEService);
      expect(controller.logger).toBe(mockLogger);
      expect(controller.ideManager).toBe(mockIDEManager);
      expect(controller.chatRepository).toBe(mockChatRepository);
      expect(controller.contentLibraryPath).toBeDefined();
    });

    it('should initialize with default values when optional dependencies are not provided', () => {
      const controllerWithoutOptionals = new DocumentationController(
        mockTaskService,
        mockCursorIDEService,
        mockLogger
      );

      expect(controllerWithoutOptionals.ideManager).toBeNull();
      expect(controllerWithoutOptionals.chatRepository).toBeNull();
    });
  });

  describe('analyzeAllProjects', () => {
    beforeEach(() => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([
        { port: 3000, name: 'IDE1' },
        { port: 3001, name: 'IDE2' }
      ]);
      mockIDEManager.getWorkspacePath.mockImplementation((port) => {
        return port === 3000 ? '/path/to/project1' : '/path/to/project2';
      });
      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: true,
        response: 'Mock AI response'
      });
      mockCursorIDEService.switchToPort.mockResolvedValue();
    });

    it('should successfully analyze all projects', async () => {
      // Mock successful response collection
      mockChatRepository.getMessagesByPort.mockResolvedValue([
        {
          id: 'msg1',
          content: 'Mock AI response',
          sender: 'assistant',
          timestamp: new Date()
        }
      ]);

      // Mock successful task creation
      mockTaskService.createTask.mockResolvedValue({
        id: 'task1',
        title: 'Test task',
        description: 'Test description'
      });

      // Mock the executeDocumentationTasksBatch method to avoid timeouts
      jest.spyOn(controller, 'executeDocumentationTasksBatch').mockResolvedValue({
        batchId: 'batch_123',
        status: 'completed',
        progress: 100
      });

      // Mock setTimeout to avoid actual delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return null;
      });

      await controller.analyzeAllProjects(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalIDEs: 2,
            successfulAnalyses: expect.any(Number),
            failedAnalyses: expect.any(Number)
          })
        })
      );
    });

    it('should handle case when IDE manager is not available', async () => {
      const controllerWithoutIDEManager = new DocumentationController(
        mockTaskService,
        mockCursorIDEService,
        mockLogger
      );

      await controllerWithoutIDEManager.analyzeAllProjects(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'IDE Manager not available'
      });
    });

    it('should handle case when no IDEs are available', async () => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([]);

      await controller.analyzeAllProjects(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No IDE instances found. Please open projects in Cursor IDE first.'
      });
    });

    it('should handle IDE with invalid workspace path', async () => {
      mockIDEManager.getWorkspacePath.mockReturnValue('invalid:path');

      // Mock the executeDocumentationTasksBatch method to avoid timeouts
      jest.spyOn(controller, 'executeDocumentationTasksBatch').mockResolvedValue({
        batchId: 'batch_123',
        status: 'completed',
        progress: 100
      });

      // Mock setTimeout to avoid actual delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return null;
      });

      await controller.analyzeAllProjects(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            failedAnalyses: expect.any(Number)
          })
        })
      );
    });

    it('should handle errors during analysis', async () => {
      mockCursorIDEService.sendMessage.mockRejectedValue(new Error('Test error'));

      // Mock the executeDocumentationTasksBatch method to avoid timeouts
      jest.spyOn(controller, 'executeDocumentationTasksBatch').mockResolvedValue({
        batchId: 'batch_123',
        status: 'completed',
        progress: 100
      });

      // Mock setTimeout to avoid actual delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return null;
      });

      await controller.analyzeAllProjects(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            failedAnalyses: expect.any(Number)
          })
        })
      );
    });

    it('should handle errors in response collection', async () => {
      mockChatRepository.getMessagesByPort.mockRejectedValue(new Error('Chat error'));

      // Mock the executeDocumentationTasksBatch method to avoid timeouts
      jest.spyOn(controller, 'executeDocumentationTasksBatch').mockResolvedValue({
        batchId: 'batch_123',
        status: 'completed',
        progress: 100
      });

      // Mock setTimeout to avoid actual delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return null;
      });

      await controller.analyzeAllProjects(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            failedAnalyses: expect.any(Number)
          })
        })
      );
    });
  });

  describe('findProjectIDE', () => {
    beforeEach(() => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([
        { port: 3000, name: 'IDE1' },
        { port: 3001, name: 'IDE2' }
      ]);
    });

    it('should find IDE with exact workspace path match', async () => {
      mockIDEManager.getWorkspacePath.mockImplementation((port) => {
        return port === 3000 ? '/path/to/project1' : '/path/to/project2';
      });

      const result = await controller.findProjectIDE('/path/to/project1');

      expect(result).toEqual({ port: 3000, name: 'IDE1' });
    });

    it('should find IDE with partial workspace path match', async () => {
      mockIDEManager.getWorkspacePath.mockImplementation((port) => {
        return port === 3000 ? '/path/to/project1' : '/path/to/project2';
      });

      const result = await controller.findProjectIDE('/some/path/project1');

      expect(result).toEqual({ port: 3000, name: 'IDE1' });
    });

    it('should fallback to active IDE when no match found', async () => {
      mockIDEManager.getWorkspacePath.mockReturnValue('/different/path');

      const result = await controller.findProjectIDE('/path/to/project1');

      expect(result).toEqual({ port: 3000 });
    });

    it('should handle case when IDE manager is not available', async () => {
      const controllerWithoutIDEManager = new DocumentationController(
        mockTaskService,
        mockCursorIDEService,
        mockLogger
      );

      const result = await controllerWithoutIDEManager.findProjectIDE('/path/to/project1');

      expect(result).toEqual({ port: 3000 });
    });

    it('should handle errors during IDE search', async () => {
      mockIDEManager.getAvailableIDEs.mockRejectedValue(new Error('IDE error'));

      const result = await controller.findProjectIDE('/path/to/project1');

      expect(result).toEqual({ port: 3000 });
    });
  });

  describe('analyzeDocumentation', () => {
    beforeEach(() => {
      mockReq.params = { projectId: 'test-project' };
      mockReq.body = { projectPath: '/path/to/project' };
      
      mockIDEManager.getWorkspacePath.mockReturnValue('/path/to/project');
      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: true,
        response: 'Mock AI response',
        duration: 5000
      });
      mockTaskService.createTask.mockResolvedValue({
        id: 'task1',
        title: 'Test task'
      });
    });

    it('should successfully analyze documentation', async () => {
      await controller.analyzeDocumentation(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            projectId: 'test-project',
            projectPath: '/path/to/project'
          })
        })
      );
    });

    it('should handle case when no IDE is found for project', async () => {
      // Mock findProjectIDE to return null
      jest.spyOn(controller, 'findProjectIDE').mockResolvedValue(null);

      await controller.analyzeDocumentation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No IDE found for this project. Please open the project in Cursor IDE first.'
      });
    });

    it('should handle missing prompt file', async () => {
      fs.existsSync.mockReturnValue(false);

      await controller.analyzeDocumentation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'doc-analyze.md prompt not found'
      });
    });

    it('should handle AI response timeout', async () => {
      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: false,
        response: null
      });

      await controller.analyzeDocumentation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI analysis timed out or failed'
      });
    });

    it('should handle errors during analysis', async () => {
      mockCursorIDEService.sendMessage.mockRejectedValue(new Error('Test error'));

      await controller.analyzeDocumentation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error'
      });
    });
  });

  describe('processDocumentationAnalysis', () => {
    it('should process analysis text successfully', () => {
      const analysisText = `
        ## Tasks
        Task: Create API documentation
        - **Estimated Time**: 4 hours
        - **Priority**: High
        
        ## Coverage
        | **API Documentation** | 75% |
        
        ## Critical Missing (High Priority)
        - [ ] API endpoint documentation
      `;

      const result = controller.processDocumentationAnalysis(analysisText, 'test-project');

      expect(result).toEqual(
        expect.objectContaining({
          rawResponse: analysisText,
          tasks: expect.any(Array),
          coverage: expect.any(Object),
          priorities: expect.any(Array),
          summary: expect.any(Object)
        })
      );
    });

    it('should handle processing errors gracefully', () => {
      const result = controller.processDocumentationAnalysis(null, 'test-project');

      expect(result).toEqual(
        expect.objectContaining({
          rawResponse: null,
          tasks: [],
          coverage: {},
          priorities: [],
          summary: 'Analysis completed but processing failed'
        })
      );
    });
  });

  describe('extractTasksFromAnalysis', () => {
    it('should extract tasks with complex regex', () => {
      const analysisText = `
        Task: Create API documentation
        - **Estimated Time**: 4 hours
        - **Priority**: High
        - **Dependencies**: None
        
        Task: Update README
        - **Estimated Time**: 2 hours
        - **Priority**: Medium
      `;

      const tasks = controller.extractTasksFromAnalysis(analysisText);

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual(
        expect.objectContaining({
          title: 'Create API documentation',
          priority: 'high',
          estimatedTime: 4
        })
      );
    });

    it('should use fallback regex when complex regex fails', () => {
      const analysisText = 'Task: Simple task without details';

      const tasks = controller.extractTasksFromAnalysis(analysisText);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toEqual(
        expect.objectContaining({
          title: 'Simple task without details',
          priority: 'medium',
          estimatedTime: 2
        })
      );
    });

    it('should filter out duplicate tasks', () => {
      const analysisText = `
        Task: Create API documentation
        Task: Create API documentation
        Task: Update README
      `;

      const tasks = controller.extractTasksFromAnalysis(analysisText);

      expect(tasks).toHaveLength(2);
    });

    it('should filter out very short tasks', () => {
      const analysisText = 'Task: Short';

      const tasks = controller.extractTasksFromAnalysis(analysisText);

      expect(tasks).toHaveLength(0);
    });
  });

  describe('extractCoverageMetrics', () => {
    it('should extract coverage metrics from analysis text', () => {
      const analysisText = `
        | **API Documentation** | 75% |
        | **User Guide** | 60% |
        | **README** | 90% |
      `;

      const coverage = controller.extractCoverageMetrics(analysisText);

      expect(coverage).toEqual({
        'API Documentation': 75,
        'User Guide': 60,
        'README': 90
      });
    });

    it('should return empty object when no coverage found', () => {
      const analysisText = 'No coverage information here';

      const coverage = controller.extractCoverageMetrics(analysisText);

      expect(coverage).toEqual({});
    });
  });

  describe('extractPriorityAreas', () => {
    it('should extract priority areas from analysis text', () => {
      const analysisText = `
        ## Critical Missing (High Priority)
        - [ ] API endpoint documentation
        - [ ] Error handling guide
        
        ## Important Missing (Medium Priority)
        - [ ] Installation guide
      `;

      const priorities = controller.extractPriorityAreas(analysisText);

      expect(priorities).toHaveLength(2);
      expect(priorities[0]).toEqual({
        level: 'high',
        items: ['API endpoint documentation', 'Error handling guide', 'Installation guide']
      });
      expect(priorities[1]).toEqual({
        level: 'medium',
        items: ['Installation guide']
      });
    });

    it('should return empty array when no priority sections found', () => {
      const analysisText = 'No priority sections here';

      const priorities = controller.extractPriorityAreas(analysisText);

      expect(priorities).toEqual([]);
    });
  });

  describe('extractListItems', () => {
    it('should extract list items from text', () => {
      const text = `
        - [ ] First item
        - [ ] Second item
        - [ ] Third item
      `;

      const items = controller.extractListItems(text);

      expect(items).toEqual([
        'First item',
        'Second item',
        'Third item'
      ]);
    });

    it('should return empty array when no list items found', () => {
      const text = 'No list items here';

      const items = controller.extractListItems(text);

      expect(items).toEqual([]);
    });
  });

  describe('generateAnalysisSummary', () => {
    it('should generate summary with all data', () => {
      const tasks = [
        { title: 'Task 1', priority: 'high' },
        { title: 'Task 2', priority: 'medium' }
      ];
      const coverage = { 'API': 75, 'Docs': 60 };
      const priorities = [
        { level: 'high', items: ['Item 1', 'Item 2'] }
      ];

      const summary = controller.generateAnalysisSummary(tasks, coverage, priorities);

      expect(summary).toEqual({
        taskCount: 2,
        avgCoverage: 68,
        highPriorityCount: 2,
        message: 'Found 2 documentation tasks. Average coverage: 68%. 2 high-priority areas identified.'
      });
    });

    it('should handle empty data', () => {
      const summary = controller.generateAnalysisSummary([], {}, []);

      expect(summary).toEqual({
        taskCount: 0,
        avgCoverage: 0,
        highPriorityCount: 0,
        message: 'Found 0 documentation tasks. Average coverage: 0%. 0 high-priority areas identified.'
      });
    });
  });

  describe('createTasksFromAnalysis', () => {
    beforeEach(() => {
      mockTaskService.createTask.mockResolvedValue({
        id: 'task1',
        title: 'Test task'
      });
      mockIDEManager.getWorkspacePath.mockReturnValue('/path/to/project');
    });

    it('should create tasks from analysis successfully', async () => {
      const analysisResult = {
        tasks: [
          {
            title: 'Create API docs',
            description: 'Document API endpoints',
            priority: 'high',
            estimatedTime: 4
          }
        ]
      };

      const result = await controller.createTasksFromAnalysis(analysisResult, 'test-project');

      expect(result).toEqual(
        expect.objectContaining({
          createdTasks: expect.any(Array),
          executionResults: expect.any(Array),
          summary: expect.any(Object)
        })
      );
      expect(mockTaskService.createTask).toHaveBeenCalled();
    });

    it('should handle task creation errors gracefully', async () => {
      const analysisResult = {
        tasks: [
          {
            title: 'Create API docs',
            description: 'Document API endpoints',
            priority: 'high'
          }
        ]
      };

      mockTaskService.createTask.mockRejectedValue(new Error('Task creation failed'));

      const result = await controller.createTasksFromAnalysis(analysisResult, 'test-project');

      expect(result.createdTasks).toHaveLength(0);
      expect(result.executionResults).toHaveLength(0);
    });

    it('should handle empty tasks array', async () => {
      const analysisResult = { tasks: [] };

      const result = await controller.createTasksFromAnalysis(analysisResult, 'test-project');

      expect(result.createdTasks).toHaveLength(0);
      expect(result.executionResults).toHaveLength(0);
    });
  });

  describe('normalizePriority', () => {
    it('should normalize high priority variants', () => {
      expect(controller.normalizePriority('high')).toBe('high');
      expect(controller.normalizePriority('critical')).toBe('high');
      expect(controller.normalizePriority('urgent')).toBe('high');
    });

    it('should normalize low priority variants', () => {
      expect(controller.normalizePriority('low')).toBe('low');
      expect(controller.normalizePriority('minor')).toBe('low');
    });

    it('should default to medium for unknown priorities', () => {
      expect(controller.normalizePriority('medium')).toBe('medium');
      expect(controller.normalizePriority('unknown')).toBe('medium');
      expect(controller.normalizePriority(null)).toBe('medium');
      expect(controller.normalizePriority(undefined)).toBe('medium');
    });
  });

  describe('getProjectIdFromPath', () => {
    it('should extract project ID from workspace path', () => {
      expect(controller.getProjectIdFromPath('/path/to/my-project')).toBe('myproject');
      expect(controller.getProjectIdFromPath('/path/to/My Project')).toBe('myproject');
      expect(controller.getProjectIdFromPath('/path/to/project-123')).toBe('project123');
    });

    it('should handle edge cases', () => {
      expect(controller.getProjectIdFromPath('')).toBe('unknown');
      expect(controller.getProjectIdFromPath(null)).toBe('unknown');
      expect(controller.getProjectIdFromPath(undefined)).toBe('unknown');
    });
  });

  describe('createOrGetChatSession', () => {
    it('should create chat session for project and IDE port', async () => {
      const session = await controller.createOrGetChatSession('test-project', 3000);

      expect(session).toEqual({
        id: 'test-project_port_3000',
        projectId: 'test-project',
        idePort: 3000,
        createdAt: expect.any(Date)
      });
    });
  });

  describe('saveChatMessage', () => {
    it('should save chat message and return message object', async () => {
      const message = await controller.saveChatMessage('session1', 'Test message', 'assistant', 'documentation');

      expect(message).toEqual({
        id: expect.any(Number),
        sessionId: 'session1',
        content: 'Test message',
        sender: 'assistant',
        type: 'documentation',
        timestamp: expect.any(Date)
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('runSingleProjectAnalysis', () => {
    beforeEach(() => {
      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: true,
        response: 'Mock AI response',
        duration: 5000
      });
      mockTaskService.createTask.mockResolvedValue({
        id: 'task1',
        title: 'Test task'
      });
    });

    it('should run single project analysis successfully', async () => {
      const result = await controller.runSingleProjectAnalysis('test-project', '/path/to/project', 3000);

      expect(result).toEqual(
        expect.objectContaining({
          projectId: 'test-project',
          projectPath: '/path/to/project',
          idePort: 3000,
          analysis: expect.any(Object),
          createdTasks: expect.any(Array),
          executionResults: expect.any(Array),
          executionSummary: expect.any(Object),
          promptSent: true,
          ideResponse: expect.any(Object),
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle missing prompt file', async () => {
      fs.existsSync.mockReturnValue(false);

      await expect(
        controller.runSingleProjectAnalysis('test-project', '/path/to/project', 3000)
      ).rejects.toThrow('doc-analyze.md prompt not found');
    });

    it('should handle AI response failure', async () => {
      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: false,
        response: null
      });

      await expect(
        controller.runSingleProjectAnalysis('test-project', '/path/to/project', 3000)
      ).rejects.toThrow('AI analysis timed out or failed for project test-project');
    });
  });

  describe('sendQuickPrompt', () => {
    beforeEach(() => {
      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: true,
        response: null
      });
    });

    it('should send quick prompt successfully', async () => {
      const result = await controller.sendQuickPrompt('test-project', '/path/to/project', 3000);

      expect(result).toEqual({
        success: true,
        promptSent: true
      });
    });

    it('should handle missing prompt file', async () => {
      fs.existsSync.mockReturnValue(false);

      await expect(
        controller.sendQuickPrompt('test-project', '/path/to/project', 3000)
      ).rejects.toThrow('doc-analyze.md prompt not found');
    });

    it('should handle send message failure', async () => {
      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: false,
        response: null
      });

      await expect(
        controller.sendQuickPrompt('test-project', '/path/to/project', 3000)
      ).rejects.toThrow('Failed to send prompt to IDE 3000');
    });
  });

  describe('getLatestChatResponse', () => {
    beforeEach(() => {
      mockChatRepository.getMessagesByPort.mockResolvedValue([
        {
          id: 'msg1',
          content: 'Latest AI response',
          sender: 'assistant',
          timestamp: new Date()
        },
        {
          id: 'msg2',
          content: 'User message',
          sender: 'user',
          timestamp: new Date(Date.now() - 1000)
        }
      ]);
    });

    it('should get latest chat response successfully', async () => {
      const result = await controller.getLatestChatResponse('test-project', 3000);

      expect(result).toEqual({
        success: true,
        response: 'Latest AI response',
        html: '',
        timestamp: expect.any(Date)
      });
    });

    it('should handle case when chat repository is not available', async () => {
      const controllerWithoutChatRepo = new DocumentationController(
        mockTaskService,
        mockCursorIDEService,
        mockLogger,
        mockIDEManager
      );

      const result = await controllerWithoutChatRepo.getLatestChatResponse('test-project', 3000);

      expect(result).toEqual({
        success: false,
        response: null,
        error: 'ChatRepository not available'
      });
    });

    it('should handle case when no messages found', async () => {
      mockChatRepository.getMessagesByPort.mockResolvedValue([]);

      const result = await controller.getLatestChatResponse('test-project', 3000);

      expect(result).toEqual({
        success: false,
        response: null,
        error: 'No messages found for port'
      });
    });

    it('should handle case when no AI messages found', async () => {
      mockChatRepository.getMessagesByPort.mockResolvedValue([
        {
          id: 'msg1',
          content: 'User message',
          sender: 'user',
          timestamp: new Date()
        }
      ]);

      const result = await controller.getLatestChatResponse('test-project', 3000);

      expect(result).toEqual({
        success: false,
        response: null,
        error: 'No AI messages found for port'
      });
    });

    it('should handle errors during message retrieval', async () => {
      mockChatRepository.getMessagesByPort.mockRejectedValue(new Error('Database error'));

      const result = await controller.getLatestChatResponse('test-project', 3000);

      expect(result).toEqual({
        success: false,
        response: null,
        error: 'Database error'
      });
    });
  });

  describe('collectResponseOnly', () => {
    beforeEach(() => {
      mockChatRepository.getMessagesByPort.mockResolvedValue([
        {
          id: 'msg1',
          content: 'AI response',
          sender: 'assistant',
          timestamp: new Date()
        }
      ]);
    });

    it('should collect response only successfully', async () => {
      const result = await controller.collectResponseOnly('test-project', '/path/to/project', 3000);

      expect(result).toEqual({
        success: true,
        response: 'AI response',
        analysis: expect.any(Object)
      });
    });

    it('should handle case when no response found', async () => {
      mockChatRepository.getMessagesByPort.mockResolvedValue([]);

      const result = await controller.collectResponseOnly('test-project', '/path/to/project', 3000);

      expect(result).toEqual({
        success: false,
        response: null,
        error: 'No response received'
      });
    });
  });

  describe('executeDocumentationTasksBatch', () => {
    beforeEach(() => {
      const tasks = [
        {
          id: 'task1',
          title: 'Create API docs',
          description: 'Document API endpoints',
          priority: 'high',
          type: 'documentation',
          createdAt: new Date()
        }
      ];
      controller.tasks = tasks;
    });

    it('should execute documentation tasks batch successfully', async () => {
      const tasks = [
        {
          id: 'task1',
          title: 'Create API docs',
          description: 'Document API endpoints',
          priority: 'high',
          type: 'documentation',
          createdAt: new Date()
        }
      ];

      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: true,
        response: 'Batch execution completed'
      });

      const result = await controller.executeDocumentationTasksBatch(tasks, '/path/to/project');

      expect(result).toEqual(
        expect.objectContaining({
          batchId: expect.any(String),
          status: 'completed',
          progress: 100,
          executionTime: expect.any(String),
          promptSent: true,
          ideResponse: expect.any(Object),
          message: 'Executed 1 documentation tasks in batch',
          taskCount: 1
        })
      );
    });

    it('should handle missing execute prompt file', async () => {
      const tasks = [
        {
          id: 'task1',
          title: 'Create API docs',
          description: 'Document API endpoints',
          priority: 'high',
          type: 'documentation',
          createdAt: new Date()
        }
      ];

      fs.existsSync.mockReturnValue(false);

      const result = await controller.executeDocumentationTasksBatch(tasks, '/path/to/project');

      expect(result).toEqual(
        expect.objectContaining({
          status: 'failed',
          error: 'doc-execute.md prompt not found'
        })
      );
    });

    it('should handle batch execution errors', async () => {
      const tasks = [
        {
          id: 'task1',
          title: 'Create API docs',
          description: 'Document API endpoints',
          priority: 'high',
          type: 'documentation',
          createdAt: new Date()
        }
      ];

      mockCursorIDEService.sendMessage.mockRejectedValue(new Error('Execution failed'));

      const result = await controller.executeDocumentationTasksBatch(tasks, '/path/to/project');

      expect(result).toEqual(
        expect.objectContaining({
          status: 'failed',
          error: 'Execution failed'
        })
      );
    });
  });

  describe('executeDocumentationTask', () => {
    it('should execute single documentation task successfully', async () => {
      const task = {
        id: 'task1',
        title: 'Create API docs',
        description: 'Document API endpoints'
      };

      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: true,
        response: 'Task executed'
      });

      const result = await controller.executeDocumentationTask(task, '/path/to/project');

      expect(result).toEqual(
        expect.objectContaining({
          taskId: 'task1',
          status: 'completed',
          progress: 100,
          executionTime: expect.any(String),
          promptSent: true,
          ideResponse: expect.any(Object),
          message: 'Documentation task executed via doc-execute.md framework'
        })
      );
    });

    it('should handle missing execute prompt file', async () => {
      const task = {
        id: 'task1',
        title: 'Create API docs',
        description: 'Document API endpoints'
      };

      fs.existsSync.mockReturnValue(false);

      const result = await controller.executeDocumentationTask(task, '/path/to/project');

      expect(result).toEqual(
        expect.objectContaining({
          status: 'failed',
          error: 'doc-execute.md prompt not found'
        })
      );
    });

    it('should handle task execution errors', async () => {
      const task = {
        id: 'task1',
        title: 'Create API docs',
        description: 'Document API endpoints'
      };

      mockCursorIDEService.sendMessage.mockRejectedValue(new Error('Task failed'));

      const result = await controller.executeDocumentationTask(task, '/path/to/project');

      expect(result).toEqual(
        expect.objectContaining({
          status: 'failed',
          error: 'Task failed'
        })
      );
    });
  });

  describe('sendTasksToIDE', () => {
    beforeEach(() => {
      const tasks = [
        {
          id: 'task1',
          title: 'Create API docs',
          description: 'Document API endpoints',
          priority: 'high',
          type: 'documentation',
          createdAt: new Date(),
          metadata: { estimatedTime: 4 }
        }
      ];
      controller.tasks = tasks;
    });

    it('should send tasks to IDE successfully', async () => {
      const tasks = [
        {
          id: 'task1',
          title: 'Create API docs',
          description: 'Document API endpoints',
          priority: 'high',
          type: 'documentation',
          createdAt: new Date(),
          metadata: { estimatedTime: 4 }
        }
      ];

      mockCursorIDEService.sendMessage.mockResolvedValue({
        success: true,
        response: 'Tasks sent'
      });

      const result = await controller.sendTasksToIDE(tasks, '/path/to/project', 3000);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          promptSent: true,
          tasksSent: 1,
          idePort: 3000,
          priorityBreakdown: {
            high: 1,
            medium: 0,
            low: 0
          },
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle missing execute prompt file', async () => {
      const tasks = [
        {
          id: 'task1',
          title: 'Create API docs',
          description: 'Document API endpoints',
          priority: 'high',
          type: 'documentation',
          createdAt: new Date()
        }
      ];

      fs.existsSync.mockReturnValue(false);

      const result = await controller.sendTasksToIDE(tasks, '/path/to/project');

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
          tasksSent: 0
        })
      );
    });

    it('should handle send message errors', async () => {
      const tasks = [
        {
          id: 'task1',
          title: 'Create API docs',
          description: 'Document API endpoints',
          priority: 'high',
          type: 'documentation',
          createdAt: new Date()
        }
      ];

      mockCursorIDEService.sendMessage.mockRejectedValue(new Error('Send failed'));

      const result = await controller.sendTasksToIDE(tasks, '/path/to/project');

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Send failed',
          tasksSent: 0
        })
      );
    });
  });

  describe('collectResponseWithPolling', () => {
    beforeEach(() => {
      mockCursorIDEService.chatMessageHandler.waitForAIResponse.mockResolvedValue({
        success: true,
        response: 'Polled AI response',
        duration: 5000
      });
    });

    it('should collect response with polling successfully', async () => {
      const result = await controller.collectResponseWithPolling('test-project', '/path/to/project', 3000);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          response: 'Polled AI response',
          analysis: expect.any(Object)
        })
      );
    });

    it('should handle case when chat message handler is not available', async () => {
      const controllerWithoutChatHandler = new DocumentationController(
        mockTaskService,
        { ...mockCursorIDEService, chatMessageHandler: null },
        mockLogger,
        mockIDEManager,
        mockChatRepository
      );

      const result = await controllerWithoutChatHandler.collectResponseWithPolling('test-project', '/path/to/project', 3000);

      expect(result).toEqual({
        success: false,
        response: null,
        error: 'ChatMessageHandler not available'
      });
    });

    it('should handle polling timeout', async () => {
      mockCursorIDEService.chatMessageHandler.waitForAIResponse.mockResolvedValue({
        success: false,
        response: null,
        error: 'Timeout'
      });

      const result = await controller.collectResponseWithPolling('test-project', '/path/to/project', 3000);

      expect(result).toEqual({
        success: false,
        response: null,
        error: 'Timeout'
      });
    });

    it('should handle chat repository save errors', async () => {
      mockChatRepository.saveMessage.mockRejectedValue(new Error('Save failed'));

      const result = await controller.collectResponseWithPolling('test-project', '/path/to/project', 3000);

      // Should still succeed even if save fails
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          response: 'Polled AI response'
        })
      );
    });
  });
}); 