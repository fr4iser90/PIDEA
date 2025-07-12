/**
 * Unit tests for HandlerResult
 */
const HandlerResult = require('@workflows/handlers/HandlerResult');

describe('HandlerResult', () => {
  describe('constructor', () => {
    it('should create result with default values', () => {
      const result = new HandlerResult();
      
      expect(result.success).toBe(false);
      expect(result.handlerId).toBe(null);
      expect(result.handlerName).toBe(null);
      expect(result.result).toBe(null);
      expect(result.error).toBe(null);
      expect(result.duration).toBe(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.metadata).toEqual({});
    });

    it('should create result with provided data', () => {
      const data = {
        success: true,
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        result: { data: 'test result' },
        error: null,
        duration: 150,
        timestamp: new Date('2023-01-01'),
        metadata: { key: 'value' }
      };

      const result = new HandlerResult(data);
      
      expect(result.success).toBe(true);
      expect(result.handlerId).toBe('test-handler-123');
      expect(result.handlerName).toBe('TestHandler');
      expect(result.result).toEqual({ data: 'test result' });
      expect(result.error).toBe(null);
      expect(result.duration).toBe(150);
      expect(result.timestamp).toEqual(new Date('2023-01-01'));
      expect(result.metadata).toEqual({ key: 'value' });
    });
  });

  describe('success status methods', () => {
    it('should check if result is successful', () => {
      const successResult = new HandlerResult({ success: true });
      const failureResult = new HandlerResult({ success: false });

      expect(successResult.isSuccess()).toBe(true);
      expect(failureResult.isSuccess()).toBe(false);
    });

    it('should check if result has error', () => {
      const errorResult = new HandlerResult({ error: 'Test error' });
      const successResult = new HandlerResult({ error: null });

      expect(errorResult.hasError()).toBe(true);
      expect(successResult.hasError()).toBe(false);
    });

    it('should get error message', () => {
      const errorResult = new HandlerResult({ error: 'Test error message' });
      const successResult = new HandlerResult({ error: null });

      expect(errorResult.getErrorMessage()).toBe('Test error message');
      expect(successResult.getErrorMessage()).toBe(null);
    });
  });

  describe('duration methods', () => {
    it('should get duration in milliseconds', () => {
      const result = new HandlerResult({ duration: 1500 });
      expect(result.getDuration()).toBe(1500);
    });

    it('should format duration correctly', () => {
      const shortResult = new HandlerResult({ duration: 500 });
      const mediumResult = new HandlerResult({ duration: 2500 });
      const longResult = new HandlerResult({ duration: 125000 });

      expect(shortResult.getFormattedDuration()).toBe('500ms');
      expect(mediumResult.getFormattedDuration()).toBe('2.50s');
      expect(longResult.getFormattedDuration()).toBe('2m 5.00s');
    });
  });

  describe('data access methods', () => {
    it('should get result data', () => {
      const resultData = { data: 'test result', count: 42 };
      const result = new HandlerResult({ result: resultData });

      expect(result.getResult()).toEqual(resultData);
    });

    it('should get metadata', () => {
      const metadata = { key1: 'value1', key2: 'value2' };
      const result = new HandlerResult({ metadata });

      expect(result.getMetadata()).toEqual(metadata);
    });

    it('should set metadata', () => {
      const result = new HandlerResult();
      result.setMetadata('key1', 'value1');
      result.setMetadata('key2', 'value2');

      expect(result.metadata.key1).toBe('value1');
      expect(result.metadata.key2).toBe('value2');
    });

    it('should get specific metadata value', () => {
      const result = new HandlerResult({ metadata: { key1: 'value1' } });

      expect(result.getMetadataValue('key1')).toBe('value1');
      expect(result.getMetadataValue('key2')).toBe(null);
      expect(result.getMetadataValue('key2', 'default')).toBe('default');
    });
  });

  describe('getter methods', () => {
    it('should get handler ID', () => {
      const result = new HandlerResult({ handlerId: 'test-handler-123' });
      expect(result.getHandlerId()).toBe('test-handler-123');
    });

    it('should get handler name', () => {
      const result = new HandlerResult({ handlerName: 'TestHandler' });
      expect(result.getHandlerName()).toBe('TestHandler');
    });

    it('should get execution timestamp', () => {
      const timestamp = new Date('2023-01-01');
      const result = new HandlerResult({ timestamp });
      expect(result.getTimestamp()).toEqual(timestamp);
    });
  });

  describe('object conversion', () => {
    it('should convert to plain object', () => {
      const data = {
        success: true,
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        result: { data: 'test result' },
        error: null,
        duration: 1500,
        timestamp: new Date('2023-01-01'),
        metadata: { key: 'value' }
      };

      const result = new HandlerResult(data);
      const obj = result.toObject();

      expect(obj).toEqual({
        success: true,
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        result: { data: 'test result' },
        error: null,
        duration: 1500,
        formattedDuration: '1.50s',
        timestamp: new Date('2023-01-01'),
        metadata: { key: 'value' }
      });
    });

    it('should convert to JSON string', () => {
      const result = new HandlerResult({
        success: true,
        handlerId: 'test-handler-123',
        result: { data: 'test result' }
      });

      const json = result.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(true);
      expect(parsed.handlerId).toBe('test-handler-123');
      expect(parsed.result).toEqual({ data: 'test result' });
    });

    it('should get result summary', () => {
      const result = new HandlerResult({
        success: true,
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        duration: 1500,
        error: null,
        timestamp: new Date('2023-01-01')
      });

      const summary = result.getSummary();

      expect(summary).toEqual({
        success: true,
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        duration: '1.50s',
        hasError: false,
        errorMessage: null,
        timestamp: new Date('2023-01-01')
      });
    });
  });

  describe('static factory methods', () => {
    it('should create success result', () => {
      const data = {
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        result: { data: 'test result' },
        duration: 150,
        metadata: { key: 'value' }
      };

      const result = HandlerResult.success(data);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(true);
      expect(result.handlerId).toBe('test-handler-123');
      expect(result.handlerName).toBe('TestHandler');
      expect(result.result).toEqual({ data: 'test result' });
      expect(result.duration).toBe(150);
      expect(result.metadata).toEqual({ key: 'value' });
    });

    it('should create error result', () => {
      const error = 'Test error message';
      const data = {
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        duration: 150,
        metadata: { key: 'value' }
      };

      const result = HandlerResult.error(error, data);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(false);
      expect(result.getErrorMessage()).toBe('Test error message');
      expect(result.handlerId).toBe('test-handler-123');
      expect(result.handlerName).toBe('TestHandler');
      expect(result.duration).toBe(150);
      expect(result.metadata).toEqual({ key: 'value' });
    });

    it('should create timeout result', () => {
      const data = {
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        duration: 30000
      };

      const result = HandlerResult.timeout(data);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(false);
      expect(result.getErrorMessage()).toBe('Handler execution timed out');
      expect(result.handlerId).toBe('test-handler-123');
      expect(result.handlerName).toBe('TestHandler');
      expect(result.duration).toBe(30000);
    });

    it('should create cancelled result', () => {
      const data = {
        handlerId: 'test-handler-123',
        handlerName: 'TestHandler',
        duration: 5000
      };

      const result = HandlerResult.cancelled(data);

      expect(result).toBeInstanceOf(HandlerResult);
      expect(result.isSuccess()).toBe(false);
      expect(result.getErrorMessage()).toBe('Handler execution was cancelled');
      expect(result.handlerId).toBe('test-handler-123');
      expect(result.handlerName).toBe('TestHandler');
      expect(result.duration).toBe(5000);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values gracefully', () => {
      const result = new HandlerResult({
        success: undefined,
        handlerId: undefined,
        result: undefined,
        error: undefined,
        duration: undefined
      });

      expect(result.success).toBe(false);
      expect(result.handlerId).toBe(null);
      expect(result.result).toBe(null);
      expect(result.error).toBe(null);
      expect(result.duration).toBe(0);
    });

    it('should handle zero duration', () => {
      const result = new HandlerResult({ duration: 0 });
      expect(result.getFormattedDuration()).toBe('0ms');
    });

    it('should handle very large duration', () => {
      const result = new HandlerResult({ duration: 3661000 }); // 1h 1m 1s
      expect(result.getFormattedDuration()).toBe('61m 1.00s');
    });

    it('should handle complex result data', () => {
      const complexData = {
        array: [1, 2, 3],
        object: { nested: { value: 'test' } },
        null: null,
        undefined: undefined
      };

      const result = new HandlerResult({ result: complexData });
      expect(result.getResult()).toEqual(complexData);
    });

    it('should handle empty metadata', () => {
      const result = new HandlerResult({ metadata: {} });
      expect(result.getMetadata()).toEqual({});
      expect(result.getMetadataValue('nonexistent')).toBe(null);
    });
  });
}); 