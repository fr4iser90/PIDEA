# Prompt: Task Review & Validation System

## Goal
Review, validate, and improve development tasks against the actual codebase. Analyze implementation files, verify code existence, identify gaps, and enhance task documentation with real-world findings.

## Core Review Process

### Phase 1: Codebase Analysis
- [ ] Scan entire project structure for current state
- [ ] Identify existing files, components, and services
- [ ] Map current architecture patterns and conventions
- [ ] Document actual tech stack and dependencies
- [ ] Analyze existing code quality and patterns

### Phase 2: Implementation File Validation
- [ ] Read existing implementation file
- [ ] Cross-reference planned files with actual codebase
- [ ] Verify file paths and directory structures
- [ ] Check for naming convention consistency
- [ ] Validate technical requirements against reality

### Phase 3: Gap Analysis
- [ ] Identify missing files from implementation plan
- [ ] Detect incomplete implementations
- [ ] Find broken dependencies or imports
- [ ] Locate outdated or incorrect file references
- [ ] Spot architectural inconsistencies

### Phase 4: Code Quality Assessment
- [ ] Review existing code for best practices
- [ ] Check for security vulnerabilities
- [ ] Analyze performance implications
- [ ] Verify error handling patterns
- [ ] Assess test coverage and quality

### Phase 5: Implementation File Enhancement
- [ ] Update file paths to match actual structure
- [ ] Add missing dependencies and imports
- [ ] Correct technical specifications
- [ ] Enhance implementation details
- [ ] Add real-world constraints and considerations

## Validation Rules

### File Existence Validation
- **Required**: All planned files must exist or be clearly marked for creation
- **Path Accuracy**: File paths must match actual project structure
- **Naming Consistency**: Follow established project naming conventions
- **Import Validation**: All imports must resolve to existing files
- **Dependency Check**: All dependencies must be available in package.json

### Code Quality Validation
- **Syntax Check**: All code must be syntactically correct
- **Pattern Consistency**: Follow established architectural patterns
- **Error Handling**: Implement proper error handling throughout
- **Security**: Validate input/output and authentication
- **Performance**: Check for performance bottlenecks

### Integration Validation
- **API Endpoints**: Verify all endpoints are properly connected
- **Database**: Ensure schema matches implementation
- **Frontend-Backend**: Validate data flow between layers
- **Event System**: Check event handling and messaging
- **WebSocket**: Verify real-time communication setup

## Review Output Format

### Implementation File Updates
```markdown
## Validation Results - [Date]

### ✅ Completed Items
- [x] File: `path/to/file.js` - Status: Implemented correctly
- [x] Feature: User authentication - Status: Working as expected

### ⚠️ Issues Found
- [ ] File: `path/to/missing.js` - Status: Not found, needs creation
- [ ] Import: `./utils/helper` - Status: File doesn't exist
- [ ] API: `/api/users` - Status: Endpoint not implemented

### 🔧 Improvements Made
- Updated file path from `src/components/` to `frontend/src/components/`
- Added missing dependency: `express-validator`
- Corrected import statement: `import { AuthService } from '../services/AuthService'`

### 📊 Code Quality Metrics
- **Coverage**: 85% (needs improvement)
- **Security Issues**: 2 medium, 1 low
- **Performance**: Good (response time < 200ms)
- **Maintainability**: Excellent (clean code patterns)

### 🚀 Next Steps
1. Create missing files: `backend/services/EmailService.js`
2. Fix security vulnerabilities in `AuthController.js`
3. Add integration tests for user registration
4. Update API documentation
```

### Gap Analysis Report
```markdown
## Gap Analysis - [Feature Name]

### Missing Components
1. **Backend Services**
   - EmailService (planned but not implemented)
   - PasswordResetService (referenced but missing)

2. **Frontend Components**
   - PasswordResetForm (planned but not created)
   - UserProfile (incomplete implementation)

3. **Database**
   - password_reset_tokens table (referenced in code but not in schema)

4. **API Endpoints**
   - POST /api/auth/reset-password (planned but not implemented)
   - GET /api/users/profile (incomplete)

### Incomplete Implementations
1. **User Registration**
   - Missing email verification
   - No password strength validation
   - Incomplete error handling

2. **Authentication Flow**
   - JWT refresh token not implemented
   - Session management incomplete
   - Logout functionality missing

### Broken Dependencies
1. **Import Errors**
   - `../utils/validation` (file doesn't exist)
   - `../../config/database` (wrong path)

2. **Missing Packages**
   - `bcryptjs` (used but not in package.json)
   - `jsonwebtoken` (version mismatch)
```

## Automated Validation Commands

### File System Validation
```bash
# Check file existence
find . -name "*.js" -o -name "*.jsx" | grep -E "(AuthService|UserController)"

# Validate imports
grep -r "import.*from" src/ | grep -v "node_modules"

# Check package dependencies
npm list --depth=0
```

### Code Quality Checks
```bash
# Run linting
npm run lint

# Run tests
npm test

# Check security vulnerabilities
npm audit

# Performance analysis
npm run build -- --analyze
```

### Database Validation
```bash
# Check schema consistency
psql -d database_name -c "\dt"

# Validate migrations
npm run migrate:status

# Check data integrity
npm run db:validate
```

## Implementation File Enhancement Process

### 1. Update File Structure
- Correct all file paths to match actual project structure
- Add missing directories and files
- Remove references to non-existent files
- Update import statements with correct paths

### 2. Enhance Technical Details
- Add actual code examples from existing files
- Include real configuration values
- Document actual API responses
- Add error handling patterns from codebase

### 3. Improve Implementation Steps
- Break down complex tasks into smaller steps
- Add validation checkpoints
- Include rollback procedures
- Add troubleshooting guides

### 4. Update Dependencies
- List actual package versions used
- Include peer dependencies
- Document environment requirements
- Add build and deployment scripts

## Review Checklist

### Pre-Review Setup
- [ ] Clone/fetch latest codebase
- [ ] Install all dependencies
- [ ] Set up development environment
- [ ] Configure database and services
- [ ] Run existing tests to verify baseline

### Codebase Analysis
- [ ] Map project structure and architecture
- [ ] Identify key components and services
- [ ] Document current state and capabilities
- [ ] List existing patterns and conventions
- [ ] Note any technical debt or issues

### Implementation Validation
- [ ] Check each planned file against actual codebase
- [ ] Verify file paths and naming conventions
- [ ] Validate imports and dependencies
- [ ] Test API endpoints and functionality
- [ ] Review database schema and migrations

### Quality Assessment
- [ ] Run code quality tools (ESLint, Prettier)
- [ ] Execute test suites and check coverage
- [ ] Perform security analysis
- [ ] Test performance and scalability
- [ ] Review error handling and logging

### Documentation Review
- [ ] Update implementation file with findings
- [ ] Correct technical specifications
- [ ] Add missing implementation details
- [ ] Include real-world examples
- [ ] Document lessons learned

## Success Criteria
- All file paths match actual project structure
- Implementation plan reflects real codebase state
- Technical specifications are accurate and complete
- Dependencies and imports are validated
- Code quality meets project standards
- Security and performance requirements are met
- Documentation is comprehensive and up-to-date

## Usage Instructions
1. Run codebase analysis to understand current state
2. Validate implementation file against actual code
3. Identify gaps, issues, and improvements needed
4. Update implementation file with findings
5. Provide actionable recommendations
6. Document lessons learned and best practices

## Example Usage
> Review and validate the user authentication implementation against the current codebase. Analyze the auth-implementation.md file, check all planned files exist, verify API endpoints work, and update the implementation file with any gaps or improvements found.
