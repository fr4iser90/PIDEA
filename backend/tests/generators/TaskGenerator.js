/**
 * Task Data Generator
 * 
 * Generates test task data for database testing.
 * Provides utilities for creating realistic task records.
 */

/**
 * Generate test task data
 * @param {number} count - Number of tasks to generate
 * @param {Object} options - Generation options
 * @returns {Array} Generated task data
 */
function generateTasks(count = 1, options = {}) {
  const {
    startId = 1,
    projectIds = [1, 2, 3],
    assignedToIds = [1, 2, 3],
    createdByIds = [1, 2, 3],
    statuses = ['pending', 'in_progress', 'completed', 'cancelled'],
    priorities = ['low', 'medium', 'high', 'urgent'],
    titlePrefix = 'Test Task'
  } = options;

  const tasks = [];

  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const title = `${titlePrefix} ${id}`;
    const description = generateTaskDescription();
    const projectId = projectIds[Math.floor(Math.random() * projectIds.length)];
    const assignedTo = assignedToIds[Math.floor(Math.random() * assignedToIds.length)];
    const createdBy = createdByIds[Math.floor(Math.random() * createdByIds.length)];
    const createdAt = generateRandomDate();
    const updatedAt = generateRandomDate(createdAt);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const dueDate = generateDueDate(createdAt);

    tasks.push({
      id,
      title,
      description,
      project_id: projectId,
      assigned_to: assignedTo,
      created_by: createdBy,
      created_at: createdAt,
      updated_at: updatedAt,
      status,
      priority,
      due_date: dueDate
    });
  }

  return tasks;
}

/**
 * Generate task description
 * @returns {string} Task description
 */
function generateTaskDescription() {
  const descriptions = [
    'A test task for database testing',
    'Another test task for database testing',
    'A third test task for database testing',
    'Test task with comprehensive testing scenarios',
    'Database testing task with multiple components',
    'Test task for performance validation',
    'Database testing task with audit trails',
    'Test task for migration testing',
    'Database testing task with error handling',
    'Test task for cross-database compatibility'
  ];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Generate due date
 * @param {string} createdAt - Creation date
 * @returns {string} Due date
 */
function generateDueDate(createdAt) {
  const created = new Date(createdAt);
  const dueDate = new Date(created.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000); // 0-30 days from creation
  return dueDate.toISOString();
}

/**
 * Generate random date
 * @param {Date} minDate - Minimum date
 * @returns {string} ISO date string
 */
function generateRandomDate(minDate = null) {
  const now = new Date();
  const start = minDate ? new Date(minDate) : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const end = now;

  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString();
}

/**
 * Generate task with specific properties
 * @param {Object} properties - Specific properties to set
 * @returns {Object} Generated task
 */
function generateTask(properties = {}) {
  const defaultTask = generateTasks(1)[0];
  return { ...defaultTask, ...properties };
}

/**
 * Generate pending task
 * @returns {Object} Pending task
 */
function generatePendingTask() {
  return generateTask({
    status: 'pending',
    priority: 'medium'
  });
}

/**
 * Generate in-progress task
 * @returns {Object} In-progress task
 */
function generateInProgressTask() {
  return generateTask({
    status: 'in_progress',
    priority: 'high'
  });
}

/**
 * Generate completed task
 * @returns {Object} Completed task
 */
function generateCompletedTask() {
  return generateTask({
    status: 'completed',
    priority: 'low'
  });
}

/**
 * Generate high priority task
 * @returns {Object} High priority task
 */
function generateHighPriorityTask() {
  return generateTask({
    status: 'in_progress',
    priority: 'high'
  });
}

/**
 * Generate urgent task
 * @returns {Object} Urgent task
 */
function generateUrgentTask() {
  return generateTask({
    status: 'pending',
    priority: 'urgent'
  });
}

/**
 * Generate task for specific project
 * @param {number} projectId - Project ID
 * @returns {Object} Task for specific project
 */
function generateTaskForProject(projectId) {
  return generateTask({
    project_id: projectId,
    status: 'pending'
  });
}

/**
 * Generate task assigned to specific user
 * @param {number} userId - User ID
 * @returns {Object} Task assigned to specific user
 */
function generateTaskForUser(userId) {
  return generateTask({
    assigned_to: userId,
    status: 'pending'
  });
}

/**
 * Generate task with specific status
 * @param {string} status - Task status
 * @returns {Object} Task with specific status
 */
function generateTaskWithStatus(status) {
  return generateTask({
    status,
    priority: 'medium'
  });
}

/**
 * Generate task with specific priority
 * @param {string} priority - Task priority
 * @returns {Object} Task with specific priority
 */
function generateTaskWithPriority(priority) {
  return generateTask({
    status: 'pending',
    priority
  });
}

module.exports = {
  generateTasks,
  generateTask,
  generatePendingTask,
  generateInProgressTask,
  generateCompletedTask,
  generateHighPriorityTask,
  generateUrgentTask,
  generateTaskForProject,
  generateTaskForUser,
  generateTaskWithStatus,
  generateTaskWithPriority
};
