# Git Workflow Guide

## Overview

This guide explains how to use the Git management system in PIDEA to handle your Git workflow, from feature branch creation to merging changes back to main.

## Git Workflow Steps

### 1. Feature Branch Creation ✅ (Already Done)

Your refactoring system has already created a new branch for your changes. This is the correct approach!

### 2. Using the Git Management Interface

Navigate to the **🔧 Git** tab in the main navigation to access the Git management interface.

#### Available Buttons:

- **✅ Validate** - Check your current changes for potential issues
- **🔍 Compare** - View differences between your branch and main
- **⬇️ Pull** - Get latest changes from main branch
- **🔀 Merge** - Merge your changes into main branch

### 3. Step-by-Step Workflow

#### Step 1: Validate Your Changes
1. Click the **✅ Validate** button
2. Review any warnings or suggestions
3. Ensure your changes are ready for integration

#### Step 2: Compare with Main
1. Click the **🔍 Compare** button
2. Review the diff modal showing changes between your branch and main
3. Verify that all changes are intentional and correct

#### Step 3: Pull Latest Changes (Optional)
1. Click the **⬇️ Pull** button to get any updates from main
2. This ensures you're merging with the latest version
3. Resolve any conflicts if they occur

#### Step 4: Merge to Main
1. Click the **🔀 Merge** button
2. Confirm the merge operation
3. Your changes will be integrated into the main branch

## Git Status Display

The interface shows:
- **Current branch** you're working on
- **File status** (modified, added, deleted)
- **Branch selector** to switch between branches
- **Real-time updates** of Git operations

## Branch Management

### Switching Branches
- Use the branch selector dropdown to switch between branches
- The current branch is marked with a 📍 icon

### Creating New Branches
- Use the **Create Branch** functionality in the Git interface
- Branches are created safely with proper validation

## Safety Features

The Git management system includes several safety features:

1. **User Permissions** - Only authorized users can perform Git operations
2. **Command Validation** - Dangerous Git commands are blocked
3. **Conflict Detection** - Automatic detection of merge conflicts
4. **Rollback Capability** - Ability to undo operations if needed
5. **Audit Logging** - All Git operations are logged for security

## Common Scenarios

### Scenario 1: Feature Development
```
1. Create feature branch ✅ (Already done)
2. Make changes ✅ (Your refactoring)
3. Validate changes ✅ (Use Validate button)
4. Compare with main ✅ (Use Compare button)
5. Merge to main ✅ (Use Merge button)
```

### Scenario 2: Updating from Main
```
1. Switch to main branch
2. Pull latest changes
3. Switch back to feature branch
4. Merge main into feature branch
5. Continue development
```

### Scenario 3: Conflict Resolution
```
1. Attempt merge
2. System detects conflicts
3. Review conflict markers
4. Resolve conflicts manually
5. Complete merge
```

## Best Practices

1. **Always validate** before merging
2. **Compare changes** to understand what you're merging
3. **Pull latest changes** before merging to avoid conflicts
4. **Use descriptive branch names** for better organization
5. **Commit frequently** with meaningful messages
6. **Test after merging** to ensure everything works

## Troubleshooting

### Common Issues

**Issue**: "Not a Git repository"
- **Solution**: Ensure you're in a directory with a `.git` folder

**Issue**: "Permission denied"
- **Solution**: Check your user permissions for Git operations

**Issue**: "Merge conflicts"
- **Solution**: Resolve conflicts manually in your IDE, then complete the merge

**Issue**: "Branch not found"
- **Solution**: Ensure the branch exists and you have access to it

### Getting Help

If you encounter issues:
1. Check the operation result messages in the interface
2. Review the browser console for detailed error information
3. Contact your system administrator for permission issues

## API Endpoints

The Git management system provides these API endpoints:

- `POST /api/git/status` - Get Git status
- `POST /api/git/branches` - Get all branches
- `POST /api/git/validate` - Validate changes
- `POST /api/git/compare` - Compare branches
- `POST /api/git/pull` - Pull changes
- `POST /api/git/checkout` - Switch branches
- `POST /api/git/merge` - Merge branches
- `POST /api/git/create-branch` - Create new branch
- `POST /api/git/info` - Get repository info

## Security Considerations

- All Git operations require authentication
- Dangerous commands are automatically blocked
- User permissions are validated for each operation
- All operations are logged for audit purposes
- Repository access is restricted to authorized users

## Integration with IDE

The Git management system integrates with your IDE:
- Real-time status updates
- Automatic branch detection
- Seamless workflow between IDE and web interface
- Terminal automation for Git operations

## Next Steps

Now that you have the Git management system set up:

1. **Navigate to the Git tab** in the main interface
2. **Validate your current changes** using the Validate button
3. **Compare your branch with main** to review changes
4. **Merge your changes** when ready

Your refactoring work is already on a feature branch, so you're ready to proceed with the validation and merge process! 