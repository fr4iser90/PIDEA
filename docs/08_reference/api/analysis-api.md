# Analysis API Reference

## Overview

The Analysis API provides a clean, modular approach to project analysis using workflow-based execution and dedicated controllers for results retrieval.

## Base URL

All analysis endpoints are prefixed with `/api/projects/:projectId/analysis` and require authentication.

## Authentication

All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Execution Routes

### Execute Project Analysis

**POST** `/api/projects/:projectId/analysis/project`

Execute a comprehensive project analysis.

#### Request Body
```json
{
  "options": {
    "includeMetrics": true,
    "depth": "full"
  }
}
```

#### Response
```json
{
  "success": true,
  "workflowId": "workflow-123",
  "status": "started",
  "message": "Project analysis started successfully"
}
```

### Execute Architecture Analysis

**POST** `/api/projects/:projectId/analysis/architecture`

Analyze project architecture and structure.

#### Request Body
```json
{
  "options": {
    "includePatterns": true,
    "analyzeDependencies": true
  }
}
```

### Execute Code Quality Analysis

**POST** `/api/projects/:projectId/analysis/code-quality`

Analyze code quality metrics and patterns.

#### Request Body
```json
{
  "options": {
    "includeMetrics": true,
    "checkStyle": true,
    "complexityAnalysis": true
  }
}
```

### Execute Tech Stack Analysis

**POST** `/api/projects/:projectId/analysis/tech-stack`

Analyze technology stack and frameworks.

#### Request Body
```json
{
  "options": {
    "detectFrameworks": true,
    "versionAnalysis": true
  }
}
```

### Execute Manifest Analysis

**POST** `/api/projects/:projectId/analysis/manifest`

Analyze project manifests and configuration files.

#### Request Body
```json
{
  "options": {
    "scanConfigFiles": true,
    "detectPackageManager": true
  }
}
```

### Execute Security Analysis

**POST** `/api/projects/:projectId/analysis/security`

Analyze security vulnerabilities and best practices.

#### Request Body
```json
{
  "options": {
    "vulnerabilityScan": true,
    "dependencyCheck": true,
    "securityAudit": true
  }
}
```

### Execute Performance Analysis

**POST** `/api/projects/:projectId/analysis/performance`

Analyze performance metrics and bottlenecks.

#### Request Body
```json
{
  "options": {
    "performanceMetrics": true,
    "bottleneckAnalysis": true
  }
}
```

### Execute Dependency Analysis

**POST** `/api/projects/:projectId/analysis/dependencies`

Analyze project dependencies and their relationships.

#### Request Body
```json
{
  "options": {
    "dependencyTree": true,
    "versionConflicts": true
  }
}
```

### Execute Comprehensive Analysis

**POST** `/api/projects/:projectId/analysis/comprehensive`

Execute all analysis types in a single workflow.

#### Request Body
```json
{
  "options": {
    "includeAllTypes": true,
    "parallelExecution": true
  }
}
```

---

## Results Routes

### Get Analysis History

**GET** `/api/projects/:projectId/analysis/history`

Retrieve analysis execution history.

#### Query Parameters
- `limit` (optional): Number of results to return (default: 10)
- `offset` (optional): Number of results to skip (default: 0)
- `type` (optional): Filter by analysis type

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "analysis-123",
      "type": "project-analysis",
      "status": "completed",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "completedAt": "2024-01-01T12:05:00.000Z",
      "duration": 300
    }
  ]
}
```

### Get Analysis Metrics

**GET** `/api/projects/:projectId/analysis/metrics`

Retrieve aggregated analysis metrics.

#### Response
```json
{
  "success": true,
  "data": {
    "totalAnalyses": 25,
    "averageDuration": 180,
    "successRate": 0.96,
    "lastAnalysis": "2024-01-01T12:00:00.000Z"
  }
}
```

### Get Analysis Status

**GET** `/api/projects/:projectId/analysis/status`

Get current analysis status and progress.

#### Response
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "currentWorkflow": null,
    "lastCompleted": "2024-01-01T12:00:00.000Z"
  }
}
```

### Get Analysis File

**GET** `/api/projects/:projectId/analysis/files/:filename`

Download analysis result files.

#### Path Parameters
- `filename`: Name of the analysis file to download

#### Response
File download with appropriate content-type header.

### Get Analysis from Database

**GET** `/api/projects/:projectId/analysis/database`

Retrieve analysis results stored in database.

#### Query Parameters
- `type` (optional): Filter by analysis type
- `limit` (optional): Number of results to return

---

## Component Routes

### Get Analysis Issues

**GET** `/api/projects/:projectId/analysis/issues`

Retrieve issues found during analysis.

#### Query Parameters
- `severity` (optional): Filter by issue severity (low, medium, high, critical)
- `type` (optional): Filter by issue type

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "issue-123",
      "type": "security",
      "severity": "high",
      "title": "SQL Injection Vulnerability",
      "description": "Potential SQL injection in user input",
      "location": "src/controllers/UserController.js:45"
    }
  ]
}
```

### Get Analysis Tech Stack

**GET** `/api/projects/:projectId/analysis/techstack`

Retrieve detected technology stack.

#### Response
```json
{
  "success": true,
  "data": {
    "frameworks": ["React", "Express"],
    "languages": ["JavaScript", "TypeScript"],
    "databases": ["PostgreSQL"],
    "tools": ["Webpack", "ESLint"]
  }
}
```

### Get Analysis Architecture

**GET** `/api/projects/:projectId/analysis/architecture`

Retrieve architecture analysis results.

#### Response
```json
{
  "success": true,
  "data": {
    "patterns": ["MVC", "Repository"],
    "layers": ["Presentation", "Business", "Data"],
    "components": ["Controllers", "Services", "Models"]
  }
}
```

### Get Analysis Recommendations

**GET** `/api/projects/:projectId/analysis/recommendations`

Retrieve improvement recommendations.

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "rec-123",
      "category": "performance",
      "priority": "high",
      "title": "Optimize Database Queries",
      "description": "Consider adding database indexes",
      "impact": "High"
    }
  ]
}
```

### Get Analysis Charts

**GET** `/api/projects/:projectId/analysis/charts/:type`

Retrieve chart data for visualization.

#### Path Parameters
- `type`: Chart type (metrics, trends, distribution)

#### Response
```json
{
  "success": true,
  "data": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [
      {
        "label": "Code Quality Score",
        "data": [85, 87, 89]
      }
    ]
  }
}
```

---

## Legacy Compatibility

### Get Project Analysis (Legacy)

**GET** `/api/projects/:projectId/analysis/:analysisId`

Retrieve specific analysis by ID (legacy endpoint).

#### Path Parameters
- `analysisId`: Unique analysis identifier

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request parameters",
  "details": {
    "field": "options",
    "message": "Options object is required"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Analysis not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Analysis execution failed"
}
```

---

## Rate Limiting

Analysis endpoints are subject to rate limiting:
- **Authenticated users**: 100 requests per hour
- **Unauthenticated users**: 10 requests per hour

---

## WebSocket Events

The analysis API also supports real-time updates via WebSocket:

### Analysis Started
```json
{
  "type": "analysis:started",
  "data": {
    "workflowId": "workflow-123",
    "projectId": "project-456",
    "type": "project-analysis"
  }
}
```

### Analysis Completed
```json
{
  "type": "analysis:completed",
  "data": {
    "workflowId": "workflow-123",
    "projectId": "project-456",
    "type": "project-analysis",
    "results": { /* analysis results */ }
  }
}
```

### Analysis Failed
```json
{
  "type": "analysis:failed",
  "data": {
    "workflowId": "workflow-123",
    "projectId": "project-456",
    "error": "Analysis execution failed"
  }
}
``` 