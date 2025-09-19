# Analysis Steps Standardization – Phase 2: Ensure Individual Steps Return Standardized Format

## Overview
Ensure all individual analysis steps return only the standardized data structure. Convert steps that still return legacy fields to use only the standardized format (issues, recommendations, tasks, documentation).

## Objectives
- [ ] Convert TrivySecurityStep to return only standardized format
- [ ] Convert LintingCodeQualityStep to return only standardized format
- [ ] Convert all other security steps (ComplianceSecurityStep, SecretScanningStep, etc.)
- [ ] Convert all other code quality steps (ComplexityCodeQualityStep, CoverageCodeQualityStep, etc.)
- [ ] Convert all steps in other subdirectories (architecture, dependencies, manifest, tech-stack, performance)
- [ ] Ensure all steps return consistent structure (issues, recommendations, tasks, documentation)
- [ ] Remove step-specific data structures (vulnerabilities, lintingIssues, etc.)
- [ ] Add comprehensive tests for converted steps

## Deliverables
- File: `backend/domain/steps/categories/analysis/security/TrivySecurityStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/security/ComplianceSecurityStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/security/SecretScanningStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/security/SemgrepSecurityStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/security/SnykSecurityStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/security/ZapSecurityStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/code-quality/LintingCodeQualityStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/code-quality/ComplexityCodeQualityStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/code-quality/CoverageCodeQualityStep.js` - Updated step
- File: `backend/domain/steps/categories/analysis/code-quality/DocumentationCodeQualityStep.js` - Updated step
- All other steps in subdirectories updated
- Validation: All steps return standardized data structure only

## Dependencies
- Requires: Phase 1 (Orchestrator legacy field removal)
- Blocks: Phase 3 (Legacy code removal)

## Estimated Time
3 hours

## Success Criteria
- [ ] All individual steps return standardized data structure only
- [ ] No step-specific data structures (vulnerabilities, lintingIssues, etc.)
- [ ] Consistent error handling across all steps
- [ ] All tests pass with standardized format
- [ ] Performance maintained for each step
- [ ] Step-specific functionality preserved

## Implementation Details

### Current State Analysis
Individual steps currently return **mixed structures** with both legacy and standardized fields:

```javascript
// CURRENT STATE - LintingCodeQualityStep.js
return {
  success: true,
  lintingIssues: [...],      // ❌ Legacy field
  codeStyleIssues: [...],    // ❌ Legacy field
  bestPractices: [...],      // ❌ Legacy field
  recommendations: [...],    // ✅ Standardized field
  issues: [...],             // ✅ Standardized field
  tasks: [...],              // ✅ Standardized field
  documentation: [...]       // ✅ Standardized field
};
```

### Target State
```javascript
// TARGET STATE - LintingCodeQualityStep.js
return {
  success: true,
  result: {
    issues: [...],           // ✅ Only standardized fields
    recommendations: [...],  // ✅ Only standardized fields
    tasks: [...],            // ✅ Only standardized fields
    documentation: [...]     // ✅ Only standardized fields
  },
  metadata: {
    stepName: this.name,
    projectPath,
    timestamp: new Date()
  }
};
```

### Steps to Convert by Category

#### Security Steps
- **TrivySecurityStep.js** - Remove: vulnerabilities, bestPractices, metrics
- **ComplianceSecurityStep.js** - Remove: complianceIssues, violations, standards
- **SecretScanningStep.js** - Remove: secrets, credentials, tokens
- **SemgrepSecurityStep.js** - Remove: semgrepIssues, patterns, rules
- **SnykSecurityStep.js** - Remove: snykIssues, dependencies, licenses
- **ZapSecurityStep.js** - Remove: zapIssues, webVulnerabilities, scans

#### Code Quality Steps
- **LintingCodeQualityStep.js** - Remove: lintingIssues, codeStyleIssues, bestPractices
- **ComplexityCodeQualityStep.js** - Remove: complexityIssues, cyclomaticComplexity, cognitiveComplexity
- **CoverageCodeQualityStep.js** - Remove: coverageIssues, testCoverage, uncoveredLines
- **DocumentationCodeQualityStep.js** - Remove: documentationIssues, missingDocs, outdatedDocs

#### Other Categories
- **Architecture Steps** - Remove: architectureIssues, layerViolations, designIssues
- **Dependency Steps** - Remove: dependencyIssues, outdatedPackages, vulnerablePackages
- **Manifest Steps** - Remove: manifestIssues, packageJsonIssues, dockerfileIssues
- **Tech Stack Steps** - Remove: techStackIssues, frameworkIssues, libraryIssues
- **Performance Steps** - Remove: performanceIssues, memoryIssues, cpuIssues

### Key Changes Required
- Remove step-specific data structures from return objects
- Convert all data to standardized format (issues, recommendations, tasks, documentation)
- Update data generation methods to return standardized structure
- Ensure consistent error handling
- Maintain step-specific functionality while standardizing output
- Update logging to reflect standardized structure

### Data Conversion Rules
- **Vulnerabilities** → Issues with category: 'security', subcategory: 'vulnerability'
- **Linting Issues** → Issues with category: 'code-quality', subcategory: 'linting'
- **Complexity Issues** → Issues with category: 'code-quality', subcategory: 'complexity'
- **Coverage Issues** → Issues with category: 'code-quality', subcategory: 'coverage'
- **Documentation Issues** → Issues with category: 'code-quality', subcategory: 'documentation'
- **Architecture Issues** → Issues with category: 'architecture', subcategory: 'design'
- **Dependency Issues** → Issues with category: 'dependencies', subcategory: 'security'
- **Manifest Issues** → Issues with category: 'manifest', subcategory: 'configuration'
- **Tech Stack Issues** → Issues with category: 'tech-stack', subcategory: 'compatibility'

### Step Conversion Pattern
```javascript
// Example: TrivySecurityStep.js - RETURN ONLY STANDARDIZED FORMAT
async execute(context = {}) {
  try {
    // Execute analysis
    const security = await this.analyzeTrivySecurity(projectPath, context);
    
    // ✅ RETURN ONLY STANDARDIZED STRUCTURE
    return {
      success: true,
      result: {
        issues: this.generateIssues(security),
        recommendations: this.generateRecommendations(security),
        tasks: this.generateTasks(security),
        documentation: this.generateDocumentation(security)
      },
      metadata: {
        stepName: this.name,
        projectPath,
        timestamp: new Date()
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      result: {
        issues: [],
        recommendations: [],
        tasks: [],
        documentation: []
      },
      metadata: {
        stepName: this.name,
        projectPath: context.projectPath,
        timestamp: new Date()
      }
    };
  }
}

generateIssues(security) {
  const issues = [];
  
  // Convert vulnerabilities to standardized issues
  if (security.vulnerabilities) {
    issues.push(...security.vulnerabilities.map(vuln => ({
      id: `sec-${uuid()}`,
      category: 'security',
      subcategory: 'vulnerability',
      severity: vuln.severity,
      title: vuln.message,
      description: vuln.description,
      file: vuln.file,
      line: vuln.line,
      suggestion: vuln.suggestion,
      metadata: {
        cve: vuln.cve,
        scanner: 'trivy',
        confidence: vuln.confidence
      }
    })));
  }
  
  return issues;
}
```

### Error Handling
- Handle missing or malformed analysis data
- Provide fallback values for missing data
- Log conversion errors for debugging
- Maintain step-specific error information in metadata

### Performance Considerations
- Optimize data conversion for large datasets
- Use efficient mapping and filtering methods
- Minimize memory usage during conversion
- Cache frequently used conversion logic

### Testing Strategy
- Test each step with various input data
- Verify standardized output format
- Test error handling with invalid data
- Validate step-specific functionality preserved
- Test performance with large datasets 