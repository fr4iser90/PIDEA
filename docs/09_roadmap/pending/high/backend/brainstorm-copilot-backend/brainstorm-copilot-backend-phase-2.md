# Brainstorm Copilot Backend Services – Phase 2: Core Services Implementation

## Overview
Implement the core services for markdown file reading, context summarization, and project analysis. This phase creates the business logic for the brainstorm copilot functionality.

## Objectives
- [ ] Implement MemoryReaderService.js (follows existing service patterns)
- [ ] Implement ContextSummarizerService.js (integrates with existing AI services)
- [ ] Implement ProjectContextService.js (uses existing project analysis patterns)
- [ ] Implement ChatHistoryService.js (follows existing chat service patterns)
- [ ] Add markdown file scanning using existing FileSystemService
- [ ] Implement context generation logic

## Deliverables
- File: `backend/domain/services/brainstorm/MemoryReaderService.js` - Read markdown files (follows existing service patterns)
- File: `backend/domain/services/brainstorm/ContextSummarizerService.js` - Generate project summaries
- File: `backend/domain/services/brainstorm/ProjectContextService.js` - Project context analysis
- File: `backend/domain/services/brainstorm/ChatHistoryService.js` - Chat history analysis
- File: `content-library/prompts/brainstorm/brainstorm-copilot-prompt.md` - AI prompt template

## Dependencies
- Requires: Phase 1 completion (Database & Entity Setup)
- Blocks: Phase 3 (Workflow & API Integration)

## Estimated Time
2 hours

## Success Criteria
- [ ] All services can read and process markdown files
- [ ] Context summarization generates accurate project summaries
- [ ] Project context analysis works correctly
- [ ] Chat history analysis provides relevant insights
- [ ] AI prompt template produces quality responses
