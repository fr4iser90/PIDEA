# Individual Analysis Loading – Phase 2: Implement Individual Step Tracking

## Overview
Implement individual step tracking system to monitor the progress of each analysis step separately. This will provide real-time status updates for each analysis type and enable step-by-step loading with proper status reflection.

## Objectives
- [ ] Create AnalysisStep entity for tracking individual steps
- [ ] Create AnalysisStepRepository for step persistence
- [ ] Implement step status tracking in AnalysisService
- [ ] Add step progress WebSocket events

## Deliverables
- [ ] AnalysisStep entity with proper structure
- [ ] AnalysisStepRepository with CRUD operations
- [ ] Enhanced AnalysisService with step tracking
- [ ] WebSocket events for step progress updates

## Dependencies
- Requires: Phase 1 completion (comprehensive routes removed)
- Blocks: Phase 3 implementation

## Estimated Time
3 hours (implementation and testing)

## Success Criteria
- [ ] Individual analysis steps are tracked separately
- [ ] Step progress is updated in real-time
- [ ] WebSocket events are emitted for step updates
- [ ] All step tracking functionality works correctly

## Implementation Plan

### Step 1: Create AnalysisStep Entity

#### File: `backend/domain/entities/AnalysisStep.js`
```javascript
class AnalysisStep {
  constructor(id, type, projectId, status = 'pending') {
    this.id = id;
    this.type = type; // 'issues', 'techstack', 'architecture', 'recommendations'
    this.projectId = projectId;
    this.status = status; // 'pending', 'running', 'completed', 'failed'
    this.progress = 0;
    this.currentStep = '';
    this.startTime = new Date();
    this.endTime = null;
    this.error = null;
    this.result = null;
    this.metadata = {
      estimatedTime: null,
      actualTime: null,
      memoryUsage: null,
      cacheHit: false
    };
  }

  updateProgress(progress, currentStep) {
    this.progress = Math.min(100, Math.max(0, progress));
    this.currentStep = currentStep;
    
    if (this.progress === 100) {
      this.status = 'completed';
      this.endTime = new Date();
    } else if (this.progress > 0) {
      this.status = 'running';
    }
  }

  markFailed(error) {
    this.status = 'failed';
    this.error = error;
    this.endTime = new Date();
  }

  setResult(result) {
    this.result = result;
    this.status = 'completed';
    this.progress = 100;
    this.endTime = new Date();
  }
}

module.exports = AnalysisStep;
```

### Step 2: Create AnalysisStepRepository

#### File: `backend/domain/repositories/AnalysisStepRepository.js`
```javascript
const AnalysisStep = require('../entities/AnalysisStep');
const Logger = require('@logging/Logger');

class AnalysisStepRepository {
  constructor(database, eventBus, logger) {
    this.database = database;
    this.eventBus = eventBus;
    this.logger = logger || new Logger('AnalysisStepRepository');
  }

  async createStep(stepId, type, projectId) {
    try {
      const step = new AnalysisStep(stepId, type, projectId);
      
      // Save to database
      await this.database.query(
        'INSERT INTO analysis_steps (id, type, project_id, status, progress, current_step, start_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [step.id, step.type, step.projectId, step.status, step.progress, step.currentStep, step.startTime]
      );

      this.logger.info('Analysis step created', { stepId, type, projectId });
      
      // Emit creation event
      this.eventBus.emit('analysis-step:created', {
        stepId,
        type,
        projectId,
        status: step.status
      });

      return step;
    } catch (error) {
      this.logger.error('Failed to create analysis step', { error: error.message, stepId, type, projectId });
      throw error;
    }
  }

  async updateStepProgress(stepId, progress, currentStep) {
    try {
      // Update database
      await this.database.query(
        'UPDATE analysis_steps SET progress = ?, current_step = ?, status = ?, updated_at = ? WHERE id = ?',
        [progress, currentStep, progress === 100 ? 'completed' : 'running', new Date(), stepId]
      );

      // Get updated step
      const [rows] = await this.database.query(
        'SELECT * FROM analysis_steps WHERE id = ?',
        [stepId]
      );

      if (rows.length === 0) {
        throw new Error(`Analysis step not found: ${stepId}`);
      }

      const stepData = rows[0];
      
      this.logger.info('Analysis step progress updated', { 
        stepId, 
        progress, 
        currentStep, 
        status: stepData.status 
      });

      // Emit progress event
      this.eventBus.emit('analysis-step:progress', {
        stepId,
        type: stepData.type,
        projectId: stepData.project_id,
        progress,
        currentStep,
        status: stepData.status
      });

      return stepData;
    } catch (error) {
      this.logger.error('Failed to update analysis step progress', { 
        error: error.message, 
        stepId, 
        progress 
      });
      throw error;
    }
  }

  async markStepFailed(stepId, error) {
    try {
      await this.database.query(
        'UPDATE analysis_steps SET status = ?, error = ?, end_time = ?, updated_at = ? WHERE id = ?',
        ['failed', error, new Date(), new Date(), stepId]
      );

      this.logger.info('Analysis step marked as failed', { stepId, error });

      // Emit failure event
      this.eventBus.emit('analysis-step:failed', {
        stepId,
        error
      });
    } catch (error) {
      this.logger.error('Failed to mark analysis step as failed', { 
        error: error.message, 
        stepId 
      });
      throw error;
    }
  }

  async getStepById(stepId) {
    try {
      const [rows] = await this.database.query(
        'SELECT * FROM analysis_steps WHERE id = ?',
        [stepId]
      );

      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      this.logger.error('Failed to get analysis step', { error: error.message, stepId });
      throw error;
    }
  }

  async getStepsByProject(projectId) {
    try {
      const [rows] = await this.database.query(
        'SELECT * FROM analysis_steps WHERE project_id = ? ORDER BY start_time DESC',
        [projectId]
      );

      return rows;
    } catch (error) {
      this.logger.error('Failed to get analysis steps by project', { 
        error: error.message, 
        projectId 
      });
      throw error;
    }
  }

  async getActiveStepsByProject(projectId) {
    try {
      const [rows] = await this.database.query(
        'SELECT * FROM analysis_steps WHERE project_id = ? AND status IN ("pending", "running") ORDER BY start_time ASC',
        [projectId]
      );

      return rows;
    } catch (error) {
      this.logger.error('Failed to get active analysis steps by project', { 
        error: error.message, 
        projectId 
      });
      throw error;
    }
  }
}

module.exports = AnalysisStepRepository;
```

### Step 3: Create Database Migration

#### File: `backend/infrastructure/database/migrations/create_analysis_steps_table.sql`
```sql
CREATE TABLE IF NOT EXISTS analysis_steps (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  progress INT DEFAULT 0,
  current_step TEXT,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  error TEXT NULL,
  result JSON NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_project_id (project_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time)
);
```

### Step 4: Enhance AnalysisService with Step Tracking

#### Update: `backend/domain/services/AnalysisService.js`
```javascript
// Add to existing AnalysisService class:

constructor(analysisStepRepository, eventBus, logger) {
  // ... existing constructor code ...
  this.analysisStepRepository = analysisStepRepository;
  this.eventBus = eventBus;
}

async executeAnalysisWithStepTracking(analysisType, projectId, options = {}) {
  const stepId = `${analysisType}_${projectId}_${Date.now()}`;
  
  try {
    // Create step tracking
    await this.analysisStepRepository.createStep(stepId, analysisType, projectId);
    
    // Update progress to 10%
    await this.analysisStepRepository.updateStepProgress(stepId, 10, 'Initializing analysis');
    
    // Execute analysis with progress updates
    const result = await this.executeAnalysisWithProgress(analysisType, projectId, stepId, options);
    
    // Mark as completed
    await this.analysisStepRepository.updateStepProgress(stepId, 100, 'Analysis completed');
    
    return result;
  } catch (error) {
    // Mark as failed
    await this.analysisStepRepository.markStepFailed(stepId, error.message);
    throw error;
  }
}

async executeAnalysisWithProgress(analysisType, projectId, stepId, options) {
  // Update progress to 25%
  await this.analysisStepRepository.updateStepProgress(stepId, 25, 'Loading project data');
  
  // ... existing analysis logic ...
  
  // Update progress to 50%
  await this.analysisStepRepository.updateStepProgress(stepId, 50, 'Processing analysis');
  
  // ... more analysis logic ...
  
  // Update progress to 75%
  await this.analysisStepRepository.updateStepProgress(stepId, 75, 'Generating results');
  
  // ... final analysis logic ...
  
  return result;
}
```

### Step 5: Add WebSocket Event Handlers

#### Update: `backend/presentation/websocket/AnalysisWebSocketHandler.js`
```javascript
// Add to existing WebSocket handler:

handleAnalysisStepEvents() {
  this.eventBus.on('analysis-step:created', (data) => {
    this.broadcastToProject(data.projectId, 'analysis-step:created', data);
  });

  this.eventBus.on('analysis-step:progress', (data) => {
    this.broadcastToProject(data.projectId, 'analysis-step:progress', data);
  });

  this.eventBus.on('analysis-step:failed', (data) => {
    this.broadcastToProject(data.projectId, 'analysis-step:failed', data);
  });
}

broadcastToProject(projectId, event, data) {
  const projectRooms = this.getProjectRooms(projectId);
  projectRooms.forEach(room => {
    this.io.to(room).emit(event, data);
  });
}
```

## Validation Checklist

### Backend Validation
- [ ] AnalysisStep entity created with proper structure
- [ ] AnalysisStepRepository implements all CRUD operations
- [ ] Database migration creates analysis_steps table
- [ ] AnalysisService integrates step tracking
- [ ] WebSocket events are emitted correctly

### Database Validation
- [ ] analysis_steps table exists with correct schema
- [ ] Indexes are created for performance
- [ ] Data can be inserted and retrieved
- [ ] Progress updates work correctly

### Event System Validation
- [ ] Step creation events are emitted
- [ ] Progress update events are emitted
- [ ] Failure events are emitted
- [ ] WebSocket broadcasts work correctly

## Risk Mitigation

### High Risk: Database Schema Issues
- **Mitigation**: Test migration thoroughly in development
- **Rollback**: Keep backup of existing data
- **Validation**: Verify schema before deployment

### Medium Risk: Event System Complexity
- **Mitigation**: Use existing event bus patterns
- **Testing**: Test all event flows
- **Documentation**: Document event structure

### Low Risk: Performance Impact
- **Mitigation**: Use efficient database queries
- **Monitoring**: Monitor database performance
- **Optimization**: Add indexes as needed

## Success Metrics

### Technical Metrics
- [ ] 100% step tracking functionality working
- [ ] All database operations successful
- [ ] All WebSocket events emitted correctly
- [ ] No memory leaks from step tracking

### Performance Metrics
- [ ] Step creation < 50ms
- [ ] Progress updates < 100ms
- [ ] Database queries < 200ms
- [ ] WebSocket broadcasts < 50ms

### Quality Metrics
- [ ] All tests passing
- [ ] No console errors
- [ ] Proper error handling
- [ ] Clean code structure

## Next Phase Dependencies
This phase must be completed before Phase 3 can begin. Phase 3 will update the frontend to use the new step tracking system.

---

**Status**: ✅ PLANNED - Ready for implementation  
**Next Action**: Implement individual step tracking system  
**Estimated Completion**: 3 hours  
**Risk Level**: Medium - Database changes and event system complexity 