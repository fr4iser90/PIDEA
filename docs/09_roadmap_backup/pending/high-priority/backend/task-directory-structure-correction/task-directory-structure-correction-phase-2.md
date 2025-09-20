# Task Directory Structure Standardisierung – Phase 2: Analysis Steps Standardisierung

## Overview
Fix all analysis steps to use the standardized directory structure instead of creating flat structures. This includes Performance, Architecture, and Security analysis steps.

## Objectives
- [ ] Fix Performance Analysis Steps (4 files)
  - [ ] CpuAnalysisStep.js - Fix createDocumentation()
  - [ ] MemoryAnalysisStep.js - Fix createDocumentation()
  - [ ] DatabaseAnalysisStep.js - Fix createDocumentation()
  - [ ] NetworkAnalysisStep.js - Fix createDocumentation()
- [ ] Fix Architecture Analysis Steps (4 files)
  - [ ] StructureAnalysisStep.js - Fix createDocumentation()
  - [ ] LayerAnalysisStep.js - Fix createDocumentation()
  - [ ] CouplingAnalysisStep.js - Fix createDocumentation()
  - [ ] PatternAnalysisStep.js - Fix createDocumentation()
- [ ] Fix Security Analysis Steps (6 files)
  - [ ] TrivySecurityStep.js - Fix createDocumentation()
  - [ ] ZapSecurityStep.js - Fix createDocumentation()
  - [ ] SecretScanningStep.js - Fix createDocumentation()
  - [ ] SemgrepSecurityStep.js - Fix createDocumentation()
  - [ ] ComplianceSecurityStep.js - Fix createDocumentation()
  - [ ] SnykSecurityStep.js - Fix createDocumentation()
- [ ] Test analysis step directory creation

## Deliverables
- File: `backend/domain/steps/categories/analysis/performance/CpuAnalysisStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/performance/MemoryAnalysisStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/performance/DatabaseAnalysisStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/performance/NetworkAnalysisStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/architecture/StructureAnalysisStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/architecture/LayerAnalysisStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/architecture/CouplingAnalysisStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/architecture/PatternAnalysisStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/security/TrivySecurityStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/security/ZapSecurityStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/security/SecretScanningStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/security/SemgrepSecurityStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/security/ComplianceSecurityStep.js` - Fixed createDocumentation()
- File: `backend/domain/steps/categories/analysis/security/SnykSecurityStep.js` - Fixed createDocumentation()

## Dependencies
- Requires: Phase 1 completion
- Blocks: Phase 3 start

## Estimated Time
3 hours

## Success Criteria
- [ ] All 14 analysis steps use TaskFileOrganizationStep.createDirectoryStructure()
- [ ] No flat structures created in analysis steps
- [ ] All analysis steps create proper `implementation/phases/documentation/assets/` structure
- [ ] Analysis step tests pass
- [ ] No build errors introduced
