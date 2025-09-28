# Analysis Toolbase Gap Implementation – Phase 2: Medium Priority Analyzers

## Overview
Implement four medium priority analyzers: Legacy Code Analyzer, Code Duplication Analyzer, Accessibility Analyzer, and Static Asset Analyzer. These analyzers focus on code quality, maintainability, and user experience optimization.

## Objectives
- [ ] Legacy Code Analyzer implementation
- [ ] Code Duplication Analyzer implementation
- [ ] Accessibility Analyzer implementation
- [ ] Static Asset Analyzer implementation
- [ ] Enhanced reporting and metrics
- [ ] Integration with existing analysis framework
- [ ] Extend frontend dashboard with new analyzers

## Deliverables
- File: `backend/domain/steps/categories/analysis/legacy_code_analysis_step.js` - Legacy code pattern detection
- File: `backend/domain/steps/categories/analysis/code_duplication_analysis_step.js` - Code duplication detection
- File: `backend/domain/steps/categories/analysis/accessibility_analysis_step.js` - Accessibility compliance checking
- File: `backend/domain/steps/categories/analysis/static_asset_analysis_step.js` - Static asset optimization analysis
- File: `backend/infrastructure/external/AnalysisOrchestrator.js` - Extended orchestrator with new analyzers
- File: `backend/presentation/api/AnalysisController.js` - New API endpoints for analyzers
- File: `frontend/src/presentation/components/analysis/LegacyCodeViewer.jsx` - Legacy code UI component
- File: `frontend/src/presentation/components/analysis/CodeDuplicationViewer.jsx` - Code duplication UI component
- File: `frontend/src/presentation/components/analysis/AccessibilityViewer.jsx` - Accessibility UI component
- File: `frontend/src/presentation/components/analysis/StaticAssetViewer.jsx` - Static asset UI component
- Test: `tests/unit/steps/analysis/LegacyCodeAnalysisStep.test.js` - Legacy code analysis tests
- Test: `tests/unit/steps/analysis/CodeDuplicationAnalysisStep.test.js` - Code duplication analysis tests
- Test: `tests/unit/steps/analysis/AccessibilityAnalysisStep.test.js` - Accessibility analysis tests
- Test: `tests/unit/steps/analysis/StaticAssetAnalysisStep.test.js` - Static asset analysis tests

## Dependencies
- Requires: Phase 1 completion (Database, API, Configuration analyzers)
- Blocks: Phase 3 start

## Estimated Time
30 hours

## Technical Implementation

### 1. Legacy Code Analyzer
**Purpose**: Identify and analyze legacy code patterns
**Key Features**:
- Deprecated API detection
- Technical debt quantification
- Modernization path suggestions
- Legacy pattern identification
- Migration effort estimation

**Implementation**:
```javascript
// backend/domain/steps/categories/analysis/legacy_code_analysis_step.js
class LegacyCodeAnalysisStep extends BaseAnalysisStep {
  async execute(context) {
    const { projectPath } = context;
    
    // Scan for deprecated APIs and patterns
    const deprecatedAPIs = await this.scanDeprecatedAPIs(projectPath);
    const legacyPatterns = await this.identifyLegacyPatterns(projectPath);
    
    // Quantify technical debt
    const technicalDebt = await this.quantifyTechnicalDebt(deprecatedAPIs, legacyPatterns);
    
    // Generate modernization paths
    const modernizationPaths = await this.generateModernizationPaths(technicalDebt);
    
    return {
      success: true,
      data: {
        deprecatedAPIs,
        legacyPatterns,
        technicalDebt,
        modernizationPaths,
        recommendations: this.generateRecommendations(technicalDebt, modernizationPaths)
      }
    };
  }
}
```

### 2. Code Duplication Analyzer
**Purpose**: Detect and analyze code duplication
**Key Features**:
- Duplicate code detection
- Similarity analysis
- Refactoring opportunities identification
- Duplication metrics calculation
- Clone cluster analysis

**Implementation**:
```javascript
// backend/domain/steps/categories/analysis/code_duplication_analysis_step.js
class CodeDuplicationAnalysisStep extends BaseAnalysisStep {
  async execute(context) {
    const { projectPath } = context;
    
    // Detect code duplicates
    const duplicates = await this.detectDuplicates(projectPath);
    const similarityAnalysis = await this.analyzeSimilarity(duplicates);
    
    // Identify refactoring opportunities
    const refactoringOpportunities = await this.identifyRefactoringOpportunities(duplicates);
    
    // Calculate duplication metrics
    const duplicationMetrics = await this.calculateDuplicationMetrics(duplicates);
    
    return {
      success: true,
      data: {
        duplicates,
        similarityAnalysis,
        refactoringOpportunities,
        duplicationMetrics,
        recommendations: this.generateRecommendations(duplicationMetrics, refactoringOpportunities)
      }
    };
  }
}
```

### 3. Accessibility Analyzer
**Purpose**: Analyze application accessibility compliance
**Key Features**:
- WCAG compliance checking
- ARIA attribute analysis
- Contrast ratio validation
- Keyboard navigation testing
- Screen reader compatibility

**Implementation**:
```javascript
// backend/domain/steps/categories/analysis/accessibility_analysis_step.js
class AccessibilityAnalysisStep extends BaseAnalysisStep {
  async execute(context) {
    const { projectPath } = context;
    
    // Analyze WCAG compliance
    const wcagCompliance = await this.analyzeWCAGCompliance(projectPath);
    const ariaAnalysis = await this.analyzeARIA(projectPath);
    
    // Check contrast ratios
    const contrastAnalysis = await this.analyzeContrast(projectPath);
    
    // Test keyboard navigation
    const keyboardNavigation = await this.testKeyboardNavigation(projectPath);
    
    return {
      success: true,
      data: {
        wcagCompliance,
        ariaAnalysis,
        contrastAnalysis,
        keyboardNavigation,
        recommendations: this.generateRecommendations(wcagCompliance, ariaAnalysis, contrastAnalysis)
      }
    };
  }
}
```

### 4. Static Asset Analyzer
**Purpose**: Analyze static assets and their optimization
**Key Features**:
- Image optimization analysis
- Asset compression evaluation
- CDN usage analysis
- Bundle size optimization
- Asset loading performance

**Implementation**:
```javascript
// backend/domain/steps/categories/analysis/static_asset_analysis_step.js
class StaticAssetAnalysisStep extends BaseAnalysisStep {
  async execute(context) {
    const { projectPath } = context;
    
    // Analyze images
    const imageAnalysis = await this.analyzeImages(projectPath);
    const compressionAnalysis = await this.analyzeCompression(projectPath);
    
    // Analyze CDN usage
    const cdnAnalysis = await this.analyzeCDNUsage(projectPath);
    
    // Analyze bundle optimization
    const bundleAnalysis = await this.analyzeBundleOptimization(projectPath);
    
    return {
      success: true,
      data: {
        imageAnalysis,
        compressionAnalysis,
        cdnAnalysis,
        bundleAnalysis,
        recommendations: this.generateRecommendations(imageAnalysis, compressionAnalysis, cdnAnalysis)
      }
    };
  }
}
```

### 5. AnalysisOrchestrator Extension
**Update AnalysisOrchestrator to support new analyzers**:
```javascript
// backend/infrastructure/external/AnalysisOrchestrator.js
// Add to stepMapping object:
const stepMapping = {
  // ... existing mappings from Phase 1
  'legacy-code': 'LegacyCodeAnalysisStep',
  'code-duplication': 'CodeDuplicationAnalysisStep',
  'accessibility': 'AccessibilityAnalysisStep',
  'static-asset': 'StaticAssetAnalysisStep'
};
```

### 6. API Endpoints
**Add new endpoints to AnalysisController**:
```javascript
// backend/presentation/api/AnalysisController.js
async getLegacyCodeAnalysis(req, res) {
  // Implementation for legacy code analysis endpoint
}

async getCodeDuplicationAnalysis(req, res) {
  // Implementation for code duplication analysis endpoint
}

async getAccessibilityAnalysis(req, res) {
  // Implementation for accessibility analysis endpoint
}

async getStaticAssetAnalysis(req, res) {
  // Implementation for static asset analysis endpoint
}
```

### 7. Frontend Components
**Create UI components for new analyzers**:
```javascript
// frontend/src/presentation/components/analysis/LegacyCodeViewer.jsx
// frontend/src/presentation/components/analysis/CodeDuplicationViewer.jsx
// frontend/src/presentation/components/analysis/AccessibilityViewer.jsx
// frontend/src/presentation/components/analysis/StaticAssetViewer.jsx
```

## Success Criteria
- [ ] All four analyzers implemented and functional
- [ ] AnalysisOrchestrator extended to support new analyzers
- [ ] API endpoints working and tested
- [ ] Frontend components integrated
- [ ] Unit tests passing with 90%+ coverage
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Performance requirements met (< 30 seconds per analyzer)
- [ ] Enhanced reporting and metrics implemented

## Risk Mitigation
- **Legacy Code Detection Accuracy**: Use established libraries, extensive testing
- **Code Duplication Performance**: Implement efficient algorithms, optimize for large codebases
- **Accessibility Analysis Complexity**: Start with basic WCAG checks, expand gradually
- **Static Asset Analysis Scope**: Focus on common optimization patterns first

## Dependencies
- Phase 1 completion (Database, API, Configuration analyzers)
- File system utilities for code scanning
- Image processing libraries for asset analysis
- Accessibility testing libraries
- Code analysis libraries for duplication detection 