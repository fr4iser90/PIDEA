# Analysis Dashboard – Phase 1: Foundation & Dependencies

## Overview
Set up the foundation for the enhanced analysis dashboard by installing missing dependencies, updating the existing AnalysisDataViewer to support new sections, and preparing the infrastructure for the new components.

## Objectives
- [ ] Install Mermaid dependency for diagram rendering
- [ ] Update AnalysisDataViewer to support collapsible sections
- [ ] Extend CSS for new section layouts
- [ ] Prepare API integration points for new data types
- [ ] Set up component structure for new sections

## Deliverables
- Dependency: `mermaid` package installed in frontend/package.json
- File: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Enhanced with section support
- File: `frontend/src/css/components/analysis/analysis-data-viewer.css` - Updated for new sections
- File: `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Extended API methods
- Test: `frontend/tests/unit/analysis/AnalysisDataViewer.test.js` - Updated tests

## Dependencies
- Requires: Existing analysis components (already implemented)
- Blocks: Phase 2 start

## Estimated Time
4 hours

## Success Criteria
- [ ] Mermaid package successfully installed and importable
- [ ] AnalysisDataViewer supports collapsible sections
- [ ] CSS properly handles new section layouts
- [ ] API repository has placeholder methods for new data types
- [ ] All existing functionality remains intact
- [ ] Tests pass for updated components

## Technical Details

### Mermaid Installation
```bash
cd frontend
npm install mermaid
```

### AnalysisDataViewer Updates
- Add state management for collapsible sections
- Implement section toggle functionality
- Add placeholder sections for new components
- Maintain existing scrollable container functionality

### CSS Updates
- Add styles for collapsible sections
- Implement proper spacing for new components
- Ensure responsive design for all screen sizes
- Add transition animations for section toggles

### API Integration Preparation
Based on actual backend data structures, add methods for:

#### Issues Data (from AdvancedAnalysisService)
```javascript
// Expected API Response Structure:
{
  success: true,
  data: {
    layerValidation: {
      violations: [
        {
          type: 'layer-violation',
          severity: 'high',
          message: 'Domain layer accessing infrastructure directly',
          file: 'src/domain/UserService.js',
          line: 45
        }
      ]
    },
    logicValidation: {
      violations: [
        {
          type: 'security-violation',
          severity: 'critical',
          message: 'SQL injection vulnerability detected',
          file: 'src/infrastructure/DatabaseService.js',
          line: 23
        }
      ]
    },
    standardAnalysis: {
      codeQuality: {
        issues: [
          {
            type: 'complexity',
            severity: 'medium',
            message: 'Function too complex',
            file: 'src/services/ComplexService.js',
            line: 15
          }
        ]
      }
    }
  }
}
```

#### Tech Stack Data (from TaskAnalysisService)
```javascript
// Expected API Response Structure:
{
  success: true,
  data: {
    dependencies: {
      direct: {
        'express': '^4.17.1',
        'react': '^18.0.0',
        'chart.js': '^4.4.0'
      },
      dev: {
        'jest': '^29.0.0',
        'eslint': '^8.0.0'
      },
      outdated: [
        { name: 'lodash', current: '4.17.21', latest: '4.17.21' }
      ]
    },
    structure: {
      projectType: 'nodejs',
      fileTypes: {
        '.js': 45,
        '.jsx': 23,
        '.json': 5
      }
    }
  }
}
```

#### Architecture Data (from ArchitectureService)
```javascript
// Expected API Response Structure:
{
  success: true,
  data: {
    structure: {
      layers: 3,
      modules: 10,
      patterns: ['mvc', 'repository']
    },
    dependencies: {
      circular: false,
      count: 25,
      graph: 'mermaid-diagram-code-here'
    },
    metrics: {
      coupling: 'low',
      cohesion: 'high',
      complexity: 'medium'
    }
  }
}
```

#### Recommendations Data (from AdvancedAnalysisService)
```javascript
// Expected API Response Structure:
{
  success: true,
  data: {
    recommendations: [
      {
        title: 'Fix critical security vulnerabilities',
        description: 'Address SQL injection in DatabaseService.js',
        priority: 'critical',
        category: 'security',
        effort: 'medium',
        impact: 'high',
        file: 'src/infrastructure/DatabaseService.js'
      },
      {
        title: 'Reduce function complexity',
        description: 'Break down ComplexService.js into smaller functions',
        priority: 'medium',
        category: 'code-quality',
        effort: 'low',
        impact: 'medium',
        file: 'src/services/ComplexService.js'
      }
    ],
    integratedInsights: [
      {
        type: 'cross-layer-logic-issue',
        severity: 'high',
        description: 'Business logic mixed with infrastructure concerns'
      }
    ]
  }
}
```

### API Method Signatures
```javascript
// Add to APIChatRepository.jsx
async getAnalysisIssues(projectId) {
  return this.apiCall(`/api/analysis/${projectId}/issues`);
}

async getAnalysisTechStack(projectId) {
  return this.apiCall(`/api/analysis/${projectId}/techstack`);
}

async getAnalysisArchitecture(projectId) {
  return this.apiCall(`/api/analysis/${projectId}/architecture`);
}

async getAnalysisRecommendations(projectId) {
  return this.apiCall(`/api/analysis/${projectId}/recommendations`);
}
```

## Risk Mitigation
- **Low Risk**: Mermaid installation - standard npm package
- **Medium Risk**: CSS conflicts - thorough testing required
- **Low Risk**: API changes - backward compatible methods

## Testing Strategy
- Unit tests for new AnalysisDataViewer functionality
- Integration tests for API method calls
- Visual regression tests for CSS changes
- Performance tests for section rendering 