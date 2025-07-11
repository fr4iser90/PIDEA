/**
 * Unit tests for HandlerContext
 */
const HandlerContext = require('@/domain/workflows/handlers/HandlerContext');

describe('HandlerContext', () => {
  let context;
  let request;
  let response;
  let handlerId;

  beforeEach(() => {
    request = { type: 'test', taskId: 'test-task-1' };
    response = { status: 200 };
    handlerId = 'test-handler-123';
    context = new HandlerContext(request, response, handlerId);
  });

  describe('constructor', () => {
    it('should create context with basic properties', () => {
      expect(context.request).toBe(request);
      expect(context.response).toBe(response);
      expect(context.handlerId).toBe(handlerId);
      expect(context.createdAt).toBeInstanceOf(Date);
      expect(context.data).toBeInstanceOf(Map);
      expect(context.metadata).toBeInstanceOf(Map);
    });

    it('should initialize with default metadata', () => {
      expect(context.getMetadata('createdAt')).toBeInstanceOf(Date);
      expect(context.getMetadata('handlerId')).toBe(handlerId);
      expect(context.getMetadata('requestType')).toBe('test');
      expect(context.getMetadata('taskId')).toBe('test-task-1');
    });

    it('should handle null request gracefully', () => {
      const nullContext = new HandlerContext(null, response, handlerId);
      expect(nullContext.getMetadata('requestType')).toBe('unknown');
      expect(nullContext.getMetadata('taskId')).toBe(null);
    });
  });

  describe('data management', () => {
    it('should set and get data', () => {
      context.set('key1', 'value1');
      context.set('key2', { nested: 'value' });

      expect(context.get('key1')).toBe('value1');
      expect(context.get('key2')).toEqual({ nested: 'value' });
    });

    it('should check if data exists', () => {
      context.set('key1', 'value1');

      expect(context.has('key1')).toBe(true);
      expect(context.has('key2')).toBe(false);
    });

    it('should delete data', () => {
      context.set('key1', 'value1');
      context.set('key2', 'value2');

      expect(context.delete('key1')).toBe(true);
      expect(context.has('key1')).toBe(false);
      expect(context.has('key2')).toBe(true);
      expect(context.delete('nonexistent')).toBe(false);
    });

    it('should get all data', () => {
      context.set('key1', 'value1');
      context.set('key2', 'value2');

      const allData = context.getAll();
      expect(allData).toEqual({
        key1: 'value1',
        key2: 'value2'
      });
    });
  });

  describe('metadata management', () => {
    it('should set and get metadata', () => {
      context.setMetadata('meta1', 'value1');
      context.setMetadata('meta2', { nested: 'value' });

      expect(context.getMetadata('meta1')).toBe('value1');
      expect(context.getMetadata('meta2')).toEqual({ nested: 'value' });
    });

    it('should get all metadata', () => {
      context.setMetadata('meta1', 'value1');
      context.setMetadata('meta2', 'value2');

      const allMetadata = context.getAllMetadata();
      expect(allMetadata.meta1).toBe('value1');
      expect(allMetadata.meta2).toBe('value2');
      expect(allMetadata.createdAt).toBeInstanceOf(Date);
      expect(allMetadata.handlerId).toBe(handlerId);
    });
  });

  describe('context age', () => {
    it('should calculate context age', () => {
      const age = context.getAge();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(1000); // Should be very recent
    });
  });

  describe('getter methods', () => {
    it('should get request object', () => {
      expect(context.getRequest()).toBe(request);
    });

    it('should get response object', () => {
      expect(context.getResponse()).toBe(response);
    });

    it('should get handler ID', () => {
      expect(context.getHandlerId()).toBe(handlerId);
    });

    it('should get creation timestamp', () => {
      expect(context.getCreatedAt()).toBeInstanceOf(Date);
    });

    it('should get context options', () => {
      const contextWithOptions = new HandlerContext(request, response, handlerId, { option1: 'value1' });
      expect(contextWithOptions.getOptions()).toEqual({ option1: 'value1' });
    });
  });

  describe('options management', () => {
    it('should check if option exists', () => {
      const contextWithOptions = new HandlerContext(request, response, handlerId, { option1: 'value1' });
      
      expect(contextWithOptions.hasOption('option1')).toBe(true);
      expect(contextWithOptions.hasOption('option2')).toBe(false);
    });

    it('should get option value with default', () => {
      const contextWithOptions = new HandlerContext(request, response, handlerId, { option1: 'value1' });
      
      expect(contextWithOptions.getOption('option1')).toBe('value1');
      expect(contextWithOptions.getOption('option2')).toBe(null);
      expect(contextWithOptions.getOption('option2', 'default')).toBe('default');
    });

    it('should set option value', () => {
      context.setOption('newOption', 'newValue');
      expect(context.getOption('newOption')).toBe('newValue');
    });

    it('should handle options object creation', () => {
      const contextWithoutOptions = new HandlerContext(request, response, handlerId);
      contextWithoutOptions.setOption('option1', 'value1');
      expect(contextWithoutOptions.getOption('option1')).toBe('value1');
    });
  });

  describe('context cloning', () => {
    it('should clone context with existing data', () => {
      context.set('key1', 'value1');
      context.setMetadata('meta1', 'value1');

      const clonedContext = context.clone();

      expect(clonedContext).toBeInstanceOf(HandlerContext);
      expect(clonedContext.get('key1')).toBe('value1');
      expect(clonedContext.getMetadata('meta1')).toBe('value1');
      expect(clonedContext.handlerId).toBe(handlerId);
      expect(clonedContext).not.toBe(context);
    });

    it('should clone context with additional data', () => {
      context.set('key1', 'value1');

      const clonedContext = context.clone({ key2: 'value2', key3: 'value3' });

      expect(clonedContext.get('key1')).toBe('value1');
      expect(clonedContext.get('key2')).toBe('value2');
      expect(clonedContext.get('key3')).toBe('value3');
    });

    it('should clone context with new options', () => {
      const contextWithOptions = new HandlerContext(request, response, handlerId, { option1: 'value1' });
      const clonedContext = contextWithOptions.clone();

      expect(clonedContext.getOptions()).toEqual({ option1: 'value1' });
    });
  });

  describe('object conversion', () => {
    it('should convert to plain object', () => {
      context.set('key1', 'value1');
      context.setMetadata('meta1', 'value1');

      const obj = context.toObject();

      expect(obj).toEqual({
        handlerId: handlerId,
        request: request,
        response: response,
        data: { key1: 'value1' },
        metadata: expect.objectContaining({
          meta1: 'value1',
          createdAt: expect.any(Date),
          handlerId: handlerId,
          requestType: 'test',
          taskId: 'test-task-1'
        }),
        options: {},
        createdAt: expect.any(Date),
        age: expect.any(Number)
      });
    });

    it('should get context summary', () => {
      context.set('key1', 'value1');
      context.set('key2', 'value2');
      context.setMetadata('meta1', 'value1');

      const summary = context.getSummary();

      expect(summary).toEqual({
        handlerId: handlerId,
        requestType: 'test',
        taskId: 'test-task-1',
        age: expect.any(Number),
        dataKeys: ['key1', 'key2'],
        metadataKeys: expect.arrayContaining(['createdAt', 'handlerId', 'requestType', 'taskId', 'meta1'])
      });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values gracefully', () => {
      expect(context.get('nonexistent')).toBeUndefined();
      expect(context.getMetadata('nonexistent')).toBeUndefined();
    });

    it('should handle empty context', () => {
      const emptyContext = new HandlerContext({}, {}, 'empty');
      
      expect(emptyContext.getAll()).toEqual({});
      expect(emptyContext.getAllMetadata()).toEqual({
        createdAt: expect.any(Date),
        handlerId: 'empty',
        requestType: 'unknown',
        taskId: null
      });
    });

    it('should handle complex data types', () => {
      const complexData = {
        array: [1, 2, 3],
        object: { nested: { value: 'test' } },
        function: () => 'test',
        null: null,
        undefined: undefined
      };

      context.set('complex', complexData);
      const retrieved = context.get('complex');

      expect(retrieved).toEqual(complexData);
    });
  });
}); 