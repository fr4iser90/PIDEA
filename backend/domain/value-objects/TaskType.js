/**
 * TaskType - Value object for task type
 */
class TaskType {
  static FEATURE = 'feature';
  static BUG = 'bug';
  static REFACTOR = 'refactor';
  static DOCUMENTATION = 'documentation';
  static MANUAL = 'manual';
  static TEST = 'test';
  static TESTING = 'testing';
  static TEST_FIX = 'test_fix';
  static TEST_COVERAGE = 'test_coverage';
  static TEST_REFACTOR = 'test_refactor';
  static TEST_STATUS = 'test_status';
  static TEST_REPORT = 'test_report';
  static OPTIMIZATION = 'optimization';
  static SECURITY = 'security';
  static ANALYSIS = 'analysis';
  
  // Roadmap feature types
  static FEATURE_SUMMARY = 'feature_summary';
  static FEATURE_IMPLEMENTATION = 'feature_implementation';
  static FEATURE_PHASE = 'feature_phase';
  static FEATURE_INDEX = 'feature_index';
  
  // New specific refactoring types
  static REFACTOR_NODE = 'refactor_node';
  static REFACTOR_REACT = 'refactor_react';
  static REFACTOR_FRONTEND = 'refactor_frontend';
  static REFACTOR_BACKEND = 'refactor_backend';
  static REFACTOR_DATABASE = 'refactor_database';
  static REFACTOR_API = 'refactor_api';
  
  // Additional technology-specific refactoring types
  static REFACTOR_PYTHON = 'refactor_python';
  static REFACTOR_JAVA = 'refactor_java';
  static REFACTOR_C_SHARP = 'refactor_csharp';
  static REFACTOR_PHP = 'refactor_php';
  static REFACTOR_RUBY = 'refactor_ruby';
  static REFACTOR_GO = 'refactor_go';
  static REFACTOR_RUST = 'refactor_rust';
  static REFACTOR_KOTLIN = 'refactor_kotlin';
  static REFACTOR_SWIFT = 'refactor_swift';
  static REFACTOR_DART = 'refactor_dart';
  
  // Framework-specific refactoring types
  static REFACTOR_VUE = 'refactor_vue';
  static REFACTOR_ANGULAR = 'refactor_angular';
  static REFACTOR_SVELTE = 'refactor_svelte';
  static REFACTOR_NEXT = 'refactor_next';
  static REFACTOR_NUXT = 'refactor_nuxt';
  static REFACTOR_DJANGO = 'refactor_django';
  static REFACTOR_FLASK = 'refactor_flask';
  static REFACTOR_SPRING = 'refactor_spring';
  static REFACTOR_LARAVEL = 'refactor_laravel';
  static REFACTOR_RAILS = 'refactor_rails';
  static REFACTOR_EXPRESS = 'refactor_express';
  static REFACTOR_FASTAPI = 'refactor_fastapi';
  
  // Infrastructure and DevOps refactoring types
  static REFACTOR_DOCKER = 'refactor_docker';
  static REFACTOR_KUBERNETES = 'refactor_kubernetes';
  static REFACTOR_TERRAFORM = 'refactor_terraform';
  static REFACTOR_ANSIBLE = 'refactor_ansible';
  static REFACTOR_CLOUD = 'refactor_cloud';
  static REFACTOR_MICROSERVICES = 'refactor_microservices';
  
  // New specific testing types
  static TEST_UNIT = 'test_unit';
  static TEST_INTEGRATION = 'test_integration';
  static TEST_E2E = 'test_e2e';
  static TEST_PERFORMANCE = 'test_performance';
  static TEST_SECURITY = 'test_security';
  
  // Technology-specific testing types
  static TEST_JEST = 'test_jest';
  static TEST_PYTEST = 'test_pytest';
  static TEST_JUNIT = 'test_junit';
  static TEST_PHPUNIT = 'test_phpunit';
  static TEST_RSPEC = 'test_rspec';
  static TEST_GO_TEST = 'test_go_test';
  static TEST_CARGO_TEST = 'test_cargo_test';
  static TEST_GRADLE = 'test_gradle';
  static TEST_XCTEST = 'test_xctest';
  static TEST_FLUTTER = 'test_flutter';

  constructor(value = TaskType.FEATURE) {
    if (!TaskType.isValid(value)) {
      throw new Error(`Invalid task type: ${value}`);
    }
    this.value = value;
  }

  requiresAI() {
    return [
      TaskType.FEATURE,
      TaskType.BUG,
      TaskType.OPTIMIZATION,
      TaskType.SECURITY,
      TaskType.ANALYSIS,
      TaskType.MANUAL,
      TaskType.TEST,
      TaskType.TESTING,
      TaskType.TEST_FIX,
      TaskType.TEST_COVERAGE,
      TaskType.TEST_REFACTOR,
      TaskType.REFACTOR,
      TaskType.REFACTOR_NODE,
      TaskType.REFACTOR_REACT,
      TaskType.REFACTOR_FRONTEND,
      TaskType.REFACTOR_BACKEND,
      TaskType.REFACTOR_DATABASE,
      TaskType.REFACTOR_API,
      TaskType.REFACTOR_PYTHON,
      TaskType.REFACTOR_JAVA,
      TaskType.REFACTOR_C_SHARP,
      TaskType.REFACTOR_PHP,
      TaskType.REFACTOR_RUBY,
      TaskType.REFACTOR_GO,
      TaskType.REFACTOR_RUST,
      TaskType.REFACTOR_KOTLIN,
      TaskType.REFACTOR_SWIFT,
      TaskType.REFACTOR_DART,
      TaskType.REFACTOR_VUE,
      TaskType.REFACTOR_ANGULAR,
      TaskType.REFACTOR_SVELTE,
      TaskType.REFACTOR_NEXT,
      TaskType.REFACTOR_NUXT,
      TaskType.REFACTOR_DJANGO,
      TaskType.REFACTOR_FLASK,
      TaskType.REFACTOR_SPRING,
      TaskType.REFACTOR_LARAVEL,
      TaskType.REFACTOR_RAILS,
      TaskType.REFACTOR_EXPRESS,
      TaskType.REFACTOR_FASTAPI,
      TaskType.REFACTOR_DOCKER,
      TaskType.REFACTOR_KUBERNETES,
      TaskType.REFACTOR_TERRAFORM,
      TaskType.REFACTOR_ANSIBLE,
      TaskType.REFACTOR_CLOUD,
      TaskType.REFACTOR_MICROSERVICES,
      TaskType.TEST_UNIT,
      TaskType.TEST_INTEGRATION,
      TaskType.TEST_E2E,
      TaskType.TEST_PERFORMANCE,
      TaskType.TEST_SECURITY,
      TaskType.TEST_JEST,
      TaskType.TEST_PYTEST,
      TaskType.TEST_JUNIT,
      TaskType.TEST_PHPUNIT,
      TaskType.TEST_RSPEC,
      TaskType.TEST_GO_TEST,
      TaskType.TEST_CARGO_TEST,
      TaskType.TEST_GRADLE,
      TaskType.TEST_XCTEST,
      TaskType.TEST_FLUTTER,
      TaskType.FEATURE_SUMMARY,
      TaskType.FEATURE_IMPLEMENTATION,
      TaskType.FEATURE_PHASE,
      TaskType.FEATURE_INDEX
    ].includes(this.value);
  }

  requiresExecution() {
    return [
      TaskType.FEATURE,
      TaskType.BUG,
      TaskType.REFACTOR,
      TaskType.OPTIMIZATION,
      TaskType.SECURITY,
      TaskType.DOCUMENTATION,
      TaskType.MANUAL,
      TaskType.ANALYSIS,
      TaskType.TEST,
      TaskType.TESTING,
      TaskType.TEST_FIX,
      TaskType.TEST_COVERAGE,
      TaskType.TEST_REFACTOR,
      TaskType.TEST_STATUS,
      TaskType.TEST_REPORT,
      TaskType.REFACTOR_NODE,
      TaskType.REFACTOR_REACT,
      TaskType.REFACTOR_FRONTEND,
      TaskType.REFACTOR_BACKEND,
      TaskType.REFACTOR_DATABASE,
      TaskType.REFACTOR_API,
      TaskType.REFACTOR_PYTHON,
      TaskType.REFACTOR_JAVA,
      TaskType.REFACTOR_C_SHARP,
      TaskType.REFACTOR_PHP,
      TaskType.REFACTOR_RUBY,
      TaskType.REFACTOR_GO,
      TaskType.REFACTOR_RUST,
      TaskType.REFACTOR_KOTLIN,
      TaskType.REFACTOR_SWIFT,
      TaskType.REFACTOR_DART,
      TaskType.REFACTOR_VUE,
      TaskType.REFACTOR_ANGULAR,
      TaskType.REFACTOR_SVELTE,
      TaskType.REFACTOR_NEXT,
      TaskType.REFACTOR_NUXT,
      TaskType.REFACTOR_DJANGO,
      TaskType.REFACTOR_FLASK,
      TaskType.REFACTOR_SPRING,
      TaskType.REFACTOR_LARAVEL,
      TaskType.REFACTOR_RAILS,
      TaskType.REFACTOR_EXPRESS,
      TaskType.REFACTOR_FASTAPI,
      TaskType.REFACTOR_DOCKER,
      TaskType.REFACTOR_KUBERNETES,
      TaskType.REFACTOR_TERRAFORM,
      TaskType.REFACTOR_ANSIBLE,
      TaskType.REFACTOR_CLOUD,
      TaskType.REFACTOR_MICROSERVICES,
      TaskType.TEST_UNIT,
      TaskType.TEST_INTEGRATION,
      TaskType.TEST_E2E,
      TaskType.TEST_PERFORMANCE,
      TaskType.TEST_SECURITY,
      TaskType.TEST_JEST,
      TaskType.TEST_PYTEST,
      TaskType.TEST_JUNIT,
      TaskType.TEST_PHPUNIT,
      TaskType.TEST_RSPEC,
      TaskType.TEST_GO_TEST,
      TaskType.TEST_CARGO_TEST,
      TaskType.TEST_GRADLE,
      TaskType.TEST_XCTEST,
      TaskType.TEST_FLUTTER,
      TaskType.FEATURE_SUMMARY,
      TaskType.FEATURE_IMPLEMENTATION,
      TaskType.FEATURE_PHASE,
      TaskType.FEATURE_INDEX
    ].includes(this.value);
  }

  requiresHumanReview() {
    return [TaskType.SECURITY, TaskType.BUG, TaskType.TEST_SECURITY].includes(this.value);
  }

  isFeature() {
    return this.value === TaskType.FEATURE;
  }

  isBug() {
    return this.value === TaskType.BUG;
  }

  isRefactor() {
    return this.value === TaskType.REFACTOR || 
           this.value === TaskType.REFACTOR_NODE || 
           this.value === TaskType.REFACTOR_REACT || 
           this.value === TaskType.REFACTOR_FRONTEND || 
           this.value === TaskType.REFACTOR_BACKEND || 
           this.value === TaskType.REFACTOR_DATABASE || 
           this.value === TaskType.REFACTOR_API ||
           this.value === TaskType.REFACTOR_PYTHON ||
           this.value === TaskType.REFACTOR_JAVA ||
           this.value === TaskType.REFACTOR_C_SHARP ||
           this.value === TaskType.REFACTOR_PHP ||
           this.value === TaskType.REFACTOR_RUBY ||
           this.value === TaskType.REFACTOR_GO ||
           this.value === TaskType.REFACTOR_RUST ||
           this.value === TaskType.REFACTOR_KOTLIN ||
           this.value === TaskType.REFACTOR_SWIFT ||
           this.value === TaskType.REFACTOR_DART ||
           this.value === TaskType.REFACTOR_VUE ||
           this.value === TaskType.REFACTOR_ANGULAR ||
           this.value === TaskType.REFACTOR_SVELTE ||
           this.value === TaskType.REFACTOR_NEXT ||
           this.value === TaskType.REFACTOR_NUXT ||
           this.value === TaskType.REFACTOR_DJANGO ||
           this.value === TaskType.REFACTOR_FLASK ||
           this.value === TaskType.REFACTOR_SPRING ||
           this.value === TaskType.REFACTOR_LARAVEL ||
           this.value === TaskType.REFACTOR_RAILS ||
           this.value === TaskType.REFACTOR_EXPRESS ||
           this.value === TaskType.REFACTOR_FASTAPI ||
           this.value === TaskType.REFACTOR_DOCKER ||
           this.value === TaskType.REFACTOR_KUBERNETES ||
           this.value === TaskType.REFACTOR_TERRAFORM ||
           this.value === TaskType.REFACTOR_ANSIBLE ||
           this.value === TaskType.REFACTOR_CLOUD ||
           this.value === TaskType.REFACTOR_MICROSERVICES;
  }

  isDocumentation() {
    return this.value === TaskType.DOCUMENTATION;
  }

  isManual() {
    return this.value === TaskType.MANUAL;
  }

  isTest() {
    return this.value === TaskType.TEST || 
           this.value === TaskType.TESTING || 
           this.value === TaskType.TEST_FIX || 
           this.value === TaskType.TEST_COVERAGE || 
           this.value === TaskType.TEST_REFACTOR || 
           this.value === TaskType.TEST_STATUS || 
           this.value === TaskType.TEST_REPORT || 
           this.value === TaskType.TEST_UNIT || 
           this.value === TaskType.TEST_INTEGRATION || 
           this.value === TaskType.TEST_E2E || 
           this.value === TaskType.TEST_PERFORMANCE || 
           this.value === TaskType.TEST_SECURITY ||
           this.value === TaskType.TEST_JEST ||
           this.value === TaskType.TEST_PYTEST ||
           this.value === TaskType.TEST_JUNIT ||
           this.value === TaskType.TEST_PHPUNIT ||
           this.value === TaskType.TEST_RSPEC ||
           this.value === TaskType.TEST_GO_TEST ||
           this.value === TaskType.TEST_CARGO_TEST ||
           this.value === TaskType.TEST_GRADLE ||
           this.value === TaskType.TEST_XCTEST ||
           this.value === TaskType.TEST_FLUTTER;
  }

  isTesting() {
    return this.value === TaskType.TESTING;
  }

  isTestFix() {
    return this.value === TaskType.TEST_FIX;
  }

  isTestCoverage() {
    return this.value === TaskType.TEST_COVERAGE;
  }

  isTestRefactor() {
    return this.value === TaskType.TEST_REFACTOR;
  }

  isTestStatus() {
    return this.value === TaskType.TEST_STATUS;
  }

  isTestReport() {
    return this.value === TaskType.TEST_REPORT;
  }

  isOptimization() {
    return this.value === TaskType.OPTIMIZATION;
  }

  isSecurity() {
    return this.value === TaskType.SECURITY;
  }

  isAnalysis() {
    return this.value === TaskType.ANALYSIS;
  }

  // New helper methods for specific types
  isRefactorNode() {
    return this.value === TaskType.REFACTOR_NODE;
  }

  isRefactorReact() {
    return this.value === TaskType.REFACTOR_REACT;
  }

  isRefactorFrontend() {
    return this.value === TaskType.REFACTOR_FRONTEND;
  }

  isRefactorBackend() {
    return this.value === TaskType.REFACTOR_BACKEND;
  }

  isRefactorDatabase() {
    return this.value === TaskType.REFACTOR_DATABASE;
  }

  isRefactorApi() {
    return this.value === TaskType.REFACTOR_API;
  }

  isTestUnit() {
    return this.value === TaskType.TEST_UNIT;
  }

  isTestIntegration() {
    return this.value === TaskType.TEST_INTEGRATION;
  }

  isTestE2E() {
    return this.value === TaskType.TEST_E2E;
  }

  isTestPerformance() {
    return this.value === TaskType.TEST_PERFORMANCE;
  }

  isTestSecurity() {
    return this.value === TaskType.TEST_SECURITY;
  }

  // Workflow compatibility methods
  supportsWorkflow() {
    return this.requiresExecution() || this.requiresAI();
  }

  gettaskMode() {
    if (this.isRefactor()) {
      return 'refactoring';
    } else if (this.isTest()) {
      return 'testing';
    } else if (this.isAnalysis()) {
      return 'analysis';
    } else if (this.isFeature()) {
      return 'feature';
    } else if (this.isBug()) {
      return 'bugfix';
    } else if (this.isDocumentation()) {
      return 'documentation';
    } else if (this.isManual()) {
      return 'manual';
    } else if (this.isOptimization()) {
      return 'optimization';
    } else if (this.isSecurity()) {
      return 'security';
    } else {
      return 'generic';
    }
  }

  getWorkflowSteps() {
    const taskMode = this.gettaskMode();
    
    switch (taskMode) {
      case 'refactoring':
        return ['analysis', 'refactoring', 'testing', 'documentation'];
      case 'testing':
        return ['setup', 'execution', 'validation', 'reporting'];
      case 'analysis':
        return ['data_collection', 'analysis', 'reporting'];
      case 'feature':
        return ['planning', 'implementation', 'testing', 'documentation'];
      case 'bugfix':
        return ['investigation', 'fix', 'testing', 'verification'];
      case 'documentation':
        return ['research', 'writing', 'review', 'publishing'];
      case 'manual':
        return ['planning', 'execution', 'validation', 'completion'];
      case 'optimization':
        return ['baseline', 'optimization', 'testing', 'validation'];
      case 'security':
        return ['assessment', 'mitigation', 'testing', 'validation'];
      default:
        return ['execution'];
    }
  }

  getWorkflowDependencies() {
    const taskMode = this.gettaskMode();
    
    switch (taskMode) {
      case 'refactoring':
        return ['code_analyzer', 'refactoring_engine', 'test_runner'];
      case 'testing':
        return ['test_runner', 'coverage_analyzer'];
      case 'analysis':
        return ['code_analyzer', 'metrics_collector'];
      case 'feature':
        return ['code_generator', 'test_runner', 'documentation_generator'];
      case 'bugfix':
        return ['debugger', 'code_analyzer', 'test_runner'];
      case 'documentation':
        return ['documentation_generator', 'markdown_processor'];
      case 'manual':
        return ['task_executor', 'code_generator'];
      case 'optimization':
        return ['performance_analyzer', 'optimizer', 'test_runner'];
      case 'security':
        return ['security_scanner', 'vulnerability_analyzer'];
      default:
        return [];
    }
  }

  getWorkflowMetadata() {
    return {
      type: this.gettaskMode(),
      steps: this.getWorkflowSteps(),
      dependencies: this.getWorkflowDependencies(),
      supportsRollback: this.isRefactor() || this.isTest(),
      requiresValidation: this.requiresHumanReview(),
      estimatedDuration: this.getEstimatedDuration(),
      complexity: this.getComplexity()
    };
  }

  getEstimatedDuration() {
    // Return estimated duration in minutes
    switch (this.value) {
      case TaskType.FEATURE:
        return 120; // 2 hours
      case TaskType.BUG:
        return 60; // 1 hour
      case TaskType.REFACTOR:
        return 90; // 1.5 hours
      case TaskType.DOCUMENTATION:
        return 45; // 45 minutes
      case TaskType.MANUAL:
        return 60; // 1 hour
      case TaskType.TEST:
        return 30; // 30 minutes
      case TaskType.ANALYSIS:
        return 60; // 1 hour
      case TaskType.OPTIMIZATION:
        return 120; // 2 hours
      case TaskType.SECURITY:
        return 90; // 1.5 hours
      default:
        return 60; // 1 hour default
    }
  }

  getComplexity() {
    // Return complexity level (1-5, where 1 is simple, 5 is complex)
    switch (this.value) {
      case TaskType.FEATURE:
        return 4;
      case TaskType.BUG:
        return 3;
      case TaskType.REFACTOR:
        return 4;
      case TaskType.DOCUMENTATION:
        return 2;
      case TaskType.MANUAL:
        return 3;
      case TaskType.TEST:
        return 2;
      case TaskType.ANALYSIS:
        return 3;
      case TaskType.OPTIMIZATION:
        return 4;
      case TaskType.SECURITY:
        return 5;
      default:
        return 3;
    }
  }

  static isValid(type) {
    return [
      TaskType.FEATURE,
      TaskType.BUG,
      TaskType.REFACTOR,
      TaskType.DOCUMENTATION,
      TaskType.MANUAL,
      TaskType.TEST,
      TaskType.TESTING,
      TaskType.TEST_FIX,
      TaskType.TEST_COVERAGE,
      TaskType.TEST_REFACTOR,
      TaskType.TEST_STATUS,
      TaskType.TEST_REPORT,
      TaskType.OPTIMIZATION,
      TaskType.SECURITY,
      TaskType.ANALYSIS,
      // Roadmap feature types
      TaskType.FEATURE_SUMMARY,
      TaskType.FEATURE_IMPLEMENTATION,
      TaskType.FEATURE_PHASE,
      TaskType.FEATURE_INDEX,
      // New specific types
      TaskType.REFACTOR_NODE,
      TaskType.REFACTOR_REACT,
      TaskType.REFACTOR_FRONTEND,
      TaskType.REFACTOR_BACKEND,
      TaskType.REFACTOR_DATABASE,
      TaskType.REFACTOR_API,
      TaskType.REFACTOR_PYTHON,
      TaskType.REFACTOR_JAVA,
      TaskType.REFACTOR_C_SHARP,
      TaskType.REFACTOR_PHP,
      TaskType.REFACTOR_RUBY,
      TaskType.REFACTOR_GO,
      TaskType.REFACTOR_RUST,
      TaskType.REFACTOR_KOTLIN,
      TaskType.REFACTOR_SWIFT,
      TaskType.REFACTOR_DART,
      TaskType.REFACTOR_VUE,
      TaskType.REFACTOR_ANGULAR,
      TaskType.REFACTOR_SVELTE,
      TaskType.REFACTOR_NEXT,
      TaskType.REFACTOR_NUXT,
      TaskType.REFACTOR_DJANGO,
      TaskType.REFACTOR_FLASK,
      TaskType.REFACTOR_SPRING,
      TaskType.REFACTOR_LARAVEL,
      TaskType.REFACTOR_RAILS,
      TaskType.REFACTOR_EXPRESS,
      TaskType.REFACTOR_FASTAPI,
      TaskType.REFACTOR_DOCKER,
      TaskType.REFACTOR_KUBERNETES,
      TaskType.REFACTOR_TERRAFORM,
      TaskType.REFACTOR_ANSIBLE,
      TaskType.REFACTOR_CLOUD,
      TaskType.REFACTOR_MICROSERVICES,
      TaskType.TEST_UNIT,
      TaskType.TEST_INTEGRATION,
      TaskType.TEST_E2E,
      TaskType.TEST_PERFORMANCE,
      TaskType.TEST_SECURITY,
      TaskType.TEST_JEST,
      TaskType.TEST_PYTEST,
      TaskType.TEST_JUNIT,
      TaskType.TEST_PHPUNIT,
      TaskType.TEST_RSPEC,
      TaskType.TEST_GO_TEST,
      TaskType.TEST_CARGO_TEST,
      TaskType.TEST_GRADLE,
      TaskType.TEST_XCTEST,
      TaskType.TEST_FLUTTER
    ].includes(type);
  }

  static getAll() {
    return [
      TaskType.FEATURE,
      TaskType.BUG,
      TaskType.REFACTOR,
      TaskType.DOCUMENTATION,
      TaskType.MANUAL,
      TaskType.TEST,
      TaskType.TESTING,
      TaskType.TEST_FIX,
      TaskType.TEST_COVERAGE,
      TaskType.TEST_REFACTOR,
      TaskType.TEST_STATUS,
      TaskType.TEST_REPORT,
      TaskType.OPTIMIZATION,
      TaskType.SECURITY,
      TaskType.ANALYSIS,
      // Roadmap feature types
      TaskType.FEATURE_SUMMARY,
      TaskType.FEATURE_IMPLEMENTATION,
      TaskType.FEATURE_PHASE,
      TaskType.FEATURE_INDEX,
      // New specific types
      TaskType.REFACTOR_NODE,
      TaskType.REFACTOR_REACT,
      TaskType.REFACTOR_FRONTEND,
      TaskType.REFACTOR_BACKEND,
      TaskType.REFACTOR_DATABASE,
      TaskType.REFACTOR_API,
      TaskType.REFACTOR_PYTHON,
      TaskType.REFACTOR_JAVA,
      TaskType.REFACTOR_C_SHARP,
      TaskType.REFACTOR_PHP,
      TaskType.REFACTOR_RUBY,
      TaskType.REFACTOR_GO,
      TaskType.REFACTOR_RUST,
      TaskType.REFACTOR_KOTLIN,
      TaskType.REFACTOR_SWIFT,
      TaskType.REFACTOR_DART,
      TaskType.REFACTOR_VUE,
      TaskType.REFACTOR_ANGULAR,
      TaskType.REFACTOR_SVELTE,
      TaskType.REFACTOR_NEXT,
      TaskType.REFACTOR_NUXT,
      TaskType.REFACTOR_DJANGO,
      TaskType.REFACTOR_FLASK,
      TaskType.REFACTOR_SPRING,
      TaskType.REFACTOR_LARAVEL,
      TaskType.REFACTOR_RAILS,
      TaskType.REFACTOR_EXPRESS,
      TaskType.REFACTOR_FASTAPI,
      TaskType.REFACTOR_DOCKER,
      TaskType.REFACTOR_KUBERNETES,
      TaskType.REFACTOR_TERRAFORM,
      TaskType.REFACTOR_ANSIBLE,
      TaskType.REFACTOR_CLOUD,
      TaskType.REFACTOR_MICROSERVICES,
      TaskType.TEST_UNIT,
      TaskType.TEST_INTEGRATION,
      TaskType.TEST_E2E,
      TaskType.TEST_PERFORMANCE,
      TaskType.TEST_SECURITY,
      TaskType.TEST_JEST,
      TaskType.TEST_PYTEST,
      TaskType.TEST_JUNIT,
      TaskType.TEST_PHPUNIT,
      TaskType.TEST_RSPEC,
      TaskType.TEST_GO_TEST,
      TaskType.TEST_CARGO_TEST,
      TaskType.TEST_GRADLE,
      TaskType.TEST_XCTEST,
      TaskType.TEST_FLUTTER
    ];
  }
}

module.exports = TaskType; 