/**
 * Unit tests for UnifiedWorkflowHandler
 */
const UnifiedWorkflowHandler = require('@workflows/handlers/UnifiedWorkflowHandler');
const HandlerRegistry = require('@workflows/handlers/HandlerRegistry');
const HandlerFactory = require('@workflows/handlers/HandlerFactory');
const HandlerValidator = require('@workflows/handlers/HandlerValidator');
const HandlerContext = require('@workflows/handlers/HandlerContext');
const HandlerResult = require('@workflows/handlers/HandlerResult');

describe('UnifiedWorkflowHandler', () => {
  let handler;
  let mockLogger;
  let mockEventBus;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockEventBus = {
      emit: jest.fn()
    };

    handler = new UnifiedWorkflowHandler({
      logger: mockLogger,
      eventBus: mockEventBus
    });
  });

  describe('constructor', () => {
    it('should create instance with default dependencies', () => {
      const defaultHandler = new UnifiedWorkflowHandler();
      expect(defaultHandler).toBeInstanceOf(UnifiedWorkflowHandler);
      expect(defaultHandler.handlerRegistry).toBeInstanceOf(HandlerRegistry);
      expect(defaultHandler.handlerFactory).toBeInstanceOf(HandlerFactory);
      expect(defaultHandler.handlerValidator).toBeInstanceOf(HandlerValidator);
    });

    it('should create instance with custom dependencies', () => {
      const customRegistry = new HandlerRegistry();
      const customFactory = new HandlerFactory();
      const customValidator = new HandlerValidator();

      const customHandler = new UnifiedWorkflowHandler({
        handlerRegistry: customRegistry,
        handlerFactory: customFactory,
        handlerValidator: customValidator,
        logger: mockLogger,
        eventBus: mockEventBus
      });

      expect(customHandler.handlerRegistry).toBe(customRegistry);
      expect(customHandler.handlerFactory).toBe(customFactory);
      expect(customHandler.handlerValidator).toBe(customValidator);
    });
  });

  describe('handle', () => {
    it('should handle valid request successfully', async () => {
      const request = {
        type: 'test',
        taskId: 'test-task-1',
        data: { test: 'data' }
      };
      const response = {};

      // Mock validator to return valid
      jest.spyOn(handler.handlerValidator, 'validateRequest').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Mock factory to return a handler
      const mockHandler = {
        execute: jest.fn().mockResolvedValue({ success: true, data: 'test result' }),
        getMetadata: jest.fn().mockReturnValue({ name: 'TestHandler', version: '1.0.0' }),
        validate: jest.fn().mockResolvedValue({ isValid: true }),
        canHandle: jest.fn().mockReturnValue(true),
        getDependencies: jest.fn().mockReturnValue([]),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
        getType: jest.fn().mockReturnValue('test'),
        initialize: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
        getStatistics: jest.fn().mockReturnValue({}),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      // Mock validator for handler and context validation
      jest.spyOn(handler.handlerValidator, 'validateHandler').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      jest.spyOn(handler.handlerValidator, 'validateContext').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      jest.spyOn(handler.handlerFactory, 'createHandler').mockResolvedValue(mockHandler);

      const result = await handler.handle(request, response);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle request validation failure', async () => {
      const request = { type: 'invalid' };
      const response = {};

      // Mock validator to return invalid
      jest.spyOn(handler.handlerValidator, 'validateRequest').mockResolvedValue({
        isValid: false,
        errors: ['Invalid request type'],
        warnings: []
      });

      const result = await handler.handle(request, response);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(false);
      expect(result.getErrorMessage()).toContain('Request validation failed');
    });

    it('should handle execution error', async () => {
      const request = { type: 'test' };
      const response = {};

      // Mock validator to return valid
      jest.spyOn(handler.handlerValidator, 'validateRequest').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Mock factory to throw error
      jest.spyOn(handler.handlerFactory, 'createHandler').mockRejectedValue(
        new Error('Handler creation failed')
      );

      const result = await handler.handle(request, response);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(false);
      expect(result.getErrorMessage()).toContain('Handler creation failed');
    });
  });

  describe('getHandler', () => {
    it('should return registered handler if exists', async () => {
      const request = { type: 'test' };
      const context = new HandlerContext(request, {}, 'test-id');

      const mockHandler = {
        execute: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({ name: 'TestHandler' }),
        validate: jest.fn().mockResolvedValue({ isValid: true }),
        canHandle: jest.fn().mockReturnValue(true),
        getDependencies: jest.fn().mockReturnValue([]),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
        getType: jest.fn().mockReturnValue('test'),
        initialize: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
        getStatistics: jest.fn().mockReturnValue({}),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(handler.handlerRegistry, 'getHandler').mockReturnValue(mockHandler);

      const result = await handler.getHandler(request, context);

      expect(result).toBe(mockHandler);
      expect(handler.handlerRegistry.getHandler).toHaveBeenCalledWith('test');
    });

    it('should create and register new handler if not exists', async () => {
      const request = { type: 'test' };
      const context = new HandlerContext(request, {}, 'test-id');

      const mockHandler = {
        execute: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({ name: 'TestHandler' }),
        validate: jest.fn().mockResolvedValue({ isValid: true }),
        canHandle: jest.fn().mockReturnValue(true),
        getDependencies: jest.fn().mockReturnValue([]),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
        getType: jest.fn().mockReturnValue('test'),
        initialize: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
        getStatistics: jest.fn().mockReturnValue({}),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(handler.handlerRegistry, 'getHandler').mockReturnValue(null);
      jest.spyOn(handler.handlerFactory, 'createHandler').mockResolvedValue(mockHandler);
      jest.spyOn(handler.handlerRegistry, 'registerHandler').mockReturnValue(true);

      const result = await handler.getHandler(request, context);

      expect(result).toBe(mockHandler);
      expect(handler.handlerFactory.createHandler).toHaveBeenCalledWith(request, context);
      expect(handler.handlerRegistry.registerHandler).toHaveBeenCalledWith('test', mockHandler);
    });
  });

  describe('executeHandler', () => {
    it('should execute handler successfully', async () => {
      const mockHandler = {
        execute: jest.fn().mockResolvedValue({ success: true, data: 'test result' }),
        getMetadata: jest.fn().mockReturnValue({ name: 'TestHandler', version: '1.0.0' }),
        validate: jest.fn().mockResolvedValue({ isValid: true }),
        canHandle: jest.fn().mockReturnValue(true),
        getDependencies: jest.fn().mockReturnValue([]),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
        getType: jest.fn().mockReturnValue('test'),
        initialize: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
        getStatistics: jest.fn().mockReturnValue({}),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      const context = new HandlerContext({}, {}, 'test-id');

      // Mock validations
      jest.spyOn(handler.handlerValidator, 'validateHandler').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      jest.spyOn(handler.handlerValidator, 'validateContext').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const result = await handler.executeHandler(mockHandler, context);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(true);
      expect(mockHandler.execute).toHaveBeenCalledWith(context);
      expect(mockEventBus.emit).toHaveBeenCalledWith('handler:execution:started', expect.any(Object));
      expect(mockEventBus.emit).toHaveBeenCalledWith('handler:execution:completed', expect.any(Object));
    });

    it('should handle handler validation failure', async () => {
      const mockHandler = {
        execute: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({ name: 'TestHandler' }),
        validate: jest.fn().mockResolvedValue({ isValid: true }),
        canHandle: jest.fn().mockReturnValue(true),
        getDependencies: jest.fn().mockReturnValue([]),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
        getType: jest.fn().mockReturnValue('test'),
        initialize: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
        getStatistics: jest.fn().mockReturnValue({}),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      const context = new HandlerContext({}, {}, 'test-id');

      // Mock validation to fail
      jest.spyOn(handler.handlerValidator, 'validateHandler').mockResolvedValue({
        isValid: false,
        errors: ['Handler validation failed'],
        warnings: []
      });

      const result = await handler.executeHandler(mockHandler, context);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(false);
      expect(result.getErrorMessage()).toContain('Handler validation failed');
    });

    it('should handle execution error', async () => {
      const mockHandler = {
        execute: jest.fn().mockRejectedValue(new Error('Execution failed')),
        getMetadata: jest.fn().mockReturnValue({ name: 'TestHandler' }),
        validate: jest.fn().mockResolvedValue({ isValid: true }),
        canHandle: jest.fn().mockReturnValue(true),
        getDependencies: jest.fn().mockReturnValue([]),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
        getType: jest.fn().mockReturnValue('test'),
        initialize: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
        getStatistics: jest.fn().mockReturnValue({}),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      const context = new HandlerContext({}, {}, 'test-id');

      // Mock validations to pass
      jest.spyOn(handler.handlerValidator, 'validateHandler').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      jest.spyOn(handler.handlerValidator, 'validateContext').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const result = await handler.executeHandler(mockHandler, context);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(false);
      expect(result.getErrorMessage()).toContain('Execution failed');
      expect(mockEventBus.emit).toHaveBeenCalledWith('handler:execution:failed', expect.any(Object));
    });
  });

  describe('utility methods', () => {
    it('should register handler', () => {
      const mockHandler = {
        execute: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({ name: 'TestHandler' }),
        validate: jest.fn().mockResolvedValue({ isValid: true }),
        canHandle: jest.fn().mockReturnValue(true),
        getDependencies: jest.fn().mockReturnValue([]),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
        getType: jest.fn().mockReturnValue('test'),
        initialize: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
        getStatistics: jest.fn().mockReturnValue({}),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(handler.handlerRegistry, 'registerHandler').mockReturnValue(true);

      const result = handler.registerHandler('test', mockHandler);

      expect(result).toBe(true);
      expect(handler.handlerRegistry.registerHandler).toHaveBeenCalledWith('test', mockHandler, {});
    });

    it('should get handler by type', () => {
      const mockHandler = {
        execute: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({ name: 'TestHandler' }),
        validate: jest.fn().mockResolvedValue({ isValid: true }),
        canHandle: jest.fn().mockReturnValue(true),
        getDependencies: jest.fn().mockReturnValue([]),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
        getType: jest.fn().mockReturnValue('test'),
        initialize: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
        getStatistics: jest.fn().mockReturnValue({}),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(handler.handlerRegistry, 'getHandler').mockReturnValue(mockHandler);

      const result = handler.getHandlerByType('test');

      expect(result).toBe(mockHandler);
      expect(handler.handlerRegistry.getHandler).toHaveBeenCalledWith('test');
    });

    it('should generate handler ID', () => {
      const handlerId = handler.generateHandlerId();
      expect(handlerId).toMatch(/^handler_\d+_[a-z0-9]+$/);
    });

    it('should get metadata', () => {
      const metadata = handler.getMetadata();
      expect(metadata).toEqual({
        name: 'UnifiedWorkflowHandler',
        description: 'Main handler orchestration for unified workflow system',
        version: '1.0.0',
        type: 'unified-workflow'
      });
    });

    it('should get dependencies', () => {
      const dependencies = handler.getDependencies();
      expect(dependencies).toEqual(['handlerRegistry', 'handlerFactory', 'handlerValidator']);
    });

    it('should get version', () => {
      const version = handler.getVersion();
      expect(version).toBe('1.0.0');
    });

    it('should get type', () => {
      const type = handler.getType();
      expect(type).toBe('unified-workflow');
    });

    it('should check if can handle request', () => {
      const validRequest = { type: 'test' };
      const invalidRequest = null;

      expect(handler.canHandle(validRequest)).toBe(true);
      expect(handler.canHandle(invalidRequest)).toBe(false);
    });
  });
}); 