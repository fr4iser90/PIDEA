import { 
  isTaskCompleted, 
  isTaskPartiallyCompleted, 
  getCompletionStatus,
  getTaskProgress,
  getCompletionDisplayText,
  getCompletionColor,
  getCompletionIcon,
  filterTasksByCompletion,
  getCompletionStats
} from '@/utils/taskCompletionUtils';

describe('TaskCompletionUtils', () => {
  describe('isTaskCompleted', () => {
    test('should return true for completed status', () => {
      const task = { status: 'completed', progress: 0 };
      expect(isTaskCompleted(task)).toBe(true);
    });

    test('should return true for 100% progress', () => {
      const task = { status: 'pending', progress: 100 };
      expect(isTaskCompleted(task)).toBe(true);
    });

    test('should return true for completed status with value object', () => {
      const task = { status: { value: 'completed' }, progress: 0 };
      expect(isTaskCompleted(task)).toBe(true);
    });

    test('should return false for pending task', () => {
      const task = { status: 'pending', progress: 0 };
      expect(isTaskCompleted(task)).toBe(false);
    });

    test('should return false for null task', () => {
      expect(isTaskCompleted(null)).toBe(false);
    });

    test('should return false for undefined task', () => {
      expect(isTaskCompleted(undefined)).toBe(false);
    });
  });

  describe('isTaskPartiallyCompleted', () => {
    test('should return true for partially completed task', () => {
      const task = { status: 'pending', progress: 50 };
      expect(isTaskPartiallyCompleted(task)).toBe(true);
    });

    test('should return false for completed task', () => {
      const task = { status: 'completed', progress: 100 };
      expect(isTaskPartiallyCompleted(task)).toBe(false);
    });

    test('should return false for pending task with 0 progress', () => {
      const task = { status: 'pending', progress: 0 };
      expect(isTaskPartiallyCompleted(task)).toBe(false);
    });

    test('should return false for null task', () => {
      expect(isTaskPartiallyCompleted(null)).toBe(false);
    });
  });

  describe('getCompletionStatus', () => {
    test('should return completed for completed task', () => {
      const task = { status: 'completed', progress: 100 };
      expect(getCompletionStatus(task)).toBe('completed');
    });

    test('should return partially_completed for partially completed task', () => {
      const task = { status: 'pending', progress: 50 };
      expect(getCompletionStatus(task)).toBe('partially_completed');
    });

    test('should return pending for pending task', () => {
      const task = { status: 'pending', progress: 0 };
      expect(getCompletionStatus(task)).toBe('pending');
    });

    test('should return pending for null task', () => {
      expect(getCompletionStatus(null)).toBe('pending');
    });
  });

  describe('getTaskProgress', () => {
    test('should return 100 for completed status', () => {
      const task = { status: 'completed', progress: 0 };
      expect(getTaskProgress(task)).toBe(100);
    });

    test('should return actual progress for pending task', () => {
      const task = { status: 'pending', progress: 75 };
      expect(getTaskProgress(task)).toBe(75);
    });

    test('should cap progress at 100', () => {
      const task = { status: 'pending', progress: 150 };
      expect(getTaskProgress(task)).toBe(100);
    });

    test('should return 0 for null task', () => {
      expect(getTaskProgress(null)).toBe(0);
    });
  });

  describe('getCompletionDisplayText', () => {
    test('should return COMPLETED for completed task', () => {
      const task = { status: 'completed', progress: 100 };
      expect(getCompletionDisplayText(task)).toBe('COMPLETED');
    });

    test('should return progress percentage for partially completed task', () => {
      const task = { status: 'pending', progress: 75 };
      expect(getCompletionDisplayText(task)).toBe('75% COMPLETE');
    });

    test('should return PENDING for pending task', () => {
      const task = { status: 'pending', progress: 0 };
      expect(getCompletionDisplayText(task)).toBe('PENDING');
    });

    test('should return Unknown for null task', () => {
      expect(getCompletionDisplayText(null)).toBe('Unknown');
    });
  });

  describe('getCompletionColor', () => {
    test('should return green for completed task', () => {
      const task = { status: 'completed', progress: 100 };
      expect(getCompletionColor(task)).toBe('#10b981');
    });

    test('should return blue for partially completed task', () => {
      const task = { status: 'pending', progress: 50 };
      expect(getCompletionColor(task)).toBe('#3b82f6');
    });

    test('should return orange for pending task', () => {
      const task = { status: 'pending', progress: 0 };
      expect(getCompletionColor(task)).toBe('#f59e0b');
    });

    test('should return gray for null task', () => {
      expect(getCompletionColor(null)).toBe('#6b7280');
    });
  });

  describe('getCompletionIcon', () => {
    test('should return ✅ for completed task', () => {
      const task = { status: 'completed', progress: 100 };
      expect(getCompletionIcon(task)).toBe('✅');
    });

    test('should return 🔄 for partially completed task', () => {
      const task = { status: 'pending', progress: 50 };
      expect(getCompletionIcon(task)).toBe('🔄');
    });

    test('should return ⏳ for pending task', () => {
      const task = { status: 'pending', progress: 0 };
      expect(getCompletionIcon(task)).toBe('⏳');
    });

    test('should return ❓ for null task', () => {
      expect(getCompletionIcon(null)).toBe('❓');
    });
  });

  describe('filterTasksByCompletion', () => {
    const tasks = [
      { id: '1', status: 'pending', progress: 0 },
      { id: '2', status: 'pending', progress: 50 },
      { id: '3', status: 'completed', progress: 100 }
    ];

    test('should filter out completed tasks when showCompleted is false', () => {
      const filtered = filterTasksByCompletion(tasks, false);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.id)).toEqual(['1', '2']);
    });

    test('should include all tasks when showCompleted is true', () => {
      const filtered = filterTasksByCompletion(tasks, true);
      expect(filtered).toHaveLength(3);
      expect(filtered.map(t => t.id)).toEqual(['1', '2', '3']);
    });

    test('should handle empty array', () => {
      const filtered = filterTasksByCompletion([], false);
      expect(filtered).toEqual([]);
    });

    test('should handle null array', () => {
      const filtered = filterTasksByCompletion(null, false);
      expect(filtered).toEqual([]);
    });
  });

  describe('getCompletionStats', () => {
    const tasks = [
      { id: '1', status: 'pending', progress: 0 },
      { id: '2', status: 'pending', progress: 50 },
      { id: '3', status: 'completed', progress: 100 },
      { id: '4', status: 'completed', progress: 100 }
    ];

    test('should return correct statistics', () => {
      const stats = getCompletionStats(tasks);
      expect(stats).toEqual({
        total: 4,
        completed: 2,
        partiallyCompleted: 1,
        pending: 1,
        completionRate: 50
      });
    });

    test('should handle empty array', () => {
      const stats = getCompletionStats([]);
      expect(stats).toEqual({
        total: 0,
        completed: 0,
        partiallyCompleted: 0,
        pending: 0,
        completionRate: 0
      });
    });

    test('should handle null array', () => {
      const stats = getCompletionStats(null);
      expect(stats).toEqual({
        total: 0,
        completed: 0,
        partiallyCompleted: 0,
        pending: 0,
        completionRate: 0
      });
    });
  });
}); 