const ETagService = require('@domain/services/ETagService');

describe('ETagService', () => {
  let etagService;

  beforeEach(() => {
    etagService = new ETagService();
  });

  describe('generateETag', () => {
    it('should generate unique ETags for different data', () => {
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };
      
      const etag1 = etagService.generateETag(data1, 'test-type', 'project1');
      const etag2 = etagService.generateETag(data2, 'test-type', 'project1');
      
      expect(etag1).toBeDefined();
      expect(etag2).toBeDefined();
      expect(etag1).not.toBe(etag2);
    });

    it('should generate consistent ETags for same data', () => {
      const data = { test: 'data' };
      
      const etag1 = etagService.generateETag(data, 'test-type', 'project1');
      const etag2 = etagService.generateETag(data, 'test-type', 'project1');
      
      expect(etag1).toBe(etag2);
    });

    it('should include type and projectId in ETag', () => {
      const data = { test: 'data' };
      
      const etag = etagService.generateETag(data, 'analysis-history', 'project123');
      
      expect(etag).toContain('analysis-history');
      expect(etag).toContain('project123');
    });

    it('should handle null projectId', () => {
      const data = { test: 'data' };
      
      const etag = etagService.generateETag(data, 'test-type');
      
      expect(etag).toBeDefined();
      expect(etag).not.toContain('null');
    });
  });

  describe('generateAnalysisETag', () => {
    it('should generate ETag for analysis data', () => {
      const analysisData = {
        timestamp: '2024-01-01T12:00:00.000Z',
        status: 'completed',
        summary: { score: 85 },
        metadata: { projectType: 'nodejs' }
      };
      
      const etag = etagService.generateAnalysisETag(analysisData, 'project1', 'code-quality');
      
      expect(etag).toBeDefined();
      expect(etag).toContain('analysis-code-quality');
      expect(etag).toContain('project1');
    });

    it('should handle missing fields gracefully', () => {
      const analysisData = {};
      
      const etag = etagService.generateAnalysisETag(analysisData, 'project1', 'security');
      
      expect(etag).toBeDefined();
      expect(etag).toContain('analysis-security');
    });
  });

  describe('generateHistoryETag', () => {
    it('should generate ETag for history data', () => {
      const historyData = [
        { type: 'code-quality', timestamp: '2024-01-01T12:00:00.000Z' },
        { type: 'security', timestamp: '2024-01-01T13:00:00.000Z' }
      ];
      
      const etag = etagService.generateHistoryETag(historyData, 'project1');
      
      expect(etag).toBeDefined();
      expect(etag).toContain('analysis-history');
      expect(etag).toContain('project1');
    });

    it('should handle empty history', () => {
      const historyData = [];
      
      const etag = etagService.generateHistoryETag(historyData, 'project1');
      
      expect(etag).toBeDefined();
      expect(etag).toContain('analysis-history');
    });
  });

  describe('validateETag', () => {
    it('should validate matching ETags', () => {
      const etag1 = 'abc123-test-type-project1';
      const etag2 = 'abc123-test-type-project1';
      
      const isValid = etagService.validateETag(etag1, etag2);
      
      expect(isValid).toBe(true);
    });

    it('should reject non-matching ETags', () => {
      const etag1 = 'abc123-test-type-project1';
      const etag2 = 'def456-test-type-project1';
      
      const isValid = etagService.validateETag(etag1, etag2);
      
      expect(isValid).toBe(false);
    });

    it('should handle quoted ETags', () => {
      const etag1 = '"abc123-test-type-project1"';
      const etag2 = 'abc123-test-type-project1';
      
      const isValid = etagService.validateETag(etag1, etag2);
      
      expect(isValid).toBe(true);
    });

    it('should handle null ETags', () => {
      const isValid = etagService.validateETag(null, 'abc123');
      
      expect(isValid).toBe(false);
    });
  });

  describe('extractETagFromRequest', () => {
    it('should extract If-None-Match header', () => {
      const req = {
        headers: {
          'if-none-match': '"abc123-test-type-project1"'
        }
      };
      
      const etag = etagService.extractETagFromRequest(req);
      
      expect(etag).toBe('"abc123-test-type-project1"');
    });

    it('should extract If-Match header', () => {
      const req = {
        headers: {
          'if-match': '"def456-test-type-project1"'
        }
      };
      
      const etag = etagService.extractETagFromRequest(req);
      
      expect(etag).toBe('"def456-test-type-project1"');
    });

    it('should return null when no ETag headers', () => {
      const req = {
        headers: {}
      };
      
      const etag = etagService.extractETagFromRequest(req);
      
      expect(etag).toBeNull();
    });
  });

  describe('setETagHeaders', () => {
    it('should set ETag and Cache-Control headers', () => {
      const res = {
        set: jest.fn()
      };
      
      const etag = 'abc123-test-type-project1';
      const options = { maxAge: 600, mustRevalidate: true, isPublic: false };
      
      etagService.setETagHeaders(res, etag, options);
      
      expect(res.set).toHaveBeenCalledWith('ETag', `"${etag}"`);
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=600, must-revalidate');
    });

    it('should use default options', () => {
      const res = {
        set: jest.fn()
      };
      
      const etag = 'abc123-test-type-project1';
      
      etagService.setETagHeaders(res, etag);
      
      expect(res.set).toHaveBeenCalledWith('ETag', `"${etag}"`);
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300, must-revalidate');
    });
  });

  describe('sendNotModified', () => {
    it('should send 304 response with ETag', () => {
      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        end: jest.fn()
      };
      
      const etag = 'abc123-test-type-project1';
      
      etagService.sendNotModified(res, etag);
      
      expect(res.set).toHaveBeenCalledWith('ETag', `"${etag}"`);
      expect(res.status).toHaveBeenCalledWith(304);
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('shouldReturn304', () => {
    it('should return true for matching ETags', () => {
      const req = {
        headers: {
          'if-none-match': '"abc123-test-type-project1"'
        }
      };
      
      const currentETag = 'abc123-test-type-project1';
      
      const shouldReturn = etagService.shouldReturn304(req, currentETag);
      
      expect(shouldReturn).toBe(true);
    });

    it('should return false for non-matching ETags', () => {
      const req = {
        headers: {
          'if-none-match': '"abc123-test-type-project1"'
        }
      };
      
      const currentETag = 'def456-test-type-project1';
      
      const shouldReturn = etagService.shouldReturn304(req, currentETag);
      
      expect(shouldReturn).toBe(false);
    });

    it('should return false when no request ETag', () => {
      const req = {
        headers: {}
      };
      
      const currentETag = 'abc123-test-type-project1';
      
      const shouldReturn = etagService.shouldReturn304(req, currentETag);
      
      expect(shouldReturn).toBe(false);
    });
  });

  describe('getCacheKey', () => {
    it('should generate cache key with projectId', () => {
      const key = etagService.getCacheKey('analysis-history', 'project1');
      
      expect(key).toBe('analysis-history:project1');
    });

    it('should generate cache key without projectId', () => {
      const key = etagService.getCacheKey('analysis-history');
      
      expect(key).toBe('analysis-history');
    });

    it('should include additional key', () => {
      const key = etagService.getCacheKey('analysis-charts', 'project1', 'trends');
      
      expect(key).toBe('analysis-charts:project1:trends');
    });
  });

  describe('parseETag', () => {
    it('should parse valid ETag', () => {
      const etag = 'abc123-test-type-project1-abc123';
      
      const parsed = etagService.parseETag(etag);
      
      expect(parsed).toEqual({
        hash: 'abc123',
        type: 'test-type',
        projectId: 'project1',
        timestamp: expect.any(Number)
      });
    });

    it('should handle quoted ETag', () => {
      const etag = '"abc123-test-type-project1-abc123"';
      
      const parsed = etagService.parseETag(etag);
      
      expect(parsed).toEqual({
        hash: 'abc123',
        type: 'test-type',
        projectId: 'project1',
        timestamp: expect.any(Number)
      });
    });

    it('should handle invalid ETag', () => {
      const etag = 'invalid-etag';
      
      const parsed = etagService.parseETag(etag);
      
      expect(parsed).toBeNull();
    });
  });

  describe('generateMetricsETag', () => {
    it('should generate ETag for metrics data', () => {
      const metricsData = {
        totalAnalyses: 10,
        successRate: 0.8,
        averageDuration: 5000
      };
      
      const etag = etagService.generateMetricsETag(metricsData, 'project1');
      
      expect(etag).toBeDefined();
      expect(etag).toContain('analysis-metrics');
      expect(etag).toContain('project1');
    });
  });

  describe('generateChartsETag', () => {
    it('should generate ETag for charts data', () => {
      const chartsData = {
        trends: [{ date: '2024-01-01', value: 85 }],
        metrics: { total: 10 }
      };
      
      const etag = etagService.generateChartsETag(chartsData, 'project1', 'trends');
      
      expect(etag).toBeDefined();
      expect(etag).toContain('analysis-charts-trends');
      expect(etag).toContain('project1');
    });
  });
}); 