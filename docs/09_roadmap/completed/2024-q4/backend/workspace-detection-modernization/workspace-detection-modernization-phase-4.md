# Workspace Detection Modernization – Phase 4: Testing & Validation

## Overview
Comprehensive testing and validation of the CDP-based workspace detection system. This phase ensures the new system works reliably across different IDE types, performs better than the legacy system, and handles error scenarios gracefully.

## Objectives
- [ ] Write comprehensive unit tests for CDP detectors
- [ ] Write integration tests for workspace detection
- [ ] Test with different IDE types and configurations
- [ ] Validate performance improvements over legacy system
- [ ] Test error handling and fallback scenarios

## Deliverables
- File: `backend/tests/unit/CDPWorkspaceDetector.test.js` - Complete unit test suite
- File: `backend/tests/unit/CDPGitDetector.test.js` - Complete unit test suite
- File: `backend/tests/unit/CDPConnectionManager.test.js` - Complete unit test suite
- File: `backend/tests/integration/CDPWorkspaceDetection.test.js` - Integration test suite
- File: `backend/tests/e2e/WorkspaceDetectionFlow.test.js` - End-to-end test suite
- Documentation: Testing guide and performance benchmarks

## Dependencies
- Requires: Phase 3 (Service Integration) completion
- Blocks: Phase 5 (Migration & Cleanup) start

## Estimated Time
2 hours

## Success Criteria
- [ ] Unit tests achieve 90%+ coverage for all CDP components
- [ ] Integration tests validate end-to-end detection flow
- [ ] E2E tests verify user journey completion
- [ ] Performance benchmarks show 60%+ improvement over legacy
- [ ] Error handling tests validate fallback mechanisms
- [ ] Cross-IDE compatibility verified (Cursor, VSCode, Windsurf)

## Technical Implementation Details

### Unit Test Strategy
```javascript
// CDPWorkspaceDetector.test.js
describe('CDPWorkspaceDetector', () => {
  let mockCDPConnectionManager;
  let detector;
  
  beforeEach(() => {
    mockCDPConnectionManager = {
      getWorkspaceConnection: jest.fn(),
      cleanupConnection: jest.fn()
    };
    detector = new CDPWorkspaceDetector(mockCDPConnectionManager);
  });
  
  describe('detectWorkspace', () => {
    it('should extract workspace from Cursor title', async () => {
      const mockPage = {
        evaluate: jest.fn().mockResolvedValue('MyProject - Cursor')
      };
      mockCDPConnectionManager.getWorkspaceConnection.mockResolvedValue({ page: mockPage });
      
      const result = await detector.detectWorkspace(9222);
      
      expect(result).toEqual({
        workspacePath: expect.any(String),
        workspaceName: 'MyProject',
        port: 9222
      });
    });
    
    it('should handle title extraction failures', async () => {
      const mockPage = {
        evaluate: jest.fn().mockResolvedValue('Invalid Title Format')
      };
      mockCDPConnectionManager.getWorkspaceConnection.mockResolvedValue({ page: mockPage });
      
      const result = await detector.detectWorkspace(9222);
      
      expect(result).toBeNull();
    });
    
    it('should use cache for repeated requests', async () => {
      // Test caching behavior
    });
  });
});
```

### Integration Test Strategy
```javascript
// CDPWorkspaceDetection.test.js
describe('CDP Workspace Detection Integration', () => {
  let ideManager;
  let browserManager;
  
  beforeEach(async () => {
    browserManager = new BrowserManager();
    ideManager = new IDEManager(browserManager);
  });
  
  describe('End-to-End Detection', () => {
    it('should detect workspace using CDP method', async () => {
      // Start real IDE instance for testing
      const port = 9222;
      await browserManager.connect(port);
      
      const workspacePath = await ideManager.detectWorkspacePath(port);
      
      expect(workspacePath).toBeDefined();
      expect(fs.existsSync(workspacePath)).toBe(true);
    });
    
    it('should handle CDP failures gracefully', async () => {
      // Mock CDP failure
      jest.spyOn(ideManager.cdpWorkspaceDetector, 'detectWorkspace')
        .mockRejectedValue(new Error('CDP connection failed'));
      
      const workspacePath = await ideManager.detectWorkspacePath(9222);
      
      expect(workspacePath).toBeNull(); // Should return null on failure
    });
  });
});
```

### Performance Testing
```javascript
// Performance benchmarks
describe('Performance Benchmarks', () => {
  it('should detect workspace faster than legacy system', async () => {
    const iterations = 10;
    
    // Test CDP method
    const cdpTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await ideManager.detectWorkspacePath(9222);
      cdpTimes.push(Date.now() - start);
    }
    
    // Test legacy method
    const legacyTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await ideManager.legacyDetectWorkspacePath(9222);
      legacyTimes.push(Date.now() - start);
    }
    
    const cdpAverage = cdpTimes.reduce((a, b) => a + b, 0) / iterations;
    const legacyAverage = legacyTimes.reduce((a, b) => a + b, 0) / iterations;
    
    expect(cdpAverage).toBeLessThan(legacyAverage * 0.4); // 60% improvement
    expect(cdpAverage).toBeLessThan(2000); // Target <2 seconds
  });
});
```

### Cross-IDE Testing
```javascript
// Test different IDE types
describe('Cross-IDE Compatibility', () => {
  const ideConfigs = [
    { type: 'Cursor', port: 9222, titlePattern: /([^-]+)\s*-\s*Cursor/ },
    { type: 'VSCode', port: 9223, titlePattern: /([^-]+)\s*-\s*Visual Studio Code/ },
    { type: 'Windsurf', port: 9224, titlePattern: /([^-]+)\s*-\s*Windsurf/ }
  ];
  
  ideConfigs.forEach(config => {
    it(`should detect workspace for ${config.type}`, async () => {
      // Test with each IDE configuration
    });
  });
});
```

### Error Handling Tests
```javascript
describe('Error Handling', () => {
  it('should handle CDP connection failures gracefully', async () => {
    // Mock connection failure
    jest.spyOn(ideManager.cdpConnectionManager, 'getWorkspaceConnection')
      .mockRejectedValue(new Error('Connection failed'));
    
    const result = await ideManager.detectWorkspacePath(9222);
    
    expect(result).toBeNull(); // Should return null on failure
  });
  
  it('should handle invalid workspace paths', async () => {
    // Test with non-existent workspace
    const mockPage = {
      evaluate: jest.fn().mockResolvedValue('Invalid Title Format')
    };
    jest.spyOn(ideManager.cdpConnectionManager, 'getWorkspaceConnection')
      .mockResolvedValue({ page: mockPage });
    
    const result = await ideManager.detectWorkspacePath(9222);
    
    expect(result).toBeNull();
  });
  
  it('should handle timeout scenarios', async () => {
    // Test with slow responses
    jest.spyOn(ideManager.cdpConnectionManager, 'getWorkspaceConnection')
      .mockImplementation(() => new Promise((resolve, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      ));
    
    const result = await ideManager.detectWorkspacePath(9222);
    
    expect(result).toBeNull();
  });
});
```

### Test Configuration
- **Backend Tests**: Jest with Node.js environment
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.js` for backend
- **Mock Strategy**: Mock CDP connections, IDE instances, file system
- **Real Testing**: Use actual IDE instances for integration tests

### Performance Benchmarks
- **Target Response Time**: <2 seconds (vs 5-10 seconds legacy)
- **Memory Usage**: <50MB for CDP connections
- **Throughput**: Support concurrent detection for multiple IDEs
- **Cache Hit Rate**: >80% for repeated detections

## Risk Mitigation
- **Test Environment Issues**: Use Docker containers for consistent testing
- **Performance Regression**: Continuous benchmarking and monitoring
- **Cross-IDE Compatibility**: Extensive testing with different IDE versions
- **Error Scenario Coverage**: Comprehensive error handling test suite
