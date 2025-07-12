/**
 * VibeCoderController - Controller for unified VibeCoder workflow operations
 * 
 * This controller provides API endpoints for VibeCoder operations using the new
 * unified workflow step system instead of  handlers.
 */
const { VibeCoderStepFactory } = require('../../domain/workflows/steps/vibecoder');
const { VibeCoderStepRegistry } = require('../../domain/workflows/steps/vibecoder');
class VibeCoderController {
  /**
   * Create a new VibeCoder controller
   * @param {Object} dependencies - Controller dependencies
   */
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    this.commandBus = dependencies.commandBus;
    this.analysisRepository = dependencies.analysisRepository;
    this.taskRepository = dependencies.taskRepository;
    this.cursorIDEService = dependencies.cursorIDEService;
    // Initialize VibeCoder components
    this.stepFactory = new VibeCoderStepFactory();
    this.stepRegistry = new VibeCoderStepRegistry();
    // Initialize with dependencies
    this.stepRegistry.initialize(dependencies);
  }
  /**
   * Execute VibeCoder analyze operation
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyze(req, res) {
    try {
      const { projectId } = req.params;
      const { options = {} } = req.body;
      this.logger.info('VibeCoderController: Starting analyze operation', {
        projectId,
        options
      });
      // Create analyze step
      const analyzeStep = await this.stepFactory.createVibeCoderAnalyzeStep({
        ...options,
        projectId
      });
      // Prepare step context
      const stepContext = {
        request: req,
        response: res,
        services: {
          logger: this.logger,
          eventBus: this.eventBus,
          commandBus: this.commandBus,
          analysisRepository: this.analysisRepository,
          taskRepository: this.taskRepository,
          cursorIDEService: this.cursorIDEService
        },
        metadata: {
          projectId,
          operation: 'analyze',
          timestamp: new Date()
        }
      };
      // Execute analyze step
      const result = await analyzeStep.execute(stepContext);
      res.json({
        success: true,
        data: result,
        metadata: {
          operation: 'vibecoder_analyze',
          projectId,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('VibeCoderController: Analyze operation failed', error);
      res.status(500).json({
        success: false,
        error: error.message,
        metadata: {
          operation: 'vibecoder_analyze',
          projectId: req.params.projectId
        }
      });
    }
  }
  /**
   * Execute VibeCoder generate operation
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async generate(req, res) {
    try {
      const { projectId } = req.params;
      const { options = {} } = req.body;
      this.logger.info('VibeCoderController: Starting generate operation', {
        projectId,
        options
      });
      // Create generate step
      const generateStep = await this.stepFactory.createVibeCoderGenerateStep({
        ...options,
        projectId
      });
      // Prepare step context
      const stepContext = {
        request: req,
        response: res,
        services: {
          logger: this.logger,
          eventBus: this.eventBus,
          commandBus: this.commandBus,
          analysisRepository: this.analysisRepository,
          taskRepository: this.taskRepository,
          cursorIDEService: this.cursorIDEService
        },
        metadata: {
          projectId,
          operation: 'generate',
          timestamp: new Date()
        }
      };
      // Execute generate step
      const result = await generateStep.execute(stepContext);
      res.json({
        success: true,
        data: result,
        metadata: {
          operation: 'vibecoder_generate',
          projectId,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('VibeCoderController: Generate operation failed', error);
      res.status(500).json({
        success: false,
        error: error.message,
        metadata: {
          operation: 'vibecoder_generate',
          projectId: req.params.projectId
        }
      });
    }
  }
  /**
   * Execute VibeCoder refactor operation
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async refactor(req, res) {
    try {
      const { projectId } = req.params;
      const { options = {} } = req.body;
      this.logger.info('VibeCoderController: Starting refactor operation', {
        projectId,
        options
      });
      // Create refactor step
      const refactorStep = await this.stepFactory.createVibeCoderRefactorStep({
        ...options,
        projectId
      });
      // Prepare step context
      const stepContext = {
        request: req,
        response: res,
        services: {
          logger: this.logger,
          eventBus: this.eventBus,
          commandBus: this.commandBus,
          analysisRepository: this.analysisRepository,
          taskRepository: this.taskRepository,
          cursorIDEService: this.cursorIDEService
        },
        metadata: {
          projectId,
          operation: 'refactor',
          timestamp: new Date()
        }
      };
      // Execute refactor step
      const result = await refactorStep.execute(stepContext);
      res.json({
        success: true,
        data: result,
        metadata: {
          operation: 'vibecoder_refactor',
          projectId,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('VibeCoderController: Refactor operation failed', error);
      res.status(500).json({
        success: false,
        error: error.message,
        metadata: {
          operation: 'vibecoder_refactor',
          projectId: req.params.projectId
        }
      });
    }
  }
  /**
   * Execute VibeCoder mode operation (comprehensive workflow)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async mode(req, res) {
    try {
      const { projectId } = req.params;
      const { options = {} } = req.body;
      this.logger.info('VibeCoderController: Starting mode operation', {
        projectId,
        options
      });
      // Create mode step (comprehensive workflow)
      const modeStep = await this.stepFactory.createVibeCoderModeStep({
        ...options,
        projectId
      });
      // Prepare step context
      const stepContext = {
        request: req,
        response: res,
        services: {
          logger: this.logger,
          eventBus: this.eventBus,
          commandBus: this.commandBus,
          analysisRepository: this.analysisRepository,
          taskRepository: this.taskRepository,
          cursorIDEService: this.cursorIDEService
        },
        metadata: {
          projectId,
          operation: 'mode',
          timestamp: new Date()
        }
      };
      // Execute mode step
      const result = await modeStep.execute(stepContext);
      res.json({
        success: true,
        data: result,
        metadata: {
          operation: 'vibecoder_mode',
          projectId,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('VibeCoderController: Mode operation failed', error);
      res.status(500).json({
        success: false,
        error: error.message,
        metadata: {
          operation: 'vibecoder_mode',
          projectId: req.params.projectId
        }
      });
    }
  }
  /**
   * Get VibeCoder step status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getStatus(req, res) {
    try {
      const { projectId } = req.params;
      const { stepType } = req.query;
      this.logger.info('VibeCoderController: Getting status', {
        projectId,
        stepType
      });
      // Get step status from registry
      const status = await this.stepRegistry.getStepStatus(stepType, projectId);
      res.json({
        success: true,
        data: status,
        metadata: {
          operation: 'vibecoder_status',
          projectId,
          stepType,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('VibeCoderController: Get status failed', error);
      res.status(500).json({
        success: false,
        error: error.message,
        metadata: {
          operation: 'vibecoder_status',
          projectId: req.params.projectId
        }
      });
    }
  }
  /**
   * Get available VibeCoder steps
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAvailableSteps(req, res) {
    try {
      this.logger.info('VibeCoderController: Getting available steps');
      // Get available steps from registry
      const steps = this.stepRegistry.listSteps();
      const templates = this.stepRegistry.listTemplates();
      res.json({
        success: true,
        data: {
          steps,
          templates
        },
        metadata: {
          operation: 'vibecoder_steps',
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('VibeCoderController: Get available steps failed', error);
      res.status(500).json({
        success: false,
        error: error.message,
        metadata: {
          operation: 'vibecoder_steps'
        }
      });
    }
  }
  /**
   * Health check for VibeCoder controller
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        components: {
          stepFactory: await this.stepFactory.isHealthy(),
          stepRegistry: await this.stepRegistry.isHealthy(),
          eventBus: !!this.eventBus,
          commandBus: !!this.commandBus,
          analysisRepository: !!this.analysisRepository,
          taskRepository: !!this.taskRepository,
          cursorIDEService: !!this.cursorIDEService
        }
      };
      res.json({
        success: true,
        data: health,
        metadata: {
          operation: 'vibecoder_health',
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('VibeCoderController: Health check failed', error);
      res.status(500).json({
        success: false,
        error: error.message,
        metadata: {
          operation: 'vibecoder_health'
        }
      });
    }
  }
}
module.exports = VibeCoderController; 