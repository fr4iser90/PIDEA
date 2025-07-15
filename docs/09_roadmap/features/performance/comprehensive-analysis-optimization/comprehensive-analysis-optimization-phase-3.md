# Comprehensive Analysis Optimization – Phase 3: Resource Management Enhancement

## Overview
Enhance resource management with timeout limits, analysis result streaming, memory usage logging, and fallback mechanisms for memory-intensive operations. **NEW**: Implement selective analysis capabilities allowing users to choose specific analysis types and combinations.

## Objectives
- [ ] Add timeout limits for each analysis type
- [ ] Implement analysis result streaming to prevent memory buildup
- [ ] Add memory usage logging and monitoring
- [ ] Create fallback mechanisms for memory-intensive operations
- [ ] Enhance existing analysis services with resource limits
- [ ] **NEW**: Implement selective analysis capabilities
- [ ] **NEW**: Add query parameter support for analysis type selection
- [ ] **NEW**: Create selective analysis endpoints and controllers

## Deliverables
- Enhanced: `backend/domain/services/MemoryOptimizedAnalysisService.js` - Add streaming and timeouts
- Modified: `backend/presentation/api/AnalysisController.js` - Add resource management
- Enhanced: All existing analysis services - Add timeout and streaming
- **NEW**: Enhanced: `backend/domain/services/AnalysisQueueService.js` - Add selective analysis support
- Test: `tests/integration/ResourceManagement.test.js` - Resource management tests
- **NEW**: Test: `tests/integration/SelectiveAnalysis.test.js` - Selective analysis tests
- Script: `scripts/analysis-oom-prevention-test.js` - Complete OOM prevention testing

## Dependencies
- Requires: Phase 1 completion (Memory Management Integration)
- Requires: Phase 2 completion (OOM Prevention Implementation)
- Requires: Existing queue infrastructure (ExecutionQueue, ExecutionScheduler)
- Blocks: Phase 4 start (Testing & Validation)

## Estimated Time
4 hours

## Technical Implementation

### Resource Management Features
- Timeout limits (5 minutes per analysis type)
- Analysis result streaming to prevent memory buildup
- Memory usage logging and monitoring
- Fallback mechanisms for memory-intensive operations
- Progressive degradation for large repositories

### Timeout and Streaming Implementation
```javascript
// Analysis with timeout and streaming
async runAnalysisWithTimeout(analysisType, projectPath, options) {
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  return Promise.race([
    this.runAnalysis(analysisType, projectPath, options),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Analysis timeout')), timeout)
    )
  ]);
}

// Streaming analysis results
async streamAnalysisResults(analysisType, projectPath, options) {
  const stream = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      // Process chunk and emit partial results
      this.push({ type: 'partial', data: chunk });
      callback();
    }
  });
  
  return stream;
}
```

### Memory Usage Logging
- Real-time memory usage tracking
- Memory threshold alerts and logging
- Performance impact monitoring
- Memory usage analytics
- Resource cleanup logging

### Fallback Mechanisms
- Lightweight analysis modes for large repositories
- Skip heavy analysis types if memory low
- Progressive degradation based on available resources
- Partial result delivery with clear indicators

### **NEW**: Selective Analysis Capabilities
```javascript
// Enhanced existing AnalysisController with selective analysis support
class AnalysisController {
  async analyzeComprehensive(req, res) {
    const { projectId } = req.params;
    const { types, exclude, priority, timeout } = req.query;
    
    try {
      // Parse analysis types from query parameters
      const analysisTypes = this.parseAnalysisTypes(types, exclude);
      
      if (analysisTypes.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid analysis types specified'
        });
      }
      
      // Process request with automatic queueing and selective support
      const result = await this.analysisQueueService.processAnalysisRequest(
        projectId,
        analysisTypes,
        { 
          priority: priority || 'normal',
          timeout: timeout ? parseInt(timeout) * 1000 : 300000,
          selective: analysisTypes.length < 4 // Less than all types = selective
        }
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
          message: `Selective analysis queued - ${result.position - 1} jobs ahead`
        });
      } else if (result.status === 'running') {
        res.json({
          success: true,
          status: 'running',
          jobId: result.jobId,
          analysisTypes: result.analysisTypes,
          estimatedTime: this.estimateAnalysisTime(analysisTypes),
          message: 'Selective analysis started'
        });
      } else if (result.status === 'cached') {
        res.json({
          success: true,
          status: 'cached',
          data: result.result,
          cachedAt: result.cachedAt,
          message: 'Returning cached selective analysis results'
        });
      }
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  parseAnalysisTypes(types, exclude) {
    const availableTypes = ['code-quality', 'security', 'performance', 'architecture'];
    let selectedTypes = [...availableTypes];
    
    // Handle types parameter
    if (types) {
      const requestedTypes = types.split(',').map(t => t.trim());
      selectedTypes = requestedTypes.filter(type => 
        availableTypes.includes(type)
      );
    }
    
    // Handle exclude parameter
    if (exclude) {
      const excludedTypes = exclude.split(',').map(t => t.trim());
      selectedTypes = selectedTypes.filter(type => 
        !excludedTypes.includes(type)
      );
    }
    
    return selectedTypes;
  }
  
  estimateAnalysisTime(analysisTypes) {
    const timeEstimates = {
      'code-quality': 60000,    // 1 minute
      'security': 120000,       // 2 minutes
      'performance': 180000,    // 3 minutes
      'architecture': 240000    // 4 minutes
    };
    
    return analysisTypes.reduce((total, type) => 
      total + (timeEstimates[type] || 120000), 0
    );
  }
}
```

### **NEW**: Enhanced Queue Service with Selective Support
```javascript
// Enhanced AnalysisQueueService with selective analysis
class AnalysisQueueService {
  constructor() {
    this.projectQueues = new Map();
    this.selectiveAnalysisCache = new Map(); // Cache selective analysis results
  }
  
  async addSelectiveAnalysisToQueue(projectId, analysisTypes, options) {
    const queue = this.getProjectQueue(projectId);
    
    // Create selective analysis job
    const job = {
      id: uuidv4(),
      projectId,
      analysisTypes,
      options: {
        ...options,
        selective: true,
        cacheKey: this.generateCacheKey(projectId, analysisTypes)
      },
      priority: options.priority || 'normal',
      createdAt: new Date()
    };
    
    // Check cache first
    const cachedResult = this.selectiveAnalysisCache.get(job.options.cacheKey);
    if (cachedResult && this.isCacheValid(cachedResult)) {
      return {
        jobId: job.id,
        status: 'cached',
        result: cachedResult.data,
        cachedAt: cachedResult.timestamp
      };
    }
    
    // Add to queue
    const success = queue.enqueue(job);
    if (success) {
      return {
        jobId: job.id,
        status: 'queued',
        analysisTypes,
        estimatedTime: this.estimateAnalysisTime(analysisTypes)
      };
    } else {
      throw new Error('Queue is full');
    }
  }
  
  generateCacheKey(projectId, analysisTypes) {
    return `${projectId}:${analysisTypes.sort().join(',')}`;
  }
  
  isCacheValid(cachedResult) {
    const cacheAge = Date.now() - cachedResult.timestamp;
    return cacheAge < 3600000; // 1 hour cache
  }
  
  async cacheSelectiveResult(cacheKey, result) {
    this.selectiveAnalysisCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
  }
}
```

### **NEW**: Query Parameter Support
```javascript
// Query parameter parsing and validation
class AnalysisQueryParser {
  static parseQueryParams(query) {
    const {
      types,
      exclude,
      priority = 'normal',
      timeout = '300',
      memory_limit = '256',
      streaming = 'false'
    } = query;
    
    return {
      analysisTypes: this.parseAnalysisTypes(types, exclude),
      priority: this.validatePriority(priority),
      timeout: parseInt(timeout) * 1000, // Convert to milliseconds
      memoryLimit: parseInt(memory_limit) * 1024 * 1024, // Convert to bytes
      streaming: streaming === 'true'
    };
  }
  
  static parseAnalysisTypes(types, exclude) {
    const availableTypes = ['code-quality', 'security', 'performance', 'architecture'];
    let selectedTypes = [...availableTypes];
    
    if (types) {
      const requestedTypes = types.split(',').map(t => t.trim());
      selectedTypes = requestedTypes.filter(type => availableTypes.includes(type));
    }
    
    if (exclude) {
      const excludedTypes = exclude.split(',').map(t => t.trim());
      selectedTypes = selectedTypes.filter(type => !excludedTypes.includes(type));
    }
    
    return selectedTypes;
  }
  
  static validatePriority(priority) {
    const validPriorities = ['low', 'normal', 'high', 'critical'];
    return validPriorities.includes(priority) ? priority : 'normal';
  }
}
```

## Success Criteria
- [ ] All objectives completed
- [ ] Timeout limits prevent hanging analyses
- [ ] Streaming prevents memory buildup
- [ ] Memory usage logging provides insights
- [ ] Fallback mechanisms work reliably
- [ ] No OOM crashes in any scenario
- [ ] Performance impact < 5% compared to current
- [ ] Tests passing with resource-intensive scenarios
- [ ] **NEW**: Selective analysis endpoints working correctly
- [ ] **NEW**: Query parameter parsing and validation working
- [ ] **NEW**: Analysis type combinations working properly
- [ ] **NEW**: Caching for selective analysis results working

## Testing Scenarios

### Resource Management Tests
- Large repository analysis (>50k files)
- Memory-intensive operations
- Timeout handling and recovery
- Streaming performance validation
- Fallback mechanism testing

### Performance Tests
- Memory usage under 256MB per analysis
- Analysis timeout response time < 2s
- Streaming throughput validation
- Resource cleanup effectiveness
- Progressive degradation testing

### **NEW**: Selective Analysis Tests
- Single analysis type execution
- Multiple analysis type combinations
- Exclusion parameter testing
- Priority and timeout parameter testing
- Caching behavior validation
- Query parameter parsing and validation 