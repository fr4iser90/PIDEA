# Refactoring Management Framework

## Overview
The Refactoring Management Framework provides advanced refactoring operations and code restructuring capabilities for the PIDEA system.

## Features
- **Method Refactoring**: Extract, inline, and move methods
- **Class Refactoring**: Extract classes and interfaces
- **File Organization**: Split large files and organize imports
- **Naming Improvements**: Rename variables with scope awareness
- **Inheritance Management**: Pull up and push down methods

## Steps Available

### Functional Refactoring
- `extract_method` - Extract method from code block
- `inline_method` - Inline method call
- `move_method` - Move method to different class

### Class Refactoring
- `extract_class` - Extract class from existing class
- `extract_interface` - Extract interface from class
- `pull_up_method` - Pull up method to superclass
- `push_down_method` - Push down method to subclass

### File Organization
- `split_large_file` - Split large file into smaller modules
- `organize_imports` - Organize and clean up imports
- `rename_variable` - Rename variable with scope awareness

## Workflows

### Functional Refactoring Workflow
1. Extract method from code block
2. Inline method call
3. Move method to different class

### Class Refactoring Workflow
1. Extract class from existing class
2. Extract interface from class
3. Pull up method to superclass
4. Push down method to subclass

### File Organization Workflow
1. Split large file into smaller modules
2. Organize and clean up imports
3. Rename variable with scope awareness

## Configuration
- **Auto Load**: Disabled (requires manual activation)
- **Confirmation Required**: Yes
- **Fallback to Core**: Yes
- **Max File Size**: 1MB
- **Backup Enabled**: Yes
- **Validation Enabled**: Yes
- **Undo Enabled**: Yes

## Dependencies
- Core framework services
- IDE integration
- Cursor AI assistance
- File system operations

## Usage
This framework is designed to work with the existing PIDEA core system and provides additional refactoring capabilities beyond the basic operations available in the core. 