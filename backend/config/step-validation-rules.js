/**
 * Step Validation Rules Configuration
 * Centralized configuration for step context validation rules
 */

const validationRules = {
  // Common validation rules applied to all steps
  common: {
    required: ['userId', 'projectId'],
    optional: ['projectPath', 'workspacePath', 'sessionId', 'requestedBy', 'timestamp'],
    types: {
      userId: 'string',
      projectId: 'string',
      projectPath: 'string',
      workspacePath: 'string',
      sessionId: 'string',
      requestedBy: 'string',
      timestamp: 'string'
    },
    validators: {
      userId: {
        type: 'uuid',
        message: 'userId must be a valid UUID'
      },
      projectId: {
        type: 'uuid',
        message: 'projectId must be a valid UUID'
      },
      projectPath: {
        type: 'path',
        message: 'projectPath must be a valid file system path'
      },
      workspacePath: {
        type: 'path',
        message: 'workspacePath must be a valid file system path'
      }
    }
  },

  // IDE-specific validation rules
  ide: {
    required: ['userId', 'projectId', 'activeIDE'],
    optional: ['message', 'sessionId', 'ideType', 'waitForResponse', 'timeout'],
    types: {
      userId: 'string',
      projectId: 'string',
      activeIDE: 'object',
      message: 'string',
      sessionId: 'string',
      ideType: 'string',
      waitForResponse: 'boolean',
      timeout: 'number'
    },
    nested: {
      activeIDE: {
        required: ['port', 'type'],
        optional: ['workspace', 'url', 'version'],
        types: {
          port: 'number',
          type: 'string',
          workspace: 'string',
          url: 'string',
          version: 'string'
        },
        validators: {
          port: {
            type: 'range',
            min: 1000,
            max: 65535,
            message: 'IDE port must be between 1000 and 65535'
          },
          type: {
            type: 'enum',
            values: ['cursor', 'vscode', 'windsurf', 'jetbrains'],
            message: 'IDE type must be one of: cursor, vscode, windsurf, jetbrains'
          }
        }
      }
    },
    validators: {
      timeout: {
        type: 'range',
        min: 1000,
        max: 300000,
        message: 'Timeout must be between 1000 and 300000 milliseconds'
      }
    }
  },

  // Terminal-specific validation rules
  terminal: {
    required: ['userId', 'projectId'],
    optional: ['command', 'script', 'workingDirectory', 'environment', 'timeout', 'interpreter'],
    types: {
      userId: 'string',
      projectId: 'string',
      command: 'string',
      script: 'string',
      workingDirectory: 'string',
      environment: 'object',
      timeout: 'number',
      interpreter: 'string'
    },
    validators: {
      command: {
        type: 'length',
        max: 1000,
        message: 'Command must be less than 1000 characters'
      },
      script: {
        type: 'length',
        max: 50000,
        message: 'Script must be less than 50000 characters'
      },
      timeout: {
        type: 'range',
        min: 1000,
        max: 300000,
        message: 'Timeout must be between 1000 and 300000 milliseconds'
      },
      interpreter: {
        type: 'enum',
        values: ['bash', 'sh', 'zsh', 'python', 'python3', 'node', 'npm', 'npx', 'ruby', 'php', 'perl', 'java', 'go', 'rust'],
        message: 'Interpreter must be one of the supported types'
      }
    }
  },

  // Chat-specific validation rules
  chat: {
    required: ['userId', 'projectId'],
    optional: ['message', 'sessionId', 'title', 'metadata'],
    types: {
      userId: 'string',
      projectId: 'string',
      message: 'string',
      sessionId: 'string',
      title: 'string',
      metadata: 'object'
    },
    validators: {
      message: {
        type: 'length',
        min: 1,
        max: 10000,
        message: 'Message must be between 1 and 10000 characters'
      },
      title: {
        type: 'length',
        max: 200,
        message: 'Title must be less than 200 characters'
      }
    }
  },

  // Analysis-specific validation rules
  analysis: {
    required: ['userId', 'projectId', 'projectPath'],
    optional: ['analysisType', 'workspacePath', 'includePatterns', 'excludePatterns'],
    types: {
      userId: 'string',
      projectId: 'string',
      projectPath: 'string',
      analysisType: 'string',
      workspacePath: 'string',
      includePatterns: 'array',
      excludePatterns: 'array'
    },
    validators: {
      analysisType: {
        type: 'enum',
        values: ['code-quality', 'security', 'performance', 'architecture', 'dependencies', 'coverage'],
        message: 'Analysis type must be one of: code-quality, security, performance, architecture, dependencies, coverage'
      },
      includePatterns: {
        type: 'array',
        message: 'Include patterns must be an array of strings'
      },
      excludePatterns: {
        type: 'array',
        message: 'Exclude patterns must be an array of strings'
      }
    }
  },

  // Git-specific validation rules
  git: {
    required: ['userId', 'projectId', 'projectPath'],
    optional: ['branchName', 'commitMessage', 'remoteUrl', 'remoteName'],
    types: {
      userId: 'string',
      projectId: 'string',
      projectPath: 'string',
      branchName: 'string',
      commitMessage: 'string',
      remoteUrl: 'string',
      remoteName: 'string'
    },
    validators: {
      branchName: {
        type: 'regex',
        pattern: '^[a-zA-Z0-9._/-]+$',
        message: 'Branch name must contain only alphanumeric characters, dots, underscores, slashes, and hyphens'
      },
      commitMessage: {
        type: 'length',
        min: 1,
        max: 500,
        message: 'Commit message must be between 1 and 500 characters'
      },
      remoteUrl: {
        type: 'url',
        message: 'Remote URL must be a valid Git repository URL'
      }
    }
  },

  // Completion/Development-specific validation rules
  completion: {
    required: ['userId', 'projectId', 'projectPath'],
    optional: ['taskId', 'workspacePath', 'devCommand', 'port'],
    types: {
      userId: 'string',
      projectId: 'string',
      projectPath: 'string',
      taskId: 'string',
      workspacePath: 'string',
      devCommand: 'string',
      port: 'number'
    },
    validators: {
      devCommand: {
        type: 'length',
        max: 500,
        message: 'Development command must be less than 500 characters'
      },
      port: {
        type: 'range',
        min: 1000,
        max: 65535,
        message: 'Port must be between 1000 and 65535'
      }
    }
  }
};

// Step-specific validation overrides
const stepOverrides = {
  // IDE Steps
  'ide_send_message_step': {
    required: ['userId', 'projectId', 'message'],
    optional: ['sessionId', 'waitForResponse', 'timeout', 'activeIDE'],
    validators: {
      message: {
        type: 'length',
        min: 1,
        max: 5000,
        message: 'Message must be between 1 and 5000 characters'
      }
    }
  },
  
  'create_chat_step': {
    required: ['userId', 'projectId'],
    optional: ['title', 'message', 'sessionId', 'activeIDE'],
    validators: {
      title: {
        type: 'length',
        min: 1,
        max: 100,
        message: 'Chat title must be between 1 and 100 characters'
      }
    }
  },
  
  'switch_chat_step': {
    required: ['userId', 'projectId', 'sessionId'],
    optional: ['activeIDE']
  },
  
  'close_chat_step': {
    required: ['userId', 'projectId', 'sessionId'],
    optional: ['activeIDE']
  },

  // Terminal Steps
  'execute_terminal_step': {
    required: ['userId', 'projectId', 'command'],
    optional: ['workingDirectory', 'environment', 'timeout', 'waitTime'],
    validators: {
      command: {
        type: 'length',
        min: 1,
        max: 1000,
        message: 'Command must be between 1 and 1000 characters'
      }
    }
  },
  
  'execute_terminal_script_step': {
    required: ['userId', 'projectId', 'script'],
    optional: ['interpreter', 'arguments', 'workingDirectory', 'environment', 'timeout'],
    validators: {
      script: {
        type: 'length',
        min: 1,
        max: 50000,
        message: 'Script must be between 1 and 50000 characters'
      }
    }
  },
  
  'open_terminal_step': {
    required: ['userId', 'projectId'],
    optional: ['workingDirectory', 'activeIDE']
  },

  // Git Steps
  'git_create_branch': {
    required: ['userId', 'projectId', 'projectPath', 'branchName'],
    optional: ['commitMessage', 'checkout', 'remoteName'],
    validators: {
      branchName: {
        type: 'regex',
        pattern: '^[a-zA-Z0-9._/-]+$',
        message: 'Branch name must contain only alphanumeric characters, dots, underscores, slashes, and hyphens'
      }
    }
  },
  
  'git_commit_changes': {
    required: ['userId', 'projectId', 'projectPath', 'commitMessage'],
    optional: ['files', 'all']
  },
  
  'git_push_changes': {
    required: ['userId', 'projectId', 'projectPath'],
    optional: ['remoteName', 'branchName', 'force']
  },

  // Analysis Steps
  'analyze_project_step': {
    required: ['userId', 'projectId', 'projectPath'],
    optional: ['analysisType', 'includePatterns', 'excludePatterns', 'depth']
  },
  
  'code_quality_analysis_step': {
    required: ['userId', 'projectId', 'projectPath'],
    optional: ['rules', 'severity', 'format']
  },

  // Completion Steps
  'run_dev_step': {
    required: ['userId', 'projectId', 'projectPath'],
    optional: ['devCommand', 'port', 'env', 'waitForReady']
  },
  
  'build_project_step': {
    required: ['userId', 'projectId', 'projectPath'],
    optional: ['buildCommand', 'outputDir', 'clean']
  }
};

// Validation configuration
const validationConfig = {
  // Global settings
  strictMode: true,
  logWarnings: true,
  logErrors: true,
  
  // Validation behavior
  failOnMissingRequired: true,
  failOnTypeMismatch: true,
  failOnValidationError: true,
  
  // Custom validators
  customValidators: {
    uuid: (value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    },
    
    path: (value) => {
      if (typeof value !== 'string') return false;
      // Basic path validation - can be enhanced
      return value.length > 0 && !value.includes('\0');
    },
    
    url: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    
    range: (value, min, max) => {
      const num = Number(value);
      return !isNaN(num) && num >= min && num <= max;
    },
    
    length: (value, min, max) => {
      if (typeof value !== 'string') return false;
      return value.length >= min && value.length <= max;
    },
    
    enum: (value, allowedValues) => {
      return allowedValues.includes(value);
    },
    
    regex: (value, pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(value);
    },
    
    array: (value) => {
      return Array.isArray(value);
    }
  }
};

module.exports = {
  validationRules,
  stepOverrides,
  validationConfig
};
