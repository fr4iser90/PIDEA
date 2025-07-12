#!/bin/bash

# Meta-Ebenen Restructure Implementation Script
# This script reorganizes the commands and handlers structure according to the proposed architecture

set -e  # Exit on any error

echo "🚀 Starting Meta-Ebenen Restructure Implementation"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if directory exists
check_directory() {
    if [ ! -d "$1" ]; then
        print_error "Directory not found: $1"
        exit 1
    fi
}

# Function to backup current structure
backup_structure() {
    print_status "Creating backup of current structure..."
    
    if [ -d "backend/application/commands" ]; then
        cp -r backend/application/commands backend/application/commands.backup.$(date +%Y%m%d_%H%M%S)
        print_success "Commands backup created"
    fi
    
    if [ -d "backend/application/handlers" ]; then
        cp -r backend/application/handlers backend/application/handlers.backup.$(date +%Y%m%d_%H%M%S)
        print_success "Handlers backup created"
    fi
}

# Phase 1: Create New Structure
phase1_create_structure() {
    print_status "Phase 1: Creating new directory structure..."
    
    # Create commands categories
    mkdir -p backend/application/commands/categories/analysis
    mkdir -p backend/application/commands/categories/generate
    mkdir -p backend/application/commands/categories/refactor
    mkdir -p backend/application/commands/categories/management
    
    # Create handlers categories
    mkdir -p backend/application/handlers/categories/analysis
    mkdir -p backend/application/handlers/categories/generate
    mkdir -p backend/application/handlers/categories/refactor
    mkdir -p backend/application/handlers/categories/management
    
    print_success "New directory structure created"
}

# Phase 2: Move Commands
phase2_move_commands() {
    print_status "Phase 2: Moving commands to categories..."
    
    # Check if source directories exist
    check_directory "backend/application/commands"
    
    # Move analysis commands
    if [ -d "backend/application/commands/analyze" ]; then
        mv backend/application/commands/analyze/* backend/application/commands/categories/analysis/ 2>/dev/null || true
        print_success "Analysis commands moved"
    fi
    
    # Move generate commands
    if [ -d "backend/application/commands/generate" ]; then
        mv backend/application/commands/generate/* backend/application/commands/categories/generate/ 2>/dev/null || true
        print_success "Generate commands moved"
    fi
    
    # Move refactor commands
    if [ -d "backend/application/commands/refactor" ]; then
        mv backend/application/commands/refactor/* backend/application/commands/categories/refactor/ 2>/dev/null || true
        print_success "Refactor commands moved"
    fi
    
    # Move management commands (root level files)
    management_files=(
        "AutoRefactorCommand.js"
        "CreateTaskCommand.js"
        "PortStreamingCommand.js"
        "ProcessTodoListCommand.js"
        "SendMessageCommand.js"
        "StartStreamingCommand.js"
        "StopStreamingCommand.js"
        "TestCorrectionCommand.js"
        "UpdateTestStatusCommand.js"
    )
    
    for file in "${management_files[@]}"; do
        if [ -f "backend/application/commands/$file" ]; then
            mv "backend/application/commands/$file" "backend/application/commands/categories/management/"
            print_success "Moved $file to management category"
        fi
    done
    
    print_success "All commands moved to categories"
}

# Phase 3: Move Handlers
phase3_move_handlers() {
    print_status "Phase 3: Moving handlers to categories..."
    
    # Check if source directories exist
    check_directory "backend/application/handlers"
    
    # Move analysis handlers
    if [ -d "backend/application/handlers/analyze" ]; then
        mv backend/application/handlers/analyze/* backend/application/handlers/categories/analysis/ 2>/dev/null || true
        print_success "Analysis handlers moved"
    fi
    
    # Move generate handlers (including subdirectories)
    if [ -d "backend/application/handlers/generate" ]; then
        mv backend/application/handlers/generate/* backend/application/handlers/categories/generate/ 2>/dev/null || true
        print_success "Generate handlers moved"
    fi
    
    # Move refactor handlers
    if [ -d "backend/application/handlers/refactor" ]; then
        mv backend/application/handlers/refactor/* backend/application/handlers/categories/refactor/ 2>/dev/null || true
        print_success "Refactor handlers moved"
    fi
    
    # Move management handlers (root level files)
    management_handlers=(
        "CreateTaskHandler.js"
        "GetChatHistoryHandler.js"
        "PortStreamingHandler.js"
        "ProcessTodoListHandler.js"
        "SendMessageHandler.js"
        "StartStreamingHandler.js"
        "StopStreamingHandler.js"
        "UpdateTestStatusHandler.js"
    )
    
    for file in "${management_handlers[@]}"; do
        if [ -f "backend/application/handlers/$file" ]; then
            mv "backend/application/handlers/$file" "backend/application/handlers/categories/management/"
            print_success "Moved $file to management category"
        fi
    done
    
    print_success "All handlers moved to categories"
}

# Phase 4: Create Registry Files
phase4_create_registry_files() {
    print_status "Phase 4: Creating registry and builder files..."
    
    # Create CommandRegistry.js
    cat > backend/application/commands/CommandRegistry.js << 'EOF'
/**
 * CommandRegistry - Application Layer: Command management
 * Manages command registration and retrieval with category support
 */
class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = new Map();
  }

  /**
   * Build command from category
   * @param {string} category - Command category
   * @param {string} name - Command name
   * @param {Object} params - Command parameters
   * @returns {Object|null} Command instance
   */
  static buildFromCategory(category, name, params) {
    const commandMap = {
      analysis: {
        AdvancedAnalysisCommand: require('./categories/analysis/AdvancedAnalysisCommand'),
        AnalyzeArchitectureCommand: require('./categories/analysis/AnalyzeArchitectureCommand'),
        AnalyzeCodeQualityCommand: require('./categories/analysis/AnalyzeCodeQualityCommand'),
        AnalyzeDependenciesCommand: require('./categories/analysis/AnalyzeDependenciesCommand'),
        AnalyzeRepoStructureCommand: require('./categories/analysis/AnalyzeRepoStructureCommand'),
        AnalyzeTechStackCommand: require('./categories/analysis/AnalyzeTechStackCommand')
      },
      generate: {
        GenerateConfigsCommand: require('./categories/generate/GenerateConfigsCommand'),
        GenerateDocumentationCommand: require('./categories/generate/GenerateDocumentationCommand'),
        GenerateScriptsCommand: require('./categories/generate/GenerateScriptsCommand'),
        GenerateTestsCommand: require('./categories/generate/GenerateTestsCommand')
      },
      refactor: {
        OrganizeModulesCommand: require('./categories/refactor/OrganizeModulesCommand'),
        RestructureArchitectureCommand: require('./categories/refactor/RestructureArchitectureCommand'),
        SplitLargeFilesCommand: require('./categories/refactor/SplitLargeFilesCommand'),
        CleanDependenciesCommand: require('./categories/refactor/CleanDependenciesCommand')
      },
      management: {
        AutoRefactorCommand: require('./categories/management/AutoRefactorCommand'),
        CreateTaskCommand: require('./categories/management/CreateTaskCommand'),
        PortStreamingCommand: require('./categories/management/PortStreamingCommand'),
        ProcessTodoListCommand: require('./categories/management/ProcessTodoListCommand'),
        SendMessageCommand: require('./categories/management/SendMessageCommand'),
        StartStreamingCommand: require('./categories/management/StartStreamingCommand'),
        StopStreamingCommand: require('./categories/management/StopStreamingCommand'),
        TestCorrectionCommand: require('./categories/management/TestCorrectionCommand'),
        UpdateTestStatusCommand: require('./categories/management/UpdateTestStatusCommand')
      }
    };
    
    const CommandClass = commandMap[category]?.[name];
    return CommandClass ? new CommandClass(params) : null;
  }

  /**
   * Get commands by category
   * @param {string} category - Category name
   * @returns {Array} Command names in category
   */
  static getByCategory(category) {
    const categoryCommands = {
      analysis: [
        'AdvancedAnalysisCommand',
        'AnalyzeArchitectureCommand',
        'AnalyzeCodeQualityCommand',
        'AnalyzeDependenciesCommand',
        'AnalyzeRepoStructureCommand',
        'AnalyzeTechStackCommand'
      ],
      generate: [
        'GenerateConfigsCommand',
        'GenerateDocumentationCommand',
        'GenerateScriptsCommand',
        'GenerateTestsCommand'
      ],
      refactor: [
        'OrganizeModulesCommand',
        'RestructureArchitectureCommand',
        'SplitLargeFilesCommand',
        'CleanDependenciesCommand'
      ],
      management: [
        'AutoRefactorCommand',
        'CreateTaskCommand',
        'PortStreamingCommand',
        'ProcessTodoListCommand',
        'SendMessageCommand',
        'StartStreamingCommand',
        'StopStreamingCommand',
        'TestCorrectionCommand',
        'UpdateTestStatusCommand'
      ]
    };
    
    return categoryCommands[category] || [];
  }
}

module.exports = CommandRegistry;
EOF

    # Create CommandBuilder.js
    cat > backend/application/commands/CommandBuilder.js << 'EOF'
/**
 * CommandBuilder - Application Layer: Command builder
 * Builds commands with validation and configuration
 */
const CommandRegistry = require('./CommandRegistry');

class CommandBuilder {
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * Build command from category
   * @param {string} category - Command category
   * @param {string} name - Command name
   * @param {Object} params - Command parameters
   * @returns {Object} Command instance
   */
  static buildFromCategory(category, name, params = {}) {
    return CommandRegistry.buildFromCategory(category, name, params);
  }

  /**
   * Validate command parameters
   * @param {string} commandName - Command name
   * @param {Object} params - Command parameters
   * @returns {Object} Validation result
   */
  static validateParams(commandName, params) {
    const CommandClass = CommandRegistry.buildFromCategory('management', commandName, params);
    
    if (!CommandClass) {
      return { isValid: false, errors: [`Command not found: ${commandName}`] };
    }

    try {
      const command = new CommandClass(params);
      
      if (typeof command.validateParams === 'function') {
        command.validateParams(params);
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }
}

module.exports = CommandBuilder;
EOF

    # Create HandlerRegistry.js
    cat > backend/application/handlers/HandlerRegistry.js << 'EOF'
/**
 * HandlerRegistry - Application Layer: Handler management
 * Manages handler registration and retrieval with category support
 */
class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
    this.categories = new Map();
  }

  /**
   * Build handler from category
   * @param {string} category - Handler category
   * @param {string} name - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object|null} Handler instance
   */
  static buildFromCategory(category, name, dependencies) {
    const handlerMap = {
      analysis: {
        AdvancedAnalysisHandler: require('./categories/analysis/AdvancedAnalysisHandler')
      },
      generate: {
        GenerateConfigsHandler: require('./categories/generate/GenerateConfigsHandler'),
        GenerateDocumentationHandler: require('./categories/generate/GenerateDocumentationHandler'),
        GenerateScriptsHandler: require('./categories/generate/GenerateScriptsHandler'),
        GenerateTestsHandler: require('./categories/generate/GenerateTestsHandler')
      },
      refactor: {
        OrganizeModulesHandler: require('./categories/refactor/OrganizeModulesHandler'),
        RestructureArchitectureHandler: require('./categories/refactor/RestructureArchitectureHandler'),
        SplitLargeFilesHandler: require('./categories/refactor/SplitLargeFilesHandler'),
        CleanDependenciesHandler: require('./categories/refactor/CleanDependenciesHandler')
      },
      management: {
        CreateTaskHandler: require('./categories/management/CreateTaskHandler'),
        GetChatHistoryHandler: require('./categories/management/GetChatHistoryHandler'),
        PortStreamingHandler: require('./categories/management/PortStreamingHandler'),
        ProcessTodoListHandler: require('./categories/management/ProcessTodoListHandler'),
        SendMessageHandler: require('./categories/management/SendMessageHandler'),
        StartStreamingHandler: require('./categories/management/StartStreamingHandler'),
        StopStreamingHandler: require('./categories/management/StopStreamingHandler'),
        UpdateTestStatusHandler: require('./categories/management/UpdateTestStatusHandler')
      }
    };
    
    const HandlerClass = handlerMap[category]?.[name];
    return HandlerClass ? new HandlerClass(dependencies) : null;
  }

  /**
   * Get handlers by category
   * @param {string} category - Category name
   * @returns {Array} Handler names in category
   */
  static getByCategory(category) {
    const categoryHandlers = {
      analysis: [
        'AdvancedAnalysisHandler'
      ],
      generate: [
        'GenerateConfigsHandler',
        'GenerateDocumentationHandler',
        'GenerateScriptsHandler',
        'GenerateTestsHandler'
      ],
      refactor: [
        'OrganizeModulesHandler',
        'RestructureArchitectureHandler',
        'SplitLargeFilesHandler',
        'CleanDependenciesHandler'
      ],
      management: [
        'CreateTaskHandler',
        'GetChatHistoryHandler',
        'PortStreamingHandler',
        'ProcessTodoListHandler',
        'SendMessageHandler',
        'StartStreamingHandler',
        'StopStreamingHandler',
        'UpdateTestStatusHandler'
      ]
    };
    
    return categoryHandlers[category] || [];
  }
}

module.exports = HandlerRegistry;
EOF

    # Create HandlerBuilder.js
    cat > backend/application/handlers/HandlerBuilder.js << 'EOF'
/**
 * HandlerBuilder - Application Layer: Handler builder
 * Builds handlers with validation and configuration
 */
const HandlerRegistry = require('./HandlerRegistry');

class HandlerBuilder {
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * Build handler from category
   * @param {string} category - Handler category
   * @param {string} name - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object} Handler instance
   */
  static buildFromCategory(category, name, dependencies = {}) {
    return HandlerRegistry.buildFromCategory(category, name, dependencies);
  }

  /**
   * Validate handler dependencies
   * @param {string} handlerName - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object} Validation result
   */
  static validateDependencies(handlerName, dependencies) {
    const HandlerClass = HandlerRegistry.buildFromCategory('management', handlerName, dependencies);
    
    if (!HandlerClass) {
      return { isValid: false, errors: [`Handler not found: ${handlerName}`] };
    }

    try {
      const handler = new HandlerClass(dependencies);
      
      if (typeof handler.validateDependencies === 'function') {
        handler.validateDependencies(dependencies);
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }
}

module.exports = HandlerBuilder;
EOF

    print_success "Registry and builder files created"
}

# Phase 5: Create Index Files
phase5_create_index_files() {
    print_status "Phase 5: Creating index files..."
    
    # Create commands/index.js
    cat > backend/application/commands/index.js << 'EOF'
/**
 * Commands Module - Application Layer
 * Exports all commands organized by categories with registry and builder
 */
const CommandRegistry = require('./CommandRegistry');
const CommandBuilder = require('./CommandBuilder');

// Export registry and builder
module.exports = {
  CommandRegistry,
  CommandBuilder,
  
  // Export category methods
  buildFromCategory: CommandBuilder.buildFromCategory,
  getByCategory: CommandRegistry.getByCategory,
  
  // Export categories
  analysis: CommandRegistry.getByCategory('analysis'),
  generate: CommandRegistry.getByCategory('generate'),
  refactor: CommandRegistry.getByCategory('refactor'),
  management: CommandRegistry.getByCategory('management')
};
EOF

    # Create handlers/index.js
    cat > backend/application/handlers/index.js << 'EOF'
/**
 * Handlers Module - Application Layer
 * Exports all handlers organized by categories with registry and builder
 */
const HandlerRegistry = require('./HandlerRegistry');
const HandlerBuilder = require('./HandlerBuilder');

// Export registry and builder
module.exports = {
  HandlerRegistry,
  HandlerBuilder,
  
  // Export category methods
  buildFromCategory: HandlerBuilder.buildFromCategory,
  getByCategory: HandlerRegistry.getByCategory,
  
  // Export categories
  analysis: HandlerRegistry.getByCategory('analysis'),
  generate: HandlerRegistry.getByCategory('generate'),
  refactor: HandlerRegistry.getByCategory('refactor'),
  management: HandlerRegistry.getByCategory('management')
};
EOF

    print_success "Index files created"
}

# Phase 6: Cleanup Old Structure
phase6_cleanup() {
    print_status "Phase 6: Cleaning up old structure..."
    
    # Remove old directories if they're empty
    if [ -d "backend/application/commands/analyze" ]; then
        rmdir backend/application/commands/analyze 2>/dev/null || print_warning "Could not remove analyze directory (may not be empty)"
    fi
    
    if [ -d "backend/application/commands/generate" ]; then
        rmdir backend/application/commands/generate 2>/dev/null || print_warning "Could not remove generate directory (may not be empty)"
    fi
    
    if [ -d "backend/application/commands/refactor" ]; then
        rmdir backend/application/commands/refactor 2>/dev/null || print_warning "Could not remove refactor directory (may not be empty)"
    fi
    
    if [ -d "backend/application/handlers/analyze" ]; then
        rmdir backend/application/handlers/analyze 2>/dev/null || print_warning "Could not remove analyze directory (may not be empty)"
    fi
    
    if [ -d "backend/application/handlers/generate" ]; then
        rmdir backend/application/handlers/generate 2>/dev/null || print_warning "Could not remove generate directory (may not be empty)"
    fi
    
    if [ -d "backend/application/handlers/refactor" ]; then
        rmdir backend/application/handlers/refactor 2>/dev/null || print_warning "Could not remove refactor directory (may not be empty)"
    fi
    
    print_success "Old structure cleaned up"
}

# Phase 7: Update Import Paths
phase7_update_imports() {
    print_status "Phase 7: Updating import paths..."
    
    # Update command imports
    find . -name "*.js" -type f -exec sed -i 's|@/application/commands/analyze/|@/application/commands/categories/analysis/|g' {} \; 2>/dev/null || true
    find . -name "*.js" -type f -exec sed -i 's|@/application/commands/generate/|@/application/commands/categories/generate/|g' {} \; 2>/dev/null || true
    find . -name "*.js" -type f -exec sed -i 's|@/application/commands/refactor/|@/application/commands/categories/refactor/|g' {} \; 2>/dev/null || true
    
    # Update handler imports
    find . -name "*.js" -type f -exec sed -i 's|@/application/handlers/analyze/|@/application/handlers/categories/analysis/|g' {} \; 2>/dev/null || true
    find . -name "*.js" -type f -exec sed -i 's|@/application/handlers/generate/|@/application/handlers/categories/generate/|g' {} \; 2>/dev/null || true
    find . -name "*.js" -type f -exec sed -i 's|@/application/handlers/refactor/|@/application/handlers/categories/refactor/|g' {} \; 2>/dev/null || true
    
    # Update root level imports
    find . -name "*.js" -type f -exec sed -i 's|@/application/commands/CreateTaskCommand|@/application/commands/categories/management/CreateTaskCommand|g' {} \; 2>/dev/null || true
    find . -name "*.js" -type f -exec sed -i 's|@/application/handlers/CreateTaskHandler|@/application/handlers/categories/management/CreateTaskHandler|g' {} \; 2>/dev/null || true
    
    print_success "Import paths updated"
}

# Main execution
main() {
    echo "Starting Meta-Ebenen Restructure at $(date)"
    echo "=============================================="
    
    # Check if we're in the right directory
    if [ ! -d "backend" ]; then
        print_error "This script must be run from the project root directory"
        exit 1
    fi
    
    # Backup current structure
    backup_structure
    
    # Execute phases
    phase1_create_structure
    phase2_move_commands
    phase3_move_handlers
    phase4_create_registry_files
    phase5_create_index_files
    phase6_cleanup
    phase7_update_imports
    
    echo ""
    echo "🎉 Meta-Ebenen Restructure completed successfully!"
    echo "================================================"
    echo ""
    echo "New structure created:"
    echo "  - Commands: backend/application/commands/categories/"
    echo "  - Handlers: backend/application/handlers/categories/"
    echo ""
    echo "Registry files created:"
    echo "  - CommandRegistry.js"
    echo "  - CommandBuilder.js"
    echo "  - HandlerRegistry.js"
    echo "  - HandlerBuilder.js"
    echo ""
    echo "Index files created:"
    echo "  - commands/index.js"
    echo "  - handlers/index.js"
    echo ""
    echo "Next steps:"
    echo "  1. Test the new structure"
    echo "  2. Update any remaining import paths manually"
    echo "  3. Run your test suite"
    echo "  4. Update documentation"
    echo ""
    echo "Backup created in:"
    echo "  - backend/application/commands.backup.*"
    echo "  - backend/application/handlers.backup.*"
    echo ""
}

# Run main function
main "$@" 