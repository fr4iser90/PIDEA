# Task Management Prompts - Summary

### 📁 **Final Prompt Collection Structure**

```
content-library/prompts/task-management/
├── task-analyze.md          # Project-wide gap analysis
├── task-check-state.md      # Status & progress tracking
├── task-create.md           # Task planning & specification
├── task-execute.md          # Task execution & implementation
├── task-language-analyzer.md # Language consistency & documentation analysis
├── task-pattern.md          # Task patterns & standards reference
├── task-refactor.md         # Large file refactoring
├── task-review.md           # Task validation & phase creation
├── test-path-config.md      # Test path resolution
├── timestamp-utility.md     # Timestamp generation utility
└── CONSOLIDATION-SUMMARY.md # This file
```

### 🎯 **Clear Role Definitions**

| Prompt | Primary Purpose | Secondary Purpose |
|--------|----------------|-------------------|
| `task-analyze.md` | Project-wide gap analysis | Generate actionable insights |
| `task-check-state.md` | Status tracking | Progress monitoring |
| `task-create.md` | Task planning | Specification creation |
| `task-execute.md` | Task execution | Implementation |
| `task-pattern.md` | Task patterns & standards | Centralized reference |

| `task-language-analyzer.md` | Language consistency analysis | Documentation coverage assessment |
| `task-refactor.md` | Large file refactoring | Code organization |
| `task-review.md` | Task validation | Phase creation |
| `test-path-config.md` | Test path resolution | Test organization |
| `timestamp-utility.md` | Timestamp generation | Time tracking |

### 🔄 **Workflow Integration**

#### **Decision Tree - Which Workflow to Use?**

```
New Task/Feature? → Standard Task Workflow
Project Analysis? → Project Analysis Workflow  
Code Quality/Refactoring? → Code Quality Workflow
File Management? → File Management Guidelines
```

#### **My Actual Usage Pattern (Core Workflow)**

**Core Workflow:**
0. **Create new GIT branch**
1. **prompt + [`task-analyze.md`](./task-analyze.md)** = `[name]-analysis.md`
2. **`[name]-analysis.md` + [`task-create.md`](./task-create.md)** = `[name]-implementation.md` / `[name]-index.md` / `[name]-phase-[number].md`
3. **[`task-review.md`](./task-review.md) + `[name]-index.md`** = `[name]-phase-[number].md` (updated)
4. **[`task-execute.md`](./task-execute.md) + `[name]-index.md`** = `[name]-phase-[number].md` (updated)  
5. **[`task-review.md`](./task-review.md) + `[name]-index.md`** = `[name]-index.md` (updated)
6. **Test & Debug Cycle:**
   - Run application to test changes
   - If errors occur: Use `task-review.md` to analyze and adjust plan
   - If complex debugging needed: Review error, discard if necessary, adjust plan
   - Repeat step 4 if more implementation needed

#### **Standard Task Workflow (For New Tasks)**
1. `task-create.md` → Creates implementation plan and index file
2. `task-review.md` → Validates and repairs implementation plan
3. `task-execute.md` → Executes implementation
4. `task-check-state.md` → Tracks current status and progress
5. `task-review.md` → Validates completion

#### **Project Analysis Workflow (For Project Analysis)**
1. `task-analyze.md` → Identifies project-wide gaps
2. `task-create.md` → Creates tasks for identified gaps (with index files)
3. `task-review.md` → Validates all new task plans
4. `task-execute.md` → Executes implementation (for each task)
5. `task-check-state.md` → Tracks progress (for each task)

#### **Code Quality Workflow (For Refactoring)**
1. `task-refactor.md` → Identifies refactoring needs
2. `task-create.md` → Creates refactoring task plan (with index file)
3. `task-review.md` → Validates refactoring plan
4. `task-execute.md` → Performs refactoring
5. `task-review.md` → Validates refactoring results
6. `test-path-config.md` → Organizes tests

### 🚀 **Usage Guidelines**

#### **For New Tasks**
1. Use `task-create.md` to plan the task (creates index file automatically)
2. Use `task-review.md` to validate the plan
3. Use `task-execute.md` to implement
4. Use `task-check-state.md` to track progress
5. Use `task-review.md` to validate completion

#### **For Project Analysis**
1. Use `task-analyze.md` for project-wide gaps
2. Use `task-create.md` to create tasks for gaps (creates index files automatically)
3. Use `task-review.md` to validate all task plans
4. Use `task-execute.md` to implement solutions
5. Use `task-check-state.md` to track progress

#### **For Code Quality**
1. Use `task-refactor.md` for large file refactoring
2. Use `task-create.md` to create refactoring task plan (creates index file automatically)
3. Use `task-review.md` to validate refactoring plan
4. Use `task-execute.md` to perform refactoring
5. Use `task-review.md` to validate refactoring results
6. Use `task-language-analyzer.md` for language consistency and documentation analysis
7. Use `test-path-config.md` for test organization

#### **For File Management**
1. Use `task-check-state.md` for status updates
2. Use `task-review.md` for validation

#### **For Standards & Patterns**
1. Use `task-pattern.md` as the single source of truth for all task management patterns
2. Reference `task-pattern.md` in all other prompts for consistency
3. Use `timestamp-utility.md` for timestamp generation
