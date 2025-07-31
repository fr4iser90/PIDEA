# Analysis Orchestrators API Documentation

**Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]  
**Version**: 1.0.0  
**Purpose**: Complete API documentation for all analysis orchestrators and their endpoints

## Overview

The Analysis Orchestrators system provides comprehensive code analysis capabilities through 7 specialized orchestrators, each focusing on different aspects of code quality and project health. All orchestrators follow the same standardized pattern and provide consistent output formats.

## Orchestrators

### 1. Security Analysis Orchestrator
- **Category**: `security`
- **Steps**: 6 specialized security analysis steps
- **Focus**: Vulnerability detection, security best practices, dependency scanning

### 2. Performance Analysis Orchestrator  
- **Category**: `performance`
- **Steps**: 4 performance analysis steps
- **Focus**: Memory usage, CPU optimization, network performance, database efficiency

### 3. Architecture Analysis Orchestrator
- **Category**: `architecture` 
- **Steps**: 4 architecture analysis steps
- **Focus**: Layer violations, design patterns, code structure, coupling analysis

### 4. Code Quality Analysis Orchestrator
- **Category**: `code-quality`
- **Steps**: 4 code quality analysis steps
- **Focus**: Linting, complexity analysis, test coverage, documentation quality

### 5. Dependency Analysis Orchestrator
- **Category**: `dependencies`
- **Steps**: 4 dependency analysis steps
- **Focus**: Outdated packages, vulnerabilities, unused dependencies, license compliance

### 6. Manifest Analysis Orchestrator
- **Category**: `manifest`
- **Steps**: 4 manifest analysis steps
- **Focus**: Package.json analysis, Dockerfile validation, CI/CD configuration, environment setup

### 7. Tech Stack Analysis Orchestrator
- **Category**: `tech-stack`
- **Steps**: 4 tech stack analysis steps
- **Focus**: Framework detection, library analysis, tool identification, version management

## API Endpoints

### Base URL Pattern
```
/api/projects/:projectId/analysis/:category/:endpoint
```

### Categories
- `security` - Security analysis data
- `performance` - Performance analysis data  
- `architecture` - Architecture analysis data
- `code-quality` - Code quality analysis data
- `dependencies` - Dependency analysis data
- `manifest` - Manifest analysis data
- `tech-stack` - Tech stack analysis data

### Endpoints
Each category supports 5 standard endpoints:

1. **`/recommendations`** - Improvement suggestions
2. **`/issues`** - Problems and vulnerabilities
3. **`/metrics`** - Quantitative measurements
4. **`/summary`** - High-level overview
5. **`/results`** - Complete analysis data

## Request/Response Format

### Standard Response Structure
```json
{
  "success": true,
  "data": {
    "category": "string",
    "projectId": "string", 
    "timestamp": "ISO-8601",
    "count": number,
    "[endpoint]": "array|object"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Detailed Endpoint Documentation

### Recommendations Endpoint
**GET** `/api/projects/:projectId/analysis/:category/recommendations`

Returns actionable improvement suggestions for the specified category.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "category": "code-quality",
    "recommendations": [
      {
        "id": "rec-001",
        "title": "Reduce Cyclomatic Complexity",
        "description": "Function 'processData' has complexity of 15, consider refactoring",
        "priority": "high",
        "impact": "maintainability",
        "suggestions": ["Extract helper functions", "Use early returns"]
      }
    ],
    "count": 1,
    "projectId": "proj-123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Issues Endpoint
**GET** `/api/projects/:projectId/analysis/:category/issues`

Returns problems, vulnerabilities, and issues found in the analysis.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "category": "security",
    "issues": [
      {
        "id": "issue-001",
        "title": "SQL Injection Vulnerability",
        "description": "User input not properly sanitized in database query",
        "severity": "critical",
        "location": "src/database/userService.js:45",
        "cwe": "CWE-89",
        "remediation": "Use parameterized queries"
      }
    ],
    "count": 1,
    "projectId": "proj-123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Metrics Endpoint
**GET** `/api/projects/:projectId/analysis/:category/metrics`

Returns quantitative measurements and statistics.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "category": "performance",
    "metrics": {
      "totalAnalyses": 5,
      "completedAnalyses": 4,
      "failedAnalyses": 1,
      "lastAnalysis": "2024-01-15T10:30:00.000Z",
      "averageDuration": 45000,
      "successRate": 0.8
    },
    "projectId": "proj-123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Summary Endpoint
**GET** `/api/projects/:projectId/analysis/:category/summary`

Returns a high-level overview of the analysis results.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "category": "architecture",
    "summary": {
      "overallScore": 85,
      "totalIssues": 12,
      "criticalIssues": 2,
      "highIssues": 5,
      "mediumIssues": 3,
      "lowIssues": 2,
      "recommendations": 8,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    "projectId": "proj-123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Results Endpoint
**GET** `/api/projects/:projectId/analysis/:category/results`

Returns the complete analysis data including all details.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "category": "dependencies",
    "results": {
      "success": true,
      "summary": {
        "outdatedDependencies": 5,
        "vulnerableDependencies": 2,
        "unusedDependencies": 8,
        "licenseIssues": 1
      },
      "details": {
        "outdated": [...],
        "vulnerable": [...],
        "unused": [...],
        "licenses": [...]
      },
      "recommendations": [...],
      "issues": [...],
      "tasks": [...],
      "documentation": [...],
      "score": 78,
      "executionTime": 45000,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "projectId": "proj-123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Execution Endpoints

### Execute Analysis
**POST** `/api/projects/:projectId/analysis/:category`

Executes the specified analysis category.

**Request Body**:
```json
{
  "mode": "category-analysis",
  "options": {
    "includeMetrics": true,
    "includeIssues": true,
    "includeSuggestions": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-123",
    "status": "completed",
    "result": { ... },
    "executionTime": 45000
  },
  "message": "Analysis completed successfully"
}
```

### Execute Comprehensive Analysis
**POST** `/api/projects/:projectId/analysis/execute`

Executes all analysis categories in a comprehensive workflow.

**Request Body**:
```json
{
  "mode": "analysis",
  "options": {
    "includeCodeQuality": true,
    "includeDependencies": true,
    "includeManifest": true,
    "includeTechStack": true,
    "includeSecurity": true,
    "includePerformance": true,
    "includeArchitecture": true
  }
}
```

## Authentication

All endpoints require authentication. Include the authentication token in the request headers:

```
Authorization: Bearer <token>
```

## Rate Limiting

- **Standard endpoints**: 100 requests per minute
- **Execution endpoints**: 10 requests per minute
- **Comprehensive analysis**: 5 requests per minute

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Project or analysis not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Analysis execution failed |

## Performance Considerations

- **Individual orchestrators**: Complete within 90 seconds
- **Comprehensive analysis**: Complete within 5 minutes
- **Response time**: < 2 seconds for data retrieval endpoints
- **Memory usage**: < 512MB per analysis

## Best Practices

1. **Use appropriate categories** - Choose the most relevant category for your analysis needs
2. **Check metrics first** - Use the metrics endpoint to understand analysis history
3. **Handle errors gracefully** - Always check the `success` field in responses
4. **Cache results** - Analysis results are cached for 1 hour
5. **Monitor execution** - Use the metrics endpoint to track analysis performance

## Examples

### JavaScript/Node.js
```javascript
// Get code quality recommendations
const response = await fetch('/api/projects/proj-123/analysis/code-quality/recommendations', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data.recommendations);
```

### Python
```python
import requests

# Execute dependency analysis
response = requests.post(
    '/api/projects/proj-123/analysis/dependencies',
    headers={'Authorization': f'Bearer {token}'},
    json={'mode': 'dependency-analysis'}
)

data = response.json()
print(data['data']['result'])
```

### cURL
```bash
# Get security issues
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/projects/proj-123/analysis/security/issues"
```

## Support

For questions or issues with the Analysis Orchestrators API:

- **Documentation**: [Link to full documentation]
- **Issues**: [GitHub Issues](https://github.com/example/issues)
- **Support**: support@example.com

---

**Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] 