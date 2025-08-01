# Frontend Orchestrators Integration - Phase 4: AnalysisIssues Update

## 📋 Phase Overview
- **Phase**: 4
- **Name**: AnalysisIssues Update
- **Objective**: Update AnalysisIssues to handle orchestrator-specific issues data
- **Estimated Time**: 1 hour
- **Status**: Pending
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 🎯 Objectives
- [ ] Update AnalysisIssues to handle orchestrator-specific issues data
- [ ] Implement category-based filtering for issues
- [ ] Add orchestrator data processing for issues
- [ ] Support new orchestrator data structure

## 📁 Files to Modify
- [ ] `frontend/src/presentation/components/analysis/AnalysisIssues.jsx` - Support orchestrator issues data

## 📁 Files to Create
- [ ] `frontend/src/utils/issuesDataProcessor.js` - Issues data processing utilities

## 🔧 Implementation Tasks

### Task 1: Update AnalysisIssues
**File**: `frontend/src/presentation/components/analysis/AnalysisIssues.jsx`

**Implementation**:
```javascript
// ✅ NEW: Support orchestrator issues data structure
const AnalysisIssues = ({ issues, loading, error, category = 'all' }) => {
  // ✅ NEW: Process orchestrator issues data
  const processedIssues = useMemo(() => {
    if (!issues) return [];

    // Handle orchestrator data structure
    if (issues.category && issues.issues) {
      return processOrchestratorIssues(issues.issues, issues.category);
    }

    // Handle legacy data structure (fallback)
    if (Array.isArray(issues)) {
      return processLegacyIssues(issues);
    }

    // Handle category-specific issues
    if (typeof issues === 'object' && !Array.isArray(issues)) {
      return processCategoryIssues(issues, category);
    }

    return [];
  }, [issues, category]);

  // ✅ NEW: Category-specific filtering
  const [filterCategory, setFilterCategory] = useState(category);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // ✅ NEW: Get available categories from issues
  const availableCategories = useMemo(() => {
    const categories = new Set();
    processedIssues.forEach(issue => {
      if (issue.category) categories.add(issue.category);
    });
    return Array.from(categories);
  }, [processedIssues]);

  // ✅ NEW: Filter issues by category
  const filteredIssues = useMemo(() => {
    return processedIssues.filter(issue => {
      const categoryMatch = filterCategory === 'all' || issue.category === filterCategory;
      const severityMatch = filterSeverity === 'all' || issue.severity === filterSeverity;
      const sourceMatch = filterSource === 'all' || issue.source === filterSource;
      return categoryMatch && severityMatch && sourceMatch;
    });
  }, [processedIssues, filterCategory, filterSeverity, filterSource]);

  return (
    <div className="analysis-issues">
      {/* ✅ NEW: Category filter */}
      <div className="category-filter">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat.replace('-', ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Existing filters and content */}
      <div className="issues-content">
        {filteredIssues.map(issue => (
          <IssueCard 
            key={issue.id} 
            issue={issue}
            category={issue.category}
          />
        ))}
      </div>
    </div>
  );
};
```

### Task 2: Create Issues Data Processor
**File**: `frontend/src/utils/issuesDataProcessor.js`

**Implementation**:
```javascript
// ✅ NEW: Process orchestrator issues data
export const processOrchestratorIssues = (issues, category) => {
  if (!Array.isArray(issues)) return [];

  return issues.map(issue => ({
    id: issue.id || `${category}-${Date.now()}-${Math.random()}`,
    title: issue.title || issue.message || 'Unknown Issue',
    description: issue.description || issue.details || '',
    severity: issue.severity || 'medium',
    category: category,
    source: issue.source || issue.scanner || 'orchestrator',
    file: issue.file || issue.path || null,
    line: issue.line || issue.lineNumber || null,
    column: issue.column || null,
    rule: issue.rule || issue.ruleId || null,
    message: issue.message || issue.description || '',
    timestamp: issue.timestamp || new Date().toISOString(),
    status: issue.status || 'open',
    priority: issue.priority || 'medium',
    effort: issue.effort || 'medium',
    tags: issue.tags || [],
    metadata: issue.metadata || {}
  }));
};

// ✅ NEW: Process legacy issues data
export const processLegacyIssues = (issues) => {
  if (!Array.isArray(issues)) return [];

  return issues.map(issue => ({
    id: issue.id || `legacy-${Date.now()}-${Math.random()}`,
    title: issue.title || issue.message || 'Unknown Issue',
    description: issue.description || issue.details || '',
    severity: issue.severity || 'medium',
    category: issue.category || 'legacy',
    source: issue.source || 'legacy',
    file: issue.file || issue.path || null,
    line: issue.line || issue.lineNumber || null,
    column: issue.column || null,
    rule: issue.rule || issue.ruleId || null,
    message: issue.message || issue.description || '',
    timestamp: issue.timestamp || new Date().toISOString(),
    status: issue.status || 'open',
    priority: issue.priority || 'medium',
    effort: issue.effort || 'medium',
    tags: issue.tags || [],
    metadata: issue.metadata || {}
  }));
};

// ✅ NEW: Process category-specific issues
export const processCategoryIssues = (data, category) => {
  if (!data || typeof data !== 'object') return [];

  // Handle different category data structures
  switch (category) {
    case 'code-quality':
      return processCodeQualityIssues(data);
    case 'security':
      return processSecurityIssues(data);
    case 'dependencies':
      return processDependencyIssues(data);
    case 'manifest':
      return processManifestIssues(data);
    case 'tech-stack':
      return processTechStackIssues(data);
    case 'performance':
      return processPerformanceIssues(data);
    case 'architecture':
      return processArchitectureIssues(data);
    default:
      return processGenericIssues(data);
  }
};

// ✅ NEW: Process code quality issues
const processCodeQualityIssues = (data) => {
  const issues = [];
  
  if (data.linting?.issues) {
    issues.push(...data.linting.issues.map(issue => ({
      ...issue,
      category: 'code-quality',
      source: 'linting'
    })));
  }
  
  if (data.complexity?.highComplexityFiles) {
    issues.push(...data.complexity.highComplexityFiles.map(file => ({
      id: `complexity-${file.path}`,
      title: 'High Complexity File',
      description: `File has high cyclomatic complexity: ${file.complexity}`,
      severity: 'medium',
      category: 'code-quality',
      source: 'complexity',
      file: file.path,
      line: file.line || null
    })));
  }
  
  return issues;
};

// ✅ NEW: Process security issues
const processSecurityIssues = (data) => {
  const issues = [];
  
  if (data.vulnerabilities) {
    issues.push(...data.vulnerabilities.map(vuln => ({
      id: vuln.id || `security-${Date.now()}-${Math.random()}`,
      title: vuln.title || 'Security Vulnerability',
      description: vuln.description || vuln.details || '',
      severity: vuln.severity || 'high',
      category: 'security',
      source: 'security-scanner',
      file: vuln.file || vuln.path || null,
      line: vuln.line || null,
      rule: vuln.rule || vuln.cve || null,
      message: vuln.message || vuln.description || ''
    })));
  }
  
  return issues;
};

// ✅ NEW: Process generic issues
const processGenericIssues = (data) => {
  if (Array.isArray(data)) {
    return data.map(issue => ({
      id: issue.id || `generic-${Date.now()}-${Math.random()}`,
      title: issue.title || issue.message || 'Unknown Issue',
      description: issue.description || issue.details || '',
      severity: issue.severity || 'medium',
      category: issue.category || 'generic',
      source: issue.source || 'generic',
      file: issue.file || issue.path || null,
      line: issue.line || issue.lineNumber || null,
      column: issue.column || null,
      rule: issue.rule || issue.ruleId || null,
      message: issue.message || issue.description || '',
      timestamp: issue.timestamp || new Date().toISOString(),
      status: issue.status || 'open',
      priority: issue.priority || 'medium',
      effort: issue.effort || 'medium',
      tags: issue.tags || [],
      metadata: issue.metadata || {}
    }));
  }
  
  return [];
};
```

## ✅ Success Criteria
- [ ] AnalysisIssues handles orchestrator-specific issues data
- [ ] Category-based filtering implemented
- [ ] Orchestrator data processing working
- [ ] Legacy data structure fallback functional
- [ ] All issue types display correctly

## 🔍 Validation Steps
1. **Component Rendering**: Verify AnalysisIssues renders with new data structure
2. **Category Filtering**: Test category-based filtering functionality
3. **Data Processing**: Validate orchestrator data processing
4. **Performance**: Check component performance with new data

## 📊 Progress Tracking
- **Status**: Pending
- **Progress**: 0%
- **Next Phase**: Phase 5 - AnalysisRecommendations Update

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Phase 2: Global State Extension (completed)
- Phase 3: AnalysisDataViewer Update (completed)
- Existing AnalysisIssues component

## 📝 Notes
- Focus only on AnalysisIssues component updates
- Implement orchestrator data processing for issues
- Add category-based filtering
- Test component with new data before proceeding to Phase 5

---

**Next**: [Phase 5 - AnalysisRecommendations Update](./frontend-orchestrators-integration-phase-5.md) 