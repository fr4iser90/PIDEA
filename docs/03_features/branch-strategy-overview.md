# Branch Strategy Overview

## Branch Architecture

PIDEA uses a three-tier branch architecture for optimal development workflow:

```
main (production)
-----
pidea-ai-main (AI-generated code)
    ↑
pidea-agent (development)
    ↑
feature/test/refactor branches (task-specific)
```

## Base Branches

### `pidea-agent` (Development Branch)
- **Purpose**: Primary development branch
- **Source**: All task branches are created from here
- **Target**: Testing tasks merge back here
- **Access**: All developers and AI

### `pidea-ai-main` (AI Code Branch)
- **Purpose**: Collection point for all AI-generated code
- **Source**: AI-generated features, refactoring, optimizations
- **Target**: Manual review and testing before production
- **Access**: AI tasks, code reviewers

### `main` (Production Branch)
- **Purpose**: Production-ready code
- **Source**: Only critical bug fixes and security patches
- **Target**: Deployment to production
- **Access**: Senior developers, automated deployments

## Task Type Branch Strategies

### AI-Generated Tasks (→ pidea-ai-main)

| Task Type | Branch Prefix | Description | Protection | Auto-Merge |
|-----------|---------------|-------------|------------|------------|
| `feature` | `feature/` | New feature implementation | Medium | No |
| `optimization` | `enhance/` | Performance optimization | Medium | No |
| `refactor` | `refactor/` | Code refactoring | Medium | No |
| `analysis` | `analyze/` | Code analysis | Low | Yes |
| `documentation` | `docs/` | Documentation generation | Low | No |

#### Technology-Specific Refactoring
| Task Type | Branch Prefix | Description |
|-----------|---------------|-------------|
| `refactor_node` | `refactor-node/` | Node.js refactoring |
| `refactor_react` | `refactor-react/` | React refactoring |
| `refactor_frontend` | `refactor-frontend/` | Frontend refactoring |
| `refactor_backend` | `refactor-backend/` | Backend refactoring |
| `refactor_database` | `refactor-db/` | Database refactoring |
| `refactor_api` | `refactor-api/` | API refactoring |

#### Roadmap Features
| Task Type | Branch Prefix | Description | Auto-Merge |
|-----------|---------------|-------------|------------|
| `feature_summary` | `feature-summary/` | Feature summary generation | Yes |
| `feature_implementation` | `feature-impl/` | Feature implementation | No |
| `feature_phase` | `feature-phase/` | Feature phase management | No |
| `feature_index` | `feature-index/` | Feature indexing | Yes |

### Critical Tasks (→ main)

| Task Type | Branch Prefix | Description | Protection | Auto-Merge |
|-----------|---------------|-------------|------------|------------|
| `bug` | `fix/` | Critical bug fixes | High | No |
| `security` | `hotfix/` | Security hotfixes | Critical | No |

### Testing Tasks (→ pidea-agent)

| Task Type | Branch Prefix | Description | Protection | Auto-Merge |
|-----------|---------------|-------------|------------|------------|
| `testing` | `test/` | General testing | Low | Yes |
| `test` | `test/` | Test execution | Low | Yes |
| `test_fix` | `test-fix/` | Test fixes | Medium | No |
| `test_coverage` | `test-coverage/` | Coverage improvements | Low | Yes |
| `test_refactor` | `test-refactor/` | Test refactoring | Medium | No |
| `test_status` | `test-status/` | Status updates | Low | Yes |
| `test_report` | `test-report/` | Report generation | Low | Yes |

#### Technology-Specific Testing
| Task Type | Branch Prefix | Description | Protection |
|-----------|---------------|-------------|------------|
| `test_unit` | `test-unit/` | Unit testing | Low |
| `test_integration` | `test-integration/` | Integration testing | Medium |
| `test_e2e` | `test-e2e/` | End-to-end testing | Medium |
| `test_performance` | `test-performance/` | Performance testing | Medium |
| `test_security` | `test-security/` | Security testing | High |

## Protection Levels

### Low Protection
- **Auto-merge**: Enabled
- **Review required**: No
- **Use cases**: Analysis, documentation, test reports, simple testing

### Medium Protection
- **Auto-merge**: Disabled
- **Review required**: Yes
- **Use cases**: Features, optimizations, refactoring, integration tests

### High Protection
- **Auto-merge**: Disabled
- **Review required**: Yes (multiple reviewers)
- **Use cases**: Bug fixes, database refactoring, security tests

### Critical Protection
- **Auto-merge**: Disabled
- **Review required**: Yes (senior reviewers)
- **Use cases**: Security patches

## Branch Naming Convention

### Pattern
```
{prefix}/{task-title-kebab-case}-{task-id}-{timestamp}
```

### Examples
```
feature/add-user-authentication-task-123-1704067200000
refactor-node/optimize-database-queries-task-456-1704067200000
test-unit/add-user-service-tests-task-789-1704067200000
fix/login-authentication-bug-task-101-1704067200000
```

## Workflow Examples

### Feature Development
1. **Start**: Create branch from `pidea-agent`
   ```bash
   git checkout pidea-agent
   git checkout -b feature/add-payment-processing-task-123-1704067200000
   ```

2. **Development**: AI implements feature
3. **Review**: Create PR to `pidea-ai-main`
4. **Testing**: Manual testing and review
5. **Merge**: Merge to `pidea-ai-main`

### Critical Bug Fix
1. **Start**: Create branch from `pidea-agent`
   ```bash
   git checkout pidea-agent
   git checkout -b fix/security-vulnerability-task-456-1704067200000
   ```

2. **Development**: AI fixes the bug
3. **Review**: Create PR to `main`
4. **Testing**: Thorough testing and security review
5. **Merge**: Merge to `main` (production)

### Testing Task
1. **Start**: Create branch from `pidea-agent`
   ```bash
   git checkout pidea-agent
   git checkout -b test-unit/add-user-service-tests-task-789-1704067200000
   ```

2. **Development**: AI creates tests
3. **Auto-merge**: Automatically merged to `pidea-agent`
4. **Result**: Tests available for other development

## Configuration

### Default Settings
```javascript
const defaultConfig = {
  baseBranch: 'pidea-agent',
  aiMergeTarget: 'pidea-ai-main',
  productionBranch: 'main',
  autoMergeThreshold: 0.8,
  requireReviewForProduction: true
};
```

### Task-Specific Overrides
```javascript
const taskConfig = {
  bug: {
    mergeTarget: 'main',
    protection: 'high',
    requireReview: true
  },
  testing: {
    mergeTarget: 'pidea-agent',
    protection: 'low',
    autoMerge: true
  },
  feature: {
    mergeTarget: 'pidea-ai-main',
    protection: 'medium',
    requireReview: true
  }
};
```

## Best Practices

### Branch Management
1. **Always start from `pidea-agent`**: Ensures consistent development environment
2. **Use descriptive names**: Include task type and purpose in branch name
3. **Keep branches short-lived**: Merge quickly to avoid conflicts
4. **Test before merging**: Ensure quality before integration

### Review Process
1. **AI-generated code**: Always review before merging to `pidea-ai-main`
2. **Critical changes**: Require senior developer review for `main`
3. **Testing changes**: Can auto-merge to `pidea-agent` for quick feedback

### Production Deployment
1. **Only merge to `main`**: Critical bug fixes and security patches
2. **Thorough testing**: Ensure production readiness
3. **Rollback plan**: Have contingency for quick rollback

## Migration Guide

### From Old System
If migrating from a different branch strategy:

1. **Create new branches**:
   ```bash
   git checkout -b pidea-agent
   git checkout -b pidea-ai-main
   ```

2. **Update configuration**:
   ```javascript
   // Update WorkflowGitService configuration
   const config = {
     baseBranch: 'pidea-agent',
     aiMergeTarget: 'pidea-ai-main',
     productionBranch: 'main'
   };
   ```

3. **Migrate existing work**:
   - Move feature branches to merge to `pidea-ai-main`
   - Move critical fixes to merge to `main`
   - Move testing to merge to `pidea-agent`

### Validation
```javascript
// Validate branch strategy
const validation = await workflowGitService.validateBranchStrategy({
  baseBranch: 'pidea-agent',
  aiMergeTarget: 'pidea-ai-main',
  productionBranch: 'main'
});

console.log('Strategy validation:', validation.isValid);
``` 