# Phase 1: Backend API Extension

## Overview
Extend the existing GitController with version management endpoints and create the necessary backend infrastructure for git version management operations.

## Estimated Time: 4 hours

## Tasks

### 1. Extend GitController with Version Management Endpoints (1.5 hours)
- [ ] Add `POST /api/projects/:projectId/git/version/bump` endpoint
- [ ] Add `GET /api/projects/:projectId/git/version/current` endpoint
- [ ] Add `POST /api/projects/:projectId/git/version/tag` endpoint
- [ ] Add `GET /api/projects/:projectId/git/version/history` endpoint
- [ ] Add `POST /api/projects/:projectId/git/version/changelog` endpoint
- [ ] Add `POST /api/projects/:projectId/git/version/release` endpoint

### 2. Create GitVersionManagementHandler (1 hour)
- [ ] Implement CQRS command handler for version management
- [ ] Add command validation and error handling
- [ ] Integrate with existing git application service
- [ ] Add logging and metrics

### 3. Implement GitVersionService (1 hour)
- [ ] Create service for git version operations
- [ ] Implement version bumping logic
- [ ] Add git tag creation and management
- [ ] Integrate with existing changelog generation script
- [ ] Add release publishing functionality

### 4. Create Version Management Commands (0.5 hours)
- [ ] Define command objects for CQRS pattern
- [ ] Add command validation
- [ ] Implement command serialization

## Technical Details

### API Endpoints
```javascript
// Version bump endpoint
POST /api/projects/:projectId/git/version/bump
{
  "bumpType": "major|minor|patch",
  "projectPath": "/path/to/project",
  "message": "Version bump message"
}

// Current version endpoint
GET /api/projects/:projectId/git/version/current?projectPath=/path/to/project

// Create tag endpoint
POST /api/projects/:projectId/git/version/tag
{
  "tagName": "v1.0.0",
  "projectPath": "/path/to/project",
  "message": "Release v1.0.0"
}

// Version history endpoint
GET /api/projects/:projectId/git/version/history?projectPath=/path/to/project

// Generate changelog endpoint
POST /api/projects/:projectId/git/version/changelog
{
  "fromVersion": "1.0.0",
  "toVersion": "1.1.0",
  "projectPath": "/path/to/project"
}

// Create release endpoint
POST /api/projects/:projectId/git/version/release
{
  "version": "1.1.0",
  "projectPath": "/path/to/project",
  "releaseNotes": "Release notes"
}
```

### Command Objects
```javascript
class GitVersionBumpCommand {
  constructor({ projectId, projectPath, bumpType, message }) {
    this.projectId = projectId;
    this.projectPath = projectPath;
    this.bumpType = bumpType;
    this.message = message;
  }
}

class GitVersionTagCommand {
  constructor({ projectId, projectPath, tagName, message }) {
    this.projectId = projectId;
    this.projectPath = projectPath;
    this.tagName = tagName;
    this.message = message;
  }
}
```

## Success Criteria
- [ ] All API endpoints respond correctly
- [ ] Version management operations work with existing git workflow
- [ ] Error handling is comprehensive
- [ ] Logging is properly implemented
- [ ] Commands follow CQRS pattern

## Dependencies
- Existing GitController
- GitApplicationService
- VersionManagementService
- Changelog generation script

## Next Phase
Phase 2: Frontend Version Management UI
