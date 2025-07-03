# Prompt: Task State Checker - Analyze & Update Implementation Files

## Goal
Analyze current codebase state, check implementation file accuracy, and update documentation without making any code changes. Provide status reports and identify discrepancies between planned and actual implementation.

## Analysis Process

### Phase 1: Current State Analysis
- [ ] Scan project structure and file system
- [ ] Identify existing files, components, and services
- [ ] Map current architecture and patterns
- [ ] Document actual tech stack and dependencies
- [ ] Note current implementation status

### Phase 2: Implementation File Review
- [ ] Read existing implementation file
- [ ] Compare planned vs actual file structure
- [ ] Check file existence and paths
- [ ] Validate naming conventions
- [ ] Review technical specifications

### Phase 3: Status Assessment
- [ ] Mark completed items as done
- [ ] Identify missing or incomplete items
- [ ] Note discrepancies and inconsistencies
- [ ] Flag outdated information
- [ ] Document current progress

### Phase 4: Implementation File Update
- [ ] Update file paths to match reality
- [ ] Correct technical specifications
- [ ] Add current status indicators
- [ ] Include actual findings and metrics
- [ ] Document lessons learned

## Status Categories

### ✅ Completed
- File exists and is fully implemented
- Feature works as specified
- Tests are passing
- Documentation is complete

### 🔄 In Progress
- File exists but implementation is partial
- Feature is partially working
- Some tests are missing
- Documentation is incomplete

### ❌ Missing
- File doesn't exist
- Feature not implemented
- No tests available
- Documentation missing

### ⚠️ Issues Found
- File exists but has problems
- Feature works but with issues
- Tests are failing
- Documentation is outdated

### 🔧 Needs Update
- File exists but needs modification
- Feature works but needs improvement
- Tests need updating
- Documentation needs revision

## Analysis Commands (Read-Only)

### File System Analysis
```bash
# Check file existence without modification
find . -name "*.js" -o -name "*.jsx" | head -20

# List directory structure
tree -I 'node_modules|.git' -L 3

# Check package dependencies
cat package.json | grep -A 20 "dependencies"

# Verify file paths
ls -la path/to/planned/file.js 2>/dev/null || echo "File not found"
```

### Code Analysis (Read-Only)
```bash
# Count lines of code
find . -name "*.js" -o -name "*.jsx" | xargs wc -l

# Check import statements
grep -r "import.*from" src/ | head -10

# Analyze file structure
find . -type f -name "*.js" | grep -E "(Controller|Service|Handler)"

# Check for TODO comments
grep -r "TODO\|FIXME\|HACK" . --exclude-dir=node_modules
```

### Database Analysis (Read-Only)
```bash
# Check database schema
psql -d database_name -c "\dt" 2>/dev/null || echo "Database not accessible"

# List migrations
ls -la database/migrations/ 2>/dev/null || echo "No migrations found"

# Check seed data
ls -la database/seed/ 2>/dev/null || echo "No seed data found"
```

## Implementation File Update Format

### Status Update Section
```markdown
## Current Status - [Date]

### ✅ Completed Items
- [x] `backend/services/AuthService.js` - Fully implemented with JWT
- [x] `frontend/src/components/LoginForm.jsx` - Working login form
- [x] `backend/controllers/AuthController.js` - All endpoints functional

### 🔄 In Progress
- [~] `backend/services/EmailService.js` - Basic structure exists, needs email integration
- [~] `frontend/src/components/UserProfile.jsx` - UI complete, needs API connection

### ❌ Missing Items
- [ ] `backend/services/PasswordResetService.js` - Not found in codebase
- [ ] `frontend/src/components/PasswordResetForm.jsx` - Not created
- [ ] `database/migrations/002_add_password_reset.sql` - Missing

### ⚠️ Issues Found
- [ ] `backend/middleware/AuthMiddleware.js` - Missing JWT validation
- [ ] `frontend/src/services/ApiService.js` - Error handling incomplete

### 📊 Current Metrics
- **Files Implemented**: 15/20 (75%)
- **Features Working**: 8/12 (67%)
- **Test Coverage**: 60%
- **Documentation**: 70% complete
```

### Gap Analysis Section
```markdown
## Gap Analysis

### Missing Backend Components
1. **Services**
   - PasswordResetService (planned but not created)
   - EmailService (incomplete implementation)

2. **Controllers**
   - UserController (missing profile endpoints)
   - PasswordController (not implemented)

3. **Middleware**
   - RateLimitingMiddleware (planned but missing)
   - ValidationMiddleware (incomplete)

### Missing Frontend Components
1. **Components**
   - PasswordResetForm (not created)
   - UserProfile (incomplete)
   - ErrorBoundary (missing)

2. **Services**
   - WebSocketService (planned but not implemented)
   - CacheService (missing)

### Database Gaps
1. **Tables**
   - password_reset_tokens (referenced but not created)
   - user_sessions (planned but missing)

2. **Indexes**
   - email_index on users table (missing)
   - token_index on password_reset_tokens (missing)
```

### Technical Specifications Update
```markdown
## Updated Technical Specifications

### Actual File Structure
- Backend: `backend/` (not `src/backend/`)
- Frontend: `frontend/src/` (not `src/frontend/`)
- Database: `database/` (not `db/`)

### Current Dependencies
- **Backend**: Express 4.18.2, JWT 9.0.0, bcrypt 5.1.0
- **Frontend**: React 18.2.0, Vite 4.4.0, Tailwind 3.3.0
- **Database**: PostgreSQL 15.0, pg 8.11.0

### Actual API Endpoints
- POST `/api/auth/login` ✅ Working
- POST `/api/auth/register` ✅ Working
- GET `/api/auth/profile` ❌ Not implemented
- POST `/api/auth/logout` ❌ Not implemented

### Current Architecture
- **Pattern**: MVC with Repository pattern
- **Authentication**: JWT tokens (implemented)
- **Database**: PostgreSQL with connection pooling
- **Frontend**: React with Vite build system
```

## Update Process

### 1. Status Verification
- Check each planned item against actual codebase
- Mark items with appropriate status indicators
- Document actual implementation details
- Note any deviations from plan

### 2. Path Correction
- Update file paths to match actual structure
- Correct import statements and references
- Fix directory structure assumptions
- Update configuration file paths

### 3. Specification Updates
- Update technical requirements based on reality
- Correct dependency versions and names
- Update API endpoint specifications
- Fix architectural assumptions

### 4. Progress Documentation
- Add completion percentages
- Document current blockers
- Note technical debt and issues
- Include lessons learned

## Success Criteria
- Implementation file accurately reflects current state
- All file paths match actual project structure
- Status indicators are accurate and up-to-date
- Technical specifications match reality
- Progress metrics are current and accurate
- Gap analysis is comprehensive and actionable

## Usage Instructions
1. Run analysis commands to understand current state
2. Review implementation file against actual codebase
3. Update status indicators and progress metrics
4. Correct file paths and technical specifications
5. Document gaps and issues found
6. Provide current state summary

## Example Usage
> Check current state of user authentication implementation. Analyze the auth-implementation.md file, verify all planned files exist, update status indicators, correct any path discrepancies, and document current progress without making any code changes.
