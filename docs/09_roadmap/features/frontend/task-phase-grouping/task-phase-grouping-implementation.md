# Task Phase Grouping Implementation - REVISED PLAN (NEW REQUIREMENT)

## 1. Project Overview
- **Feature/Component Name**: Task Phase Grouping
- **Priority**: High
- **Category**: frontend
- **Estimated Time**: 8 hours
- **Dependencies**: Existing task management system, API infrastructure
- **Related Issues**: Tasks are currently displayed as a flat list instead of grouped by phases
- **Current Status**: ❌ **NOT IMPLEMENTED** - Documentation only

## 2. Technical Requirements
- **Tech Stack**: React, JavaScript, CSS, REST API
- **Architecture Pattern**: Component-based architecture with service layer
- **Database Changes**: None (uses existing task.phase field)
- **API Changes**: New endpoints for grouped task retrieval and phase execution
- **Frontend Changes**: Task list is grouped by phase, no separate panels
- **Backend Changes**: New service methods for phase grouping and execution

## 3. File Impact Analysis - REVISED

#### Files to Modify:
- [ ] `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx` - Group task list by phase, remove any separate phase panel, adapt modal logic
- [ ] `frontend/src/presentation/components/PhaseAccordionSection.jsx` (formerly PhaseGroupComponent) - Section for a phase in the task list
- [ ] `frontend/src/presentation/components/PhaseModal.jsx` (NEW or adapt) - Modal displaying all phases and their tasks, with buttons for single-phase and all-phases execution
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Methods for single-phase and multi-phase execution
- [ ] `frontend/src/css/components/PhaseAccordionSection.css` and modal styles as needed

#### Files to Create:
- [ ] `frontend/src/presentation/components/PhaseModal.jsx` (if not already present)

#### Files to Delete:
- [ ] None

## 4. Implementation Phases - REVISED

#### Phase 1: Backend API Extension (as before)
- See previous description

#### Phase 2: Frontend API Integration (as before)
- See previous description

#### Phase 3: Frontend Component Development (REVISED)
- [ ] Group task list by phase in `TasksPanelComponent`, no separate panels
- [ ] `PhaseAccordionSection.jsx`: Section for a phase, expandable, opens modal
- [ ] `PhaseModal.jsx`: Displays all phases and tasks, buttons for single-phase and all-phases execution
- [ ] UI/UX: No duplicate or separate blocks, everything as a single list

#### Phase 4: Integration and Testing (as before)
- See previous description

## 5. UI/UX CORRECTION
- **NO separate phase panel!**
- Task list is grouped by phase, all in a single list
- Modal displays all phases, allows single-phase and all-phases execution
- Loading and error states are handled cleanly

## 6. Success Criteria (updated)
- [ ] Task list displays tasks grouped by phase, no separate panels
- [ ] Modal allows single-phase and all-phases execution
- [ ] Loading and error states are handled correctly
- [ ] No duplicate or separate blocks for phases

## 7. Notes
- The API/backend logic remains as described, as long as it supports grouped tasks and phase execution.
- The UI must be designed so that everything appears as a single, unified list and the modal handles phase execution control.

---

**This plan replaces the previous structure with a separate phase panel with a unified, phase-grouped task list and a modal for phase execution control.** 