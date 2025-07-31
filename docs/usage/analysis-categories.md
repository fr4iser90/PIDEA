# Analysis Categories Usage Guide

**Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]  
**Version**: 1.0.0  
**Purpose**: Complete usage guide for all analysis categories and their capabilities

## Overview

The Analysis Orchestrators system provides 7 specialized analysis categories, each designed to examine different aspects of your codebase and provide actionable insights. This guide explains when to use each category and how to interpret the results.

## Analysis Categories

### 1. Security Analysis (`security`)

**When to Use**: 
- Before deploying to production
- After adding new dependencies
- During security audits
- When handling sensitive data

**What It Analyzes**:
- Known vulnerabilities in dependencies
- Security best practices violations
- Potential security issues in code
- Authentication and authorization patterns
- Input validation and sanitization

**Key Metrics**:
- Critical vulnerabilities count
- Security score (0-100)
- Compliance with security standards
- Risk assessment

**Example Use Case**:
```bash
# Run security analysis
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "security-analysis"}' \
  "https://api.example.com/api/projects/proj-123/analysis/security"

# Get security issues
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/projects/proj-123/analysis/security/issues"
```

### 2. Performance Analysis (`performance`)

**When to Use**:
- Before performance-critical deployments
- When experiencing slow response times
- During capacity planning
- After major code changes

**What It Analyzes**:
- Memory usage patterns
- CPU utilization
- Network performance bottlenecks
- Database query efficiency
- Resource consumption

**Key Metrics**:
- Performance score (0-100)
- Response time analysis
- Resource usage patterns
- Optimization opportunities

**Example Use Case**:
```bash
# Run performance analysis
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "performance-analysis"}' \
  "https://api.example.com/api/projects/proj-123/analysis/performance"

# Get performance metrics
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/projects/proj-123/analysis/performance/metrics"
```

### 3. Architecture Analysis (`architecture`)

**When to Use**:
- During code reviews
- Before major refactoring
- When onboarding new team members
- For technical debt assessment

**What It Analyzes**:
- Layer violations and dependencies
- Design pattern usage
- Code structure and organization
- Coupling and cohesion metrics
- Architectural compliance

**Key Metrics**:
- Architecture score (0-100)
- Layer violation count
- Design pattern coverage
- Structural complexity

**Example Use Case**:
```bash
# Run architecture analysis
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "architecture-analysis"}' \
  "https://api.example.com/api/projects/proj-123/analysis/architecture"

# Get architecture summary
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/projects/proj-123/analysis/architecture/summary"
```

### 4. Code Quality Analysis (`code-quality`)

**When to Use**:
- During development
- Before code reviews
- For continuous integration
- When maintaining legacy code

**What It Analyzes**:
- Code style and formatting
- Cyclomatic complexity
- Test coverage
- Documentation quality
- Code smells and anti-patterns

**Key Metrics**:
- Code quality score (0-100)
- Linting issues count
- Test coverage percentage
- Documentation completeness

**Example Use Case**:
```bash
# Run code quality analysis
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "code-quality-analysis"}' \
  "https://api.example.com/api/projects/proj-123/analysis/code-quality"

# Get code quality recommendations
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/projects/proj-123/analysis/code-quality/recommendations"
```

### 5. Dependency Analysis (`dependencies`)

**When to Use**:
- Before updating dependencies
- During security audits
- For maintenance planning
- When optimizing bundle size

**What It Analyzes**:
- Outdated packages
- Known vulnerabilities
- Unused dependencies
- License compliance
- Dependency conflicts

**Key Metrics**:
- Dependency health score (0-100)
- Outdated packages count
- Vulnerability count
- Unused dependencies count

**Example Use Case**:
```bash
# Run dependency analysis
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "dependency-analysis"}' \
  "https://api.example.com/api/projects/proj-123/analysis/dependencies"

# Get dependency issues
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/projects/proj-123/analysis/dependencies/issues"
```

### 6. Manifest Analysis (`manifest`)

**When to Use**:
- During deployment preparation
- For environment consistency
- When troubleshooting build issues
- For infrastructure planning

**What It Analyzes**:
- Package.json configuration
- Dockerfile optimization
- CI/CD configuration
- Environment setup
- Build configuration

**Key Metrics**:
- Manifest quality score (0-100)
- Configuration issues count
- Best practices compliance
- Environment consistency

**Example Use Case**:
```bash
# Run manifest analysis
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "manifest-analysis"}' \
  "https://api.example.com/api/projects/proj-123/analysis/manifest"

# Get manifest results
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/projects/proj-123/analysis/manifest/results"
```

### 7. Tech Stack Analysis (`tech-stack`)

**When to Use**:
- For technology assessment
- During migration planning
- For tool selection
- When evaluating alternatives

**What It Analyzes**:
- Framework detection
- Library usage patterns
- Tool identification
- Version management
- Technology trends

**Key Metrics**:
- Tech stack maturity score (0-100)
- Framework coverage
- Library diversity
- Version consistency

**Example Use Case**:
```bash
# Run tech stack analysis
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "tech-stack-analysis"}' \
  "https://api.example.com/api/projects/proj-123/analysis/tech-stack"

# Get tech stack summary
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/projects/proj-123/analysis/tech-stack/summary"
```

## Comprehensive Analysis

### Running All Categories

For a complete project assessment, run all categories together:

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "analysis",
    "options": {
      "includeSecurity": true,
      "includePerformance": true,
      "includeArchitecture": true,
      "includeCodeQuality": true,
      "includeDependencies": true,
      "includeManifest": true,
      "includeTechStack": true
    }
  }' \
  "https://api.example.com/api/projects/proj-123/analysis/execute"
```

### Understanding Scores

All categories provide scores from 0-100:

- **90-100**: Excellent - Minimal issues, best practices followed
- **80-89**: Good - Some minor issues, generally well-maintained
- **70-79**: Fair - Several issues that should be addressed
- **60-69**: Poor - Significant issues requiring attention
- **0-59**: Critical - Major issues requiring immediate action

## Response Interpretation

### Recommendations
Actionable suggestions for improvement:
```json
{
  "id": "rec-001",
  "title": "Update Outdated Dependencies",
  "description": "5 packages are outdated and may contain security vulnerabilities",
  "priority": "high",
  "impact": "security",
  "suggestions": ["Run npm update", "Review changelogs"]
}
```

### Issues
Problems that need to be addressed:
```json
{
  "id": "issue-001",
  "title": "SQL Injection Vulnerability",
  "description": "User input not properly sanitized",
  "severity": "critical",
  "location": "src/database/userService.js:45",
  "remediation": "Use parameterized queries"
}
```

### Metrics
Quantitative measurements:
```json
{
  "totalAnalyses": 5,
  "completedAnalyses": 4,
  "failedAnalyses": 1,
  "lastAnalysis": "2024-01-15T10:30:00.000Z",
  "averageDuration": 45000,
  "successRate": 0.8
}
```

## Best Practices

### 1. Regular Analysis
- Run security analysis weekly
- Run code quality analysis on every commit
- Run comprehensive analysis monthly
- Run performance analysis before major releases

### 2. Score Tracking
- Monitor score trends over time
- Set minimum score thresholds
- Track improvements after fixes
- Use scores for team performance metrics

### 3. Issue Prioritization
- Address critical issues immediately
- Plan high-priority issues for next sprint
- Schedule medium-priority issues for future releases
- Document low-priority issues for reference

### 4. Integration
- Integrate analysis into CI/CD pipelines
- Use analysis results in code reviews
- Include analysis in deployment gates
- Share results with stakeholders

## Troubleshooting

### Common Issues

1. **Analysis Fails**
   - Check project path is correct
   - Verify authentication token
   - Ensure project has required files
   - Check system resources

2. **Low Scores**
   - Review recommendations
   - Address high-priority issues first
   - Focus on critical vulnerabilities
   - Implement best practices gradually

3. **Slow Performance**
   - Check network connectivity
   - Verify system resources
   - Consider running fewer categories
   - Use caching when possible

### Getting Help

- **Documentation**: [Link to full documentation]
- **API Reference**: [Link to API docs]
- **Support**: support@example.com
- **Issues**: [GitHub Issues](https://github.com/example/issues)

## Examples

### JavaScript/Node.js Integration
```javascript
class AnalysisService {
  async runSecurityAnalysis(projectId) {
    const response = await fetch(`/api/projects/${projectId}/analysis/security`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'security-analysis' })
    });
    
    const result = await response.json();
    return result.data;
  }

  async getIssues(projectId, category) {
    const response = await fetch(`/api/projects/${projectId}/analysis/${category}/issues`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    const result = await response.json();
    return result.data.issues;
  }
}
```

### Python Integration
```python
import requests

class AnalysisClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def run_analysis(self, project_id, category):
        response = requests.post(
            f'{self.base_url}/api/projects/{project_id}/analysis/{category}',
            headers=self.headers,
            json={'mode': f'{category}-analysis'}
        )
        return response.json()
    
    def get_recommendations(self, project_id, category):
        response = requests.get(
            f'{self.base_url}/api/projects/{project_id}/analysis/{category}/recommendations',
            headers=self.headers
        )
        return response.json()['data']['recommendations']
```

---

**Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] 