# StepRegistry Sequential Execution Bottleneck - Master Index

## 📋 Task Overview
- **Name**: StepRegistry Parallel Execution Optimization
- **Category**: performance
- **Priority**: High
- **Status**: Planning
- **Total Estimated Time**: 8 hours
- **Created**: 2025-07-26
- **Last Updated**: 2025-07-26

## 📁 File Structure
```
docs/09_roadmap/tasks/performance/step-registry-sequential-bottleneck/
├── step-registry-sequential-bottleneck-index.md (this file)
├── step-registry-sequential-bottleneck-implementation.md
├── step-registry-sequential-bottleneck-phase-1.md
├── step-registry-sequential-bottleneck-phase-2.md
├── step-registry-sequential-bottleneck-phase-3.md
└── step-registry-sequential-bottleneck-phase-4.md
```

## 🎯 Main Implementation
- **[StepRegistry Parallel Execution Implementation](./step-registry-sequential-bottleneck-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./step-registry-sequential-bottleneck-phase-1.md) | Planning | 2h | 0% |
| 2 | [Phase 2](./step-registry-sequential-bottleneck-phase-2.md) | Planning | 3h | 0% |
| 3 | [Phase 3](./step-registry-sequential-bottleneck-phase-3.md) | Planning | 2h | 0% |
| 4 | [Phase 4](./step-registry-sequential-bottleneck-phase-4.md) | Planning | 1h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] [Root Cause Analysis](./step-registry-sequential-bottleneck-phase-1.md) - Planning - 0%
- [ ] [Core Implementation](./step-registry-sequential-bottleneck-phase-2.md) - Planning - 0%
- [ ] [Integration & Testing](./step-registry-sequential-bottleneck-phase-3.md) - Planning - 0%
- [ ] [Validation & Documentation](./step-registry-sequential-bottleneck-phase-4.md) - Planning - 0%

### Completed Subtasks
- [x] [Problem Analysis](./step-registry-sequential-bottleneck-implementation.md) - ✅ Done

### Pending Subtasks
- [ ] [Performance Testing](./step-registry-sequential-bottleneck-phase-3.md) - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: 5% Complete
- **Current Phase**: Phase 1 (Root Cause Analysis)
- **Next Milestone**: Architecture Design
- **Estimated Completion**: 2025-07-27

## 🔗 Related Tasks
- **Dependencies**: None
- **Dependents**: View switching performance improvements
- **Related**: Backend performance optimization, API response time improvements

## 📝 Notes & Updates
### 2025-07-26 - Problem Analysis
- Identified StepRegistry sequential execution bottleneck
- Root cause: All steps (including API calls) run sequentially
- Performance impact: 753ms vs <200ms expected
- Solution: Parallel execution for non-critical steps

### 2025-07-26 - Architecture Design
- Designed step classification system
- Planned parallel execution engine
- Identified critical vs non-critical steps
- Created implementation phases

## 🚀 Quick Actions
- [View Implementation Plan](./step-registry-sequential-bottleneck-implementation.md)
- [Start Phase 1](./step-registry-sequential-bottleneck-phase-1.md)
- [Review Progress](#progress-tracking)
- [Update Status](#notes--updates)

## 🎯 Problem Summary

### **Current Issue:**
When switching between views in the frontend, the backend becomes slow and unresponsive due to sequential execution of all API calls through the StepRegistry.

### **Root Cause:**
The StepRegistry executes ALL steps sequentially, including:
- `GetChatHistoryStep` (117ms)
- `GitGetStatusStep` (19ms)  
- `GitGetCurrentBranchStep` (9ms)

**Total: 145ms instead of ~20ms (parallel)**

### **Solution:**
Implement parallel execution for non-critical steps while maintaining sequential execution for workflow steps.

### **Expected Improvement:**
- **Before**: 753ms (sequential)
- **After**: <200ms (parallel)
- **Improvement**: 73% faster view switching 