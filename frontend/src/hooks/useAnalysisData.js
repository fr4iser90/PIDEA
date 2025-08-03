import { useState, useEffect, useCallback } from 'react';
import AnalysisRepository from '@/infrastructure/repositories/AnalysisRepository';

const analysisRepository = new AnalysisRepository();

/**
 * Custom hook for managing analysis data
 * @param {string} projectId - Project ID
 * @param {string} category - Analysis category (security, code-quality, etc.)
 * @returns {Object} Analysis data and loading states
 */
export const useAnalysisData = (projectId, category = 'security') => {
  const [issues, setIssues] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documentation, setDocumentation] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analysisRepository.getAnalysisIssues(projectId, category);
      setIssues(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, category]);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analysisRepository.getAnalysisRecommendations(projectId, category);
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, category]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analysisRepository.getAnalysisTasks(projectId, category);
      setTasks(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, category]);

  // Fetch documentation
  const fetchDocumentation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analysisRepository.getAnalysisDocumentation(projectId, category);
      setDocumentation(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch documentation:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, category]);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analysisRepository.getAnalysisMetrics(projectId, category);
      setMetrics(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, category]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analysisRepository.getAnalysisSummary(projectId, category);
      setSummary(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, category]);

  // Fetch all analysis data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the convenience method for better performance
      const allData = await analysisRepository.getAllAnalysisData(projectId, category);
      
      setIssues(allData.issues);
      setRecommendations(allData.recommendations);
      setTasks(allData.tasks);
      setDocumentation(allData.documentation);
      setMetrics(allData.metrics);
      setSummary(allData.summary);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch all analysis data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, category]);

  // Request new analysis
  const requestAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analysisRepository.requestAnalysis(projectId, category);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to request analysis:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId, category]);

  // Auto-fetch data on mount
  useEffect(() => {
    if (projectId) {
      fetchAllData();
    }
  }, [projectId, category, fetchAllData]);

  return {
    // Data
    issues,
    recommendations,
    tasks,
    documentation,
    metrics,
    summary,
    
    // Loading states
    loading,
    error,
    
    // Actions
    fetchIssues,
    fetchRecommendations,
    fetchTasks,
    fetchDocumentation,
    fetchMetrics,
    fetchSummary,
    fetchAllData,
    requestAnalysis,
    
    // Computed values
    totalIssues: issues.length,
    totalRecommendations: recommendations.length,
    totalTasks: tasks.length,
    totalDocumentation: documentation.length,
    
    // Filtered data
    criticalIssues: issues.filter(issue => issue.severity === 'critical'),
    highIssues: issues.filter(issue => issue.severity === 'high'),
    mediumIssues: issues.filter(issue => issue.severity === 'medium'),
    lowIssues: issues.filter(issue => issue.severity === 'low'),
    
    highPriorityTasks: tasks.filter(task => task.priority === 'high'),
    criticalTasks: tasks.filter(task => task.priority === 'critical'),
    
    // Category info
    category,
    projectId,
  };
}; 