# Prompt: Universal Changelog Generator

## Goal
Generate comprehensive changelogs for any Git comparison scenario - branch-to-branch, release-to-release, or main branch updates. Automatically adapts output format based on comparison type and audience needs.

## Phase
Analyze Git history, collect all data needed, generate appropriate changelog format automatically.

## 🚀 QUICK USAGE EXAMPLES

### Branch-to-Branch Comparison (Technical)
```
@task-changelog.md Compare 'pidea-agent' branch to 'main' branch. Generate detailed changelog with all technical changes, file modifications, and breaking changes.
```

### Release-to-Release Comparison (User-Friendly)
```
@task-changelog.md Compare version 2.0.0 to version 2.1.0. Generate user-friendly release changelog with new features, improvements, and migration guide.
```

### Main Branch Updates (Development Progress)
```
@task-changelog.md Compare latest updates on main branch since last week. Generate development progress changelog with technical details and feature status.
```

### Specific Focus Areas
```
@task-changelog.md Compare 'feature/chat-selector' to 'main'. Focus specifically on chat selector collection changes, backend API modifications, and security enhancements.
```

### Latest Changes Only
```
@task-changelog.md Compare latest 10 commits on main branch. Generate changelog with recent changes, bug fixes, and improvements.
```

### Time-Based Comparison
```
@task-changelog.md Compare main branch changes from 2024-01-01 to 2024-01-15. Generate changelog with all changes in this time period.
```

## 📋 WHAT THE PROMPT AUTOMATICALLY DOES

- ✅ **Detects comparison type** (Branch-to-Branch, Release-to-Release, Main-Updates)
- ✅ **Adapts output format** (Technical/User-friendly/Development)
- ✅ **Analyzes Git history** automatically
- ✅ **Categorizes commits** (Features, Bugfixes, Refactoring, etc.)
- ✅ **Identifies breaking changes** and highlights them
- ✅ **Generates migration guides** for developers and users
- ✅ **Creates risk assessment** with mitigation strategies
- ✅ **Includes quality metrics** (performance, security, code quality)
- ✅ **Provides actionable recommendations**

## 🎯 USAGE PATTERNS

### For Developers (Technical Focus)
- Branch comparisons
- Code reviews
- Technical analysis
- Breaking change detection
- Migration planning

### For Users (User-Friendly Focus)
- Release notes
- Feature announcements
- User migration guides
- Performance improvements
- Bug fix summaries

### For Project Management (Development Focus)
- Sprint progress
- Feature completion status
- Development milestones
- Team progress tracking
- Technical debt updates

## Template Structure

### 1. Changelog Overview
- **Comparison Type**: [Branch-to-Branch/Release-to-Release/Main-Branch-Update]
- **Source**: [Source branch/version/commit]
- **Target**: [Target branch/version/commit]
- **Date Range**: [Start date] to [End date]
- **Total Commits**: [Number of commits analyzed]
- **Files Changed**: [Total number of files modified]
- **Lines Added**: [Total lines added]
- **Lines Removed**: [Total lines removed]
- **Generated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`

### 2. Automatic Format Detection

#### Branch-to-Branch Comparison (Detailed Technical)
- **Purpose**: Comprehensive technical documentation for developers
- **Audience**: Developers, technical teams, code reviewers
- **Format**: Detailed technical sections with full commit analysis
- **Content**: All commits, file changes, technical details, breaking changes

#### Release-to-Release Comparison (User-Friendly)
- **Purpose**: User-friendly release documentation
- **Audience**: End users, stakeholders, product managers
- **Format**: Clean, emoji-enhanced sections focusing on user benefits
- **Content**: Features, improvements, bug fixes, migration guides

#### Main Branch Updates (Development Progress)
- **Purpose**: Development progress tracking
- **Audience**: Development team, project managers
- **Format**: Structured progress updates with technical context
- **Content**: Development milestones, feature progress, bug fixes

### 3. Commit Analysis

#### Major Commits (High Impact)
- **Commit Hash**: `[short-hash]` - [Commit message]
  - **Author**: [Author name]
  - **Date**: [Commit date]
  - **Files Changed**: [Number of files]
  - **Impact**: [High/Medium/Low]
  - **Category**: [Feature/Bugfix/Refactor/Documentation/Configuration]
  - **Description**: [Detailed description of changes]
  - **Files Modified**:
    - `path/to/file.js` - [Description of changes]
    - `path/to/file.jsx` - [Description of changes]
    - `path/to/file.md` - [Description of changes]

#### Feature Commits
- **Commit Hash**: `[short-hash]` - [Commit message]
  - **Feature**: [Feature name]
  - **Components**: [List of components affected]
  - **API Changes**: [New endpoints, modifications]
  - **Database Changes**: [Schema updates, migrations]
  - **Frontend Changes**: [UI components, state management]
  - **Backend Changes**: [Services, controllers, handlers]

#### Bugfix Commits
- **Commit Hash**: `[short-hash]` - [Commit message]
  - **Issue**: [Bug description]
  - **Root Cause**: [Technical explanation]
  - **Solution**: [How it was fixed]
  - **Files Affected**: [List of files]
  - **Tests Added**: [Test files created/modified]

#### Refactoring Commits
- **Commit Hash**: `[short-hash]` - [Commit message]
  - **Refactoring Type**: [Code organization, Performance, Architecture]
  - **Motivation**: [Why refactoring was needed]
  - **Changes**: [What was changed]
  - **Benefits**: [Improvements achieved]
  - **Risk Assessment**: [Potential risks introduced]

### 4. File Change Analysis

#### New Files Created
- `path/to/new-file.js` - [Purpose and functionality]
- `path/to/new-file.jsx` - [Purpose and functionality]
- `path/to/new-file.md` - [Purpose and functionality]
- `path/to/new-file.json` - [Purpose and functionality]

#### Files Modified
- `path/to/modified-file.js` - [Summary of changes]
- `path/to/modified-file.jsx` - [Summary of changes]
- `path/to/modified-file.md` - [Summary of changes]

#### Files Deleted
- `path/to/deleted-file.js` - [Reason for deletion]
- `path/to/deleted-file.jsx` - [Reason for deletion]

#### Configuration Files
- `package.json` - [Dependencies added/removed/updated]
- `docker-compose.yml` - [Service changes]
- `.env.example` - [New environment variables]
- `nginx.conf` - [Configuration updates]

### 5. Technical Impact Analysis

#### Architecture Changes
- **Pattern Updates**: [New architectural patterns introduced]
- **Service Modifications**: [Changes to service layer]
- **Database Schema**: [Schema changes and migrations]
- **API Evolution**: [API endpoint changes]
- **Frontend Architecture**: [Component structure changes]

#### Performance Impact
- **Performance Improvements**: [Optimizations made]
- **Performance Regressions**: [Potential slowdowns]
- **Memory Usage**: [Changes in memory consumption]
- **Response Times**: [API response time changes]
- **Bundle Size**: [Frontend bundle size changes]

#### Security Changes
- **Security Enhancements**: [New security measures]
- **Vulnerability Fixes**: [Security issues addressed]
- **Authentication Changes**: [Auth system modifications]
- **Authorization Updates**: [Permission system changes]
- **Data Protection**: [Privacy and data handling updates]

### 6. Dependency Analysis

#### New Dependencies
- **Package**: `package-name@version` - [Purpose and usage]
- **Type**: [Production/Development/Peer]
- **Impact**: [How it affects the project]
- **License**: [License information]
- **Security**: [Known vulnerabilities]

#### Updated Dependencies
- **Package**: `package-name@old-version` → `package-name@new-version`
- **Breaking Changes**: [Any breaking changes in the update]
- **New Features**: [New functionality available]
- **Bug Fixes**: [Issues resolved in the update]

#### Removed Dependencies
- **Package**: `package-name@version` - [Reason for removal]
- **Replacement**: [What replaced it, if anything]
- **Migration Required**: [Any migration needed]

### 7. Breaking Changes (Auto-Detected)

#### API Breaking Changes
- **Change**: [What changed]
- **Impact**: [Who is affected]
- **Migration**: [How to migrate]
- **Timeline**: [When to migrate by]

#### Configuration Breaking Changes
- **Change**: [Configuration change]
- **Impact**: [Who is affected]
- **Migration**: [Migration steps]

#### Database Breaking Changes
- **Change**: [Database change]
- **Impact**: [Who is affected]
- **Migration**: [Migration steps]

### 8. Migration Guide (Auto-Generated)

#### For Developers
- **Code Changes Required**: [What developers need to update]
- **Import Updates**: [Changed import statements]
- **API Usage**: [Updated API calls]
- **Configuration**: [New configuration requirements]

#### For Operations
- **Deployment Steps**: [Required deployment procedures]
- **Database Migration**: [Database update procedures]
- **Environment Setup**: [New environment requirements]
- **Monitoring**: [Updated monitoring configuration]

#### For Users
- **Feature Changes**: [User-facing changes]
- **UI Updates**: [Interface modifications]
- **Workflow Changes**: [Changed user workflows]

### 9. Risk Assessment

#### High Risk Changes
- **Risk**: [Description of high-risk change]
- **Impact**: [Potential negative impact]
- **Mitigation**: [How to mitigate the risk]
- **Rollback Plan**: [How to rollback if needed]

#### Medium Risk Changes
- **Risk**: [Description of medium-risk change]
- **Impact**: [Potential impact]
- **Mitigation**: [Mitigation strategy]

#### Low Risk Changes
- **Risk**: [Description of low-risk change]
- **Impact**: [Minimal impact]
- **Mitigation**: [Simple mitigation]

### 10. Quality Metrics

#### Code Quality
- **Lines of Code**: [Total LOC added/removed]
- **Cyclomatic Complexity**: [Complexity changes]
- **Code Coverage**: [Test coverage percentage]
- **Technical Debt**: [Debt reduction/increase]

#### Performance Metrics
- **Bundle Size**: [Frontend bundle size change]
- **Load Time**: [Page load time changes]
- **API Response**: [API response time changes]
- **Memory Usage**: [Memory consumption changes]

#### Security Metrics
- **Vulnerabilities**: [Security issues found/fixed]
- **Dependencies**: [Secure dependency updates]
- **Code Security**: [Security improvements]

### 11. Recommendations

#### Immediate Actions
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

#### Follow-up Tasks
- [ ] [Follow-up task 1]
- [ ] [Follow-up task 2]
- [ ] [Follow-up task 3]

#### Long-term Considerations
- [ ] [Long-term consideration 1]
- [ ] [Long-term consideration 2]
- [ ] [Long-term consideration 3]

### 12. Git Commands Used

#### Analysis Commands
```bash
# Get commit range
git log --oneline [source]..[target]

# Get file changes
git diff --stat [source]..[target]

# Get detailed diff
git diff [source]..[target]

# Get commit details
git log --pretty=format:"%h - %an, %ar : %s" [source]..[target]
```

#### Branch Information
```bash
# Branch details
git show-branch [source] [target]

# Branch status
git status
```

### 13. Changelog Generation Commands

#### Automated Generation
```bash
# Generate changelog between branches
git log --pretty=format:"%h - %an, %ar : %s" [source]..[target] > changelog-detailed.md

# Generate file changes
git diff --name-status [source]..[target] >> changelog-detailed.md

# Generate commit details
git log --stat [source]..[target] >> changelog-detailed.md
```

#### Manual Analysis Commands
```bash
# Analyze specific commits
git show [commit-hash]

# Check file history
git log --follow path/to/file

# Analyze merge commits
git log --merges [source]..[target]
```

## Usage Instructions

### 1. Comparison Setup
- [ ] Identify source and target (branches/versions/commits)
- [ ] Ensure both are up to date
- [ ] Check for merge conflicts
- [ ] Verify status

### 2. Data Collection
- [ ] Run git log analysis
- [ ] Collect file change statistics
- [ ] Analyze commit messages
- [ ] Review code changes
- [ ] Check dependency updates

### 3. Analysis Process
- [ ] Categorize commits by type
- [ ] Identify breaking changes
- [ ] Assess technical impact
- [ ] Evaluate risk factors
- [ ] Generate recommendations

### 4. Documentation Generation
- [ ] Create appropriate changelog format
- [ ] Include all technical details
- [ ] Add migration guides
- [ ] Provide risk assessment
- [ ] Include quality metrics

### 5. Review and Validation
- [ ] Verify accuracy of information
- [ ] Check completeness of analysis
- [ ] Validate technical details
- [ ] Review recommendations
- [ ] Finalize changelog

## Success Criteria
- [ ] All commits between sources are documented
- [ ] File changes are accurately listed
- [ ] Technical impact is properly assessed
- [ ] Breaking changes are clearly identified
- [ ] Migration guides are comprehensive
- [ ] Risk assessment is complete
- [ ] Recommendations are actionable
- [ ] Quality metrics are included
- [ ] Format is appropriate for audience
- [ ] Content is complete and accurate

## Example Usage

### Branch-to-Branch Comparison
> @task-changelog.md Compare 'pidea-agent' branch to 'main' branch. Generate detailed changelog with all technical changes, file modifications, and breaking changes.

### Release-to-Release Comparison
> @task-changelog.md Compare version 2.0.0 to version 2.1.0. Generate user-friendly release changelog with new features, improvements, and migration guide.

### Main Branch Updates
> @task-changelog.md Compare latest updates on main branch since last week. Generate development progress changelog with technical details and feature status.

### Specific Focus Areas
> @task-changelog.md Compare 'feature/chat-selector' to 'main'. Focus specifically on chat selector collection changes, backend API modifications, and security enhancements.

## Output Format

The changelog should be saved as:
- **File**: `changelog-[comparison-type]-[source]-to-[target].md`
- **Location**: Project root or `docs/changelogs/`
- **Format**: Markdown with clear sections and structure
- **Timestamp**: Include generation timestamp
- **Version**: Include version information if applicable

## Automatic Format Detection

### Branch-to-Branch (Technical Focus)
- Detailed commit analysis
- Full technical impact assessment
- Comprehensive file change documentation
- Developer-focused migration guides
- Risk assessment and recommendations

### Release-to-Release (User Focus)
- User-friendly feature descriptions
- Performance improvements highlighted
- Clear migration instructions
- Breaking changes prominently displayed
- Stakeholder-focused content

### Main Branch Updates (Development Focus)
- Development progress tracking
- Feature completion status
- Bug fix summaries
- Technical debt updates
- Team-focused progress reports

---

**Note**: This universal prompt automatically detects the comparison type and generates appropriate changelog format. It provides comprehensive analysis for any Git comparison scenario while adapting the output to the specific audience and use case.
