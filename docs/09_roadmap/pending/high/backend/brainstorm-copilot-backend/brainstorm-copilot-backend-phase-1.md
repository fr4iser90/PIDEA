# Brainstorm Copilot Backend Services – Phase 1: Database & Entity Setup

## Overview
Set up the database schema and entity modifications to support brainstorm sessions. This phase establishes the data foundation for the brainstorm copilot feature.

## Objectives
- [ ] Update ChatSession entity to support brainstorm sessions (utilize existing session_type field)
- [ ] Add brainstorm session validation following existing entity patterns
- [ ] Test session creation and validation

## Deliverables
- Modified: `backend/domain/entities/ChatSession.js` - Add brainstorm session support (utilize existing session_type)
- File: Brainstorm session validation tests following existing entity patterns

## Dependencies
- Requires: Existing database schema and ChatSession entity
- Blocks: Phase 2 (Core Services Implementation)

## Estimated Time
1 hour

## Success Criteria
- [ ] Database schemas support brainstorm session type
- [ ] ChatSession entity handles brainstorm sessions
- [ ] Migration scripts work for both SQLite and PostgreSQL
- [ ] Session validation prevents invalid brainstorm sessions
