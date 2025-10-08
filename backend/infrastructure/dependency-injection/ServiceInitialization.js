/**
 * Service Initialization - Professional Service Management
 * 
 * This module provides a clean, modular approach to service initialization
 * including infrastructure, domain services, and application handlers.
 */

class ServiceInitialization {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Initialize infrastructure services
   * @returns {Object} Infrastructure services
   */
  async initializeInfrastructure() {
    this.logger.info('🏗️ Initializing infrastructure...');

    // Initialize Step Registry FIRST (before DI)
    const { initializeSteps } = require('../../domain/steps');
    await initializeSteps();
    const stepRegistry = require('../../domain/steps').getStepRegistry();

    // Initialize DI system
    const { getServiceRegistry } = require('./ServiceRegistry');
    const { getProjectContextService } = require('./ProjectContextService');
    
    const serviceRegistry = getServiceRegistry();
    const projectContext = getProjectContextService();
    
    // Register all services (including handlers)
    serviceRegistry.registerAllServices();
    
    // Get services from DI container with consistent error handling
    const services = await this.getInfrastructureServices(serviceRegistry);
    
    this.logger.info('✅ Infrastructure initialized with DI');
    
    return {
      stepRegistry,
      serviceRegistry,
      projectContext,
      ...services
    };
  }

  async getInfrastructureServices(serviceRegistry) {
    try {
      const services = {
        browserManager: serviceRegistry.getService('browserManager'),
        ideManager: serviceRegistry.getService('ideManager'),
        chatRepository: serviceRegistry.getService('chatRepository'),
        eventBus: serviceRegistry.getService('eventBus'),
        commandBus: serviceRegistry.getService('commandBus'),
        queryBus: serviceRegistry.getService('queryBus'),
        userRepository: serviceRegistry.getService('userRepository'),
        userSessionRepository: serviceRegistry.getService('userSessionRepository'),
        ideWorkspaceDetectionService: serviceRegistry.getService('ideWorkspaceDetectionService'),
        fileSystemService: serviceRegistry.getService('fileSystemService'),
        monorepoStrategy: serviceRegistry.getService('monorepoStrategy'),
        singleRepoStrategy: serviceRegistry.getService('singleRepoStrategy')
      };
      
      return services;
    } catch (error) {
      this.logger.error('Failed to get infrastructure services:', error.message);
      throw error; // Re-throw because these are critical services
    }
  }

  /**
   * Initialize domain services
   * @param {Object} serviceRegistry - Service registry
   * @param {Object} databaseConnection - Database connection
   * @returns {Object} Domain services
   */
  async initializeDomainServices(serviceRegistry, databaseConnection) {
    this.logger.info('🔧 Initializing domain services with automatic dependency resolution...');

    // Debug: Log all registered services before validation
    const container = serviceRegistry.getContainer();
    const allServices = Array.from(container.factories.keys());
    this.logger.info('🔍 All registered services:', allServices);
    
    // Debug: Log dependency graph nodes
    const graphNodes = Array.from(container.dependencyGraph.nodes.keys());
    this.logger.info('🔍 Dependency graph nodes:', graphNodes);

    // Validate dependency resolution before getting services
    const validation = serviceRegistry.getContainer().validateDependencies();
    if (!validation.isValid) {
        this.logger.error('Dependency validation failed:', validation);
        throw new Error(`Dependency validation failed: ${JSON.stringify(validation)}`);
    }

    // Get services through DI container with automatic dependency resolution
    const services = await this.getDomainServices(serviceRegistry);
    
    // Log dependency statistics
    const stats = serviceRegistry.getContainer().getDependencyStats();
    this.logger.info('Dependency resolution statistics:', stats);

    // Start all services with lifecycle hooks
    this.logger.info('Starting services with lifecycle hooks...');
    const startupResults = await serviceRegistry.getContainer().startAllServices();
    
    if (startupResults.failed.length > 0) {
        this.logger.warn('Some services failed to start:', startupResults.failed);
    }
    
    this.logger.info(`Service startup completed: ${startupResults.started.length} started, ${startupResults.failed.length} failed`);

    // Initialize WorkflowLoaderService
    await this.initializeWorkflowLoaderService(services.workflowLoaderService);

    // Initialize TaskProcessor
    const taskProcessor = serviceRegistry.getService('taskProcessor');
    taskProcessor.startQueueProcessor();
    this.logger.info('✅ TaskProcessor initialized and started');

    // Initialize Framework Infrastructure
    const frameworkInfrastructure = await this.initializeFrameworkInfrastructure(services.stepRegistry);

    // Initialize Auto-Finish System
    const taskSessionRepository = databaseConnection.getRepository('TaskSession');
    await taskSessionRepository.initialize();

    this.logger.info('Domain services initialized with DI');
    
    return {
      ...services,
      taskProcessor,
      taskSessionRepository,
      ...frameworkInfrastructure
    };
  }

  async getDomainServices(serviceRegistry) {
    try {
      const services = {
        // Core services
        cursorIDEService: serviceRegistry.getService('cursorIDEService'),
        authService: serviceRegistry.getService('authService'),
        aiService: serviceRegistry.getService('aiService'),
        recommendationsService: serviceRegistry.getService('recommendationsService'),
        subprojectDetector: serviceRegistry.getService('subprojectDetector'),
        analysisOutputService: serviceRegistry.getService('analysisOutputService'),
        analysisRepository: serviceRegistry.getService('analysisRepository'),
        projectRepository: serviceRegistry.getService('projectRepository'),
        projectMappingService: serviceRegistry.getService('projectMappingService'),
        taskRepository: serviceRegistry.getService('taskRepository'),
        taskExecutionRepository: serviceRegistry.getService('taskExecutionRepository'),
        taskService: serviceRegistry.getService('taskService'),
        taskValidationService: serviceRegistry.getService('taskValidationService'),
        taskAnalysisService: serviceRegistry.getService('taskAnalysisService'),
        monorepoStrategy: serviceRegistry.getService('monorepoStrategy'),
        singleRepoStrategy: serviceRegistry.getService('singleRepoStrategy'),

        // Workflow and orchestration services
        workflowOrchestrationService: serviceRegistry.getService('workflowOrchestrationService'),
        gitService: serviceRegistry.getService('gitService'),
        testOrchestrator: serviceRegistry.getService('testOrchestrator'),
        workflowLoaderService: serviceRegistry.getService('workflowLoaderService')
      };
      
      return services;
    } catch (error) {
        this.logger.error('Failed to get domain services:', error.message);
        
        // Get detailed dependency information for debugging
        const dependencyInfo = serviceRegistry.getContainer().getAllDependencyInfo();
        this.logger.error('Dependency information:', dependencyInfo);
        
        throw error; // Re-throw because these are critical services
    }
  }

  async initializeWorkflowLoaderService(workflowLoaderService) {
    await workflowLoaderService.loadWorkflows();
    this.logger.info('✅ WorkflowLoaderService loaded and initialized from service registry');
  }

  async initializeFrameworkInfrastructure(stepRegistry) {
    try {
      const { initializeFrameworkInfrastructure } = require('../framework');
      const frameworkInfrastructure = await initializeFrameworkInfrastructure(stepRegistry);
      
      // Log initialization results
      this.logger.info('Framework Infrastructure initialized');
      this.logger.info('Framework initialization results:', frameworkInfrastructure.initializationResults);
      
      // Log health status
      if (frameworkInfrastructure.loader.getHealthStatus) {
        const healthStatus = frameworkInfrastructure.loader.getHealthStatus();
        this.logger.info('Framework Loader health status:', healthStatus);
      }
      
      if (frameworkInfrastructure.stepRegistry.getHealthStatus) {
        const stepHealthStatus = frameworkInfrastructure.stepRegistry.getHealthStatus();
        this.logger.info('Framework Step Registry health status:', stepHealthStatus);
      }
      
      return frameworkInfrastructure;
    } catch (error) {
      this.logger.warn('Framework Infrastructure initialization failed, continuing without framework support:', error.message);
      
      // Create fallback framework services
      return {
        manager: { 
          activateFramework: () => Promise.resolve({}),
          deactivateFramework: () => Promise.resolve(true),
          getActiveFramework: () => null,
          getAllActiveFrameworks: () => []
        },
        loader: { 
          getStats: () => ({}),
          getHealthStatus: () => ({ isHealthy: false, error: 'Framework infrastructure not initialized' })
        },
        validator: { validateFramework: () => Promise.resolve({ isValid: true }) },
        config: { getConfigStats: () => ({}) },
        stepRegistry: { 
          getFrameworkSteps: () => [], 
          isFrameworkStep: () => false,
          getLoadedFrameworks: () => [],
          getHealthStatus: () => ({ isHealthy: false, error: 'Framework step registry not initialized' })
        },
        initializationResults: { error: error.message }
      };
    }
  }

  /**
   * Setup project context
   * @param {Object} projectContext - Project context service
   */
  async setupProjectContext(projectContext) {
    this.logger.info('📁 Setting up project context...');
    
    // Auto-detect project path
    const projectPath = await projectContext.autoDetectProjectPath();
    
    // Set project context
    await projectContext.setProjectContext({
      projectPath: projectPath || process.env.PROJECT_PATH,
      projectId: process.env.PROJECT_ID,
      workspacePath: process.env.WORKSPACE_PATH
    });

    // Validate project context
    const validation = await projectContext.validateProjectContext();
    if (!validation.isValid) {
      this.logger.warn('Project context validation warnings:', validation.warnings);
    } else {
      this.logger.info('✅ Project context validated successfully');
    }
  }

  /**
   * Initialize application handlers
   * @param {Object} serviceRegistry - Service registry
   * @returns {Object} Application handlers
   */
  async initializeApplicationHandlers(serviceRegistry) {
    this.logger.info('Initializing application handlers with DI...');

    // Instantiate handlers with dependencies from ServiceRegistry
    const SendMessageHandler = require('../../application/handlers/categories/chat/SendMessageHandler');
    const GetChatHistoryHandler = require('../../application/handlers/categories/chat/GetChatHistoryHandler');
    const CreateTaskHandler = require('../../application/handlers/categories/workflow/CreateTaskHandler');

    // Create handler instances with dependencies
    const sendMessageHandler = new SendMessageHandler({
      browserManager: serviceRegistry.getService('browserManager'),
      ideManager: serviceRegistry.getService('ideManager'),
      eventBus: serviceRegistry.getService('eventBus'),
      logger: serviceRegistry.getService('logger')
    });

    const getChatHistoryHandler = new GetChatHistoryHandler(
      serviceRegistry.getService('chatRepository'),
      serviceRegistry.getService('ideManager'),
      serviceRegistry,
      serviceRegistry.getService('chatCacheService')
    );

    const createTaskHandler = new CreateTaskHandler({
      taskRepository: serviceRegistry.getService('taskRepository'),
      taskTemplateRepository: serviceRegistry.getService('taskTemplateRepository'),
      analysisRepository: serviceRegistry.getService('analysisRepository'),
      taskValidationService: serviceRegistry.getService('taskValidationService'),
      taskGenerationService: serviceRegistry.getService('taskGenerationService'),
      eventBus: serviceRegistry.getService('eventBus'),
      logger: serviceRegistry.getService('logger')
    });

    // Register handlers in ServiceRegistry for steps to access
    serviceRegistry.container.register('sendMessageHandler', () => sendMessageHandler, { singleton: true });
    serviceRegistry.container.register('getChatHistoryHandler', () => getChatHistoryHandler, { singleton: true });
    serviceRegistry.container.register('createTaskHandler', () => createTaskHandler, { singleton: true });
    
    // Register CreateChatHandler for steps
    const CreateChatHandler = require('../../application/handlers/categories/chat/CreateChatHandler');
    const createChatHandler = new CreateChatHandler({
      chatSessionService: serviceRegistry.getService('chatSessionService'),
      ideManager: serviceRegistry.getService('ideManager'),
      browserManager: serviceRegistry.getService('browserManager'),
      eventBus: serviceRegistry.getService('eventBus'),
      logger: serviceRegistry.getService('logger')
    });
    serviceRegistry.container.register('createChatHandler', () => createChatHandler, { singleton: true });

    // Initialize VersionManagementHandler
    const VersionManagementHandler = require('../../application/handlers/categories/version/VersionManagementHandler');
    const VersionManagementService = require('../../domain/services/version/VersionManagementService');
    
    // Get or create versionManagementService
    let versionManagementService;
    try {
      versionManagementService = serviceRegistry.getService('versionManagementService');
    } catch (error) {
      this.logger.warn('VersionManagementService not found in registry, creating directly');
      versionManagementService = new VersionManagementService({
        fileSystemService: serviceRegistry.getService('fileSystemService'),
        logger: serviceRegistry.getService('logger')
      });
    }
    
    const versionManagementHandler = new VersionManagementHandler({
      versionManagementService: versionManagementService,
      logger: serviceRegistry.getService('logger')
    });
    serviceRegistry.container.register('versionManagementHandler', () => versionManagementHandler, { singleton: true });

    this.logger.info('Application handlers initialized with DI');
    
    return {
      sendMessageHandler,
      getChatHistoryHandler,
      createTaskHandler,
      createChatHandler,
      versionManagementHandler
    };
  }
}

module.exports = ServiceInitialization;
