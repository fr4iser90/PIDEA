/**
 * TestFixTaskGenerator - Generate Task entities from parsed test data
 * Converts failing tests, coverage issues, and legacy tests into database tasks
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
        const task = this.createFailingTestTask(failingTest, projectId, userId);
        tasks.push(task);
      }

      // Generate tasks for coverage issues
      for (const coverageIssue of parsedData.coverageIssues) {
        const task = this.createCoverageTask(coverageIssue, projectId, userId);
        tasks.push(task);
      }

      // Generate tasks for legacy tests
      for (const legacyTest of parsedData.legacyTests) {
        const task = this.createLegacyTestTask(legacyTest, projectId, userId);
        tasks.push(task);
      }

      // Generate tasks for complex tests
      for (const complexTest of parsedData.complexTests) {
        const task = this.createComplexTestTask(complexTest, projectId, userId);
        tasks.push(task);
      }

      this.logger.info(`[TestFixTaskGenerator] Generated ${tasks.length} tasks`);
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
   * Create task for legacy test
   * @param {Object} legacyTest - Legacy test data
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Task} Task entity
   */
  createLegacyTestTask(legacyTest, projectId, userId) {
    const taskId = `legacy-refactor-${uuidv4()}`;
    
    return new Task(
      taskId,
      projectId,
      `Refactor legacy test: ${legacyTest.testName}`,
      `Refactor the legacy test "${legacyTest.testName}" in ${legacyTest.fileName}. Legacy score: ${legacyTest.legacyScore || 'high'}`,
      TaskStatus.PENDING,
      TaskPriority.MEDIUM,
      TaskType.REFACTOR,
      {
        testFile: legacyTest.fileName,
        testName: legacyTest.testName,
        legacyScore: legacyTest.legacyScore,
        healthScore: legacyTest.healthScore,
        source: legacyTest.source || 'test-report',
        taskType: 'legacy_test_refactor',
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
    
    return new Task(
      taskId,
      projectId,
      `Refactor complex test: ${complexTest.testName}`,
      `Refactor the complex test "${complexTest.testName}" in ${complexTest.fileName}. Complexity score: ${complexTest.complexityScore || 'high'}`,
      TaskStatus.PENDING,
      TaskPriority.MEDIUM,
      TaskType.REFACTOR,
      {
        testFile: complexTest.fileName,
        testName: complexTest.testName,
        complexityScore: complexTest.complexityScore,
        healthScore: complexTest.healthScore,
        source: complexTest.source || 'test-report',
        taskType: 'complex_test_refactor',
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