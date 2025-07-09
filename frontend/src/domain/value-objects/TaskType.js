/**
 * TaskType - Frontend value object for task type
 * Mirrors the backend TaskType definitions for consistency
 */
class TaskType {
  static FEATURE = 'feature';
  static BUG = 'bug';
  static REFACTOR = 'refactor';
  static DOCUMENTATION = 'documentation';
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

  toString() {
    return this.value;
  }

  equals(other) {
    return this.value === other.value;
  }

  requiresAI() {
    return [
      TaskType.FEATURE, TaskType.BUG, TaskType.OPTIMIZATION, TaskType.SECURITY, 
      TaskType.ANALYSIS, TaskType.TEST, TaskType.TESTING, TaskType.TEST_FIX, 
      TaskType.TEST_COVERAGE, TaskType.TEST_REFACTOR, TaskType.REFACTOR,
      TaskType.REFACTOR_NODE, TaskType.REFACTOR_REACT, TaskType.REFACTOR_FRONTEND,
      TaskType.REFACTOR_BACKEND, TaskType.REFACTOR_DATABASE, TaskType.REFACTOR_API,
      TaskType.REFACTOR_PYTHON, TaskType.REFACTOR_JAVA, TaskType.REFACTOR_C_SHARP,
      TaskType.REFACTOR_PHP, TaskType.REFACTOR_RUBY, TaskType.REFACTOR_GO,
      TaskType.REFACTOR_RUST, TaskType.REFACTOR_KOTLIN, TaskType.REFACTOR_SWIFT,
      TaskType.REFACTOR_DART, TaskType.REFACTOR_VUE, TaskType.REFACTOR_ANGULAR,
      TaskType.REFACTOR_SVELTE, TaskType.REFACTOR_NEXT, TaskType.REFACTOR_NUXT,
      TaskType.REFACTOR_DJANGO, TaskType.REFACTOR_FLASK, TaskType.REFACTOR_SPRING,
      TaskType.REFACTOR_LARAVEL, TaskType.REFACTOR_RAILS, TaskType.REFACTOR_EXPRESS,
      TaskType.REFACTOR_FASTAPI, TaskType.REFACTOR_DOCKER, TaskType.REFACTOR_KUBERNETES,
      TaskType.REFACTOR_TERRAFORM, TaskType.REFACTOR_ANSIBLE, TaskType.REFACTOR_CLOUD,
      TaskType.REFACTOR_MICROSERVICES, TaskType.TEST_UNIT, TaskType.TEST_INTEGRATION,
      TaskType.TEST_E2E, TaskType.TEST_PERFORMANCE, TaskType.TEST_SECURITY,
      TaskType.TEST_JEST, TaskType.TEST_PYTEST, TaskType.TEST_JUNIT,
      TaskType.TEST_PHPUNIT, TaskType.TEST_RSPEC, TaskType.TEST_GO_TEST,
      TaskType.TEST_CARGO_TEST, TaskType.TEST_GRADLE, TaskType.TEST_XCTEST,
      TaskType.TEST_FLUTTER
    ].includes(this.value);
  }

  requiresExecution() {
    return [
      TaskType.FEATURE, TaskType.BUG, TaskType.REFACTOR, TaskType.OPTIMIZATION,
      TaskType.SECURITY, TaskType.DOCUMENTATION, TaskType.ANALYSIS, TaskType.TEST,
      TaskType.TESTING, TaskType.TEST_FIX, TaskType.TEST_COVERAGE, TaskType.TEST_REFACTOR,
      TaskType.TEST_STATUS, TaskType.TEST_REPORT, TaskType.REFACTOR_NODE,
      TaskType.REFACTOR_REACT, TaskType.REFACTOR_FRONTEND, TaskType.REFACTOR_BACKEND,
      TaskType.REFACTOR_DATABASE, TaskType.REFACTOR_API, TaskType.REFACTOR_PYTHON,
      TaskType.REFACTOR_JAVA, TaskType.REFACTOR_C_SHARP, TaskType.REFACTOR_PHP,
      TaskType.REFACTOR_RUBY, TaskType.REFACTOR_GO, TaskType.REFACTOR_RUST,
      TaskType.REFACTOR_KOTLIN, TaskType.REFACTOR_SWIFT, TaskType.REFACTOR_DART,
      TaskType.REFACTOR_VUE, TaskType.REFACTOR_ANGULAR, TaskType.REFACTOR_SVELTE,
      TaskType.REFACTOR_NEXT, TaskType.REFACTOR_NUXT, TaskType.REFACTOR_DJANGO,
      TaskType.REFACTOR_FLASK, TaskType.REFACTOR_SPRING, TaskType.REFACTOR_LARAVEL,
      TaskType.REFACTOR_RAILS, TaskType.REFACTOR_EXPRESS, TaskType.REFACTOR_FASTAPI,
      TaskType.REFACTOR_DOCKER, TaskType.REFACTOR_KUBERNETES, TaskType.REFACTOR_TERRAFORM,
      TaskType.REFACTOR_ANSIBLE, TaskType.REFACTOR_CLOUD, TaskType.REFACTOR_MICROSERVICES,
      TaskType.TEST_UNIT, TaskType.TEST_INTEGRATION, TaskType.TEST_E2E,
      TaskType.TEST_PERFORMANCE, TaskType.TEST_SECURITY, TaskType.TEST_JEST,
      TaskType.TEST_PYTEST, TaskType.TEST_JUNIT, TaskType.TEST_PHPUNIT,
      TaskType.TEST_RSPEC, TaskType.TEST_GO_TEST, TaskType.TEST_CARGO_TEST,
      TaskType.TEST_GRADLE, TaskType.TEST_XCTEST, TaskType.TEST_FLUTTER
    ].includes(this.value);
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

  isFeature() {
    return this.value === TaskType.FEATURE;
  }

  isBug() {
    return this.value === TaskType.BUG;
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

  isRefactorAPI() {
    return this.value === TaskType.REFACTOR_API;
  }

  // Technology-specific helpers
  isRefactorPython() {
    return this.value === TaskType.REFACTOR_PYTHON;
  }

  isRefactorJava() {
    return this.value === TaskType.REFACTOR_JAVA;
  }

  isRefactorCSharp() {
    return this.value === TaskType.REFACTOR_C_SHARP;
  }

  isRefactorPHP() {
    return this.value === TaskType.REFACTOR_PHP;
  }

  isRefactorRuby() {
    return this.value === TaskType.REFACTOR_RUBY;
  }

  isRefactorGo() {
    return this.value === TaskType.REFACTOR_GO;
  }

  isRefactorRust() {
    return this.value === TaskType.REFACTOR_RUST;
  }

  isRefactorKotlin() {
    return this.value === TaskType.REFACTOR_KOTLIN;
  }

  isRefactorSwift() {
    return this.value === TaskType.REFACTOR_SWIFT;
  }

  isRefactorDart() {
    return this.value === TaskType.REFACTOR_DART;
  }

  // Framework-specific helpers
  isRefactorVue() {
    return this.value === TaskType.REFACTOR_VUE;
  }

  isRefactorAngular() {
    return this.value === TaskType.REFACTOR_ANGULAR;
  }

  isRefactorSvelte() {
    return this.value === TaskType.REFACTOR_SVELTE;
  }

  isRefactorNext() {
    return this.value === TaskType.REFACTOR_NEXT;
  }

  isRefactorNuxt() {
    return this.value === TaskType.REFACTOR_NUXT;
  }

  isRefactorDjango() {
    return this.value === TaskType.REFACTOR_DJANGO;
  }

  isRefactorFlask() {
    return this.value === TaskType.REFACTOR_FLASK;
  }

  isRefactorSpring() {
    return this.value === TaskType.REFACTOR_SPRING;
  }

  isRefactorLaravel() {
    return this.value === TaskType.REFACTOR_LARAVEL;
  }

  isRefactorRails() {
    return this.value === TaskType.REFACTOR_RAILS;
  }

  isRefactorExpress() {
    return this.value === TaskType.REFACTOR_EXPRESS;
  }

  isRefactorFastAPI() {
    return this.value === TaskType.REFACTOR_FASTAPI;
  }

  // Infrastructure helpers
  isRefactorDocker() {
    return this.value === TaskType.REFACTOR_DOCKER;
  }

  isRefactorKubernetes() {
    return this.value === TaskType.REFACTOR_KUBERNETES;
  }

  isRefactorTerraform() {
    return this.value === TaskType.REFACTOR_TERRAFORM;
  }

  isRefactorAnsible() {
    return this.value === TaskType.REFACTOR_ANSIBLE;
  }

  isRefactorCloud() {
    return this.value === TaskType.REFACTOR_CLOUD;
  }

  isRefactorMicroservices() {
    return this.value === TaskType.REFACTOR_MICROSERVICES;
  }

  // Testing helpers
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

  // Technology-specific testing helpers
  isTestJest() {
    return this.value === TaskType.TEST_JEST;
  }

  isTestPyTest() {
    return this.value === TaskType.TEST_PYTEST;
  }

  isTestJUnit() {
    return this.value === TaskType.TEST_JUNIT;
  }

  isTestPHPUnit() {
    return this.value === TaskType.TEST_PHPUNIT;
  }

  isTestRSpec() {
    return this.value === TaskType.TEST_RSPEC;
  }

  isTestGoTest() {
    return this.value === TaskType.TEST_GO_TEST;
  }

  isTestCargoTest() {
    return this.value === TaskType.TEST_CARGO_TEST;
  }

  isTestGradle() {
    return this.value === TaskType.TEST_GRADLE;
  }

  isTestXCTest() {
    return this.value === TaskType.TEST_XCTEST;
  }

  isTestFlutter() {
    return this.value === TaskType.TEST_FLUTTER;
  }

  static isValid(type) {
    return [
      TaskType.FEATURE,
      TaskType.BUG,
      TaskType.REFACTOR,
      TaskType.DOCUMENTATION,
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

  // Helper method to get display name
  getDisplayName() {
    const displayNames = {
      [TaskType.FEATURE]: 'Feature',
      [TaskType.BUG]: 'Bug Fix',
      [TaskType.REFACTOR]: 'Refactor',
      [TaskType.DOCUMENTATION]: 'Documentation',
      [TaskType.TEST]: 'Test',
      [TaskType.TESTING]: 'Testing',
      [TaskType.TEST_FIX]: 'Test Fix',
      [TaskType.TEST_COVERAGE]: 'Test Coverage',
      [TaskType.TEST_REFACTOR]: 'Test Refactor',
      [TaskType.TEST_STATUS]: 'Test Status',
      [TaskType.TEST_REPORT]: 'Test Report',
      [TaskType.OPTIMIZATION]: 'Optimization',
      [TaskType.SECURITY]: 'Security',
      [TaskType.ANALYSIS]: 'Analysis',
      [TaskType.REFACTOR_NODE]: 'Node.js Refactor',
      [TaskType.REFACTOR_REACT]: 'React Refactor',
      [TaskType.REFACTOR_FRONTEND]: 'Frontend Refactor',
      [TaskType.REFACTOR_BACKEND]: 'Backend Refactor',
      [TaskType.REFACTOR_DATABASE]: 'Database Refactor',
      [TaskType.REFACTOR_API]: 'API Refactor',
      [TaskType.REFACTOR_PYTHON]: 'Python Refactor',
      [TaskType.REFACTOR_JAVA]: 'Java Refactor',
      [TaskType.REFACTOR_C_SHARP]: 'C# Refactor',
      [TaskType.REFACTOR_PHP]: 'PHP Refactor',
      [TaskType.REFACTOR_RUBY]: 'Ruby Refactor',
      [TaskType.REFACTOR_GO]: 'Go Refactor',
      [TaskType.REFACTOR_RUST]: 'Rust Refactor',
      [TaskType.REFACTOR_KOTLIN]: 'Kotlin Refactor',
      [TaskType.REFACTOR_SWIFT]: 'Swift Refactor',
      [TaskType.REFACTOR_DART]: 'Dart Refactor',
      [TaskType.REFACTOR_VUE]: 'Vue Refactor',
      [TaskType.REFACTOR_ANGULAR]: 'Angular Refactor',
      [TaskType.REFACTOR_SVELTE]: 'Svelte Refactor',
      [TaskType.REFACTOR_NEXT]: 'Next.js Refactor',
      [TaskType.REFACTOR_NUXT]: 'Nuxt.js Refactor',
      [TaskType.REFACTOR_DJANGO]: 'Django Refactor',
      [TaskType.REFACTOR_FLASK]: 'Flask Refactor',
      [TaskType.REFACTOR_SPRING]: 'Spring Refactor',
      [TaskType.REFACTOR_LARAVEL]: 'Laravel Refactor',
      [TaskType.REFACTOR_RAILS]: 'Rails Refactor',
      [TaskType.REFACTOR_EXPRESS]: 'Express Refactor',
      [TaskType.REFACTOR_FASTAPI]: 'FastAPI Refactor',
      [TaskType.REFACTOR_DOCKER]: 'Docker Refactor',
      [TaskType.REFACTOR_KUBERNETES]: 'Kubernetes Refactor',
      [TaskType.REFACTOR_TERRAFORM]: 'Terraform Refactor',
      [TaskType.REFACTOR_ANSIBLE]: 'Ansible Refactor',
      [TaskType.REFACTOR_CLOUD]: 'Cloud Refactor',
      [TaskType.REFACTOR_MICROSERVICES]: 'Microservices Refactor',
      [TaskType.TEST_UNIT]: 'Unit Test',
      [TaskType.TEST_INTEGRATION]: 'Integration Test',
      [TaskType.TEST_E2E]: 'E2E Test',
      [TaskType.TEST_PERFORMANCE]: 'Performance Test',
      [TaskType.TEST_SECURITY]: 'Security Test',
      [TaskType.TEST_JEST]: 'Jest Test',
      [TaskType.TEST_PYTEST]: 'PyTest',
      [TaskType.TEST_JUNIT]: 'JUnit Test',
      [TaskType.TEST_PHPUNIT]: 'PHPUnit Test',
      [TaskType.TEST_RSPEC]: 'RSpec Test',
      [TaskType.TEST_GO_TEST]: 'Go Test',
      [TaskType.TEST_CARGO_TEST]: 'Cargo Test',
      [TaskType.TEST_GRADLE]: 'Gradle Test',
      [TaskType.TEST_XCTEST]: 'XCTest',
      [TaskType.TEST_FLUTTER]: 'Flutter Test'
    };
    
    return displayNames[this.value] || this.value;
  }

  // Helper method to get category
  getCategory() {
    if (this.isRefactor()) return 'refactoring';
    if (this.isTest()) return 'testing';
    if (this.isFeature()) return 'feature';
    if (this.isBug()) return 'bugfix';
    if (this.isDocumentation()) return 'documentation';
    if (this.isOptimization()) return 'optimization';
    if (this.isSecurity()) return 'security';
    if (this.isAnalysis()) return 'analysis';
    return 'other';
  }
}

export default TaskType; 