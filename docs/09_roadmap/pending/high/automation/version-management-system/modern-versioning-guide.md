# Moderne Versionierung - Komplette Anleitung

## 🎯 Semantic Versioning (SemVer) - Industriestandard

### Grundregeln
**Format: `MAJOR.MINOR.PATCH`** (z.B. `1.2.3`)

- **MAJOR** (1): Breaking Changes - Inkompatible API-Änderungen
- **MINOR** (2): Neue Features - Rückwärtskompatibel
- **PATCH** (3): Bug Fixes - Rückwärtskompatibel

### Prä-Release Versionen
- **Alpha**: `1.0.0-alpha.1` - Frühe Entwicklung
- **Beta**: `1.0.0-beta.1` - Feature-komplett, Testing
- **RC**: `1.0.0-rc.1` - Release Candidate
- **Snapshot**: `1.0.0-SNAPSHOT` - Entwicklungsversion

## 📋 Versionierung Workflow

### 1. **Entwicklungsphase**
```bash
# Aktuelle Version: 1.0.3
# Entwicklung für Feature
git checkout -b feature/new-authentication
# ... Entwicklung ...
git commit -m "feat: add OAuth2 authentication"
```

### 2. **Version Bump Entscheidung**
```bash
# PATCH (1.0.3 → 1.0.4) - Bug Fixes
git commit -m "fix: resolve login timeout issue"

# MINOR (1.0.3 → 1.1.0) - Neue Features
git commit -m "feat: add user profile management"

# MAJOR (1.0.3 → 2.0.0) - Breaking Changes
git commit -m "feat!: redesign API endpoints (BREAKING CHANGE)"
```

### 3. **Version Update Process**
```bash
# Automatisch über Version Management System
node -e "
const CentralVersionManager = require('./backend/config/version/CentralVersionManager');
const manager = new CentralVersionManager();
manager.updateVersion('1.1.0', {
  commits: 15,
  sinceVersion: 'v1.0.3'
});
"

# Oder manuell
npm version minor  # 1.0.3 → 1.1.0
npm version patch  # 1.0.3 → 1.0.4
npm version major  # 1.0.3 → 2.0.0
```

### 4. **Release Process**
```bash
# 1. Version bump
npm version minor

# 2. Changelog generieren
node scripts/generate-release-changelog.js 1.0.3 1.1.0

# 3. Git tag erstellen
git tag v1.1.0

# 4. Release erstellen
git push origin main --tags

# 5. GitHub Release erstellen (manuell oder automatisch)
```

## 🏭 Industriestandards

### **Conventional Commits**
```bash
# Format: type(scope): description
feat(auth): add OAuth2 authentication
fix(api): resolve timeout issue
docs(readme): update installation guide
style(ui): improve button design
refactor(db): optimize query performance
test(auth): add unit tests for login
chore(deps): update dependencies
```

### **Commit Types & Version Impact**
- **feat**: → MINOR bump (neue Features)
- **fix**: → PATCH bump (Bug Fixes)
- **BREAKING CHANGE**: → MAJOR bump
- **docs, style, refactor, test, chore**: → Kein Bump (außer bei Breaking Changes)

### **Branch Strategy**
```bash
# Feature Branches
feature/user-management
feature/payment-integration

# Bug Fix Branches  
bugfix/login-timeout
bugfix/memory-leak

# Hotfix Branches (für Production)
hotfix/security-patch
hotfix/critical-bug

# Release Branches
release/1.1.0
release/2.0.0
```

## 🔧 Automatisierung

### **1. Pre-commit Hooks**
```json
// .husky/pre-commit
#!/bin/sh
npm run lint
npm run test
npm run version-check
```

### **2. CI/CD Pipeline**
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate Changelog
        run: node scripts/generate-release-changelog.js
      - name: Create Release
        uses: actions/create-release@v1
```

### **3. Automated Version Bumping**
```javascript
// scripts/auto-version.js
const conventionalCommits = require('conventional-commits');

function determineVersionBump(commits) {
  let bumpType = 'patch'; // Default
  
  commits.forEach(commit => {
    if (commit.type === 'feat') {
      bumpType = 'minor';
    }
    if (commit.breaking) {
      bumpType = 'major';
    }
  });
  
  return bumpType;
}
```

## 📊 Version Management Best Practices

### **1. Single Source of Truth**
```javascript
// ✅ RICHTIG - Zentrale Version
const version = require('./backend/config/version/version.json').version;

// ❌ FALSCH - Hardcoded Version
const version = "1.0.3";
```

### **2. Version Validation**
```javascript
// Pre-release Validation
function validateVersion(version) {
  const semver = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semver.test(version);
}
```

### **3. Version Compatibility**
```javascript
// API Versioning
const API_VERSION = 'v1';
const ENDPOINT = `/api/${API_VERSION}/users`;

// Database Schema Versioning
const SCHEMA_VERSION = '1.2.0';
```

## 🚀 Release Management

### **1. Release Types**
- **Patch Release**: Nur Bug Fixes (1.0.3 → 1.0.4)
- **Minor Release**: Neue Features (1.0.3 → 1.1.0)
- **Major Release**: Breaking Changes (1.0.3 → 2.0.0)
- **Hotfix Release**: Kritische Fixes (1.0.3 → 1.0.4-hotfix.1)

### **2. Release Checklist**
```markdown
## Release Checklist v1.1.0

### Pre-Release
- [ ] Alle Tests bestehen
- [ ] Code Review abgeschlossen
- [ ] Dokumentation aktualisiert
- [ ] Changelog generiert
- [ ] Version bumped
- [ ] Git tag erstellt

### Release
- [ ] GitHub Release erstellt
- [ ] Release Notes veröffentlicht
- [ ] Deployment durchgeführt
- [ ] Monitoring aktiviert

### Post-Release
- [ ] Release dokumentiert
- [ ] Team informiert
- [ ] Metrics überwacht
- [ ] Feedback gesammelt
```

### **3. Rollback Strategy**
```bash
# Rollback zu vorheriger Version
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0
git checkout v1.0.3
git checkout -b hotfix/rollback-1.1.0
```

## 📈 Version Tracking

### **1. Version History**
```sql
-- Version Tracking Table
CREATE TABLE version_history (
  id UUID PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  previous_version VARCHAR(20),
  bump_type VARCHAR(10), -- major, minor, patch
  release_date TIMESTAMP,
  commit_hash VARCHAR(40),
  changelog TEXT,
  created_by VARCHAR(100)
);
```

### **2. Version Metrics**
```javascript
// Version Analytics
const versionMetrics = {
  releasesPerMonth: 2.5,
  averageTimeBetweenReleases: '14 days',
  patchReleaseRatio: 0.6,
  minorReleaseRatio: 0.3,
  majorReleaseRatio: 0.1
};
```

## 🔒 Security & Compliance

### **1. Security Versioning**
```bash
# Security Patches
1.0.3-security.1  # Security Fix
1.0.3-security.2  # Additional Security Fix
```

### **2. Compliance Tracking**
```javascript
// Compliance Versioning
const complianceVersions = {
  gdpr: '1.2.0',
  ccpa: '1.3.0',
  sox: '1.4.0'
};
```

## 🎯 PIDEA-spezifische Regeln

### **1. Version Update Process**
```bash
# 1. Entwickeln auf Feature Branch
git checkout -b feature/new-feature

# 2. Commits mit Conventional Commits
git commit -m "feat: add new feature"
git commit -m "test: add unit tests"
git commit -m "docs: update documentation"

# 3. Version Bump über CentralVersionManager
node -e "
const CentralVersionManager = require('./backend/config/version/CentralVersionManager');
const manager = new CentralVersionManager();
manager.updateVersion('1.1.0');
"

# 4. Alle Dateien synchronisieren
node scripts/sync-versions.js

# 5. Release erstellen
node scripts/generate-release-changelog.js 1.0.3 1.1.0
git tag v1.1.0
git push origin main --tags
```

### **2. Version Validation**
```bash
# Vor jedem Release
npm run version:validate
npm run version:sync
npm run version:check
```

### **3. Automatisierung**
```json
// package.json scripts
{
  "scripts": {
    "version:patch": "node scripts/version-bump.js patch",
    "version:minor": "node scripts/version-bump.js minor", 
    "version:major": "node scripts/version-bump.js major",
    "version:sync": "node scripts/sync-versions.js",
    "version:validate": "node scripts/validate-versions.js",
    "release:create": "node scripts/generate-release-changelog.js"
  }
}
```

## 📚 Tools & Libraries

### **1. Version Management Tools**
- **semver**: Semantic Versioning Parser
- **conventional-changelog**: Changelog Generation
- **standard-version**: Automated Versioning
- **release-it**: Release Automation

### **2. Git Hooks**
- **husky**: Git Hooks Management
- **lint-staged**: Pre-commit Linting
- **commitizen**: Conventional Commits

### **3. CI/CD Integration**
- **GitHub Actions**: Automated Releases
- **GitLab CI**: Pipeline Integration
- **Jenkins**: Enterprise CI/CD

---

## 🎯 Zusammenfassung

**Moderne Versionierung folgt diesen Prinzipien:**

1. **Semantic Versioning** - MAJOR.MINOR.PATCH
2. **Conventional Commits** - Strukturierte Commit Messages
3. **Automatisierung** - CI/CD Pipeline Integration
4. **Single Source of Truth** - Zentrale Versionsverwaltung
5. **Validation** - Konsistenz-Checks vor Release
6. **Documentation** - Vollständige Changelogs
7. **Rollback Strategy** - Sicherheitsmechanismen

**Für PIDEA bedeutet das:**
- ✅ CentralVersionManager als Single Source of Truth
- ✅ Automatische Synchronisation aller Dateien
- ✅ Conventional Commits für automatische Version Bumps
- ✅ Vollständige Changelog Generation
- ✅ Git Tags für Releases
- ✅ GitHub Release Integration

**Das ist der moderne Industriestandard für professionelle Software-Entwicklung!** 🚀
