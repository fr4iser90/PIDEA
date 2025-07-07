import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@infrastructure/repositories/APIChatRepository.jsx';

function AnalysisStep({ framework, onAnalysisComplete, workflowData, setWorkflowData }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const api = new APIChatRepository();

  useEffect(() => {
    loadCurrentProject();
  }, []);

  const loadCurrentProject = async () => {
    try {
      // Get current project ID using the existing system
      const projectId = await api.getCurrentProjectId();
      const ideList = await api.getIDEs();
      
      if (ideList.success && ideList.data) {
        const activeIDE = ideList.data.find(ide => ide.active);
        if (activeIDE) {
          const project = {
            id: projectId,
            name: activeIDE.workspacePath ? activeIDE.workspacePath.split('/').pop() : 'Unknown',
            path: activeIDE.workspacePath || 'Unknown'
          };
          setCurrentProject(project);
        }
      }
    } catch (error) {
      setAnalysisError('Failed to load current project: ' + error.message);
    }
  };

  const startAnalysis = async () => {
    if (!currentProject) {
      setAnalysisError('No project selected');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Use new documentation-specific analysis API
      console.log('📊 [AnalysisStep] Starting documentation analysis for project:', currentProject.id);
      console.log('📊 [AnalysisStep] Project path:', currentProject.path);
      
      const response = await apiCall(`/api/projects/${currentProject.id}/documentation/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          projectPath: currentProject.path
        })
      });

      if (response.success) {
        console.log('✅ [AnalysisStep] Documentation analysis completed:', response.data);
        
        // Parse analysis results for documentation framework
        const results = parseAnalysisResults(response.data);
        setAnalysisResults(results);
        
        // Update workflow data
        setWorkflowData(prev => ({
          ...prev,
          projectId: currentProject.id,
          projectName: currentProject.name,
          projectPath: currentProject.path,
          analysisComplete: true
        }));
        
        // Notify parent component
        onAnalysisComplete(results);
      } else {
        throw new Error(response.error || 'Documentation analysis failed');
      }
    } catch (error) {
      console.error('❌ [AnalysisStep] Documentation analysis error:', error);
      setAnalysisError('Error during analysis: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseAnalysisResults = (analysisData) => {
    // Parse real documentation analysis results from DocumentationController
    const analysis = analysisData.analysis || {};
    const coverage = analysis.coverage || {};
    const tasks = analysis.tasks || [];
    
    // Extract coverage areas from the analysis
    const areas = Object.entries(coverage).map(([name, percentage]) => ({
      name,
      coverage: percentage,
      quality: percentage > 80 ? 'Excellent' : percentage > 60 ? 'Good' : 'Poor',
      missing: [] // TODO: Extract from priorities
    }));
    
    // Calculate overall coverage
    const overallCoverage = areas.length > 0 
      ? Math.round(areas.reduce((sum, area) => sum + area.coverage, 0) / areas.length)
      : 0;
    
    // Convert tasks to our format
    const prioritizedTasks = tasks.map(task => ({
      title: task.title,
      priority: task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium',
      estimatedHours: task.estimatedTime || 2,
      category: task.type || 'documentation',
      description: task.description
    }));
    
    // Extract recommendations from summary or priorities
    const recommendations = analysis.priorities?.flatMap(p => p.items) || [
      'Review the generated analysis from Cursor IDE',
      'Implement high-priority tasks first',
      'Focus on areas with low coverage'
    ];
    
    return {
      overallCoverage,
      areas: areas.length > 0 ? areas : [
        { name: 'Getting Started', coverage: 70, quality: 'Good', missing: [] },
        { name: 'API Documentation', coverage: 50, quality: 'Fair', missing: [] },
        { name: 'Development Guide', coverage: 60, quality: 'Good', missing: [] }
      ],
      prioritizedTasks: prioritizedTasks.length > 0 ? prioritizedTasks : [
        { 
          title: 'Review Documentation Analysis',
          priority: 'High',
          estimatedHours: 1,
          category: 'review',
          description: 'Review the analysis results from Cursor IDE in the next step'
        }
      ],
      qualityScore: analysis.summary?.avgCoverage || overallCoverage,
      recommendations,
      rawAnalysis: analysisData // Keep original for debugging
    };
  };

  const renderCoverageChart = () => {
    if (!analysisResults) return null;

    return (
      <div className="coverage-chart">
        <h4>Documentation Coverage by Area</h4>
        <div className="coverage-bars">
          {analysisResults.areas.map((area, index) => (
            <div key={index} className="coverage-bar">
              <div className="bar-label">
                <span>{area.name}</span>
                <span>{area.coverage}%</span>
              </div>
              <div className="bar-container">
                <div 
                  className={`bar-fill ${area.coverage > 80 ? 'excellent' : area.coverage > 60 ? 'good' : 'poor'}`}
                  style={{ width: `${area.coverage}%` }}
                />
              </div>
              <div className="bar-details">
                <span className={`quality-badge ${area.quality.toLowerCase()}`}>
                  {area.quality}
                </span>
                <span className="missing-count">
                  {area.missing.length} missing items
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTaskPreview = () => {
    if (!analysisResults) return null;

    return (
      <div className="task-preview">
        <h4>Prioritized Tasks ({analysisResults.prioritizedTasks.length})</h4>
        <div className="task-list">
          {analysisResults.prioritizedTasks.map((task, index) => (
            <div key={index} className="task-preview-item">
              <div className="task-header">
                <span className="task-title">{task.title}</span>
                <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
              </div>
              <div className="task-meta">
                <span className="estimated-time">⏱️ {task.estimatedHours}h</span>
                <span className="category">📂 {task.category}</span>
              </div>
              <p className="task-description">{task.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-step">
      {!workflowData.analysisComplete ? (
        <div className="analysis-setup">
          <div className="setup-section">
            <h4>📁 Current Project</h4>
            {currentProject ? (
              <div className="current-project-info">
                <div className="project-detail">
                  <strong>Name:</strong> {currentProject.name}
                </div>
                <div className="project-detail">
                  <strong>ID:</strong> {currentProject.id}
                </div>
                <div className="project-detail">
                  <strong>Path:</strong> {currentProject.path}
                </div>
              </div>
            ) : (
              <div className="loading-project">
                <div className="spinner"></div>
                Loading current project...
              </div>
            )}
            <p className="help-text">
              Documentation analysis will be performed for the current project
            </p>
          </div>

          <div className="setup-section">
            <h4>🔍 Analysis Overview</h4>
            <div className="analysis-checklist">
              <div className="checklist-item">
                <span className="check-icon">📊</span>
                <div>
                  <strong>Documentation Coverage</strong>
                  <p>Analyze existing documentation files and assess coverage</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-icon">🔍</span>
                <div>
                  <strong>Gap Analysis</strong>
                  <p>Identify missing documentation areas and quality issues</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-icon">📋</span>
                <div>
                  <strong>Task Prioritization</strong>
                  <p>Create prioritized list of improvement tasks</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-icon">📈</span>
                <div>
                  <strong>Quality Assessment</strong>
                  <p>Evaluate documentation quality and provide recommendations</p>
                </div>
              </div>
            </div>
          </div>

          <div className="action-section">
            <button 
              className="btn-primary analysis-btn"
              onClick={startAnalysis}
              disabled={isAnalyzing || !currentProject}
            >
              {isAnalyzing ? (
                <>
                  <div className="spinner"></div>
                  Analyzing Documentation...
                </>
              ) : (
                <>
                  🔍 Start Documentation Analysis
                </>
              )}
            </button>
            
            {analysisError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {analysisError}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="analysis-results">
          <div className="results-header">
            <h3>📊 Analysis Complete</h3>
            <div className="overall-score">
              <span className="score-label">Overall Quality Score:</span>
              <span className={`score-value ${analysisResults.qualityScore > 80 ? 'excellent' : analysisResults.qualityScore > 60 ? 'good' : 'poor'}`}>
                {analysisResults.qualityScore}%
              </span>
            </div>
          </div>

          {renderCoverageChart()}
          {renderTaskPreview()}

          <div className="recommendations">
            <h4>💡 Key Recommendations</h4>
            <ul>
              {analysisResults.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisStep; 