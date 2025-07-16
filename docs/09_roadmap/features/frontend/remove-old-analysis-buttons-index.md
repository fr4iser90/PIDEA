# Remove Old Analysis Buttons & Integrate Individual Analysis Buttons - Master Index

## 📋 Task Overview
- **Name**: Remove Old Analysis Buttons & Integrate Individual Analysis Buttons with "Run All" Option
- **Category**: frontend
- **Priority**: High
- **Status**: Planning Complete - Ready for Implementation
- **Total Estimated Time**: 2.5 hours
- **Created**: 2024-12-19
- **Last Updated**: 2024-12-19

## 📁 File Structure
```
docs/09_roadmap/features/frontend/remove-old-analysis-buttons/
├── remove-old-analysis-buttons-index.md (this file)
└── remove-old-analysis-buttons-implementation.md
```

## 🎯 Main Implementation
- **[Remove Old Analysis Buttons Implementation](./remove-old-analysis-buttons-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | Remove Old Analysis Buttons | ⏳ Ready | 0.5h | 0% |
| 2 | Integrate Individual Analysis Buttons with "Run All" | ⏳ Ready | 1.5h | 0% |
| 3 | Style Updates & Testing | ⏳ Ready | 0.5h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] Remove "Jetzt analysieren" button (line 447) - ⏳ Ready - 0%
- [ ] Remove "Start Analysis" button (lines 147-161) - ⏳ Ready - 0%
- [ ] Import IndividualAnalysisButtons component - ⏳ Ready - 0%
- [ ] Add IndividualAnalysisButtons to header - ⏳ Ready - 0%
- [ ] Add "Run All Analysis" button with bulk execution - ⏳ Ready - 0%
- [ ] Create individual-analysis-buttons.css file - ⏳ Ready - 0%
- [ ] Update analysis-data-viewer.css layout - ⏳ Ready - 0%

### Completed Subtasks
- [x] Create implementation plan - ✅ Done
- [x] Codebase analysis completed - ✅ Done
- [x] Identify exact file locations and line numbers - ✅ Done

### Pending Subtasks
- [ ] Execute Phase 1 - Remove Old Buttons - ⏳ Waiting
- [ ] Execute Phase 2 - Integrate New Buttons - ⏳ Waiting
- [ ] Execute Phase 3 - Style Updates - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: 15% Complete (planning and analysis done)
- **Current Phase**: Ready to start Phase 1
- **Next Milestone**: Remove old analysis buttons
- **Estimated Completion**: 2024-12-19

## 🔗 Related Tasks
- **Dependencies**: Individual Analysis Loading System (already completed)
- **Dependents**: None
- **Related**: Analysis UI improvements, UX optimization

## 📝 Notes & Updates
### 2024-12-19 - Codebase Analysis Complete
- ✅ Identified exact locations of old buttons:
  - "Jetzt analysieren" button: AnalysisDataViewer.jsx line 447
  - "Start Analysis" button: AnalysisStatus.jsx lines 147-161
- ✅ Confirmed IndividualAnalysisButtons component exists and is functional
- ✅ Verified individual-analysis-buttons.css file is missing (needs creation)
- ✅ Updated implementation plan with specific line numbers and file paths
- ✅ Ready for execution

### 2024-12-19 - Planning Complete
- ✅ Created comprehensive implementation plan
- ✅ Identified all files to modify
- ✅ Defined clear phases and success criteria
- ✅ Ready for execution

## 🚀 Quick Actions
- [View Implementation Plan](./remove-old-analysis-buttons-implementation.md)
- [Start Phase 1 - Remove Old Buttons](#phase-breakdown)
- [Review Progress](#progress-tracking)
- [Update Status](#notes--updates)

## 🎯 Current Focus
**Priority**: Remove redundant analysis buttons to improve UX

**Next Steps**:
1. **Phase 1**: Remove old buttons
   - Remove "Jetzt analysieren" button from AnalysisDataViewer.jsx line 447
   - Remove "Start Analysis" button from AnalysisStatus.jsx lines 147-161
   - Deprecate handleStartAnalysis function (lines 378-405)

2. **Phase 2**: Integrate new buttons
   - Import IndividualAnalysisButtons component
   - Add to analysis header (replace old buttons)
   - Add "Run All Analysis" button with bulk execution
   - Implement bulk analysis progress tracking

3. **Phase 3**: Style updates
   - Create individual-analysis-buttons.css file
   - Update analysis-data-viewer.css for new layout
   - Test responsive design

**Success Goal**: Clean, intuitive analysis interface with individual analysis buttons + bulk "Run All" option

## 🔍 Codebase Status
- **IndividualAnalysisButtons Component**: ✅ Exists and functional
- **APIChatRepository Methods**: ✅ Available for integration
- **Old Buttons**: ✅ Identified for removal
- **CSS File**: ❌ Missing (needs creation)
- **Layout**: ✅ Ready for modification 