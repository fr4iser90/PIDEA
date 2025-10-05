import { useState, useCallback } from 'react';

/**
 * useTestRunner - Custom hook for test runner functionality
 * 
 * Provides test execution and management capabilities following
 * existing hook patterns with proper error handling.
 */
const useTestRunner = () => {
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({
    isRunning: false,
    activeTestCount: 0,
    totalResults: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const executeTest = useCallback(async (testName, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { projectId, workspacePath, config } = options;
      
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Update status to running
      setStatus(prev => ({
        ...prev,
        isRunning: true,
        activeTestCount: 1
      }));

      const response = await fetch(`/api/projects/${projectId}/analysis/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testName,
          options: {
            workspacePath,
            config
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute tests');
      }

      const data = await response.json();
      
      if (data.success) {
        // Add new result to results array
        setResults(prev => [...prev, data.data]);
        
        // Update status
        setStatus(prev => ({
          ...prev,
          isRunning: false,
          activeTestCount: 0,
          totalResults: prev.totalResults + 1
        }));
        
        return data.data;
      } else {
        throw new Error(data.error || 'Test execution failed');
      }
      
    } catch (err) {
      setError(err.message);
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        activeTestCount: 0
      }));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTestResults = useCallback(async (testId) => {
    try {
      const response = await fetch(`/api/projects/${testId}/analysis/test-analysis`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get test results');
      }

      const data = await response.json();
      return data.data;
      
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getAllTestResults = useCallback(async () => {
    try {
      const response = await fetch('/api/projects/all/analysis/test-analysis');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get all test results');
      }

      const data = await response.json();
      setResults(data.data.results || []);
      return data.data;
      
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const stopTests = useCallback(async (testId = null) => {
    try {
      const response = await fetch('/api/projects/stop/analysis/test-fixing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop tests');
      }

      const data = await response.json();
      
      // Update status
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        activeTestCount: 0
      }));
      
      return data.data;
      
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getTestRunnerStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/projects/status/analysis/test');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get test runner status');
      }

      const data = await response.json();
      setStatus(data.data.status);
      return data.data;
      
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const validateLoginCredentials = useCallback(async (projectId, credentials) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analysis/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to validate credentials');
      }

      const data = await response.json();
      return data.data;
      
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setStatus(prev => ({
      ...prev,
      totalResults: 0
    }));
  }, []);

  return {
    // State
    results,
    error,
    status,
    isLoading,
    
    // Actions
    executeTest,
    getTestResults,
    getAllTestResults,
    stopTests,
    getTestRunnerStatus,
    validateLoginCredentials,
    clearError,
    clearResults
  };
};

export default useTestRunner;
