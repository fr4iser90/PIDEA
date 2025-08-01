# Frontend Orchestrators Integration - Phase 4: Tech Stack & Architecture

## 📋 Phase Overview
- **Phase**: 4
- **Name**: Tech Stack & Architecture
- **Objective**: Update TechStack and Architecture components to support orchestrator data structures
- **Estimated Time**: 1 hour
- **Status**: Pending
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 🎯 Objectives
- [ ] Update AnalysisTechStack to handle orchestrator tech stack data
- [ ] Update AnalysisArchitecture to support orchestrator architecture data
- [ ] Implement category-specific data processing for tech-stack and architecture
- [ ] Add enhanced visualizations for orchestrator data
- [ ] Replace legacy data structures with orchestrator format

## 📁 Files to Modify
- [ ] `frontend/src/presentation/components/analysis/AnalysisTechStack.jsx` - Support orchestrator tech stack data
- [ ] `frontend/src/presentation/components/analysis/AnalysisArchitecture.jsx` - Support orchestrator architecture data

## 📁 Files to Create
- [ ] `frontend/src/utils/techStackDataProcessor.js` - Tech stack specific data processing
- [ ] `frontend/src/utils/architectureDataProcessor.js` - Architecture specific data processing

## 🔧 Implementation Tasks

### Task 1: Update AnalysisTechStack
**File**: `frontend/src/presentation/components/analysis/AnalysisTechStack.jsx`

**Implementation**:
```javascript
// ✅ NEW: Support orchestrator tech stack data structure
const AnalysisTechStack = ({ techStack, loading, error, category = 'tech-stack' }) => {
  // ✅ NEW: Process orchestrator tech stack data
  const processedTechStack = useMemo(() => {
    if (!techStack) return null;

    // Handle orchestrator data structure
    if (techStack.category && techStack.details) {
      return processOrchestratorTechStack(techStack.details, techStack.category);
    }

    // Handle legacy data structure (fallback)
    if (techStack.frameworks || techStack.libraries || techStack.tools) {
      return processLegacyTechStack(techStack);
    }

    // Handle category-specific tech stack data
    if (typeof techStack === 'object' && !Array.isArray(techStack)) {
      return processCategoryTechStack(techStack, category);
    }

    return null;
  }, [techStack, category]);

  // ✅ NEW: Category-specific state
  const [activeTab, setActiveTab] = useState('overview');
  const [filterType, setFilterType] = useState('all');
  const [filterConfidence, setFilterConfidence] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // ✅ NEW: Get tech stack categories
  const techCategories = useMemo(() => {
    if (!processedTechStack) return [];
    
    const categories = new Set();
    if (processedTechStack.frameworks) categories.add('frameworks');
    if (processedTechStack.libraries) categories.add('libraries');
    if (processedTechStack.tools) categories.add('tools');
    if (processedTechStack.languages) categories.add('languages');
    if (processedTechStack.databases) categories.add('databases');
    if (processedTechStack.services) categories.add('services');
    
    return Array.from(categories);
  }, [processedTechStack]);

  // ✅ NEW: Filter tech stack items
  const filteredTechStack = useMemo(() => {
    if (!processedTechStack) return {};

    const filtered = {};
    Object.entries(processedTechStack).forEach(([category, items]) => {
      if (filterType === 'all' || category === filterType) {
        filtered[category] = items.filter(item => {
          const confidenceMatch = filterConfidence === 'all' || 
            (item.confidence && item.confidence >= parseFloat(filterConfidence));
          return confidenceMatch;
        });
      }
    });

    return filtered;
  }, [processedTechStack, filterType, filterConfidence]);

  return (
    <div className="analysis-tech-stack">
      {/* ✅ NEW: Category-specific header */}
      <div className="tech-stack-header">
        <h3>Tech Stack Analysis</h3>
        <div className="tech-stack-meta">
          {processedTechStack?.summary && (
            <div className="tech-stack-summary">
              <span className="score">Score: {processedTechStack.summary.score || 'N/A'}</span>
              <span className="total">Total: {processedTechStack.summary.totalItems || 0}</span>
              <span className="confidence">Avg Confidence: {processedTechStack.summary.averageConfidence || 'N/A'}%</span>
            </div>
          )}
        </div>
      </div>

      {/* ✅ NEW: Enhanced filters */}
      <div className="tech-stack-filters">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {techCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>

        <select value={filterConfidence} onChange={(e) => setFilterConfidence(e.target.value)}>
          <option value="all">All Confidence</option>
          <option value="0.9">High (90%+)</option>
          <option value="0.7">Medium (70%+)</option>
          <option value="0.5">Low (50%+)</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="confidence">Sort by Confidence</option>
          <option value="version">Sort by Version</option>
        </select>
      </div>

      {/* ✅ NEW: Category tabs */}
      <div className="tech-stack-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        {techCategories.map(cat => (
          <button
            key={cat}
            className={activeTab === cat ? 'active' : ''}
            onClick={() => setActiveTab(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* ✅ NEW: Enhanced content */}
      <div className="tech-stack-content">
        {activeTab === 'overview' ? (
          <TechStackOverview 
            techStack={filteredTechStack}
            summary={processedTechStack?.summary}
            loading={loading}
          />
        ) : (
          <TechStackCategory
            category={activeTab}
            items={filteredTechStack[activeTab] || []}
            loading={loading}
            sortBy={sortBy}
          />
        )}
      </div>
    </div>
  );
};
```

### Task 2: Update AnalysisArchitecture
**File**: `frontend/src/presentation/components/analysis/AnalysisArchitecture.jsx`

**Implementation**:
```javascript
// ✅ NEW: Support orchestrator architecture data structure
const AnalysisArchitecture = ({ architecture, loading, error, category = 'architecture' }) => {
  // ✅ NEW: Process orchestrator architecture data
  const processedArchitecture = useMemo(() => {
    if (!architecture) return null;

    // Handle orchestrator data structure
    if (architecture.category && architecture.details) {
      return processOrchestratorArchitecture(architecture.details, architecture.category);
    }

    // Handle legacy data structure (fallback)
    if (architecture.structure || architecture.patterns || architecture.metrics) {
      return processLegacyArchitecture(architecture);
    }

    // Handle category-specific architecture data
    if (typeof architecture === 'object' && !Array.isArray(architecture)) {
      return processCategoryArchitecture(architecture, category);
    }

    return null;
  }, [architecture, category]);

  // ✅ NEW: Category-specific state
  const [activeView, setActiveView] = useState('overview');
  const [selectedLayer, setSelectedLayer] = useState('all');
  const [selectedPattern, setSelectedPattern] = useState('all');
  const [filterComplexity, setFilterComplexity] = useState('all');

  // ✅ NEW: Get architecture sections
  const architectureSections = useMemo(() => {
    if (!processedArchitecture) return [];
    
    const sections = [];
    if (processedArchitecture.structure) sections.push('structure');
    if (processedArchitecture.patterns) sections.push('patterns');
    if (processedArchitecture.metrics) sections.push('metrics');
    if (processedArchitecture.coupling) sections.push('coupling');
    if (processedArchitecture.cohesion) sections.push('cohesion');
    if (processedArchitecture.recommendations) sections.push('recommendations');
    
    return sections;
  }, [processedArchitecture]);

  // ✅ NEW: Filter architecture data
  const filteredArchitecture = useMemo(() => {
    if (!processedArchitecture) return {};

    const filtered = { ...processedArchitecture };
    
    // Filter by layer
    if (selectedLayer !== 'all' && filtered.structure) {
      filtered.structure = filtered.structure.filter(item => 
        item.layer === selectedLayer
      );
    }

    // Filter by pattern
    if (selectedPattern !== 'all' && filtered.patterns) {
      filtered.patterns = filtered.patterns.filter(item => 
        item.pattern === selectedPattern
      );
    }

    // Filter by complexity
    if (filterComplexity !== 'all' && filtered.metrics) {
      filtered.metrics = filtered.metrics.filter(item => {
        const complexity = item.complexity || item.cyclomaticComplexity || 0;
        switch (filterComplexity) {
          case 'low': return complexity < 5;
          case 'medium': return complexity >= 5 && complexity < 10;
          case 'high': return complexity >= 10;
          default: return true;
        }
      });
    }

    return filtered;
  }, [processedArchitecture, selectedLayer, selectedPattern, filterComplexity]);

  return (
    <div className="analysis-architecture">
      {/* ✅ NEW: Category-specific header */}
      <div className="architecture-header">
        <h3>Architecture Analysis</h3>
        <div className="architecture-meta">
          {processedArchitecture?.summary && (
            <div className="architecture-summary">
              <span className="score">Score: {processedArchitecture.summary.score || 'N/A'}</span>
              <span className="complexity">Complexity: {processedArchitecture.summary.averageComplexity || 'N/A'}</span>
              <span className="coupling">Coupling: {processedArchitecture.summary.couplingScore || 'N/A'}</span>
              <span className="cohesion">Cohesion: {processedArchitecture.summary.cohesionScore || 'N/A'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ✅ NEW: Enhanced filters */}
      <div className="architecture-filters">
        <select value={selectedLayer} onChange={(e) => setSelectedLayer(e.target.value)}>
          <option value="all">All Layers</option>
          {processedArchitecture?.structure?.map(item => item.layer).filter((v, i, a) => a.indexOf(v) === i).map(layer => (
            <option key={layer} value={layer}>{layer}</option>
          ))}
        </select>

        <select value={selectedPattern} onChange={(e) => setSelectedPattern(e.target.value)}>
          <option value="all">All Patterns</option>
          {processedArchitecture?.patterns?.map(item => item.pattern).filter((v, i, a) => a.indexOf(v) === i).map(pattern => (
            <option key={pattern} value={pattern}>{pattern}</option>
          ))}
        </select>

        <select value={filterComplexity} onChange={(e) => setFilterComplexity(e.target.value)}>
          <option value="all">All Complexity</option>
          <option value="low">Low (&lt; 5)</option>
          <option value="medium">Medium (5-10)</option>
          <option value="high">High (&gt; 10)</option>
        </select>
      </div>

      {/* ✅ NEW: View tabs */}
      <div className="architecture-tabs">
        <button 
          className={activeView === 'overview' ? 'active' : ''}
          onClick={() => setActiveView('overview')}
        >
          Overview
        </button>
        {architectureSections.map(section => (
          <button
            key={section}
            className={activeView === section ? 'active' : ''}
            onClick={() => setActiveView(section)}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* ✅ NEW: Enhanced content */}
      <div className="architecture-content">
        {activeView === 'overview' ? (
          <ArchitectureOverview 
            architecture={filteredArchitecture}
            summary={processedArchitecture?.summary}
            loading={loading}
          />
        ) : (
          <ArchitectureSection
            section={activeView}
            data={filteredArchitecture[activeView]}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};
```

### Task 3: Tech Stack Data Processing
**File**: `frontend/src/utils/techStackDataProcessor.js`

**Implementation**:
```javascript
// ✅ NEW: Process orchestrator tech stack data
export const processOrchestratorTechStack = (data, category) => {
  if (!data || typeof data !== 'object') return null;

  return {
    frameworks: processTechStackItems(data.frameworks || [], 'framework'),
    libraries: processTechStackItems(data.libraries || [], 'library'),
    tools: processTechStackItems(data.tools || [], 'tool'),
    languages: processTechStackItems(data.languages || [], 'language'),
    databases: processTechStackItems(data.databases || [], 'database'),
    services: processTechStackItems(data.services || [], 'service'),
    summary: {
      score: data.score || 0,
      totalItems: calculateTotalItems(data),
      averageConfidence: calculateAverageConfidence(data),
      categories: Object.keys(data).filter(key => 
        ['frameworks', 'libraries', 'tools', 'languages', 'databases', 'services'].includes(key)
      )
    }
  };
};

// ✅ NEW: Process tech stack items
const processTechStackItems = (items, type) => {
  if (!Array.isArray(items)) return [];

  return items.map(item => ({
    id: item.id || `${type}-${Date.now()}-${Math.random()}`,
    name: item.name || item.title || 'Unknown',
    version: item.version || item.ver || 'Unknown',
    type: type,
    confidence: item.confidence || item.conf || 0.8,
    description: item.description || item.desc || '',
    category: item.category || type,
    source: item.source || 'orchestrator',
    file: item.file || item.path || null,
    line: item.line || item.lineNumber || null,
    metadata: item.metadata || {},
    tags: item.tags || [],
    status: item.status || 'detected',
    lastUpdated: item.lastUpdated || item.timestamp || new Date().toISOString()
  }));
};

// ✅ NEW: Calculate total items
const calculateTotalItems = (data) => {
  return Object.values(data).reduce((total, items) => {
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
};

// ✅ NEW: Calculate average confidence
const calculateAverageConfidence = (data) => {
  const allItems = [];
  Object.values(data).forEach(items => {
    if (Array.isArray(items)) {
      allItems.push(...items);
    }
  });

  if (allItems.length === 0) return 0;

  const totalConfidence = allItems.reduce((sum, item) => {
    return sum + (item.confidence || item.conf || 0.8);
  }, 0);

  return Math.round((totalConfidence / allItems.length) * 100);
};

// ✅ NEW: Process category-specific tech stack
export const processCategoryTechStack = (data, category) => {
  switch (category) {
    case 'tech-stack':
      return processOrchestratorTechStack(data, category);
    case 'dependencies':
      return processDependencyTechStack(data);
    case 'manifest':
      return processManifestTechStack(data);
    default:
      return processGenericTechStack(data);
  }
};
```

### Task 4: Architecture Data Processing
**File**: `frontend/src/utils/architectureDataProcessor.js`

**Implementation**:
```javascript
// ✅ NEW: Process orchestrator architecture data
export const processOrchestratorArchitecture = (data, category) => {
  if (!data || typeof data !== 'object') return null;

  return {
    structure: processArchitectureStructure(data.structure || []),
    patterns: processArchitecturePatterns(data.patterns || []),
    metrics: processArchitectureMetrics(data.metrics || []),
    coupling: processArchitectureCoupling(data.coupling || []),
    cohesion: processArchitectureCohesion(data.cohesion || []),
    recommendations: processArchitectureRecommendations(data.recommendations || []),
    summary: {
      score: data.score || 0,
      averageComplexity: calculateAverageComplexity(data.metrics || []),
      couplingScore: calculateCouplingScore(data.coupling || []),
      cohesionScore: calculateCohesionScore(data.cohesion || []),
      totalPatterns: (data.patterns || []).length,
      totalComponents: (data.structure || []).length
    }
  };
};

// ✅ NEW: Process architecture structure
const processArchitectureStructure = (structure) => {
  if (!Array.isArray(structure)) return [];

  return structure.map(item => ({
    id: item.id || `structure-${Date.now()}-${Math.random()}`,
    name: item.name || item.title || 'Unknown Component',
    type: item.type || item.componentType || 'component',
    layer: item.layer || item.architecturalLayer || 'unknown',
    path: item.path || item.file || null,
    dependencies: item.dependencies || [],
    dependents: item.dependents || [],
    complexity: item.complexity || item.cyclomaticComplexity || 0,
    lines: item.lines || item.lineCount || 0,
    description: item.description || item.desc || '',
    status: item.status || 'active',
    metadata: item.metadata || {}
  }));
};

// ✅ NEW: Process architecture patterns
const processArchitecturePatterns = (patterns) => {
  if (!Array.isArray(patterns)) return [];

  return patterns.map(pattern => ({
    id: pattern.id || `pattern-${Date.now()}-${Math.random()}`,
    name: pattern.name || pattern.pattern || 'Unknown Pattern',
    type: pattern.type || pattern.patternType || 'design',
    category: pattern.category || 'general',
    description: pattern.description || pattern.desc || '',
    implementation: pattern.implementation || pattern.impl || '',
    benefits: pattern.benefits || [],
    drawbacks: pattern.drawbacks || [],
    examples: pattern.examples || [],
    confidence: pattern.confidence || pattern.conf || 0.8,
    status: pattern.status || 'detected',
    metadata: pattern.metadata || {}
  }));
};

// ✅ NEW: Process architecture metrics
const processArchitectureMetrics = (metrics) => {
  if (!Array.isArray(metrics)) return [];

  return metrics.map(metric => ({
    id: metric.id || `metric-${Date.now()}-${Math.random()}`,
    name: metric.name || metric.metric || 'Unknown Metric',
    value: metric.value || metric.val || 0,
    unit: metric.unit || '',
    category: metric.category || 'general',
    description: metric.description || metric.desc || '',
    threshold: metric.threshold || metric.thresh || null,
    status: metric.status || 'normal',
    severity: metric.severity || 'medium',
    metadata: metric.metadata || {}
  }));
};

// ✅ NEW: Calculate average complexity
const calculateAverageComplexity = (metrics) => {
  const complexityMetrics = metrics.filter(m => 
    m.name?.toLowerCase().includes('complexity') || 
    m.category?.toLowerCase().includes('complexity')
  );

  if (complexityMetrics.length === 0) return 0;

  const totalComplexity = complexityMetrics.reduce((sum, metric) => {
    return sum + (metric.value || 0);
  }, 0);

  return Math.round(totalComplexity / complexityMetrics.length);
};

// ✅ NEW: Calculate coupling score
const calculateCouplingScore = (coupling) => {
  if (!Array.isArray(coupling) || coupling.length === 0) return 0;

  const totalCoupling = coupling.reduce((sum, item) => {
    return sum + (item.score || item.value || 0);
  }, 0);

  return Math.round(totalCoupling / coupling.length);
};

// ✅ NEW: Calculate cohesion score
const calculateCohesionScore = (cohesion) => {
  if (!Array.isArray(cohesion) || cohesion.length === 0) return 0;

  const totalCohesion = cohesion.reduce((sum, item) => {
    return sum + (item.score || item.value || 0);
  }, 0);

  return Math.round(totalCohesion / cohesion.length);
};
```

## ✅ Success Criteria
- [ ] AnalysisTechStack handles orchestrator tech stack data correctly
- [ ] AnalysisArchitecture supports orchestrator architecture data
- [ ] Category-specific data processing implemented
- [ ] Enhanced visualizations for orchestrator data working
- [ ] Legacy data structures replaced with orchestrator format
- [ ] All filters and sorting functionality working
- [ ] Performance optimized for large datasets

## 🔍 Validation Steps
1. **Component Rendering**: Verify TechStack and Architecture components render with new data
2. **Data Processing**: Test category-specific data processing functions
3. **Filtering**: Validate all filter and sorting functionality
4. **Performance**: Check component performance with large datasets
5. **Visualizations**: Test enhanced visualizations and charts

## 📊 Progress Tracking
- **Status**: Pending
- **Progress**: 0%
- **Next Phase**: Phase 5 - Charts & Metrics Enhancement

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Phase 2: Global State Extension (completed)
- Phase 3: Core Components Update (completed)
- Existing TechStack and Architecture components
- Data processing utilities

## 📝 Notes
- Focus on TechStack and Architecture specific components
- Implement category-specific data processing
- Add enhanced visualizations and filtering
- Optimize performance for large datasets
- Test all functionality before proceeding to Phase 5

---

**Next**: [Phase 5 - Charts & Metrics Enhancement](./frontend-orchestrators-integration-phase-5.md) 