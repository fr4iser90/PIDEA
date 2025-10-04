# Phase 2: Frontend Version Management UI

## Overview
Create the frontend components for version management integration into the git view, including changelog generation, tag management, and release publishing.

## Estimated Time: 6 hours

## Tasks

### 1. Create VersionManagementSection Component (2 hours)
- [ ] Create main version management section component
- [ ] Add version status display
- [ ] Implement version bump controls
- [ ] Add version history display
- [ ] Integrate with existing git status

### 2. Implement ChangelogGenerator Component (1.5 hours)
- [ ] Create changelog generation UI
- [ ] Add version range selection
- [ ] Implement changelog preview
- [ ] Add changelog export functionality
- [ ] Integrate with existing changelog script

### 3. Build ReleaseManager Component (1.5 hours)
- [ ] Create release management UI
- [ ] Add release notes editor
- [ ] Implement release publishing
- [ ] Add release status tracking
- [ ] Integrate with GitHub API (without CLI)

### 4. Create TagManager Component (1 hour)
- [ ] Create git tag management UI
- [ ] Add tag creation form
- [ ] Implement tag listing and deletion
- [ ] Add tag validation
- [ ] Integrate with git operations

## Technical Details

### Component Structure
```jsx
// VersionManagementSection.jsx
const VersionManagementSection = ({ projectPath, gitStatus, onVersionOperation }) => {
  const [currentVersion, setCurrentVersion] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="version-management-section">
      <VersionStatus currentVersion={currentVersion} />
      <VersionControls onBumpVersion={handleBumpVersion} />
      <ChangelogGenerator projectPath={projectPath} />
      <TagManager projectPath={projectPath} />
      <ReleaseManager projectPath={projectPath} />
    </div>
  );
};

// ChangelogGenerator.jsx
const ChangelogGenerator = ({ projectPath }) => {
  const [fromVersion, setFromVersion] = useState('');
  const [toVersion, setToVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="changelog-generator">
      <VersionRangeSelector 
        fromVersion={fromVersion}
        toVersion={toVersion}
        onFromChange={setFromVersion}
        onToChange={setToVersion}
      />
      <ChangelogPreview changelog={changelog} />
      <ChangelogActions onGenerate={handleGenerate} onExport={handleExport} />
    </div>
  );
};

// TagManager.jsx
const TagManager = ({ projectPath }) => {
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagMessage, setNewTagMessage] = useState('');

  return (
    <div className="tag-manager">
      <TagList tags={tags} onDelete={handleDeleteTag} />
      <TagCreationForm 
        tagName={newTagName}
        tagMessage={newTagMessage}
        onTagNameChange={setNewTagName}
        onTagMessageChange={setNewTagMessage}
        onCreate={handleCreateTag}
      />
    </div>
  );
};

// ReleaseManager.jsx
const ReleaseManager = ({ projectPath }) => {
  const [releases, setReleases] = useState([]);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');

  return (
    <div className="release-manager">
      <ReleaseList releases={releases} />
      <ReleaseCreationForm 
        version={selectedVersion}
        notes={releaseNotes}
        onVersionChange={setSelectedVersion}
        onNotesChange={setReleaseNotes}
        onPublish={handlePublishRelease}
      />
    </div>
  );
};
```

### API Integration
```javascript
// Add to APIChatRepository.jsx
class APIChatRepository {
  // Version management methods
  async bumpVersion(projectId, projectPath, bumpType, message) {
    return await this.apiCall(`/api/projects/${projectId}/git/version/bump`, 'POST', {
      projectPath,
      bumpType,
      message
    });
  }

  async getCurrentVersion(projectId, projectPath) {
    return await this.apiCall(`/api/projects/${projectId}/git/version/current?projectPath=${encodeURIComponent(projectPath)}`);
  }

  async createTag(projectId, projectPath, tagName, message) {
    return await this.apiCall(`/api/projects/${projectId}/git/version/tag`, 'POST', {
      projectPath,
      tagName,
      message
    });
  }

  async getVersionHistory(projectId, projectPath) {
    return await this.apiCall(`/api/projects/${projectId}/git/version/history?projectPath=${encodeURIComponent(projectPath)}`);
  }

  async generateChangelog(projectId, projectPath, fromVersion, toVersion) {
    return await this.apiCall(`/api/projects/${projectId}/git/version/changelog`, 'POST', {
      projectPath,
      fromVersion,
      toVersion
    });
  }

  async publishRelease(projectId, projectPath, version, releaseNotes) {
    return await this.apiCall(`/api/projects/${projectId}/git/version/release`, 'POST', {
      projectPath,
      version,
      releaseNotes
    });
  }
}
```

### Styling
```css
/* Add to git.css */
.version-management-section {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.version-status {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.version-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.changelog-generator,
.tag-manager,
.release-manager {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background-color: white;
}

.version-bump-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.version-bump-btn:hover {
  background-color: #0056b3;
}
```

## Success Criteria
- [ ] All components render correctly
- [ ] Version management operations work
- [ ] Changelog generation works
- [ ] Tag management works
- [ ] Release publishing works
- [ ] UI is responsive and user-friendly

## Dependencies
- Existing git management component
- APIChatRepository
- Backend API endpoints from Phase 1

## Next Phase
Phase 3: Integration with Git View
