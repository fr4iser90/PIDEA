# Docs Tasks to Manual Tasks Refactor – Phase 1: Backend Service Refactoring

## Overview
Rename all backend services, handlers, and methods from "docs tasks" to "manual tasks" terminology. This phase focuses on the core backend infrastructure changes.

## Objectives
- [x] ✅ Rename DocsImportService to ManualTasksImportService
- [x] ✅ Rename DocsTasksHandler to ManualTasksHandler
- [x] ✅ Update all method names (syncDocsTasks → syncManualTasks, cleanDocsTasks → cleanManualTasks)
- [x] ✅ Update route handlers and comments
- [x] ✅ Update service registrations and dependencies
- [x] ✅ Remove all backward compatibility - only new manual task methods remain

## Deliverables
- [x] ✅ File: `backend/domain/services/task/ManualTasksImportService.js` - Renamed from DocsImportService
- [x] ✅ File: `backend/application/handlers/categories/workflow/ManualTasksHandler.js` - Renamed from DocsTasksHandler
- [x] ✅ Updated: `backend/application/services/TaskApplicationService.js` - Updated method names
- [x] ✅ Updated: `backend/presentation/api/TaskController.js` - Updated method names and routes
- [x] ✅ Updated: `backend/Application.js` - Updated route registration
- [x] ✅ Updated: `backend/infrastructure/dependency-injection/ServiceRegistry.js` - Updated service registrations
- [x] ✅ Updated: `backend/application/services/IDEApplicationService.js` - Updated handler reference

## Status: ✅ COMPLETED
**Completion Date**: Current session
**Time Spent**: ~2 hours
**Issues**: None
**Notes**: All backend refactoring completed successfully. No backward compatibility maintained as requested. 