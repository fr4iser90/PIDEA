# Refactor Structure Analysis – Phase 2: Split Security Analysis

## Overview
**Status:** Pending ⏳  
**Duration:** 4 hours  
**Priority:** High

This phase focuses on splitting the monolithic `security_analysis_step.js` into specialized security analysis components. Each component will handle a specific security analysis tool or concern, following the single responsibility principle.

## Objectives
- [ ] Extract Trivy security analysis logic into TrivySecurityStep.js
- [ ] Extract Snyk security analysis logic into SnykSecurityStep.js
- [ ] Extract Semgrep security analysis logic into SemgrepSecurityStep.js
- [ ] Extract ZAP security analysis logic into ZapSecurityStep.js
- [ ] Extract secret scanning logic into SecretScanningStep.js
- [ ] Extract compliance analysis logic into ComplianceSecurityStep.js
- [ ] Update security category index.js with all exports
- [ ] Create SecurityAnalysisService.js orchestrator
- [ ] Update all import references

## Deliverables
- File: `backend/domain/steps/categories/analysis/security/TrivySecurityStep.js` - Trivy vulnerability scanning
- File: `backend/domain/steps/categories/analysis/security/SnykSecurityStep.js` - Snyk dependency scanning
- File: `backend/domain/steps/categories/analysis/security/SemgrepSecurityStep.js` - Semgrep static analysis
- File: `backend/domain/steps/categories/analysis/security/ZapSecurityStep.js` - OWASP ZAP web scanning
- File: `backend/domain/steps/categories/analysis/security/SecretScanningStep.js` - Secret detection
- File: `backend/domain/steps/categories/analysis/security/ComplianceSecurityStep.js` - Compliance checking
- File: `backend/domain/steps/categories/analysis/security/index.js` - Updated with all security step exports
- File: `backend/application/services/categories/analysis/security/SecurityAnalysisService.js` - Security orchestration service
- File: `backend/application/services/categories/analysis/security/index.js` - Security services export
- File: `backend/infrastructure/external/categories/analysis/security/TrivyService.js` - Trivy API integration
- File: `backend/infrastructure/external/categories/analysis/security/SnykService.js` - Snyk API integration
- File: `backend/infrastructure/external/categories/analysis/security/SemgrepService.js` - Semgrep API integration
- File: `backend/infrastructure/external/categories/analysis/security/ZapService.js` - ZAP API integration
- File: `backend/infrastructure/external/categories/analysis/security/SecretScanningService.js` - Secret scanning API
- File: `backend/infrastructure/external/categories/analysis/security/ComplianceService.js` - Compliance API
- File: `backend/infrastructure/external/categories/analysis/security/index.js` - Security infrastructure export
- File: `backend/presentation/api/categories/analysis/security/SecurityAnalysisController.js` - Main security API
- File: `backend/presentation/api/categories/analysis/security/TrivyAnalysisController.js` - Trivy API endpoints
- File: `backend/presentation/api/categories/analysis/security/SnykAnalysisController.js` - Snyk API endpoints
- File: `backend/presentation/api/categories/analysis/security/SemgrepAnalysisController.js` - Semgrep API endpoints
- File: `backend/presentation/api/categories/analysis/security/ZapAnalysisController.js` - ZAP API endpoints
- File: `backend/presentation/api/categories/analysis/security/SecretScanningController.js` - Secret scanning API endpoints
- File: `backend/presentation/api/categories/analysis/security/ComplianceController.js` - Compliance API endpoints
- File: `backend/presentation/api/categories/analysis/security/index.js` - Security controllers export

## Dependencies
- Requires: Phase 1 completion (category structure)
- Blocks: Phase 3, 4 start

## Estimated Time
4 hours

## Detailed Tasks

### 2.1 Domain Layer Security Steps Extraction (1.5 hours)
- [ ] Analyze `security_analysis_step.js` (679 lines) for extraction points
- [ ] Extract Trivy vulnerability scanning logic into `TrivySecurityStep.js`
- [ ] Extract Snyk dependency scanning logic into `SnykSecurityStep.js`
- [ ] Extract Semgrep static analysis logic into `SemgrepSecurityStep.js`
- [ ] Extract ZAP web scanning logic into `ZapSecurityStep.js`
- [ ] Extract secret scanning logic into `SecretScanningStep.js`
- [ ] Extract compliance checking logic into `ComplianceSecurityStep.js`
- [ ] Update `backend/domain/steps/categories/analysis/security/index.js` with all exports

### 2.2 Application Layer Security Services Creation (1 hour)
- [ ] Create `SecurityAnalysisService.js` orchestrator service
- [ ] Implement orchestration logic for all security steps
- [ ] Create individual service files for each security tool
- [ ] Update `backend/application/services/categories/analysis/security/index.js`
- [ ] Update dependency injection configurations

### 2.3 Infrastructure Layer Security Services Creation (1 hour)
- [ ] Create `TrivyService.js` for Trivy API integration
- [ ] Create `SnykService.js` for Snyk API integration
- [ ] Create `SemgrepService.js` for Semgrep API integration
- [ ] Create `ZapService.js` for ZAP API integration
- [ ] Create `SecretScanningService.js` for secret scanning APIs
- [ ] Create `ComplianceService.js` for compliance APIs
- [ ] Update `backend/infrastructure/external/categories/analysis/security/index.js`

### 2.4 Presentation Layer Security Controllers Creation (0.5 hours)
- [ ] Create `SecurityAnalysisController.js` main security API
- [ ] Create individual controller files for each security tool
- [ ] Update `backend/presentation/api/categories/analysis/security/index.js`
- [ ] Update API routing configurations

## Implementation Details

### TrivySecurityStep.js Template
```javascript
/**
 * TrivySecurityStep - Domain Layer
 * Specialized step for Trivy vulnerability scanning
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');

class TrivySecurityStep {
  constructor() {
    this.name = 'TrivySecurityStep';
    this.description = 'Trivy vulnerability scanning';
    this.category = 'security';
  }

  async execute(context = {}) {
    // Extract Trivy-specific logic from security_analysis_step.js
    // Focus only on Trivy vulnerability scanning
  }

  async analyzeTrivyVulnerabilities(projectPath) {
    // Trivy-specific vulnerability analysis
  }
}

module.exports = TrivySecurityStep;
```

### SecurityAnalysisService.js Template
```javascript
/**
 * SecurityAnalysisService - Application Layer
 * Orchestrates all security analysis steps
 */

class SecurityAnalysisService {
  constructor({
    trivyStep,
    snykStep,
    semgrepStep,
    zapStep,
    secretScanningStep,
    complianceStep
  }) {
    this.trivyStep = trivyStep;
    this.snykStep = snykStep;
    this.semgrepStep = semgrepStep;
    this.zapStep = zapStep;
    this.secretScanningStep = secretScanningStep;
    this.complianceStep = complianceStep;
  }

  async executeSecurityAnalysis(projectId) {
    // Orchestrate all security steps
    const results = await Promise.all([
      this.trivyStep.execute({ projectId }),
      this.snykStep.execute({ projectId }),
      this.semgrepStep.execute({ projectId }),
      this.zapStep.execute({ projectId }),
      this.secretScanningStep.execute({ projectId }),
      this.complianceStep.execute({ projectId })
    ]);

    return this.combineResults(results);
  }
}

module.exports = SecurityAnalysisService;
```

### Security Analysis Logic Extraction Points
From `security_analysis_step.js` (679 lines):
- **Lines 199-262**: `analyzeDependencies()` → SnykSecurityStep.js
- **Lines 263-289**: `analyzeCodeSecurity()` → SemgrepSecurityStep.js
- **Lines 290-328**: `analyzeConfiguration()` → ComplianceSecurityStep.js
- **Lines 329-369**: `analyzeEnvironment()` → SecretScanningStep.js
- **Lines 370-417**: `detectSecurityIssues()` → TrivySecurityStep.js
- **Lines 418-470**: `analyzeConfigFile()` → ComplianceSecurityStep.js
- **Lines 471-501**: `analyzeEnvFile()` → SecretScanningStep.js
- **Lines 502-529**: `detectHardcodedSecrets()` → SecretScanningStep.js

## Success Criteria
- [ ] All security analysis logic extracted into specialized steps
- [ ] Each step follows single responsibility principle
- [ ] All imports and exports properly configured
- [ ] Security orchestration service working correctly
- [ ] No functionality lost during extraction
- [ ] All tests passing for security analysis
- [ ] API endpoints accessible and functional

## Risk Mitigation
- **Medium Risk**: Complex logic extraction from monolithic file
- **Mitigation**: Extract incrementally, test each step individually
- **Rollback**: Keep original file as backup until validation complete

## Validation Checklist
- [ ] All security steps execute independently
- [ ] Security orchestration service combines results correctly
- [ ] No circular dependencies introduced
- [ ] All security API endpoints respond correctly
- [ ] Performance maintained or improved
- [ ] Error handling preserved in all steps
- [ ] Logging and monitoring still functional

## Next Phase Preparation
- [ ] Document security step extraction patterns for reuse
- [ ] Prepare performance analysis extraction strategy
- [ ] Update workflow definitions to use new security steps
- [ ] Set up integration tests for security orchestration 