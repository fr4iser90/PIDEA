/**
 * useTask Hook
 * Custom hook for task management using DDD patterns
 */
import { useState, useEffect, useCallback } from 'react';
import useTaskStore from '../../infrastructure/stores/TaskStore.jsx';

export const useTask = (taskId = null) => {
  const store = useTaskStore();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load task data
  const loadTask = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const taskData = store.getTaskById(taskId);
      setTask(taskData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, store]);

  // Execute task
  const executeTask = useCallback(async (options = {}) => {
    if (!taskId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedTask = await store.executeTask(taskId, options);
      setTask(updatedTask.toJSON());
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [taskId, store]);

  // Complete task
  const completeTask = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedTask = await store.completeTask(taskId);
      setTask(updatedTask.toJSON());
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [taskId, store]);

  // Update task progress
  const updateProgress = useCallback(async (progress) => {
    if (!taskId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedTask = await store.updateTaskProgress(taskId, progress);
      setTask(updatedTask.toJSON());
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [taskId, store]);

  // Cancel task
  const cancelTask = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedTask = await store.cancelTask(taskId);
      setTask(updatedTask.toJSON());
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [taskId, store]);

  // Load task on mount or when taskId changes
  useEffect(() => {
    loadTask();
  }, [loadTask]);

  return {
    task,
    isLoading: isLoading || store.isLoading,
    error: error || store.error,
    executeTask,
    completeTask,
    updateProgress,
    cancelTask,
    refresh: loadTask,
    clearError: () => {
      setError(null);
      store.clearError();
    }
  };
};

export const useTaskList = (options = {}) => {
  const store = useTaskStore();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await store.loadTasks(options);
      setTasks(result.tasks);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [store, options]);

  // Create task
  const createTask = useCallback(async (projectId, type, taskOptions = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newTask = await store.createTask(projectId, type, taskOptions);
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Get task statistics
  const getStatistics = useCallback(async (projectId) => {
    try {
      return await store.getTaskStatistics(projectId);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [store]);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Update tasks when store changes
  useEffect(() => {
    if (options.projectId) {
      setTasks(store.getTasksByProject(options.projectId));
    } else if (options.status) {
      setTasks(store.getTasksByStatus(options.status));
    } else if (options.type) {
      setTasks(store.getTasksByType(options.type));
    } else {
      setTasks(store.getTaskList());
    }
  }, [store.tasks, store.lastUpdate, options]);

  return {
    tasks,
    isLoading: isLoading || store.isLoading,
    error: error || store.error,
    loadTasks,
    createTask,
    getStatistics,
    clearError: () => {
      setError(null);
      store.clearError();
    }
  };
};
