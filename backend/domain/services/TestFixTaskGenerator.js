/**
 * TestFixTaskGenerator - Generate Task entities from parsed test data
 * Converts failing tests, coverage issues, and  tests into database tasks
 */
const Task = require('@/domain/entities/Task');
const TaskType = require('@/domain/value-objects/TaskType');
const TaskPriority = require('@/domain/value-objects/TaskPriority');
const TaskStatus = require('@/domain/value-objects/TaskStatus');
const { v4: uuidv4 } = require('uuid');
class TestFixTaskGenerator {
  constructor(taskRepository) {
    this.taskRepository = taskRepository;
    this.logger = console;
  }
  /**
   * Generate tasks from parsed test data
   * @param {Object} parsedData - Data from TestReportParser
   * @param {Object} options - Generation options
   * @returns {Promise<Array<Task>>} Generated tasks
   */
  async generateTasksFromTestData(parsedData, options = {}) {
    try {
      this.logger.info('[TestFixTaskGenerator] Generating tasks from test data...');
      const tasks = [];
      const projectId = options.projectId || 'system';
      const userId = options.userId || 'system';
      // Generate tasks for failing tests
      for (const failingTest of parsedData.failingTests) {
        const filePath = failingTest.testFile || failingTest.fileName;
        if (this.shouldSkipFile(filePath)) {
          this.logger.debug(`[TestFixTaskGenerator] Skipping failing test file: ${filePath}`);
          continue; // Skip non-code files!
        }
        const task = this.createFailingTestTask(failingTest, projectId, userId);
        tasks.push(task);
      }
      // Generate tasks for coverage issues
      for (const coverageIssue of parsedData.coverageIssues) {
        if (this.shouldSkipFile(coverageIssue.file)) {
          this.logger.debug(`[TestFixTaskGenerator] Skipping coverage file: ${coverageIssue.file}`);
          continue;
        }
        const task = this.createCoverageTask(coverageIssue, projectId, userId);
        tasks.push(task);
      }
      // Generate tasks for complex tests
      for (const complexTest of parsedData.complexTests) {
        if (this.shouldSkipFile(complexTest.fileName)) {
          this.logger.debug(`[TestFixTaskGenerator] Skipping complex test file: ${complexTest.fileName}`);
          continue;
        }
        const task = this.createComplexTestTask(complexTest, projectId, userId);
        tasks.push(task);
      }
      this.logger.info(`[TestFixTaskGenerator] Generated ${tasks.length} tasks from test data`);
      // Log summary of what was processed
      const totalFailingTests = parsedData.failingTests?.length || 0;
      const totalCoverageIssues = parsedData.coverageIssues?.length || 0;
      const totalComplexTests = parsedData.complexTests?.length || 0;
      this.logger.info(`[TestFixTaskGenerator] Summary: ${totalFailingTests} failing tests, ${totalCoverageIssues} coverage issues, ${totalComplexTests} complex tests processed`);
      return tasks;
    } catch (error) {
      this.logger.error('[TestFixTaskGenerator] Error generating tasks:', error.message);
      throw error;
    }
  }
  /**
   * Create task for failing test
   * @param {Object} failingTest - Failing test data
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Task} Task entity
   */
  createFailingTestTask(failingTest, projectId, userId) {
    const taskId = `test-fix-${uuidv4()}`;
    return new Task(
      taskId,
      projectId,
      `Fix failing test: ${failingTest.testName}`,
      `Fix the failing test "${failingTest.testName}" in ${failingTest.fileName}. Error: ${failingTest.error}`,
      TaskStatus.PENDING,
      this.determinePriority(failingTest.healthScore),
      TaskType.TESTING,
      {
        testFile: failingTest.fileName,
        testName: failingTest.testName,
        error: failingTest.error,
        healthScore: failingTest.healthScore,
        source: failingTest.source || 'test-report',
        taskType: 'failing_test_fix',
        estimatedDuration: 300000, // 5 minutes
        autoFixEnabled: true
      }
    );
  }
  /**
   * Create task for coverage issue
   * @param {Object} coverageIssue - Coverage issue data
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Task} Task entity
   */
  createCoverageTask(coverageIssue, projectId, userId) {
    const taskId = `coverage-improve-${uuidv4()}`;
    const targetCoverage = 80;
    return new Task(
      taskId,
      projectId,
      `Improve coverage: ${coverageIssue.file} (${coverageIssue.average}% → ${targetCoverage}%)`,
      `Improve test coverage for ${coverageIssue.file} from ${coverageIssue.average}% to ${targetCoverage}%. Current: Functions ${coverageIssue.functions}%, Lines ${coverageIssue.lines}%, Branches ${coverageIssue.branches}%`,
      TaskStatus.PENDING,
      this.determineCoveragePriority(coverageIssue.average),
      TaskType.TESTING,
      {
        file: coverageIssue.file,
        currentCoverage: coverageIssue.average,
        targetCoverage: targetCoverage,
        functions: coverageIssue.functions,
        lines: coverageIssue.lines,
        branches: coverageIssue.branches,
        source: coverageIssue.source || 'coverage-report',
        taskType: 'coverage_improvement',
        estimatedDuration: 600000, // 10 minutes
        autoFixEnabled: true
      }
    );
  }
  /**
   * Create task for  test
   * @param {Object} Test -  test data
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Task} Task entity
   */
  createTestTask(Test, projectId, userId) {
    // Determine specific refactor type based on file extension and project structure
    let refactorType = TaskType.REFACTOR; // Default
    let testType = TaskType.TEST; // Default
    if (Test.fileName) {
      // Frontend frameworks
      if (Test.fileName.includes('.jsx') || Test.fileName.includes('.tsx')) {
        refactorType = TaskType.REFACTOR_REACT;
        testType = TaskType.TEST_JEST;
      } else if (Test.fileName.includes('.vue')) {
        refactorType = TaskType.REFACTOR_VUE;
        testType = TaskType.TEST_JEST;
      } else if (Test.fileName.includes('.svelte')) {
        refactorType = TaskType.REFACTOR_SVELTE;
        testType = TaskType.TEST_JEST;
      } else if (Test.fileName.includes('.ng.') || Test.fileName.includes('angular')) {
        refactorType = TaskType.REFACTOR_ANGULAR;
        testType = TaskType.TEST_JEST;
      }
      // Backend languages
      else if (Test.fileName.includes('.py')) {
        refactorType = TaskType.REFACTOR_PYTHON;
        testType = TaskType.TEST_PYTEST;
      } else if (Test.fileName.includes('.java')) {
        refactorType = TaskType.REFACTOR_JAVA;
        testType = TaskType.TEST_JUNIT;
      } else if (Test.fileName.includes('.cs')) {
        refactorType = TaskType.REFACTOR_C_SHARP;
        testType = TaskType.TEST_JUNIT;
      } else if (Test.fileName.includes('.php')) {
        refactorType = TaskType.REFACTOR_PHP;
        testType = TaskType.TEST_PHPUNIT;
      } else if (Test.fileName.includes('.rb')) {
        refactorType = TaskType.REFACTOR_RUBY;
        testType = TaskType.TEST_RSPEC;
      } else if (Test.fileName.includes('.go')) {
        refactorType = TaskType.REFACTOR_GO;
        testType = TaskType.TEST_GO_TEST;
      } else if (Test.fileName.includes('.rs')) {
        refactorType = TaskType.REFACTOR_RUST;
        testType = TaskType.TEST_CARGO_TEST;
      } else if (Test.fileName.includes('.kt')) {
        refactorType = TaskType.REFACTOR_KOTLIN;
        testType = TaskType.TEST_GRADLE;
      } else if (Test.fileName.includes('.swift')) {
        refactorType = TaskType.REFACTOR_SWIFT;
        testType = TaskType.TEST_XCTEST;
      } else if (Test.fileName.includes('.dart')) {
        refactorType = TaskType.REFACTOR_DART;
        testType = TaskType.TEST_FLUTTER;
      }
      // Infrastructure and DevOps
      else if (Test.fileName.includes('Dockerfile') || Test.fileName.includes('.docker')) {
        refactorType = TaskType.REFACTOR_DOCKER;
        testType = TaskType.TEST_INTEGRATION;
      } else if (Test.fileName.includes('.tf') || Test.fileName.includes('terraform')) {
        refactorType = TaskType.REFACTOR_TERRAFORM;
        testType = TaskType.TEST_INTEGRATION;
      } else if (Test.fileName.includes('.yml') || Test.fileName.includes('.yaml')) {
        refactorType = TaskType.REFACTOR_KUBERNETES;
        testType = TaskType.TEST_INTEGRATION;
      }
      // Generic JavaScript/TypeScript
      else if (Test.fileName.includes('.js') || Test.fileName.includes('.ts')) {
        refactorType = TaskType.REFACTOR_NODE;
        testType = TaskType.TEST_JEST;
      }
    }
    // Additional detection based on project structure
    if (Test.filePath) {
      if (Test.filePath.includes('frontend/') || Test.filePath.includes('client/')) {
        refactorType = TaskType.REFACTOR_FRONTEND;
      } else if (Test.filePath.includes('backend/') || Test.filePath.includes('server/')) {
        refactorType = TaskType.REFACTOR_BACKEND;
      } else if (Test.filePath.includes('database/') || Test.filePath.includes('db/')) {
        refactorType = TaskType.REFACTOR_DATABASE;
      } else if (Test.filePath.includes('api/') || Test.filePath.includes('routes/')) {
        refactorType = TaskType.REFACTOR_API;
      } else if (Test.filePath.includes('microservices/') || Test.filePath.includes('services/')) {
        refactorType = TaskType.REFACTOR_MICROSERVICES;
      }
    }
    // Framework-specific detection based on file patterns
    if (Test.fileName) {
      if (Test.fileName.includes('next.config') || Test.fileName.includes('pages/')) {
        refactorType = TaskType.REFACTOR_NEXT;
      } else if (Test.fileName.includes('nuxt.config') || Test.fileName.includes('layouts/')) {
        refactorType = TaskType.REFACTOR_NUXT;
      } else if (Test.fileName.includes('settings.py') || Test.fileName.includes('urls.py')) {
        refactorType = TaskType.REFACTOR_DJANGO;
      } else if (Test.fileName.includes('app.py') || Test.fileName.includes('flask')) {
        refactorType = TaskType.REFACTOR_FLASK;
      } else if (Test.fileName.includes('Application.java') || Test.fileName.includes('@SpringBootApplication')) {
        refactorType = TaskType.REFACTOR_SPRING;
      } else if (Test.fileName.includes('artisan') || Test.fileName.includes('Laravel')) {
        refactorType = TaskType.REFACTOR_LARAVEL;
      } else if (Test.fileName.includes('Gemfile') || Test.fileName.includes('rails')) {
        refactorType = TaskType.REFACTOR_RAILS;
      } else if (Test.fileName.includes('app.js') || Test.fileName.includes('express')) {
        refactorType = TaskType.REFACTOR_EXPRESS;
      } else if (Test.fileName.includes('main.py') || Test.fileName.includes('fastapi')) {
        refactorType = TaskType.REFACTOR_FASTAPI;
      }
    }
    return new Task(
      taskId,
      projectId,
      `Refactor  test: ${Test.testName}`,
      `Refactor the  test "${Test.testName}" in ${Test.fileName}.  score: ${Test.Score || 'high'}`,
      TaskStatus.PENDING,
      TaskPriority.MEDIUM,
      refactorType,
      {
        testFile: Test.fileName,
        testName: Test.testName,
        Score: Test.Score,
        healthScore: Test.healthScore,
        source: Test.source || 'test-report',
        taskType: '_test_refactor',
        refactorType: refactorType,
        estimatedDuration: 900000, // 15 minutes
        autoFixEnabled: true
      }
    );
  }
  /**
   * Create task for complex test
   * @param {Object} complexTest - Complex test data
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Task} Task entity
   */
  createComplexTestTask(complexTest, projectId, userId) {
    const taskId = `complex-refactor-${uuidv4()}`;
    // Determine specific refactor type based on file extension
    let refactorType = TaskType.REFACTOR; // Default
    if (complexTest.fileName) {
      if (complexTest.fileName.includes('.jsx') || complexTest.fileName.includes('.tsx')) {
        refactorType = TaskType.REFACTOR_REACT;
      } else if (complexTest.fileName.includes('.js') || complexTest.fileName.includes('.ts')) {
        refactorType = TaskType.REFACTOR_NODE;
      } else if (complexTest.fileName.includes('frontend/') || complexTest.fileName.includes('src/')) {
        refactorType = TaskType.REFACTOR_FRONTEND;
      } else if (complexTest.fileName.includes('backend/') || complexTest.fileName.includes('server/')) {
        refactorType = TaskType.REFACTOR_BACKEND;
      }
    }
    return new Task(
      taskId,
      projectId,
      `Refactor complex test: ${complexTest.testName}`,
      `Refactor the complex test "${complexTest.testName}" in ${complexTest.fileName}. Complexity score: ${complexTest.complexityScore || 'high'}`,
      TaskStatus.PENDING,
      TaskPriority.MEDIUM,
      refactorType,
      {
        testFile: complexTest.fileName,
        testName: complexTest.testName,
        complexityScore: complexTest.complexityScore,
        healthScore: complexTest.healthScore,
        source: complexTest.source || 'test-report',
        taskType: 'complex_test_refactor',
        refactorType: refactorType,
        estimatedDuration: 900000, // 15 minutes
        autoFixEnabled: true
      }
    );
  }
  /**
   * Determine priority based on health score
   * @param {number} healthScore - Health score (0-100)
   * @returns {TaskPriority} Priority
   */
  determinePriority(healthScore) {
    if (healthScore < 30) return TaskPriority.CRITICAL;
    if (healthScore < 50) return TaskPriority.HIGH;
    if (healthScore < 70) return TaskPriority.MEDIUM;
    return TaskPriority.LOW;
  }
  /**
   * Determine priority based on coverage percentage
   * @param {number} coverage - Coverage percentage
   * @returns {TaskPriority} Priority
   */
  determineCoveragePriority(coverage) {
    if (coverage < 20) return TaskPriority.HIGH;
    if (coverage < 50) return TaskPriority.MEDIUM;
    return TaskPriority.LOW;
  }
  /**
   * Check if a file should be skipped (non-code files)
   * @param {string} filePath - File path to check
   * @returns {boolean} True if file should be skipped
   */
  shouldSkipFile(filePath) {
    if (!filePath) return true;
    // Skip markdown files
    if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
      return true;
    }
    // Skip documentation directories
    if (filePath.includes('/docs/') || filePath.includes('/documentation/')) {
      return true;
    }
    // Skip README files
    if (filePath.toLowerCase().includes('readme')) {
      return true;
    }
    // Skip license files
    if (filePath.toLowerCase().includes('license')) {
      return true;
    }
    // Skip configuration files that don't need test coverage
    if (filePath.endsWith('.json') || filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return true;
    }
    // Skip lock files
    if (filePath.endsWith('.lock') || filePath.includes('package-lock.json') || filePath.includes('yarn.lock')) {
      return true;
    }
    // Skip git files
    if (filePath.includes('.git/') || filePath.includes('.gitignore')) {
      return true;
    }
    // Skip node_modules
    if (filePath.includes('node_modules/')) {
      return true;
    }
    // Skip build artifacts
    if (filePath.includes('/dist/') || filePath.includes('/build/') || filePath.includes('/coverage/')) {
      return true;
    }
    // Skip log files
    if (filePath.endsWith('.log')) {
      return true;
    }
    return false;
  }
  /**
   * Save tasks to database with better error handling
   * @param {Array<Task>} tasks - Tasks to save
   * @returns {Promise<Array<Task>>} Saved tasks
   */
  async saveTasks(tasks) {
    try {
      this.logger.info(`[TestFixTaskGenerator] Saving ${tasks.length} tasks to database...`);
      const savedTasks = [];
      let savedCount = 0;
      let skippedCount = 0;
      for (const task of tasks) {
        try {
          if (this.taskRepository) {
            // Check if task already exists
            const existingTask = await this.taskRepository.findById(task.id);
            if (existingTask) {
              this.logger.warn(`[TestFixTaskGenerator] Task ${task.id} already exists, skipping`);
              savedTasks.push(existingTask);
              skippedCount++;
              continue;
            }
            const savedTask = await this.taskRepository.save(task);
            savedTasks.push(savedTask);
            savedCount++;
          } else {
            savedTasks.push(task);
            savedCount++;
          }
        } catch (error) {
          this.logger.error(`[TestFixTaskGenerator] Failed to save task ${task.id}:`, error.message);
          // If it's a unique constraint error, skip this task
          if (error.message.includes('UNIQUE constraint failed') || error.message.includes('already exists')) {
            this.logger.warn(`[TestFixTaskGenerator] Task ${task.id} already exists, skipping`);
            skippedCount++;
            continue;
          }
          // For other errors, re-throw
          throw error;
        }
      }
      this.logger.info(`[TestFixTaskGenerator] Successfully saved ${savedCount} tasks, skipped ${skippedCount} existing tasks`);
      return savedTasks;
    } catch (error) {
      this.logger.error('[TestFixTaskGenerator] Error saving tasks:', error.message);
      throw error;
    }
  }
  /**
   * Generate and save tasks from test data
   * @param {Object} parsedData - Parsed test data
   * @param {Object} options - Options
   * @returns {Promise<Array<Task>>} Saved tasks
   */
  async generateAndSaveTasks(parsedData, options = {}) {
    try {
      this.logger.info('[TestFixTaskGenerator] Generating tasks from test data...');
      // Clear existing tasks if requested
      if (options.clearExisting) {
        this.logger.info('[TestFixTaskGenerator] Clearing existing tasks...');
        if (this.taskRepository) {
          await this.taskRepository.clear();
        }
      }
      // Generate tasks
      const tasks = await this.generateTasksFromTestData(parsedData, options);
      // Save tasks to database
      const savedTasks = await this.saveTasks(tasks);
      return savedTasks;
    } catch (error) {
      this.logger.error('[TestFixTaskGenerator] Error generating and saving tasks:', error.message);
      throw error;
    }
  }
}
module.exports = TestFixTaskGenerator; 