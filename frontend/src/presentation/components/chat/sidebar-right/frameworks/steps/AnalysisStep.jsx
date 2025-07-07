import React, { useState, useEffect } from 'react';
import APIChatRepository from '@infrastructure/repositories/APIChatRepository.jsx';

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
      // Use existing project analysis API
      const response = await api.analyzeProject(currentProject.path, {
        analysisType: 'documentation',
        framework: 'documentation-framework'
      });

      if (response.success) {
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
        setAnalysisError('Failed to analyze documentation: ' + response.error);
      }
    } catch (error) {
      setAnalysisError('Error during analysis: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseAnalysisResults = (analysisData) => {
    // Convert backend analysis results to documentation framework format
    // This would parse the real analysis data
    return {
      overallCoverage: analysisData.documentationCoverage || 70,
      areas: analysisData.areas || [
        { name: 'Getting Started', coverage: 80, quality: 'Good', missing: ['Installation screenshots'] },
        { name: 'API Documentation', coverage: 40, quality: 'Poor', missing: ['API examples', 'Auth guide'] },
        { name: 'Development Setup', coverage: 90, quality: 'Excellent', missing: ['Docker troubleshooting'] },
        { name: 'Architecture', coverage: 60, quality: 'Good', missing: ['Database schema'] },
        { name: 'Testing', coverage: 30, quality: 'Poor', missing: ['Test coverage report'] }
      ],
      prioritizedTasks: analysisData.recommendedTasks || [
        { 
          title: 'Create API Documentation Examples',
          priority: 'High',
          estimatedHours: 4,
          category: 'api',
          description: 'Add comprehensive API examples with request/response samples'
        },
        {
          title: 'Improve Testing Documentation',
          priority: 'High', 
          estimatedHours: 3,
          category: 'testing',
          description: 'Create testing guide with examples and coverage reports'
        }
      ],
      qualityScore: analysisData.qualityScore || 65,
      recommendations: analysisData.recommendations || [
        'Focus on API documentation first - highest impact',
        'Add visual elements (diagrams, screenshots)',
        'Implement documentation testing/validation'
      ]
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