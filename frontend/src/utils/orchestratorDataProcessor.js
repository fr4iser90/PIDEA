/**
 * Process orchestrator analysis results into consistent format
 */
export const processOrchestratorData = (data, category) => {
  if (!data || !data.success) {
    return {
      category,
      hasData: false,
      summary: null,
      details: null,
      recommendations: [],
      issues: [],
      tasks: [],
      documentation: null,
      score: 0,
      executionTime: 0,
      timestamp: null
    };
  }

  const result = data.data || data;
  
  return {
    category,
    hasData: true,
    summary: result.summary || {},
    details: result.details || {},
    recommendations: result.recommendations || [],
    issues: result.issues || [],
    tasks: result.tasks || [],
    documentation: result.documentation || {},
    score: result.score || 0,
    executionTime: result.executionTime || 0,
    timestamp: result.timestamp || new Date().toISOString()
  };
};

/**
 * Process orchestrator issues data
 */
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

/**
 * Process orchestrator recommendations data
 */
export const processOrchestratorRecommendations = (recommendations, category) => {
  if (!Array.isArray(recommendations)) return [];

  return recommendations.map(rec => ({
    id: rec.id || `${category}-${Date.now()}-${Math.random()}`,
    title: rec.title || rec.message || 'Unknown Recommendation',
    description: rec.description || rec.details || '',
    category: category,
    priority: rec.priority || 'medium',
    effort: rec.effort || 'medium',
    impact: rec.impact || 'medium',
    source: rec.source || 'orchestrator',
    file: rec.file || rec.path || null,
    line: rec.line || rec.lineNumber || null,
    column: rec.column || null,
    rule: rec.rule || rec.ruleId || null,
    message: rec.message || rec.description || '',
    timestamp: rec.timestamp || new Date().toISOString(),
    status: rec.status || 'pending',
    tags: rec.tags || [],
    metadata: rec.metadata || {},
    implementation: rec.implementation || null,
    examples: rec.examples || []
  }));
};

/**
 * Process category-specific data
 */
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

/**
 * Process category-specific recommendations
 */
export const processCategoryRecommendations = (data, category) => {
  if (!data || typeof data !== 'object') return [];

  // Handle different category data structures
  switch (category) {
    case 'code-quality':
      return processCodeQualityRecommendations(data);
    case 'security':
      return processSecurityRecommendations(data);
    case 'dependencies':
      return processDependencyRecommendations(data);
    case 'manifest':
      return processManifestRecommendations(data);
    case 'tech-stack':
      return processTechStackRecommendations(data);
    case 'performance':
      return processPerformanceRecommendations(data);
    case 'architecture':
      return processArchitectureRecommendations(data);
    default:
      return processGenericRecommendations(data);
  }
};

/**
 * Validate orchestrator data structure
 */
export const validateOrchestratorData = (data) => {
  const requiredFields = ['category', 'projectId', 'score', 'timestamp'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    console.warn('Missing required fields in orchestrator data:', missingFields);
    return false;
  }
  
  return true;
};

// Category-specific processing functions
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
      line: file.line || null,
      priority: 'medium',
      effort: 'medium'
    })));
  }
  
  return issues;
};

const processSecurityIssues = (data) => {
  const issues = [];
  
  if (data.vulnerabilities) {
    issues.push(...data.vulnerabilities.map(vuln => ({
      id: vuln.id || `security-${Date.now()}-${Math.random()}`,
      title: vuln.title || vuln.name || 'Security Vulnerability',
      description: vuln.description || vuln.details || '',
      severity: vuln.severity || 'high',
      category: 'security',
      source: vuln.scanner || 'security-scanner',
      file: vuln.file || vuln.path || null,
      line: vuln.line || null,
      priority: vuln.severity === 'high' ? 'high' : 'medium',
      effort: 'medium'
    })));
  }
  
  return issues;
};

const processDependencyIssues = (data) => {
  const issues = [];
  
  if (data.dependencies) {
    data.dependencies.forEach(dep => {
      if (dep.vulnerabilities?.length > 0) {
        dep.vulnerabilities.forEach(vuln => {
          issues.push({
            id: `dep-${dep.name}-${vuln.id}`,
            title: `Vulnerability in ${dep.name}`,
            description: vuln.description || vuln.title || '',
            severity: vuln.severity || 'medium',
            category: 'dependencies',
            source: 'dependency-scanner',
            file: dep.file || null,
            priority: vuln.severity === 'high' ? 'high' : 'medium',
            effort: 'low'
          });
        });
      }
      
      if (dep.status === 'outdated') {
        issues.push({
          id: `dep-${dep.name}-outdated`,
          title: `Outdated dependency: ${dep.name}`,
          description: `Current: ${dep.currentVersion}, Latest: ${dep.latestVersion}`,
          severity: 'low',
          category: 'dependencies',
          source: 'dependency-scanner',
          file: dep.file || null,
          priority: 'low',
          effort: 'low'
        });
      }
    });
  }
  
  return issues;
};

const processManifestIssues = (data) => {
  const issues = [];
  
  if (data.manifests) {
    Object.entries(data.manifests).forEach(([manifestName, manifestData]) => {
      if (manifestData.issues) {
        manifestData.issues.forEach(issue => {
          issues.push({
            id: `manifest-${manifestName}-${issue.id}`,
            title: issue.title || `Issue in ${manifestName}`,
            description: issue.description || issue.message || '',
            severity: issue.severity || 'medium',
            category: 'manifest',
            source: 'manifest-scanner',
            file: manifestName,
            priority: issue.severity === 'high' ? 'high' : 'medium',
            effort: 'low'
          });
        });
      }
    });
  }
  
  return issues;
};

const processTechStackIssues = (data) => {
  const issues = [];
  
  if (data.frameworks || data.libraries || data.tools) {
    const allTech = [
      ...(data.frameworks || []),
      ...(data.libraries || []),
      ...(data.tools || [])
    ];
    
    allTech.forEach(tech => {
      if (tech.issues?.length > 0) {
        tech.issues.forEach(issue => {
          issues.push({
            id: `tech-${tech.name}-${issue.id}`,
            title: `Issue with ${tech.name}`,
            description: issue.description || issue.message || '',
            severity: issue.severity || 'medium',
            category: 'tech-stack',
            source: 'tech-scanner',
            file: tech.file || null,
            priority: issue.severity === 'high' ? 'high' : 'medium',
            effort: 'medium'
          });
        });
      }
    });
  }
  
  return issues;
};

const processPerformanceIssues = (data) => {
  const issues = [];
  
  if (data.metrics) {
    data.metrics.forEach(metric => {
      if (metric.status === 'warning' || metric.status === 'error') {
        issues.push({
          id: `perf-${metric.name}`,
          title: `Performance Issue: ${metric.name}`,
          description: metric.description || `Performance metric ${metric.name} is ${metric.status}`,
          severity: metric.status === 'error' ? 'high' : 'medium',
          category: 'performance',
          source: 'performance-scanner',
          priority: metric.status === 'error' ? 'high' : 'medium',
          effort: 'medium'
        });
      }
    });
  }
  
  return issues;
};

const processArchitectureIssues = (data) => {
  const issues = [];
  
  if (data.structure) {
    data.structure.forEach(component => {
      if (component.issues?.length > 0) {
        component.issues.forEach(issue => {
          issues.push({
            id: `arch-${component.name}-${issue.id}`,
            title: `Architecture Issue: ${issue.title}`,
            description: issue.description || issue.message || '',
            severity: issue.severity || 'medium',
            category: 'architecture',
            source: 'architecture-scanner',
            file: component.path || null,
            priority: issue.severity === 'high' ? 'high' : 'medium',
            effort: 'high'
          });
        });
      }
    });
  }
  
  return issues;
};

const processGenericIssues = (data) => {
  if (Array.isArray(data)) return data;
  if (data.issues) return data.issues;
  return [];
};

// Recommendations processing functions
const processCodeQualityRecommendations = (data) => {
  const recommendations = [];
  
  if (data.linting?.recommendations) {
    recommendations.push(...data.linting.recommendations);
  }
  
  if (data.complexity?.recommendations) {
    recommendations.push(...data.complexity.recommendations);
  }
  
  return recommendations;
};

const processSecurityRecommendations = (data) => {
  return data.recommendations || [];
};

const processDependencyRecommendations = (data) => {
  const recommendations = [];
  
  if (data.dependencies) {
    data.dependencies.forEach(dep => {
      if (dep.recommendations?.length > 0) {
        recommendations.push(...dep.recommendations);
      }
    });
  }
  
  return recommendations;
};

const processManifestRecommendations = (data) => {
  const recommendations = [];
  
  if (data.manifests) {
    Object.values(data.manifests).forEach(manifestData => {
      if (manifestData.recommendations?.length > 0) {
        recommendations.push(...manifestData.recommendations);
      }
    });
  }
  
  return recommendations;
};

const processTechStackRecommendations = (data) => {
  const recommendations = [];
  
  if (data.recommendations) {
    recommendations.push(...data.recommendations);
  }
  
  return recommendations;
};

const processPerformanceRecommendations = (data) => {
  return data.recommendations || [];
};

const processArchitectureRecommendations = (data) => {
  return data.recommendations || [];
};

const processGenericRecommendations = (data) => {
  if (Array.isArray(data)) return data;
  if (data.recommendations) return data.recommendations;
  return [];
}; 