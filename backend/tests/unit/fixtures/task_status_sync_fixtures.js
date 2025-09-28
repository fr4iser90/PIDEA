/**
 * Task Status Sync Step - Test Fixtures
 * Test data and fixtures for TaskStatusSyncStep tests
 * Created: 2025-09-28T17:54:16.000Z
 */

const TaskStatus = require('@domain/value-objects/TaskStatus');
const TaskPriority = require('@domain/value-objects/TaskPriority');

module.exports = {
  // Mock task data
  mockTasks: {
    pendingTask: {
      id: 'task-pending-1',
      title: 'Test Pending Task',
      description: 'A task in pending status',
      status: { value: 'pending' },
      priority: { value: 'medium' },
      category: 'test',
      type: 'feature',
      projectId: 'test-project',
      createdAt: '2025-09-28T10:00:00.000Z',
      updatedAt: '2025-09-28T10:00:00.000Z',
      updateStatus: function(newStatus) {
        this.status = { value: newStatus };
        this.updatedAt = new Date().toISOString();
      }
    },

    inProgressTask: {
      id: 'task-in-progress-1',
      title: 'Test In Progress Task',
      description: 'A task in progress',
      status: { value: 'in-progress' },
      priority: { value: 'high' },
      category: 'test',
      type: 'bug',
      projectId: 'test-project',
      createdAt: '2025-09-28T09:00:00.000Z',
      updatedAt: '2025-09-28T11:00:00.000Z',
      updateStatus: function(newStatus) {
        this.status = { value: newStatus };
        this.updatedAt = new Date().toISOString();
      }
    },

    completedTask: {
      id: 'task-completed-1',
      title: 'Test Completed Task',
      description: 'A completed task',
      status: { value: 'completed' },
      priority: { value: 'low' },
      category: 'test',
      type: 'improvement',
      projectId: 'test-project',
      createdAt: '2025-09-28T08:00:00.000Z',
      updatedAt: '2025-09-28T12:00:00.000Z',
      completedAt: '2025-09-28T12:00:00.000Z',
      updateStatus: function(newStatus) {
        this.status = { value: newStatus };
        this.updatedAt = new Date().toISOString();
        if (newStatus === 'completed') {
          this.completedAt = new Date().toISOString();
        }
      }
    },

    failedTask: {
      id: 'task-failed-1',
      title: 'Test Failed Task',
      description: 'A failed task',
      status: { value: 'failed' },
      priority: { value: 'critical' },
      category: 'test',
      type: 'fix',
      projectId: 'test-project',
      createdAt: '2025-09-28T07:00:00.000Z',
      updatedAt: '2025-09-28T13:00:00.000Z',
      updateStatus: function(newStatus) {
        this.status = { value: newStatus };
        this.updatedAt = new Date().toISOString();
      }
    },

    blockedTask: {
      id: 'task-blocked-1',
      title: 'Test Blocked Task',
      description: 'A blocked task',
      status: { value: 'blocked' },
      priority: { value: 'medium' },
      category: 'test',
      type: 'feature',
      projectId: 'test-project',
      createdAt: '2025-09-28T06:00:00.000Z',
      updatedAt: '2025-09-28T14:00:00.000Z',
      updateStatus: function(newStatus) {
        this.status = { value: newStatus };
        this.updatedAt = new Date().toISOString();
      }
    },

    cancelledTask: {
      id: 'task-cancelled-1',
      title: 'Test Cancelled Task',
      description: 'A cancelled task',
      status: { value: 'cancelled' },
      priority: { value: 'low' },
      category: 'test',
      type: 'feature',
      projectId: 'test-project',
      createdAt: '2025-09-28T05:00:00.000Z',
      updatedAt: '2025-09-28T15:00:00.000Z',
      updateStatus: function(newStatus) {
        this.status = { value: newStatus };
        this.updatedAt = new Date().toISOString();
      }
    }
  },

  // Mock service responses
  mockServiceResponses: {
    taskRepository: {
      findById: {
        success: (taskId) => Promise.resolve(module.exports.mockTasks[`${taskId.split('-')[1]}Task`]),
        notFound: () => Promise.resolve(null),
        error: () => Promise.reject(new Error('Database connection failed'))
      },
      update: {
        success: () => Promise.resolve({}),
        error: () => Promise.reject(new Error('Update failed'))
      }
    },

    statusTransitionService: {
      moveTaskToCompleted: {
        success: () => Promise.resolve({ success: true }),
        error: () => Promise.reject(new Error('File move failed'))
      },
      moveTaskToInProgress: {
        success: () => Promise.resolve({ success: true }),
        error: () => Promise.reject(new Error('File move failed'))
      },
      moveTaskToPending: {
        success: () => Promise.resolve({ success: true }),
        error: () => Promise.reject(new Error('File move failed'))
      },
      moveTaskToCancelled: {
        success: () => Promise.resolve({ success: true }),
        error: () => Promise.reject(new Error('File move failed'))
      }
    },

    eventBus: {
      emit: {
        success: () => Promise.resolve({ success: true }),
        error: () => Promise.reject(new Error('Event emission failed'))
      }
    }
  },

  // Test scenarios
  testScenarios: {
    validTransitions: [
      { from: 'pending', to: 'in-progress' },
      { from: 'pending', to: 'cancelled' },
      { from: 'pending', to: 'blocked' },
      { from: 'in-progress', to: 'completed' },
      { from: 'in-progress', to: 'failed' },
      { from: 'in-progress', to: 'blocked' },
      { from: 'in-progress', to: 'cancelled' },
      { from: 'blocked', to: 'pending' },
      { from: 'blocked', to: 'in-progress' },
      { from: 'blocked', to: 'cancelled' },
      { from: 'failed', to: 'pending' },
      { from: 'failed', to: 'in-progress' }
    ],

    invalidTransitions: [
      { from: 'completed', to: 'pending' },
      { from: 'completed', to: 'in-progress' },
      { from: 'cancelled', to: 'pending' },
      { from: 'cancelled', to: 'in-progress' },
      { from: 'pending', to: 'completed' },
      { from: 'pending', to: 'failed' }
    ],

    batchOperations: {
      smallBatch: ['task-pending-1', 'task-in-progress-1'],
      mediumBatch: ['task-pending-1', 'task-in-progress-1', 'task-failed-1', 'task-blocked-1'],
      largeBatch: Array.from({ length: 100 }, (_, i) => `task-${i + 1}`),
      mixedStatusBatch: ['task-pending-1', 'task-in-progress-1', 'task-completed-1', 'task-failed-1']
    }
  },

  // Mock context
  mockContext: {
    valid: {
      getService: jest.fn((serviceName) => {
        const serviceMap = {
          'taskRepository': module.exports.mockServiceResponses.taskRepository,
          'statusTransitionService': module.exports.mockServiceResponses.statusTransitionService,
          'eventBus': module.exports.mockServiceResponses.eventBus
        };
        return serviceMap[serviceName];
      })
    },

    invalid: {
      getService: null
    },

    missingServices: {
      missingTaskRepository: {
        getService: jest.fn((serviceName) => {
          if (serviceName === 'taskRepository') return null;
          return module.exports.mockServiceResponses[serviceName];
        })
      },
      missingStatusTransitionService: {
        getService: jest.fn((serviceName) => {
          if (serviceName === 'statusTransitionService') return null;
          return module.exports.mockServiceResponses[serviceName];
        })
      },
      missingEventBus: {
        getService: jest.fn((serviceName) => {
          if (serviceName === 'eventBus') return null;
          return module.exports.mockServiceResponses[serviceName];
        })
      }
    }
  },

  // Expected results
  expectedResults: {
    singleTaskSync: {
      success: {
        success: true,
        taskId: 'task-pending-1',
        oldStatus: 'pending',
        newStatus: 'in-progress',
        timestamp: expect.any(String)
      }
    },

    batchTaskSync: {
      success: {
        success: true,
        operation: 'batch-sync',
        processedTasks: 2,
        successfulTasks: 2,
        failedTasks: 0,
        results: expect.any(Array),
        errors: expect.any(Array),
        timestamp: expect.any(String)
      }
    },

    validation: {
      success: {
        success: true,
        operation: 'validate',
        totalTasks: 2,
        validTasks: 2,
        invalidTasks: 0,
        results: expect.any(Array),
        timestamp: expect.any(String)
      }
    },

    rollback: {
      success: {
        success: true,
        operation: 'rollback',
        totalTasks: 2,
        successfulRollbacks: 2,
        failedRollbacks: 0,
        results: expect.any(Array),
        timestamp: expect.any(String)
      }
    }
  },

  // Error scenarios
  errorScenarios: {
    taskNotFound: {
      taskId: 'non-existent-task',
      expectedError: 'Task non-existent-task not found'
    },

    invalidTransition: {
      from: 'completed',
      to: 'pending',
      expectedError: 'Invalid status transition from completed to pending'
    },

    missingTaskId: {
      expectedError: 'Task ID and target status are required for sync operation'
    },

    missingTargetStatus: {
      expectedError: 'Task ID and target status are required for sync operation'
    },

    missingTaskIds: {
      expectedError: 'Task IDs array is required for batch sync operation'
    },

    missingPreviousStatus: {
      expectedError: 'Previous status is required for rollback'
    },

    unsupportedOperation: {
      operation: 'unsupported',
      expectedError: 'Unsupported operation: unsupported'
    }
  }
};
