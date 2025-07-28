# Prompt: Language Consistency & Documentation Coverage Analyzer

## Goal
Automatically analyze the entire codebase for language consistency issues, detect non-English content, assess documentation coverage for critical components, and provide actionable recommendations for improvement. Generate comprehensive reports with specific file-level analysis and prioritized action items.

## Phase
Comprehensive codebase analysis for language consistency and documentation quality. Create detailed reports with file-level findings and improvement recommendations.

## Core Principles
- **Multi-Language Detection**: Identify German, English, and other languages in code
- **Documentation Coverage**: Assess critical areas requiring documentation
- **Actionable Insights**: Provide specific, prioritized recommendations
- **Integration**: Work with existing analysis services and patterns
- **Comprehensive Reporting**: Generate detailed, file-level analysis reports
- **Quality Assessment**: Evaluate comment quality and documentation standards

## Analysis Strategy

### Phase 1: Language Consistency Analysis
- [ ] **Scan all code files** for language inconsistencies
- [ ] **Detect non-English content** in comments, strings, and documentation
- [ ] **Identify mixed-language files** with inconsistent language usage
- [ ] **Map language distribution** across the codebase
- [ ] **Flag critical language issues** in public APIs and user-facing content
- [ ] **Generate language consistency score** per file and project-wide

### Phase 2: Documentation Coverage Analysis
- [ ] **Identify critical components** requiring documentation
- [ ] **Assess current documentation coverage** for each critical area
- [ ] **Analyze comment quality** and relevance
- [ ] **Evaluate external documentation** completeness
- [ ] **Calculate documentation coverage metrics**
- [ ] **Prioritize documentation gaps** by business impact

### Phase 3: Quality Assessment & Recommendations
- [ ] **Evaluate comment quality** (relevance, accuracy, maintenance)
- [ ] **Assess documentation standards** compliance
- [ ] **Generate improvement recommendations** with priority levels
- [ ] **Create action plan** for language standardization
- [ ] **Provide documentation templates** for missing areas
- [ ] **Suggest refactoring opportunities** for better self-documentation

## Language Detection Patterns

### German Language Indicators
```javascript
const GERMAN_INDICATORS = [
  // Common German words in technical context
  'soll', 'muss', 'kann', 'wird', 'haben', 'sein', 'werden',
  'durch', 'für', 'mit', 'von', 'zu', 'bei', 'nach', 'über',
  'unter', 'zwischen', 'innerhalb', 'außerhalb', 'vorher', 'nachher',
  
  // Technical German terms
  'funktion', 'klasse', 'methode', 'variable', 'konstante',
  'schleife', 'bedingung', 'fehler', 'ausnahme', 'validierung',
  'authentifizierung', 'autorisierung', 'konfiguration', 'einstellung',
  
  // German comment patterns
  '// TODO:', '// FIXME:', '// HINWEIS:', '// WARNUNG:',
  '/* Kommentar */', '// Erklärung:', '// Beschreibung:'
];
```

### English Language Indicators
```javascript
const ENGLISH_INDICATORS = [
  // Common English technical terms
  'function', 'class', 'method', 'variable', 'constant',
  'loop', 'condition', 'error', 'exception', 'validation',
  'authentication', 'authorization', 'configuration', 'setting',
  
  // English comment patterns
  '// TODO:', '// FIXME:', '// NOTE:', '// WARNING:',
  '/* Comment */', '// Explanation:', '// Description:'
];
```

### Mixed Language Detection
```javascript
const MIXED_LANGUAGE_PATTERNS = {
  germanEnglish: /(soll|muss|kann|wird).*(function|class|method)/i,
  englishGerman: /(function|class|method).*(soll|muss|kann|wird)/i,
  commentMixing: /\/\/.*[äöüßÄÖÜ].*[a-zA-Z]{3,}/i,
  stringMixing: /["'].*[äöüßÄÖÜ].*[a-zA-Z]{3,}.*["']/i
};
```

## Critical Documentation Areas

### High Priority (Must Document)
```javascript
const CRITICAL_AREAS = {
  // Business Logic
  businessRules: {
    patterns: [/business.*logic/i, /domain.*rule/i, /validation.*rule/i],
    priority: 'critical',
    documentation: 'required'
  },
  
  // API Endpoints
  apiEndpoints: {
    patterns: [/app\.(get|post|put|delete)/i, /router\.(get|post|put|delete)/i],
    priority: 'critical',
    documentation: 'required'
  },
  
  // Security
  security: {
    patterns: [/auth/i, /security/i, /encrypt/i, /hash/i, /token/i],
    priority: 'critical',
    documentation: 'required'
  },
  
  // Configuration
  configuration: {
    patterns: [/config/i, /setting/i, /environment/i, /\.env/i],
    priority: 'high',
    documentation: 'required'
  },
  
  // Performance
  performance: {
    patterns: [/optimization/i, /performance/i, /cache/i, /async/i],
    priority: 'high',
    documentation: 'required'
  }
};
```

### Medium Priority (Should Document)
```javascript
const MEDIUM_PRIORITY_AREAS = {
  // Complex Algorithms
  algorithms: {
    patterns: [/algorithm/i, /complex.*logic/i, /calculation/i],
    priority: 'medium',
    documentation: 'recommended'
  },
  
  // Data Models
  dataModels: {
    patterns: [/model/i, /entity/i, /schema/i, /interface/i],
    priority: 'medium',
    documentation: 'recommended'
  },
  
  // External Integrations
  integrations: {
    patterns: [/api.*client/i, /external.*service/i, /third.*party/i],
    priority: 'medium',
    documentation: 'recommended'
  }
};
```

### Low Priority (Optional)
```javascript
const LOW_PRIORITY_AREAS = {
  // Simple CRUD
  crud: {
    patterns: [/create/i, /read/i, /update/i, /delete/i],
    priority: 'low',
    documentation: 'optional'
  },
  
  // Utility Functions
  utilities: {
    patterns: [/util/i, /helper/i, /format/i, /parse/i],
    priority: 'low',
    documentation: 'optional'
  }
};
```

## Analysis Commands

### Language Detection Commands
```bash
# Scan for German content in code
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | \
  xargs grep -l "soll\|muss\|kann\|wird\|haben\|sein\|werden" 2>/dev/null

# Scan for mixed language comments
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | \
  xargs grep -E "//.*[äöüßÄÖÜ].*[a-zA-Z]{3,}" 2>/dev/null

# Count language distribution
echo "German files:" && find . -name "*.js" -o -name "*.jsx" | xargs grep -l "soll\|muss\|kann" | wc -l
echo "English files:" && find . -name "*.js" -o -name "*.jsx" | xargs grep -l "function\|class\|method" | wc -l
```

### Documentation Coverage Commands
```bash
# Find files with business logic
find . -name "*.js" -o -name "*.jsx" | xargs grep -l "business.*logic\|domain.*rule" 2>/dev/null

# Find API endpoints
find . -name "*.js" -o -name "*.jsx" | xargs grep -l "app\.(get\|post\|put\|delete)\|router\.(get\|post\|put\|delete)" 2>/dev/null

# Find security-related code
find . -name "*.js" -o -name "*.jsx" | xargs grep -l "auth\|security\|encrypt\|hash" 2>/dev/null

# Count documented vs undocumented functions
echo "Functions with JSDoc:" && grep -r "@param\|@returns" . --include="*.js" --include="*.jsx" | wc -l
echo "Total functions:" && grep -r "function\|=>" . --include="*.js" --include="*.jsx" | wc -l
```

### Comment Quality Analysis
```bash
# Find TODO comments
find . -name "*.js" -o -name "*.jsx" | xargs grep -r "TODO\|FIXME\|HACK" 2>/dev/null

# Find outdated comments
find . -name "*.js" -o -name "*.jsx" | xargs grep -r "//.*[0-9]{4}" 2>/dev/null

# Find empty or useless comments
find . -name "*.js" -o -name "*.jsx" | xargs grep -r "//.*[a-zA-Z]{1,2}\s*$" 2>/dev/null
```

## Report Generation

### Language Consistency Report
```markdown
# Language Consistency Analysis Report
**Generated**: [TIMESTAMP]
**Project**: [PROJECT_NAME]
**Total Files Analyzed**: [COUNT]

## Summary
- **Language Consistency Score**: [SCORE]%
- **Files with Issues**: [COUNT]
- **Critical Issues**: [COUNT]
- **Recommendations**: [COUNT]

## Language Distribution
| Language | Files | Percentage | Status |
|----------|-------|------------|--------|
| English | [COUNT] | [PERCENT]% | ✅ Consistent |
| German | [COUNT] | [PERCENT]% | ⚠️ Needs Translation |
| Mixed | [COUNT] | [PERCENT]% | ❌ Inconsistent |

## Critical Issues Found
### High Priority
- [ ] **File**: `path/to/file.js` - German comments in public API
- [ ] **File**: `path/to/file.js` - Mixed language in user-facing strings

### Medium Priority
- [ ] **File**: `path/to/file.js` - German variable names
- [ ] **File**: `path/to/file.js` - Inconsistent comment language

## Recommendations
1. **Immediate Actions** (Critical)
   - Translate German comments in `path/to/file.js`
   - Standardize language in `path/to/file.js`

2. **Short-term Actions** (High Priority)
   - Review and translate mixed-language files
   - Establish language guidelines

3. **Long-term Actions** (Medium Priority)
   - Implement automated language checks
   - Create translation workflow
```

### Documentation Coverage Report
```markdown
# Documentation Coverage Analysis Report
**Generated**: [TIMESTAMP]
**Project**: [PROJECT_NAME]
**Critical Areas**: [COUNT]

## Coverage Summary
- **Overall Coverage**: [PERCENT]%
- **Critical Areas Covered**: [COUNT]/[TOTAL]
- **High Priority Gaps**: [COUNT]
- **Medium Priority Gaps**: [COUNT]

## Critical Areas Analysis

### Business Logic (Priority: Critical)
| File | Functions | Documented | Coverage | Status |
|------|-----------|------------|----------|--------|
| `path/to/business.js` | 15 | 8 | 53% | ⚠️ Needs Documentation |
| `path/to/domain.js` | 12 | 12 | 100% | ✅ Complete |

### API Endpoints (Priority: Critical)
| File | Endpoints | Documented | Coverage | Status |
|------|-----------|------------|----------|--------|
| `path/to/api.js` | 8 | 3 | 38% | ❌ Incomplete |
| `path/to/routes.js` | 12 | 12 | 100% | ✅ Complete |

### Security (Priority: Critical)
| File | Security Functions | Documented | Coverage | Status |
|------|-------------------|------------|----------|--------|
| `path/to/auth.js` | 6 | 2 | 33% | ❌ Incomplete |

## Documentation Gaps

### High Priority Gaps
1. **File**: `path/to/business.js`
   - **Missing**: JSDoc for `validateBusinessRule()` function
   - **Impact**: Critical business logic undocumented
   - **Recommendation**: Add comprehensive JSDoc with examples

2. **File**: `path/to/api.js`
   - **Missing**: API documentation for 5 endpoints
   - **Impact**: External developers cannot understand API
   - **Recommendation**: Add OpenAPI/Swagger documentation

### Medium Priority Gaps
1. **File**: `path/to/utility.js`
   - **Missing**: Comments for complex utility functions
   - **Impact**: Maintenance difficulty
   - **Recommendation**: Add inline comments for complex logic

## Quality Assessment

### Comment Quality Issues
- **Outdated Comments**: 15 found in 8 files
- **Empty Comments**: 8 found in 5 files
- **Inconsistent Style**: 23 found in 12 files

### Documentation Standards
- **JSDoc Compliance**: 67% of functions have proper JSDoc
- **API Documentation**: 45% of endpoints documented
- **README Coverage**: 78% of modules have README files
```

## Action Plan Generation

### Immediate Actions (This Week)
```markdown
## Week 1: Critical Issues Resolution

### Day 1-2: Language Standardization
- [ ] **Task**: Translate German comments in public APIs
  - **Files**: `path/to/api.js`, `path/to/controller.js`
  - **Effort**: 4 hours
  - **Priority**: Critical

- [ ] **Task**: Standardize language in user-facing strings
  - **Files**: `path/to/ui.js`, `path/to/messages.js`
  - **Effort**: 3 hours
  - **Priority**: Critical

### Day 3-4: Critical Documentation
- [ ] **Task**: Document business logic functions
  - **Files**: `path/to/business.js`, `path/to/domain.js`
  - **Effort**: 6 hours
  - **Priority**: Critical

- [ ] **Task**: Add API endpoint documentation
  - **Files**: `path/to/api.js`, `path/to/routes.js`
  - **Effort**: 4 hours
  - **Priority**: Critical

### Day 5: Security Documentation
- [ ] **Task**: Document security functions
  - **Files**: `path/to/auth.js`, `path/to/security.js`
  - **Effort**: 3 hours
  - **Priority**: Critical
```

### Short-term Actions (Next 2 Weeks)
```markdown
## Week 2-3: Quality Improvement

### Documentation Standards
- [ ] **Task**: Implement JSDoc standards
- [ ] **Task**: Create documentation templates
- [ ] **Task**: Set up automated documentation checks

### Language Guidelines
- [ ] **Task**: Create language style guide
- [ ] **Task**: Implement automated language checks
- [ ] **Task**: Train team on language standards
```

## Integration with Existing Services

### FileSystemService Integration
```javascript
// Use existing language detection
const fileSystemService = new FileSystemService();
const language = fileSystemService.getFileLanguage(filePath);

// Extend with custom language analysis
const languageAnalysis = {
  primaryLanguage: detectPrimaryLanguage(content),
  mixedLanguage: detectMixedLanguage(content),
  consistencyScore: calculateConsistencyScore(content),
  recommendations: generateLanguageRecommendations(content)
};
```

### LayerValidationService Integration
```javascript
// Use existing layer detection
const layerValidationService = new LayerValidationService();
const layer = await layerValidationService.detectLayerFromFile(filePath, relativePath);

// Add documentation requirements based on layer
const documentationRequirements = {
  presentation: ['API documentation', 'User interface documentation'],
  application: ['Business logic documentation', 'Service documentation'],
  domain: ['Domain model documentation', 'Business rule documentation'],
  infrastructure: ['Configuration documentation', 'External service documentation']
};
```

### LogicValidationService Integration
```javascript
// Use existing code quality analysis
const logicValidationService = new LogicValidationService();
const qualityScore = await logicValidationService.assessCodeQuality(filePath);

// Extend with documentation quality
const documentationQuality = {
  commentCoverage: calculateCommentCoverage(content),
  documentationCompleteness: assessDocumentationCompleteness(content),
  qualityScore: calculateDocumentationQuality(content)
};
```

## Automated Execution Commands

### Full Analysis Run
```bash
# Run complete language and documentation analysis
node scripts/language-analyzer.js --full-analysis --generate-reports

# Run specific analysis types
node scripts/language-analyzer.js --language-only
node scripts/language-analyzer.js --documentation-only
node scripts/language-analyzer.js --quality-only

# Generate specific reports
node scripts/language-analyzer.js --report=language-consistency
node scripts/language-analyzer.js --report=documentation-coverage
node scripts/language-analyzer.js --report=action-plan
```

### Continuous Monitoring
```bash
# Set up automated checks
node scripts/language-analyzer.js --watch --threshold=80

# Pre-commit hooks
node scripts/language-analyzer.js --pre-commit --strict

# CI/CD integration
node scripts/language-analyzer.js --ci --fail-on-critical
```

## Success Metrics

### Language Consistency Metrics
- **Target**: 95% English consistency
- **Current**: [PERCENT]%
- **Gap**: [PERCENT]%
- **Files to Fix**: [COUNT]

### Documentation Coverage Metrics
- **Target**: 90% coverage for critical areas
- **Current**: [PERCENT]%
- **Gap**: [PERCENT]%
- **Critical Gaps**: [COUNT]

### Quality Metrics
- **Comment Quality Score**: [SCORE]/100
- **Documentation Standards Compliance**: [PERCENT]%
- **Maintenance Readiness**: [PERCENT]%

---

**Result**: Comprehensive language consistency and documentation coverage analysis with actionable recommendations and automated reporting capabilities. 