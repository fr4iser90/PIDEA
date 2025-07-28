# Prompt: Automated Task State Checker & Translation Optimizer

## Goal
Automatically check current implementation status, update progress indicators, track completion, detect and translate non-English content, and ensure optimal language for AI processing. Execute all updates automatically without user input or confirmation.

## Phase
Check current state against codebase, collect all data needed!
Update existing Plan/Implementation [Name]-implementation.md in docs/09_roadmap/tasks/[category]/[name]/ with current status, progress, and translation updates.
**Note**: The system automatically creates a hierarchical folder structure: Category → Task Name → Implementation files

## Core Principles
- **Zero User Input Required**: Execute all status checks and updates automatically
- **Automatic Translation**: Detect and translate non-English content to English
- **File Updates**: Automatically update implementation files with current status
- **Language Optimization**: Ensure all content is optimized for AI processing
- **Progress Tracking**: Update all progress indicators and metrics
- **Status Validation**: Verify accuracy of all status updates

## Automated Execution Strategy

### Phase 1: Language Detection & Translation
- [ ] Scan all task files for non-English content
- [ ] Detect primary language using automated language detection
- [ ] Translate all non-English content to English
- [ ] Preserve original language alongside English translation
- [ ] Update implementation files with translation status
- [ ] Optimize technical terms for AI processing

### Phase 2: Status Verification & Updates
- [ ] Check each planned item against actual codebase
- [ ] Mark items with appropriate status indicators automatically
- [ ] Document actual implementation details
- [ ] Note any deviations from plan
- [ ] Update completion percentages
- [ ] Document current blockers and issues

### Phase 3: File Updates & Documentation
- [ ] Update status indicators and progress metrics
- [ ] Correct file paths and technical specifications
- [ ] Document gaps and issues found
- [ ] Provide current state summary
- [ ] Add English translation if original was in different language
- [ ] Update all related documentation files

### Phase 4: Progress Tracking & Metrics
- [ ] Calculate completion percentages for all phases
- [ ] Update time tracking and velocity metrics
- [ ] Document current blockers and risk mitigation
- [ ] Update implementation file with current status
- [ ] Generate progress reports and summaries

## Timestamp Generation
Reference `@timestamp-utility.md` for timestamp generation commands and usage patterns.

**Quick Command**: `date -u +"%Y-%m-%dT%H:%M:%S.000Z"`

## Language Detection & Translation

### Automated Language Detection
```javascript
// Automated language detection for task content
const detectLanguage = (content) => {
  const germanIndicators = ['soll', 'muss', 'kann', 'wird', 'haben', 'sein', 'werden', 'durch', 'für', 'mit', 'von', 'zu', 'bei', 'nach', 'über', 'unter', 'zwischen', 'innerhalb', 'außerhalb'];
  const frenchIndicators = ['doit', 'peut', 'sera', 'avoir', 'être', 'faire', 'avec', 'pour', 'dans', 'sur', 'sous', 'entre', 'devant', 'derrière', 'près', 'loin', 'avant', 'après'];
  const spanishIndicators = ['debe', 'puede', 'será', 'tener', 'hacer', 'estar', 'con', 'para', 'en', 'sobre', 'bajo', 'entre', 'delante', 'detrás', 'cerca', 'lejos', 'antes', 'después'];
  const italianIndicators = ['deve', 'può', 'sarà', 'avere', 'essere', 'fare', 'con', 'per', 'in', 'su', 'sotto', 'tra', 'davanti', 'dietro', 'vicino', 'lontano', 'prima', 'dopo'];
  
  const words = content.toLowerCase().split(/\s+/);
  
  const germanCount = words.filter(word => germanIndicators.includes(word)).length;
  const frenchCount = words.filter(word => frenchIndicators.includes(word)).length;
  const spanishCount = words.filter(word => spanishIndicators.includes(word)).length;
  const italianCount = words.filter(word => italianIndicators.includes(word)).length;
  
  if (germanCount > 3) return 'german';
  if (frenchCount > 3) return 'french';
  if (spanishCount > 3) return 'spanish';
  if (italianCount > 3) return 'italian';
  return 'english';
};

// Automated translation function
const translateContent = async (content, sourceLanguage, targetLanguage = 'en') => {
  if (sourceLanguage === targetLanguage) return content;
  
  // Use translation service or API
  const translatedContent = await translationService.translate(content, sourceLanguage, targetLanguage);
  return translatedContent;
};
```

### Translation Requirements
- **Target Language**: English (optimal for AI processing)
- **Preserve Original**: Keep original language alongside English
- **Technical Terms**: Maintain technical accuracy in translation
- **Code Comments**: Translate comments for better AI understanding
- **Documentation**: Ensure all documentation is in English
- **Automatic Updates**: Update all files with translation status

### Translation Format
```markdown
## Language Status - Last Updated: [TIMESTAMP]

### Original Language
[Original task description in detected language]

### English Translation
[Translated task description for optimal AI processing]

### Technical Terms Mapping
- [Original Term] → [English Term]
- [Original Term] → [English Term]

### Translation Notes
- [Any special considerations or context]
- [Technical accuracy verification]
- [AI processing optimization status]
```

## Status Categories

### ✅ Completed
- File exists and is fully implemented
- Feature works as specified
- Tests are passing
- Documentation is complete
- Language optimized for AI processing

### 🔄 In Progress
- File exists but implementation is partial
- Feature is partially working
- Some tests are missing
- Documentation is incomplete
- Translation in progress

### ❌ Missing
- File doesn't exist
- Feature not implemented
- No tests available
- Documentation missing
- Translation not started

### ⚠️ Issues Found
- File exists but has problems
- Feature works but with issues
- Tests are failing
- Documentation is outdated
- Translation has errors

### 🔧 Needs Update
- File exists but needs modification
- Feature works but needs improvement
- Tests need updating
- Documentation needs revision
- Translation needs refinement

### 🌐 Language Issues
- Task description in non-English language
- Technical terms need translation
- Comments or documentation in different language
- AI processing optimization needed
- Translation quality issues

## File Management Rules

### Automatic File Updates
- Update all implementation files with current status
- Create translation files if needed
- Update progress tracking files
- Modify documentation files with current state
- **Organize files in hierarchical structure**: `docs/09_roadmap/tasks/[category]/[name]/`
- **Update main implementation file**: `[name]-implementation.md`
- **Create translation files**: `[name]-translation-[language].md`

### Implementation File Update Format
```markdown
## Current Status - Last Updated: [TIMESTAMP]

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

### 🌐 Language Optimization
- [x] Task description translated to English for AI processing
- [x] Technical terms mapped and standardized
- [x] Code comments translated where needed
- [x] Documentation language verified

### 📊 Current Metrics
- **Files Implemented**: 15/20 (75%)
- **Features Working**: 8/12 (67%)
- **Test Coverage**: 60%
- **Documentation**: 70% complete
- **Language Optimization**: 100% (English)
```

### Progress Tracking Section
```markdown
## Progress Tracking

### Phase Completion
- **Phase 1**: Foundation Setup - ✅ Complete (100%)
- **Phase 2**: Core Implementation - 🔄 In Progress (75%)
- **Phase 3**: Integration - ❌ Not Started (0%)
- **Phase 4**: Testing - ❌ Not Started (0%)
- **Phase 5**: Documentation - ❌ Not Started (0%)

### Time Tracking
- **Estimated Total**: 12 hours
- **Time Spent**: 6 hours
- **Time Remaining**: 6 hours
- **Velocity**: 2 hours/day

### Blockers & Issues
- **Current Blocker**: Email service integration pending external API setup
- **Risk**: Password reset functionality delayed due to missing service
- **Mitigation**: Using mock email service for development

### Language Processing
- **Original Language**: German
- **Translation Status**: ✅ Complete
- **AI Processing**: ✅ Optimized
- **Technical Accuracy**: ✅ Verified
```

## Automated Status Check Commands

### File Existence Checks
```bash
# Check if specific files exist
ls -la path/to/planned/file.js 2>/dev/null || echo "File not found"

# Count implemented files
find . -name "*.js" -o -name "*.jsx" | grep -E "(AuthService|UserController)" | wc -l

# Check test file existence
find . -name "*.test.js" -o -name "*.test.jsx" | grep -E "(AuthService|UserController)"
```

### Progress Indicators
```bash
# Count TODO comments (incomplete items)
grep -r "TODO\|FIXME\|HACK" . --exclude-dir=node_modules | wc -l

# Check for incomplete implementations
grep -r "// TODO\|// FIXME\|// HACK" . --exclude-dir=node_modules

# Count test files vs implementation files
find . -name "*.test.js" -o -name "*.test.jsx" | wc -l
find . -name "*.js" -o -name "*.jsx" | grep -v "test" | wc -l
```

### Language Detection Commands
```bash
# Check for non-English comments
grep -r "//.*[äöüßÄÖÜ]" . --exclude-dir=node_modules

# Check for German keywords in code
grep -r "soll\|muss\|kann\|wird\|haben\|sein\|werden" . --exclude-dir=node_modules

# Check for French keywords in code
grep -r "doit\|peut\|sera\|avoir\|être\|faire" . --exclude-dir=node_modules

# Check for Spanish keywords in code
grep -r "debe\|puede\|será\|tener\|hacer\|estar" . --exclude-dir=node_modules

# Check for Italian keywords in code
grep -r "deve\|può\|sarà\|avere\|essere\|fare" . --exclude-dir=node_modules
```

## Complete Task State Check Flow

1. **Parse Task Requirements**: Extract all technical specifications and content
2. **Detect Language**: Automatically detect primary language of task content
3. **Translate Content**: Translate non-English content to English for AI optimization
4. **Check Implementation Status**: Verify all planned items against actual codebase
5. **Update Status Indicators**: Mark items with appropriate status categories
6. **Calculate Progress Metrics**: Update completion percentages and time tracking
7. **Document Issues**: Record blockers, risks, and mitigation strategies
8. **Update Files**: Automatically update all implementation and documentation files
9. **Validate Updates**: Ensure all updates are accurate and complete
10. **Generate Summary**: Create comprehensive status report

## Error Handling & Recovery

### Translation Failure Recovery
- If translation fails, preserve original content
- Implement fallback translation methods
- Document translation issues for manual review
- Continue with status updates using available content

### Status Update Recovery
- If file updates fail, retry with alternative methods
- Preserve existing content while attempting updates
- Document update failures for manual intervention
- Maintain system stability throughout process

### Validation & Quality Assurance
- Validate all translation accuracy
- Ensure status indicators are correct
- Verify file paths and technical specifications
- Confirm progress metrics are accurate
- Check for consistency across all updates

## Success Criteria
- All task content translated to English for AI optimization
- Implementation file accurately reflects current state
- All file paths match actual project structure
- Status indicators are accurate and up-to-date
- Progress metrics are current and accurate
- Blockers and issues are clearly documented
- Time tracking is accurate and helpful
- Language optimization completed for AI processing
- Technical terms are accurately translated
- Original language is preserved alongside English
- All files updated automatically without user input
- Timestamps used instead of hardcoded dates for better tracking
- All status updates include proper timestamps

## Usage Instructions
1. **Get real timestamp**: Reference `@timestamp-utility.md` for commands
2. Provide task name and category for status checking
3. System will automatically detect and translate non-English content
4. All status checks and updates performed automatically
5. Implementation files updated with current state using real timestamp
6. Progress tracking and metrics calculated automatically
7. Language optimization completed for AI processing
8. No user input or confirmation required

## File Pattern Requirement
> **File Pattern Requirement:**  
> All Index, Implementation and Phase files must always be created using this pattern:
> - **Index**: docs/09_roadmap/tasks/[category]/[name]/[name]-index.md  
> If a file is missing, it must be created automatically. This pattern is required for orchestration and grouping in the system.  
> - **Implementation**: docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md  
> - **Phase**: docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md  
> - **Translation**: docs/09_roadmap/tasks/[category]/[name]/[name]-translation-[language].md

## Example Usage
> Check current state of user authentication implementation. Automatically detect and translate any non-English content, update the auth-implementation.md file with current status indicators, progress percentages, identify any blockers, and ensure all content is optimized for AI processing. Execute all updates automatically without user input.

**Note**: Use `@timestamp-utility.md` for timestamp generation.

## Template Structure for Status Updates

### Current Status Section
```markdown
## Current Status - Last Updated: [TIMESTAMP]

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

### 🌐 Language Optimization
- [x] Task description translated to English for AI processing
- [x] Technical terms mapped and standardized
- [x] Code comments translated where needed
- [x] Documentation language verified

### 📊 Current Metrics
- **Files Implemented**: 15/20 (75%)
- **Features Working**: 8/12 (67%)
- **Test Coverage**: 60%
- **Documentation**: 70% complete
- **Language Optimization**: 100% (English)
```

### Progress Tracking Section
```markdown
## Progress Tracking

### Phase Completion
- **Phase 1**: Foundation Setup - ✅ Complete (100%)
- **Phase 2**: Core Implementation - 🔄 In Progress (75%)
- **Phase 3**: Integration - ❌ Not Started (0%)
- **Phase 4**: Testing - ❌ Not Started (0%)
- **Phase 5**: Documentation - ❌ Not Started (0%)

### Time Tracking
- **Estimated Total**: 12 hours
- **Time Spent**: 6 hours
- **Time Remaining**: 6 hours
- **Velocity**: 2 hours/day

### Blockers & Issues
- **Current Blocker**: Email service integration pending external API setup
- **Risk**: Password reset functionality delayed due to missing service
- **Mitigation**: Using mock email service for development

### Language Processing
- **Original Language**: German
- **Translation Status**: ✅ Complete
- **AI Processing**: ✅ Optimized
- **Technical Accuracy**: ✅ Verified
```

## Integration with Other Prompts

### With task-review.md
- `task-review.md` handles codebase analysis and validation
- `task-check-state.md` handles status updates and progress tracking
- Use `task-review.md` for initial analysis, `task-check-state.md` for ongoing status updates

### With task-create.md
- `task-create.md` creates the initial implementation plan
- `task-check-state.md` tracks progress against that plan
- Update status based on completion of planned items

### With task-execute.md
- `task-execute.md` executes the implementation
- `task-check-state.md` tracks execution progress
- Update status as phases are completed

### With Language Processing
- Detect task language automatically
- Translate to English for optimal AI processing
- Preserve original language for reference
- Ensure technical accuracy in translation
- Optimize for AI understanding and execution
- Update all files automatically without user input
