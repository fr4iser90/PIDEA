# Comprehensive Analysis Optimization – Phase 1: Analysis Queue System

## Overview
Implement a robust queue system for managing analysis jobs with prioritization, cancellation, and monitoring capabilities. This phase focuses on creating the foundation for handling multiple concurrent analyses without OOM crashes.

## Objectives
- [ ] Create AnalysisQueueService with Redis/In-Memory backend
- [ ] Implement analysis job queuing and prioritization
- [ ] Add analysis cancellation and pause/resume functionality
- [ ] Create queue monitoring and management endpoints
- [ ] Integrate queue system with existing analysis controllers

## Deliverables
- File: `backend/domain/services/AnalysisQueueService.js` - Core queue management service
- File: `backend/infrastructure/queue/AnalysisQueue.js` - Queue implementation with Redis/In-Memory support
- File: `backend/domain/services/AnalysisProgressTracker.js` - Progress tracking for queued jobs
- API: `/api/projects/:projectId/analysis/queue/status` - Queue status endpoint
- API: `/api/projects/:projectId/analysis/queue/jobs` - Queue jobs management
- API: `/api/projects/:projectId/analysis/queue/clear` - Queue clearing endpoint
- API: `/api/projects/:projectId/analysis/queue/priority` - Priority management
- Test: `tests/unit/AnalysisQueueService.test.js` - Unit tests for queue functionality

## Dependencies
- Requires: Existing analysis services (TaskAnalysisService, AdvancedAnalysisService)
- Blocks: Phase 2 start (Progressive Analysis Implementation)

## Estimated Time
4 hours

## Technical Implementation

### AnalysisQueueService Features
- Job prioritization (high, medium, low)
- Concurrent job limits (configurable)
- Job timeout management
- Memory usage monitoring
- Job cancellation and pause/resume
- Queue persistence (Redis or in-memory)

### Queue Management Endpoints
```javascript
// Queue status
GET /api/projects/:projectId/analysis/queue/status
Response: { active: 2, queued: 5, completed: 10, failed: 1 }

// Queue jobs
GET /api/projects/:projectId/analysis/queue/jobs
Response: { jobs: [{ id, type, status, priority, progress }] }

// Clear queue
POST /api/projects/:projectId/analysis/queue/clear
Response: { cleared: 5, message: "Queue cleared successfully" }

// Set priority
PUT /api/projects/:projectId/analysis/queue/priority
Body: { jobId, priority: "high"|"medium"|"low" }
```

### Integration Points
- Modify existing AnalysisController to use queue
- Add queue status to analysis endpoints
- Integrate with existing memory monitoring
- Connect to existing event system

## Success Criteria
- [ ] All objectives completed
- [ ] All deliverables created
- [ ] Queue system handles 50+ concurrent jobs
- [ ] Job cancellation works reliably
- [ ] Memory usage stays under limits
- [ ] Tests passing with >90% coverage
- [ ] Documentation updated 