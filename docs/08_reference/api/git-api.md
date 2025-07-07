# Git Management API

Complete documentation for the Git management API endpoints.

## Base URL

```
/api/projects/:projectId/git
```

## Authentication

All Git endpoints require authentication. Include your authentication token in the request headers.

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error message"
}
```

## Endpoints

### Get Git Status

**POST** `/api/projects/:projectId/git/status`

Get the current Git status for a project.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "status": {
      "modified": ["file1.js", "file2.js"],
      "added": ["newfile.js"],
      "deleted": ["oldfile.js"],
      "untracked": ["temp.js"]
    },
    "currentBranch": "feature/new-feature",
    "lastCommit": {
      "hash": "abc123",
      "message": "Add new feature",
      "author": "John Doe",
      "date": "2024-01-01T12:00:00.000Z"
    },
    "isGitRepository": true
  },
  "message": "Git status retrieved successfully"
}
```

### Get Branches

**POST** `/api/projects/:projectId/git/branches`

Get all branches for a project.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "branches": [
      "main",
      "feature/new-feature",
      "bugfix/issue-123"
    ],
    "currentBranch": "feature/new-feature"
  },
  "message": "Branches retrieved successfully"
}
```

### Validate Changes

**POST** `/api/projects/:projectId/git/validate`

Validate the current Git changes and provide recommendations.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "hasChanges": true,
    "modifiedFiles": 2,
    "addedFiles": 1,
    "deletedFiles": 0,
    "untrackedFiles": 3,
    "currentBranch": "feature/new-feature",
    "isValid": true,
    "warnings": [
      "Many untracked files (3). Consider adding to .gitignore"
    ],
    "errors": []
  },
  "message": "Validation completed successfully"
}
```

### Compare Branches

**POST** `/api/projects/:projectId/git/compare`

Compare two branches and show the differences.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project",
  "sourceBranch": "feature/new-feature",
  "targetBranch": "main"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "diff": "diff --git a/file1.js b/file1.js\nindex abc123..def456 100644\n--- a/file1.js\n+++ b/file1.js\n@@ -1,3 +1,4 @@\n console.log('Hello');\n+console.log('World');\n",
    "sourceHistory": [
      {
        "hash": "abc123",
        "message": "Add new feature",
        "author": "John Doe",
        "date": "2024-01-01T12:00:00.000Z"
      }
    ],
    "targetHistory": [
      {
        "hash": "def456",
        "message": "Update main",
        "author": "Jane Smith",
        "date": "2024-01-01T10:00:00.000Z"
      }
    ],
    "sourceBranch": "feature/new-feature",
    "targetBranch": "main"
  },
  "message": "Branch comparison completed successfully"
}
```

### Pull Changes

**POST** `/api/projects/:projectId/git/pull`

Pull the latest changes from the remote repository.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project",
  "branch": "main",
  "remote": "origin"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "output": "Already up to date.",
    "branch": "main",
    "remote": "origin"
  },
  "message": "Changes pulled successfully"
}
```

### Checkout Branch

**POST** `/api/projects/:projectId/git/checkout`

Switch to a different branch.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project",
  "branch": "feature/new-feature"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "output": "Switched to branch 'feature/new-feature'",
    "branch": "feature/new-feature"
  },
  "message": "Switched to branch: feature/new-feature"
}
```

### Merge Branches

**POST** `/api/projects/:projectId/git/merge`

Merge a source branch into a target branch.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project",
  "sourceBranch": "feature/new-feature",
  "targetBranch": "main"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "output": "Merge made by the 'recursive' strategy.",
    "sourceBranch": "feature/new-feature",
    "targetBranch": "main"
  },
  "message": "Successfully merged feature/new-feature into main"
}
```

### Create Branch

**POST** `/api/projects/:projectId/git/create-branch`

Create a new branch from a specified starting point.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project",
  "branchName": "feature/another-feature",
  "startPoint": "main"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "output": "Created branch 'feature/another-feature'",
    "branchName": "feature/another-feature",
    "startPoint": "main"
  },
  "message": "Branch 'feature/another-feature' created successfully"
}
```

### Get Repository Info

**POST** `/api/projects/:projectId/git/info`

Get detailed information about the Git repository.

#### Path Parameters

- `projectId`: The unique identifier for the project

#### Request Body

```json
{
  "projectPath": "/path/to/project"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "repository": {
      "name": "my-project",
      "url": "https://github.com/user/my-project.git",
      "remote": "origin",
      "defaultBranch": "main"
    },
    "status": {
      "isGitRepository": true,
      "hasRemote": true,
      "isClean": false
    },
    "statistics": {
      "totalCommits": 150,
      "totalBranches": 8,
      "lastCommit": "2024-01-01T12:00:00.000Z"
    }
  },
  "message": "Repository info retrieved successfully"
}
```

## Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Bad Request | Missing required parameters (projectId, projectPath, etc.) |
| 401 | Unauthorized | Authentication required |
| 404 | Not Found | Project or Git repository not found |
| 500 | Internal Server Error | Git operation failed |

## Common Error Responses

### Missing Project ID

```json
{
  "success": false,
  "error": "Project ID is required"
}
```

### Missing Project Path

```json
{
  "success": false,
  "error": "Project path is required"
}
```

### Not a Git Repository

```json
{
  "success": false,
  "error": "Not a Git repository"
}
```

### Git Operation Failed

```json
{
  "success": false,
  "error": "Failed to execute Git operation",
  "message": "git: 'invalid-command' is not a git command"
}
```

## Examples

### cURL Examples

```bash
# Get Git status
curl -X POST http://localhost:3000/api/projects/myproject/git/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"projectPath": "/path/to/project"}'

# Create a new branch
curl -X POST http://localhost:3000/api/projects/myproject/git/create-branch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectPath": "/path/to/project",
    "branchName": "feature/new-feature",
    "startPoint": "main"
  }'

# Merge branches
curl -X POST http://localhost:3000/api/projects/myproject/git/merge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectPath": "/path/to/project",
    "sourceBranch": "feature/new-feature",
    "targetBranch": "main"
  }'
```

### JavaScript Examples

```javascript
// Get Git status
const response = await fetch('/api/projects/myproject/git/status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    projectPath: '/path/to/project'
  })
});

const result = await response.json();

// Create a new branch
const branchResponse = await fetch('/api/projects/myproject/git/create-branch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    projectPath: '/path/to/project',
    branchName: 'feature/new-feature',
    startPoint: 'main'
  })
});

const branchResult = await branchResponse.json();
```

## Security Considerations

- All Git operations require authentication
- Project ID validation ensures users can only access authorized projects
- Git operations are restricted to the specified project path
- All operations are logged for audit purposes
- Dangerous Git commands are automatically blocked

## Rate Limiting

Git API endpoints are subject to rate limiting to prevent abuse:

- **Standard endpoints**: 100 requests per minute per user
- **Merge operations**: 10 requests per minute per user
- **Branch creation**: 20 requests per minute per user

## WebSocket Events

The Git API also publishes real-time events via WebSocket:

- `git.status.retrieved`: Git status updated
- `git.branch.created`: New branch created
- `git.checkout.completed`: Branch checkout completed
- `git.merge.completed`: Branch merge completed
- `git.pull.completed`: Pull operation completed

## Best Practices

1. **Always validate changes** before merging
2. **Use descriptive branch names** for better organization
3. **Pull latest changes** before creating new branches
4. **Test after merging** to ensure everything works
5. **Use feature branches** for new development
6. **Keep commits atomic** and well-documented

## Integration with IDE

The Git API integrates seamlessly with the IDE:

- Real-time status updates in the IDE interface
- Automatic branch detection and switching
- Visual diff viewing and conflict resolution
- Terminal automation for complex Git operations
- Integration with the task execution system 