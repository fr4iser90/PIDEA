# Comprehensive Analysis Optimization – Phase 4: Testing & Validation

## Overview
Create comprehensive OOM prevention test scenarios and validate that the memory management system prevents OOM crashes in all scenarios, including large repositories and memory-intensive operations. **NEW**: Test queue management system and selective analysis capabilities to ensure project isolation and proper analysis type selection.

## Objectives
- [ ] Create OOM prevention test scenarios
- [ ] Test with large repositories (>10k files)
- [ ] Validate memory usage stays under limits
- [ ] Performance testing with existing endpoints
- [ ] End-to-end validation of complete OOM prevention system
- [ ] **NEW**: Test queue management and project isolation
- [ ] **NEW**: Validate selective analysis capabilities
- [ ] **NEW**: Test concurrent analysis scenarios

## Deliverables
- Test: `tests/integration/OOMPrevention.test.js` - OOM prevention integration tests
- Test: `tests/performance/AnalysisMemoryPerformance.test.js` - Memory performance tests
- Test: `tests/e2e/AnalysisOOMPreventionE2E.test.js` - End-to-end OOM prevention tests
- **NEW**: Test: `tests/integration/QueueManagement.test.js` - Queue management tests
- **NEW**: Test: `tests/integration/SelectiveAnalysis.test.js` - Selective analysis tests
- **NEW**: Test: `tests/e2e/ConcurrentAnalysisE2E.test.js` - Concurrent analysis tests
- Script: `scripts/analysis-oom-prevention-test.js` - Complete OOM prevention testing
- **NEW**: Script: `scripts/test-queue-management.js` - Queue management testing
- **NEW**: Script: `scripts/test-selective-analysis.js` - Selective analysis testing
- Script: `scripts/test-large-repository-analysis.js` - Large repository testing

## Dependencies
- Requires: Phase 1 completion (Memory Management Integration)
- Requires: Phase 2 completion (OOM Prevention Implementation)
- Requires: Phase 3 completion (Resource Management Enhancement)
- Requires: Existing queue infrastructure (ExecutionQueue, ExecutionScheduler)
- Blocks: None (final phase)

## Estimated Time
3 hours

## Technical Implementation

### OOM Prevention Test Scenarios
- Large repository analysis (>50k files)
- Memory-intensive operations
- Concurrent analysis requests
- Memory threshold testing
- Timeout and cancellation testing
- Fallback mechanism validation

### Test Implementation
```javascript
// OOM prevention test
describe('OOM Prevention', () => {
  test('should not crash with large repository', async () => {
    const largeRepo = createLargeTestRepository(50000); // 50k files
    
    const startMemory = process.memoryUsage().heapUsed;
    
    const result = await analysisController.analyzeComprehensive(
      { params: { projectPath: largeRepo } },
      { json: jest.fn() }
    );
    
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = endMemory - startMemory;
    
    expect(memoryUsed).toBeLessThan(256 * 1024 * 1024); // 256MB
    expect(result.success).toBe(true);
  });
  
  test('should handle memory threshold exceeded', async () => {
    // Force high memory usage
    global.gc = jest.fn();
    
    const result = await analysisController.analyzeComprehensive(
      { params: { projectPath: 'large-repo' } },
      { json: jest.fn() }
    );
    
    expect(result.data.partial).toBe(true);
    expect(result.data.error).toContain('memory');
  });
});
```

### Performance Testing
- Memory usage benchmarking
- Analysis execution time validation
- Resource cleanup effectiveness
- Progressive degradation testing
- Concurrent request handling

### Large Repository Testing
- Repository with 50k+ files
- Memory usage monitoring
- Analysis completion validation
- Partial result delivery testing
- Error handling validation

### **NEW**: Queue Management Testing
```javascript
// Queue management tests
describe('Automatic Queue Management', () => {
  test('should automatically queue when analysis is running', async () => {
    const projectId = 'test-project';
    
    // Start first analysis
    const result1 = await analysisController.analyzeComprehensive(
      { params: { projectId } },
      { json: jest.fn() }
    );
    
    expect(result1.data.status).toBe('running');
    
    // Try to start second analysis - should be queued automatically
    const result2 = await analysisController.analyzeComprehensive(
      { params: { projectId } },
      { json: jest.fn() }
    );
    
    expect(result2.data.status).toBe('queued');
    expect(result2.data.position).toBe(1);
    expect(result2.data.estimatedWaitTime).toBeDefined();
  });
  
  test('should isolate projects in separate queues', async () => {
    const project1 = 'project-1';
    const project2 = 'project-2';
    
    // Start analyses in different projects
    const result1 = await analysisController.analyzeComprehensive(
      { params: { projectId: project1 } },
      { json: jest.fn() }
    );
    
    const result2 = await analysisController.analyzeComprehensive(
      { params: { projectId: project2 } },
      { json: jest.fn() }
    );
    
    // Both should be running (no interference)
    expect(result1.data.status).toBe('running');
    expect(result2.data.status).toBe('running');
  });
  
  test('should handle selective analysis with automatic queueing', async () => {
    const projectId = 'test-project';
    
    // Start comprehensive analysis
    const result1 = await analysisController.analyzeComprehensive(
      { params: { projectId } },
      { json: jest.fn() }
    );
    
    expect(result1.data.status).toBe('running');
    
    // Try selective analysis - should be queued automatically
    const result2 = await analysisController.analyzeComprehensive(
      { 
        params: { projectId },
        query: { types: 'code-quality,security' }
      },
      { json: jest.fn() }
    );
    
    expect(result2.data.status).toBe('queued');
    expect(result2.data.analysisTypes).toEqual(['code-quality', 'security']);
    expect(result2.data.message).toContain('Selective analysis queued');
  });
});
```

### **NEW**: Selective Analysis Testing
```javascript
// Selective analysis tests
describe('Automatic Selective Analysis', () => {
  test('should run only specified analysis types', async () => {
    const projectId = 'test-project';
    const analysisTypes = ['code-quality', 'security'];
    
    const result = await analysisController.analyzeComprehensive(
      { 
        params: { projectId },
        query: { types: analysisTypes.join(',') }
      },
      { json: jest.fn() }
    );
    
    expect(result.data.analysisTypes).toEqual(analysisTypes);
    expect(result.data.status).toBe('running');
  });
  
  test('should handle exclusion parameter', async () => {
    const projectId = 'test-project';
    const exclude = 'architecture';
    
    const result = await analysisController.analyzeComprehensive(
      { 
        params: { projectId },
        query: { exclude }
      },
      { json: jest.fn() }
    );
    
    expect(result.data.analysisTypes).not.toContain('architecture');
    expect(result.data.analysisTypes).toContain('code-quality');
    expect(result.data.analysisTypes).toContain('security');
    expect(result.data.analysisTypes).toContain('performance');
  });
  
  test('should validate query parameters', async () => {
    const projectId = 'test-project';
    
    // Test invalid analysis type
    const result = await analysisController.analyzeComprehensive(
      { 
        params: { projectId },
        query: { types: 'invalid-type' }
      },
      { json: jest.fn() }
    );
    
    expect(result.data.error).toContain('No valid analysis types');
  });
  
  test('should cache selective analysis results', async () => {
    const projectId = 'test-project';
    const analysisTypes = ['code-quality'];
    
    // First request
    const result1 = await analysisController.analyzeComprehensive(
      { 
        params: { projectId },
        query: { types: analysisTypes.join(',') }
      },
      { json: jest.fn() }
    );
    
    // Second request (should be cached)
    const result2 = await analysisController.analyzeComprehensive(
      { 
        params: { projectId },
        query: { types: analysisTypes.join(',') }
      },
      { json: jest.fn() }
    );
    
    expect(result2.data.status).toBe('cached');
    expect(result2.data.cachedAt).toBeDefined();
  });
});
```

### **NEW**: Concurrent Analysis Testing
```javascript
// Concurrent analysis tests
describe('Concurrent Analysis', () => {
  test('should handle multiple projects simultaneously', async () => {
    const projects = ['project-1', 'project-2', 'project-3'];
    const promises = projects.map(projectId => 
      analysisQueueService.addAnalysisToQueue(
        projectId,
        ['code-quality'],
        { priority: 'normal' }
      )
    );
    
    const results = await Promise.all(promises);
    
    // Verify all jobs were queued successfully
    results.forEach(result => {
      expect(result.status).toBe('queued');
      expect(result.jobId).toBeDefined();
    });
    
    // Verify project isolation
    projects.forEach(projectId => {
      const queue = analysisQueueService.getProjectQueue(projectId);
      expect(queue.queue.length).toBe(1);
    });
  });
  
  test('should respect global resource limits', async () => {
    const globalMemoryLimit = 1024 * 1024 * 1024; // 1GB
    
    // Start multiple memory-intensive analyses
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        analysisController.analyzeComprehensive(
          { params: { projectPath: `project-${i}` } },
          { json: jest.fn() }
        )
      );
    }
    
    const results = await Promise.allSettled(promises);
    
    // Verify some analyses were rejected due to resource limits
    const rejected = results.filter(r => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
    
    // Verify memory usage stayed under limit
    const currentMemory = process.memoryUsage().heapUsed;
    expect(currentMemory).toBeLessThan(globalMemoryLimit);
  });
});
```

## Success Criteria
- [ ] All objectives completed
- [ ] No OOM crashes in any test scenario
- [ ] Memory usage stays under 256MB per analysis
- [ ] Large repositories process successfully
- [ ] Fallback mechanisms work reliably
- [ ] Performance impact < 5% compared to current
- [ ] All tests passing with 100% OOM prevention success rate
- [ ] **NEW**: Queue management tests passing
- [ ] **NEW**: Project isolation working correctly
- [ ] **NEW**: Selective analysis tests passing
- [ ] **NEW**: Concurrent analysis tests passing
- [ ] **NEW**: Resource limits enforced properly

## Testing Scenarios

### OOM Prevention Tests
- Repository with 100k+ files
- Memory-intensive analysis types
- Concurrent analysis requests (10+)
- Memory threshold exceeded scenarios
- Timeout and cancellation testing
- Fallback mechanism validation

### Performance Tests
- Memory usage under 256MB per analysis
- Analysis execution time < 5 minutes
- Resource cleanup effectiveness
- Progressive degradation testing
- Concurrent request handling

### Integration Tests
- Complete analysis workflow
- Memory monitoring accuracy
- Sequential execution validation
- Error handling and recovery
- Partial result delivery

### **NEW**: Queue Management Tests
- Project isolation validation
- Resource limit enforcement
- Job cancellation and retry
- Priority scheduling
- Queue status tracking

### **NEW**: Selective Analysis Tests
- Analysis type selection
- Exclusion parameter handling
- Query parameter validation
- Caching behavior
- Time estimation accuracy

### **NEW**: Concurrent Analysis Tests
- Multiple project handling
- Global resource limits
- Project isolation under load
- Memory usage monitoring
- Performance degradation testing

### Browser Compatibility
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest) 