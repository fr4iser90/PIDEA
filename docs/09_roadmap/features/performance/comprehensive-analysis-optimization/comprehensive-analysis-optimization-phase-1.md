# Comprehensive Analysis Optimization – Phase 1: Memory Management Integration

## Overview
Integrate existing MemoryOptimizedAnalysisService with current analysis services and modify AnalysisController to prevent OOM crashes by using sequential execution instead of parallel Promise.all. **NEW**: Integrate with existing ExecutionQueue system for project isolation and queue management.

## Objectives
- [x] Integrate MemoryOptimizedAnalysisService with existing analysis services
- [x] Add memory monitoring to AnalysisController.analyzeComprehensive
- [x] Implement sequential analysis execution instead of Promise.all
- [x] Add memory cleanup between analysis types
- [x] Add memory usage logging and monitoring
- [x] **NEW**: Integrate with existing ExecutionQueue system
- [x] **NEW**: Create project-specific analysis queues
- [x] **NEW**: Add queue status tracking and progress monitoring

## Deliverables
- [x] Modified: `backend/presentation/api/AnalysisController.js` - Add memory monitoring and sequential execution
- [x] Enhanced: `backend/domain/services/MemoryOptimizedAnalysisService.js` - Integration with other services
- [x] **NEW**: `backend/domain/services/AnalysisQueueService.js` - Queue management service
- [ ] Test: `tests/unit/AnalysisControllerMemory.test.js` - Memory management tests
- [x] **NEW**: Test: `tests/unit/AnalysisQueueService.test.js` - Queue management tests
- [x] Script: `scripts/analysis-oom-prevention-test.js` - OOM prevention testing

## Dependencies
- Requires: Existing analysis services (TaskAnalysisService, AdvancedAnalysisService, MemoryOptimizedAnalysisService)
- Requires: Existing queue infrastructure (ExecutionQueue, ExecutionScheduler, SequentialExecutionEngine)
- Blocks: Phase 2 start (OOM Prevention Implementation)

## Estimated Time
4 hours

## Technical Implementation

### Memory Management Integration
- Replace Promise.all with sequential forEach execution
- Add memory usage checks before each analysis
- Implement garbage collection between analyses
- Add timeout limits for each analysis type
- Memory threshold monitoring (256MB per analysis)

### Sequential Analysis Execution
```javascript
// Instead of Promise.all, use sequential execution
const analyses = [];
for (const analysisType of ['codeQuality', 'security', 'performance', 'architecture']) {
  // Check memory before each analysis
  await this.checkMemoryUsage();
  
  // Run analysis with timeout
  const result = await this.runAnalysisWithTimeout(analysisType, projectPath, options);
  analyses.push(result);
  
  // Cleanup after each analysis
  await this.cleanupAfterAnalysis();
}
```

### Memory Safety Features
- Memory usage monitoring before each analysis
- Automatic garbage collection triggers
- Analysis cancellation on memory threshold
- Timeout limits (5 minutes per analysis)
- Fallback to partial results if memory limit exceeded

### **NEW**: Queue Management Integration
```javascript
// Integrate with existing ExecutionQueue
class AnalysisQueueService {
  constructor() {
    this.projectQueues = new Map(); // projectId -> ExecutionQueue
    this.activeAnalyses = new Map(); // projectId -> active analysis info
    this.executionEngine = new SequentialExecutionEngine({
      enablePriority: true,
      enableRetry: true,
      enableResourceManagement: true,
      maxConcurrentExecutions: 3 // Max 3 concurrent analyses per project
    });
  }
  
  async processAnalysisRequest(projectId, analysisTypes, options) {
    // Check if analysis is already running for this project
    const activeAnalysis = this.activeAnalyses.get(projectId);
    
    if (activeAnalysis) {
      // Analysis is running - automatically queue the request
      return this.queueAnalysisRequest(projectId, analysisTypes, options);
    } else {
      // No analysis running - start immediately
      return this.startAnalysisImmediately(projectId, analysisTypes, options);
    }
  }
  
  async queueAnalysisRequest(projectId, analysisTypes, options) {
    const queue = this.getProjectQueue(projectId);
    const job = {
      id: uuidv4(),
      projectId,
      analysisTypes,
      options,
      priority: options.priority || 'normal',
      createdAt: new Date()
    };
    
    const success = queue.enqueue(job);
    if (success) {
      return {
        jobId: job.id,
        status: 'queued',
        analysisTypes,
        position: queue.queue.length,
        estimatedWaitTime: this.estimateWaitTime(queue.queue.length),
        message: `Analysis queued - ${queue.queue.length - 1} jobs ahead`
      };
    } else {
      throw new Error('Queue is full');
    }
  }
  
  async startAnalysisImmediately(projectId, analysisTypes, options) {
    const jobId = uuidv4();
    
    // Mark analysis as active
    this.activeAnalyses.set(projectId, {
      jobId,
      analysisTypes,
      startTime: new Date(),
      status: 'running'
    });
    
    return {
      jobId,
      status: 'running',
      analysisTypes,
      estimatedTime: this.estimateAnalysisTime(analysisTypes),
      message: 'Analysis started'
    };
  }
  
  getProjectQueue(projectId) {
    if (!this.projectQueues.has(projectId)) {
      this.projectQueues.set(projectId, new ExecutionQueue({
        maxSize: 10,
        enablePriority: true,
        enableRetry: true,
        maxRetries: 2,
        defaultTimeout: 300000 // 5 minutes
      }));
    }
    return this.projectQueues.get(projectId);
  }
  
  estimateWaitTime(queuePosition) {
    const avgTimePerJob = 3 * 60 * 1000; // 3 minutes average
    return Math.round(queuePosition * avgTimePerJob / 60000); // Return in minutes
  }
}
```

### **AUTOMATIC Queue Integration** (No Extra Controllers):
```javascript
// Enhanced existing AnalysisController with automatic queueing
class AnalysisController {
  async analyzeComprehensive(req, res) {
    const { projectId } = req.params;
    const { types, exclude, priority, timeout } = req.query;
    
    try {
      // Parse analysis types from query parameters
      const analysisTypes = this.parseAnalysisTypes(types, exclude);
      
      // Process request with automatic queueing
      const result = await this.analysisQueueService.processAnalysisRequest(
        projectId,
        analysisTypes,
        { priority, timeout }
      );
      
      // Return appropriate response based on status
      if (result.status === 'queued') {
        res.json({
          success: true,
          status: 'queued',
          jobId: result.jobId,
          analysisTypes: result.analysisTypes,
          position: result.position,
          estimatedWaitTime: result.estimatedWaitTime,
          message: result.message
        });
      } else if (result.status === 'running') {
        res.json({
          success: true,
          status: 'running',
          jobId: result.jobId,
          analysisTypes: result.analysisTypes,
          estimatedTime: result.estimatedTime,
          message: result.message
        });
      }
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

## Success Criteria
- [ ] All objectives completed
- [ ] Memory usage stays under 256MB per analysis
- [ ] No OOM crashes during comprehensive analysis
- [ ] Sequential execution working correctly
- [ ] Memory cleanup effective between analyses
- [ ] Tests passing with large repositories
- [ ] **NEW**: Queue system integrated with existing ExecutionQueue
- [ ] **NEW**: Project isolation working correctly
- [ ] **NEW**: Queue status tracking functional
- [ ] **NEW**: Progress monitoring working 