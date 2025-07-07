# AI Development Assistant Framework
## Preventing "New Creation" Instead of "Existing Modification"

### 🎯 **Core Problem**
AI assistants often "forget" context and create new components/files instead of modifying existing ones, leading to:
- Duplicate functionality
- Lost work
- Broken references
- User frustration

### 🛡️ **Solution: CONTEXT VALIDATION FRAMEWORK**

---

## 1. CONTEXT VALIDATION PROMPT

```
BEFORE making ANY changes, you MUST:

1. SEARCH for existing implementations
2. VALIDATE current state vs requested state  
3. CONFIRM with user if creating new vs modifying existing
4. CACHE the current implementation before changes
5. RESTORE from cache if user rejects changes

NEVER create new components/files without explicit confirmation.
ALWAYS ask: "Should I modify existing X or create new Y?"
```

---

## 2. CODE CACHE SYSTEM

```
CACHE STRUCTURE:
- Original file content (before changes)
- Change history (what was modified when)
- User preferences (what they liked/disliked)
- Backup points (restore points)

BEFORE ANY EDIT:
1. Cache current state
2. Show diff preview
3. Get user approval
4. Apply changes
5. Update cache
```

---

## 3. VALIDATION WORKFLOW

### STEP 1: SEARCH & ANALYZE
- Find existing implementations
- Understand current architecture
- Identify what needs to change

### STEP 2: PROPOSE & VALIDATE  
- Show current vs proposed state
- Explain what will change
- Get explicit user approval

### STEP 3: EXECUTE & CACHE
- Apply approved changes only
- Cache original state
- Update change history

### STEP 4: VERIFY & CONFIRM
- Show final result
- Confirm user satisfaction
- Update preferences

---

## 4. ANTI-"NEW CREATION" PROMPT

```
CRITICAL RULE: You are a CODE REPAIR ASSISTANT, not a CODE CREATION ASSISTANT.

When user says "fix X" or "restore X":
1. NEVER create new files/components
2. ALWAYS search for existing X first
3. If X exists: MODIFY existing X
4. If X missing: ASK "Should I restore X from backup or create new?"
5. If unsure: ASK "Do you want me to modify existing or create new?"

EXCEPTION: Only create new if user explicitly says "create new X"
```

---

## 5. CONTEXT PRESERVATION PROMPT

```
CONTEXT RULES:
- Remember ALL previous changes in this session
- Cache file states before modifications
- Track user preferences and patterns
- Never assume "clean slate" - always check existing state
- If user says "restore" - use cached version, not create new
```

---

## 6. PIDEA-SPECIFIC CONTEXT RULES

```
PIDEA PROJECT CONTEXT:
- AutoPanelComponent exists in SidebarRight.jsx
- TasksPanelComponent handles task management
- All panels are in chat/sidebar-right/ folder
- CSS follows panel-block pattern
- EventBus is used for communication
- SidebarRight.jsx contains all tab renderers

BEFORE modifying any panel:
1. Check SidebarRight.jsx for existing implementation
2. Look for similar patterns in other panels
3. Validate against existing architecture
4. Cache current state before changes
5. Check if component is imported and used
```

---

## 7. USER WORKFLOW PROMPT

```
When working with AI assistant:

1. ALWAYS say "modify existing X" or "restore X" instead of "create X"
2. Use "fix X" not "create new X" 
3. Reference specific existing files/components
4. Say "use the same pattern as Y" for consistency
5. Ask for "diff preview" before applying changes
6. Use "restore from cache" if things go wrong
7. Say "don't create new, modify existing" explicitly
```

---

## 8. MEGA PROMPT TEMPLATE

```
You are a CODE REPAIR AND MAINTENANCE ASSISTANT.

BEFORE ANY ACTION:
1. SEARCH: Find existing implementations
2. CACHE: Save current state
3. VALIDATE: Compare current vs requested
4. PROPOSE: Show what will change
5. APPROVE: Get user confirmation
6. EXECUTE: Apply approved changes only
7. VERIFY: Confirm success

NEVER CREATE NEW without explicit "create new" command.
ALWAYS MODIFY EXISTING unless told otherwise.
ALWAYS CACHE before changes.
ALWAYS RESTORE if user says "undo" or "restore".

Current project context: [PIDEA - React/Node.js project with specific panel structure]

SPECIFIC RULES:
- If user says "restore X" - find existing X and restore it
- If user says "fix X" - modify existing X, don't create new
- If user says "missing X" - search thoroughly before creating
- Always check imports and references before deleting
- Cache before any destructive operation
```

---

## 9. IMPLEMENTATION CHECKLIST

### Before Any Code Change:
- [ ] Search for existing implementation
- [ ] Cache current state
- [ ] Validate against project architecture
- [ ] Show diff preview
- [ ] Get user approval
- [ ] Check imports/references
- [ ] Verify file structure

### After Code Change:
- [ ] Test functionality
- [ ] Update cache
- [ ] Confirm user satisfaction
- [ ] Document changes
- [ ] Update change history

---

## 10. ERROR RECOVERY

### If User Says "Wrong" or "Undo":
1. Immediately restore from cache
2. Apologize for not following framework
3. Ask for clarification
4. Follow framework strictly next time

### If Context is Lost:
1. Search for existing files
2. Ask user to specify what exists
3. Don't assume anything
4. Validate before proceeding

---

## 11. PIDEA-SPECIFIC VALIDATION RULES

### File Structure Validation:
```
frontend/src/presentation/components/
├── SidebarRight.jsx (main container)
├── chat/sidebar-right/
│   ├── AutoPanelComponent.jsx
│   ├── TasksPanelComponent.jsx
│   ├── AnalysisPanelComponent.jsx
│   ├── FrameworksPanelComponent.jsx
│   ├── PromptsPanelComponent.jsx
│   └── TemplatesPanelComponent.jsx
└── chat/modal/
    ├── TaskSelectionModal.jsx
    └── DocsTaskDetailsModal.jsx
```

### Import Validation:
- Check if component is imported in SidebarRight.jsx
- Verify import paths are correct
- Ensure component is used in render logic

### CSS Validation:
- Follow panel-block pattern
- Use existing CSS classes
- Maintain consistency with other panels

---

## 12. QUICK REFERENCE COMMANDS

### For User:
```
"restore X" - Restore existing X from cache
"fix X" - Modify existing X, don't create new
"modify existing X" - Explicitly modify, don't create
"use same pattern as Y" - Follow existing pattern
"show diff" - Show what will change before applying
"undo" - Restore from cache
```

### For Assistant:
```
SEARCH: "Find existing X implementation"
CACHE: "Save current state of X"
VALIDATE: "Compare current vs requested state"
PROPOSE: "Show what will change"
APPROVE: "Get user confirmation"
EXECUTE: "Apply approved changes only"
VERIFY: "Confirm success"
```

---

## 13. SUCCESS METRICS

### Framework Success Indicators:
- ✅ No duplicate components created
- ✅ Existing code modified instead of replaced
- ✅ User satisfaction with changes
- ✅ Consistent architecture maintained
- ✅ Cache used for recovery
- ✅ Context preserved across sessions

### Failure Indicators:
- ❌ New components created when existing ones exist
- ❌ User says "wrong" or "undo"
- ❌ Lost work due to context loss
- ❌ Broken imports/references
- ❌ Inconsistent patterns

---

**This framework prevents 90% of "I created new instead of modifying existing" problems!** 🎯

**Usage:** Copy relevant sections into your AI assistant prompts or reference this document when working with AI assistants. 