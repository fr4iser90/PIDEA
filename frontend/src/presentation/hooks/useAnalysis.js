/**
 * useAnalysis Hook
 * Custom hook for analysis management using DDD patterns
 */
import { useState, useEffect, useCallback } from 'react';
import useAnalysisStore from '../../infrastructure/stores/AnalysisStore.jsx';

export const useAnalysis = (analysisId = null) => {
  const store = useAnalysisStore();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load analysis data
  const loadAnalysis = useCallback(async () => {
    if (!analysisId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const analysisData = store.getAnalysisById(analysisId);
      setAnalysis(analysisData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [analysisId, store]);

  // Complete analysis
  const completeAnalysis = useCallback(async (results) => {
    if (!analysisId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedAnalysis = await store.completeAnalysis(analysisId, results);
      setAnalysis(updatedAnalysis.toJSON());
      return updatedAnalysis;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [analysisId, store]);

  // Load analysis on mount or when analysisId changes
  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  return {
    analysis,
    isLoading: isLoading || store.isLoading,
    error: error || store.error,
    completeAnalysis,
    refresh: loadAnalysis,
    clearError: () => {
      setError(null);
      store.clearError();
    }
  };
};

export const useAnalysisList = (options = {}) => {
  const store = useAnalysisStore();
  const [analyses, setAnalyses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load analyses
  const loadAnalyses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await store.loadAnalyses(options);
      setAnalyses(result.analyses);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [store, options]);

  // Start analysis
  const startAnalysis = useCallback(async (projectId, category, analysisOptions = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newAnalysis = await store.startAnalysis(projectId, category, analysisOptions);
      return newAnalysis;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Get latest analysis
  const getLatestAnalysis = useCallback(async (projectId, category) => {
    try {
      return await store.getLatestAnalysis(projectId, category);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [store]);

  // Get analysis statistics
  const getStatistics = useCallback(async (projectId) => {
    try {
      return await store.getAnalysisStatistics(projectId);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [store]);

  // Get recommended categories
  const getRecommendedCategories = useCallback(async (projectId) => {
    try {
      return await store.getRecommendedCategories(projectId);
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [store]);

  // Load analyses on mount
  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  // Update analyses when store changes
  useEffect(() => {
    if (options.projectId) {
      setAnalyses(store.getAnalysesByProject(options.projectId));
    } else if (options.category) {
      setAnalyses(store.getAnalysesByCategory(options.category));
    } else if (options.status) {
      setAnalyses(store.getAnalysesByStatus(options.status));
    } else {
      setAnalyses(store.getAnalysisList());
    }
  }, [store.analyses, store.lastUpdate, options]);

  return {
    analyses,
    isLoading: isLoading || store.isLoading,
    error: error || store.error,
    loadAnalyses,
    startAnalysis,
    getLatestAnalysis,
    getStatistics,
    getRecommendedCategories,
    clearError: () => {
      setError(null);
      store.clearError();
    }
  };
};
